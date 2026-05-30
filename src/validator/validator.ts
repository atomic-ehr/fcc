import { translate, validate as fsValidate } from "@atomic-ehr/fhirschema";
import type { Plugin, PluginContext } from "fcc";
import { resolve as resolvePath } from "node:path";

// The validation plugin (explicitly enabled). It is a thin runner: it executes a
// composable list of `Validator` functions, merges their issues into one report
// at ctx.shared.validate (the site renders it as errors.html with a top-bar QA
// chip), and emits a summary. Every check is a validator — compose them:
//
//   validator()                                   // default: [structural()]
//   validator({ validators: [structural(), schema({ packagesDir }), fhirpathConstraints()] })
//
// Built-in validators:
//   structural()          — lite lint (resourceType/id/url/dupes/unresolved refs), no cache needed
//   schema()              — @atomic-ehr/fhirschema: examples vs profiles + canonicals translate
//   fhirpathConstraints() — @atomic-ehr/fhirpath: element constraint[] invariants

export type ValidatorIssue = {
  rid: string; rt: string; fhirId: string; title: string; href: string;
  severity: "error" | "warning" | "information";
  code: string; path: string; message?: string; expected?: string; got?: string;
  validator: string;
};

/**
 * A validator produces issues for the current build. **Always async** — almost
 * every real check is (terminology servers, FHIRPath, reference resolution,
 * network), so the framework commits to one async contract. Validators are
 * independent (read-only over the graph), so the plugin runs them in parallel.
 */
export type Validator = (ctx: PluginContext) => Promise<ValidatorIssue[]>;

type Opts = { validators?: Validator[]; quiet?: boolean };

export default function validator(opts: Opts = {}): Plugin {
  const validators = opts.validators ?? [structural()];
  return (hooks) => hooks.afterValidate(async (ctx) => {
      const results = await Promise.all(validators.map(v =>
        v(ctx).catch((e: Error) => {
          ctx.warn({ severity: "warning", source: "fcc/validator", message: `validator threw: ${e.message}` });
          return [] as ValidatorIssue[];
        }),
      ));
      const issues = results.flat();
      const errors = issues.filter(i => i.severity === "error").length;
      const warnings = issues.filter(i => i.severity === "warning").length;
      const resources = new Set(issues.map(i => i.rid)).size;
      (ctx.shared as any).validate = { issues, summary: { errors, warnings, resources, total: issues.length } };
      if (!opts.quiet) {
        ctx.warn({
          severity: errors ? "warning" : "info", source: "fcc/validator",
          message: `validated: ${errors} error(s), ${warnings} warning(s) across ${resources} resource(s) → errors.html`,
        });
      }
  });
}

// ── shared helpers ───────────────────────────────────────────────────────────

const CONFORMANCE = new Set([
  "StructureDefinition", "ValueSet", "CodeSystem", "CapabilityStatement",
  "SearchParameter", "ImplementationGuide", "OperationDefinition", "ConceptMap",
  "NamingSystem", "CompartmentDefinition", "StructureMap", "GraphDefinition",
  "MessageDefinition", "TerminologyCapabilities", "ExampleScenario",
]);
const CANONICAL_TYPES = new Set([
  "StructureDefinition", "ValueSet", "CodeSystem", "CapabilityStatement",
  "ConceptMap", "NamingSystem", "SearchParameter", "OperationDefinition",
  "MessageDefinition", "ImplementationGuide", "Questionnaire",
]);

const stripVer = (u: string) => u.split("|")[0]!;
// fhirschema resolves both bare resourceTypes ("Patient") and full canonicals.
const normRef = (ref: string) => {
  const u = stripVer(ref);
  return u.includes("://") ? u : `http://hl7.org/fhir/StructureDefinition/${u}`;
};

type R = { id: string; resourceType: string; data: unknown };
function resourceBase(r: R): Pick<ValidatorIssue, "rid" | "rt" | "fhirId" | "title" | "href"> {
  const d = r.data as Record<string, unknown>;
  const fhirId = (d.id as string | undefined) ?? r.id.split("/").pop() ?? r.id;
  const title = (d.title as string | undefined) ?? (d.name as string | undefined) ?? fhirId;
  return { rid: r.id, rt: r.resourceType, fhirId, title, href: `${r.resourceType}-${fhirId}.html` };
}
function mkIssue(r: R, f: { severity: ValidatorIssue["severity"]; code: string; path?: string; message?: string; expected?: unknown; got?: unknown }, validator: string): ValidatorIssue {
  return {
    ...resourceBase(r),
    severity: f.severity, code: f.code, path: f.path ?? "",
    message: f.message,
    expected: f.expected !== undefined ? JSON.stringify(f.expected) : undefined,
    got: f.got !== undefined ? JSON.stringify(f.got) : undefined,
    validator,
  };
}

// ── structural(): lite lint, no FHIR package cache needed ────────────────────

export function structural(): Validator {
  return async (ctx) => {
    const issues: ValidatorIssue[] = [];
    const seenIds = new Map<string, string>();
    const seenUrls = new Map<string, string>();
    for (const r of ctx.resources.values()) {
      const d = r.data as Record<string, unknown>;
      const id = d.id as string | undefined;
      const rt = r.resourceType;
      const push = (severity: ValidatorIssue["severity"], code: string, message: string) => issues.push(mkIssue(r, { severity, code, message }, "structural"));
      if (!rt) { push("error", "no-resourceType", "resource has no resourceType"); continue; }
      if (!id) push("error", "no-id", "resource has no id");
      const idKey = `${rt}/${id}`;
      if (seenIds.has(idKey)) push("error", "duplicate-id", `duplicate id ${idKey} (also declared by ${seenIds.get(idKey)})`);
      else seenIds.set(idKey, r.id);
      const url = d.url as string | undefined;
      if (CANONICAL_TYPES.has(rt) && !url) push("error", "missing-url", `${rt} requires a canonical url`);
      if (url) {
        if (seenUrls.has(url)) push("error", "duplicate-url", `duplicate canonical url ${url} (also ${seenUrls.get(url)})`);
        else seenUrls.set(url, r.id);
      }
      for (const ref of r.deps) {
        if (!ctx.byUrl(ref) && !/^https?:\/\//.test(ref)) push("warning", "unresolved-ref", `unresolved canonical reference ${ref}`);
      }
    }
    return issues;
  };
}

// ── schema(): @atomic-ehr/fhirschema structural validation ───────────────────

export function schema(opts: { packagesDir?: string } = {}): Validator {
  let baseIndex: Map<string, any> | null = null;            // cached across rebuilds
  return async (ctx) => {
    const base = await loadBaseIndex(ctx, opts.packagesDir, baseIndex);
    baseIndex = base;
    const sdByUrl = new Map(base);                          // in-bundle SDs override base packages
    for (const r of ctx.resources.values()) {
      if (r.resourceType === "StructureDefinition" && (r.data as any)?.url) sdByUrl.set((r.data as any).url, r.data);
    }
    const schemaCache = new Map<string, any>();
    const resolveSchema = (ref: string) => {
      const url = normRef(ref);
      if (schemaCache.has(url)) return schemaCache.get(url);
      const sd = sdByUrl.get(url);
      let s: any; try { s = sd ? translate(sd) : undefined; } catch { s = undefined; }
      schemaCache.set(url, s);
      return s;
    };
    const vctx = { resolve: resolveSchema };

    const issues: ValidatorIssue[] = [];
    // instances against their profile(s) (+ base resourceType, resolved internally)
    for (const r of ctx.resources.values()) {
      if (CONFORMANCE.has(r.resourceType)) continue;
      const d = r.data as any;
      const schemas = ((d.meta?.profile as string[] | undefined) ?? []).map(stripVer).map(resolveSchema).filter(Boolean);
      let res: any; try { res = fsValidate(vctx, schemas, d, { strict: false }); } catch { continue; }
      for (const i of res?.issues ?? []) {
        issues.push(mkIssue(r, {
          severity: (i.severity ?? "error"), code: String(i.code ?? "?"),
          path: Array.isArray(i.path) ? i.path.join(".") : String(i.path ?? ""),
          message: i.message, expected: i.expected, got: i.got,
        }, "schema"));
      }
    }
    // canonicals: each StructureDefinition must translate to a FHIRSchema
    for (const r of ctx.resources.values()) {
      if (r.resourceType !== "StructureDefinition") continue;
      try { translate(r.data as any); }
      catch (e) { issues.push(mkIssue(r, { severity: "error", code: "translate", message: `StructureDefinition does not translate: ${(e as Error).message}` }, "schema")); }
    }
    return issues;
  };
}

// ── fhirpathConstraints(): @atomic-ehr/fhirpath invariant checks ─────────────
// The engine is async-only (can't satisfy fhirschema's sync `fhirpath` hook), so
// this is a separate pass. Reads element constraint[] from the generated snapshot
// (run fcc/snapshot first). Conservative: only an explicit [false] is flagged.

export function fhirpathConstraints(opts: { quiet?: boolean } = {}): Validator {
  return async (ctx) => {
    const { evaluate } = await import("@atomic-ehr/fhirpath");
    const issues: ValidatorIssue[] = [];
    for (const r of ctx.resources.values()) {
      if (CONFORMANCE.has(r.resourceType)) continue;
      const d = r.data as any;
      for (const purl of ((d.meta?.profile as string[] | undefined) ?? []).map(stripVer)) {
        const sd = ctx.byUrl(purl);
        const elements = (sd?.data as any)?.snapshot?.element as any[] | undefined;
        if (!elements) continue;
        const rootType = (sd!.data as any).type ?? r.resourceType;
        for (const el of elements) {
          const rel = el.path === rootType ? null : el.path.slice(rootType.length + 1);
          if (rel && /[[:]/.test(rel)) continue;             // skip choice[x] / slice paths
          for (const c of (el.constraint ?? [])) {
            if (!c.expression) continue;
            let nodes: unknown[];
            try { nodes = rel ? await evaluate(rel, { input: d }) : [d]; } catch { continue; }
            for (const node of nodes) {
              let res: unknown;
              try { res = await evaluate(c.expression, { input: node, variables: { resource: d, rootResource: d, context: node } }); }
              catch { continue; }                            // unsupported fn → skip
              if (Array.isArray(res) && res.length === 1 && res[0] === false) {
                issues.push(mkIssue(r, { severity: c.severity === "warning" ? "warning" : "error", code: String(c.key), path: el.path, message: String(c.human ?? c.expression) }, "fhirpath"));
                break;
              }
            }
          }
        }
      }
    }
    if (!opts.quiet) ctx.warn({ severity: "info", source: "fcc/validator", message: `fhirpath constraints: ${issues.length} violation(s)` });
    return issues;
  };
}

// Index base StructureDefinitions from the FHIR package cache (R4 core + each
// declared dependency at its version) — same source the snapshot plugin uses.
async function loadBaseIndex(ctx: PluginContext, packagesDir: string | undefined, cached: Map<string, any> | null): Promise<Map<string, any>> {
  if (cached) return cached;
  const m = new Map<string, any>();
  const dir = resolvePath(ctx.config.projectRoot, packagesDir ?? "input-cache/.fhir/packages");
  const deps = ((ctx.config as any).deps ?? {}) as Record<string, string>;
  const wanted = new Set<string>(["hl7.fhir.r4.core#4.0.1"]);
  for (const [pkg, version] of Object.entries(deps)) wanted.add(`${pkg}#${version}`);
  for (const pv of wanted) {
    try {
      for await (const rel of new Bun.Glob("StructureDefinition-*.json").scan({ cwd: resolvePath(dir, pv, "package") })) {
        try {
          const d = await Bun.file(resolvePath(dir, pv, "package", rel)).json();
          if (d?.url && !m.has(d.url)) m.set(d.url, d);
        } catch { /* skip */ }
      }
    } catch { /* package absent */ }
  }
  return m;
}
