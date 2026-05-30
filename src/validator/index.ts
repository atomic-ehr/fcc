import { translate, validate as fsValidate } from "@atomic-ehr/fhirschema";
import type { Plugin, PluginContext } from "fcc";
import { resolve as resolvePath } from "node:path";

// Schema validator (explicitly enabled). Validates instances/examples against
// their declared profiles and StructureDefinitions for well-formedness via
// @atomic-ehr/fhirschema, and writes a report to ctx.shared.validate that the
// site renders as a QA page (errors.html).
//
// Extensible: pass extra standalone `validators`, and wire fhirschema's
// pluggable `fhirpath` / `terminology` / `referenceResolver` evaluators to add
// FHIRPath-constraint and terminology checks later (both are skipped when
// absent, which is why slicing/binding checks are currently limited).

export type ValidatorIssue = {
  rid: string; rt: string; fhirId: string; title: string; href: string;
  severity: "error" | "warning" | "information";
  code: string; path: string; message?: string; expected?: string; got?: string;
  validator: string;
};

type Opts = {
  /** FHIR package cache, relative to projectRoot (base definitions for the chain). */
  packagesDir?: string;
  examples?: boolean;       // validate instances against profiles (default true)
  canonicals?: boolean;     // validate StructureDefinitions translate cleanly (default true)
  strict?: boolean;
  // fhirschema extension points (add real evaluators to cut false positives):
  fhirpath?: unknown;
  terminology?: unknown;
  referenceResolver?: unknown;
  // additional standalone validators (e.g. naming policy, MS-coverage):
  validators?: Array<(ctx: PluginContext) => ValidatorIssue[] | Promise<ValidatorIssue[]>>;
  quiet?: boolean;
};

// Conformance/canonical resource types — everything else is an instance/example.
const CONFORMANCE = new Set([
  "StructureDefinition", "ValueSet", "CodeSystem", "CapabilityStatement",
  "SearchParameter", "ImplementationGuide", "OperationDefinition", "ConceptMap",
  "NamingSystem", "CompartmentDefinition", "StructureMap", "GraphDefinition",
  "MessageDefinition", "TerminologyCapabilities", "ExampleScenario",
]);

const stripVer = (u: string) => u.split("|")[0]!;
// fhirschema resolves both bare resourceTypes ("Patient") and full canonicals.
const normRef = (ref: string) => {
  const u = stripVer(ref);
  return u.includes("://") ? u : `http://hl7.org/fhir/StructureDefinition/${u}`;
};

export default function validator(opts: Opts = {}): Plugin {
  let baseIndex: Map<string, any> | null = null;   // url → raw base SD (cache packages), cached across rebuilds

  return {
    name: "fcc/validator",
    async afterValidate(ctx) {
      const base = await loadBaseIndex(ctx, opts, baseIndex);
      baseIndex = base;

      // In-bundle SDs override the cached base packages.
      const sdByUrl = new Map(base);
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
      const vopts: any = { strict: opts.strict === true };
      if (opts.fhirpath) vopts.fhirpath = opts.fhirpath;
      if (opts.terminology) vopts.terminology = opts.terminology;
      if (opts.referenceResolver) vopts.referenceResolver = opts.referenceResolver;

      const issues: ValidatorIssue[] = [];

      // 1) examples / instances against their profile(s) (+ base resourceType)
      if (opts.examples !== false) {
        for (const r of ctx.resources.values()) {
          if (CONFORMANCE.has(r.resourceType)) continue;
          const d = r.data as any;
          const schemas = ((d.meta?.profile as string[] | undefined) ?? []).map(stripVer).map(resolveSchema).filter(Boolean);
          // fhirschema also resolves data.resourceType + meta.profile internally,
          // so even with no in-bundle profile it validates against the base type.
          let res: any; try { res = fsValidate(vctx, schemas, d, vopts); } catch { continue; }
          for (const i of res?.issues ?? []) issues.push(toIssue(ctx, r, i, "fhirschema"));
        }
      }

      // 2) canonicals: StructureDefinitions must translate to a FHIRSchema
      if (opts.canonicals !== false) {
        for (const r of ctx.resources.values()) {
          if (r.resourceType !== "StructureDefinition") continue;
          try { translate(r.data as any); }
          catch (e) {
            issues.push(toIssue(ctx, r, { severity: "error", code: "translate", path: [], message: `StructureDefinition does not translate: ${(e as Error).message}` }, "fhirschema"));
          }
        }
      }

      // 3) pluggable extra validators
      for (const v of opts.validators ?? []) {
        try { issues.push(...await v(ctx)); } catch (e) { ctx.warn({ severity: "warning", source: "fcc/validator", message: `validator threw: ${(e as Error).message}` }); }
      }

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
    },
  };
}

// Common per-resource fields for an issue (id/title/href).
function resourceBase(r: { id: string; resourceType: string; data: unknown }): Pick<ValidatorIssue, "rid" | "rt" | "fhirId" | "title" | "href"> {
  const d = r.data as Record<string, unknown>;
  const fhirId = (d.id as string | undefined) ?? r.id.split("/").pop() ?? r.id;
  const title = (d.title as string | undefined) ?? (d.name as string | undefined) ?? fhirId;
  return { rid: r.id, rt: r.resourceType, fhirId, title, href: `${r.resourceType}-${fhirId}.html` };
}

function toIssue(_ctx: PluginContext, r: { id: string; resourceType: string; data: unknown }, i: any, validatorName: string): ValidatorIssue {
  return {
    ...resourceBase(r),
    severity: (i.severity ?? "error") as ValidatorIssue["severity"],
    code: String(i.code ?? "?"),
    path: Array.isArray(i.path) ? i.path.join(".") : String(i.path ?? ""),
    message: i.message ? String(i.message) : undefined,
    expected: i.expected !== undefined ? JSON.stringify(i.expected) : undefined,
    got: i.got !== undefined ? JSON.stringify(i.got) : undefined,
    validator: validatorName,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Pluggable FHIRPath-constraint validator. Drop into `validator({ validators:
// [fhirpathConstraints()] })`. Evaluates each profile's element `constraint[]`
// (collected from the generated snapshot) against the instance via the async
// @atomic-ehr/fhirpath engine. This is a SEPARATE pass (not fhirschema's sync
// `fhirpath` hook, which the async engine can't satisfy). Conservative: only an
// explicit `[false]` result is flagged; unsupported FHIRPath functions and
// non-boolean results are skipped, keeping the noise low.

export function fhirpathConstraints(opts: { quiet?: boolean } = {}): (ctx: PluginContext) => Promise<ValidatorIssue[]> {
  return async (ctx) => {
    const { evaluate } = await import("@atomic-ehr/fhirpath");
    const issues: ValidatorIssue[] = [];

    for (const r of ctx.resources.values()) {
      if (CONFORMANCE.has(r.resourceType)) continue;
      const d = r.data as any;
      for (const purl of ((d.meta?.profile as string[] | undefined) ?? []).map(stripVer)) {
        const sd = ctx.byUrl(purl);
        const elements = (sd?.data as any)?.snapshot?.element as any[] | undefined;
        if (!elements) continue;                                  // need a snapshot (run fcc/snapshot first)
        const rootType = (sd!.data as any).type ?? r.resourceType;

        for (const el of elements) {
          const rel = el.path === rootType ? null : el.path.slice(rootType.length + 1);
          if (rel && /[[:]/.test(rel)) continue;                  // skip choice[x] / slice paths
          for (const c of (el.constraint ?? [])) {
            if (!c.expression) continue;
            let nodes: unknown[];
            try { nodes = rel ? await evaluate(rel, { input: d }) : [d]; } catch { continue; }
            for (const node of nodes) {
              let res: unknown;
              try { res = await evaluate(c.expression, { input: node, variables: { resource: d, rootResource: d, context: node } }); }
              catch { continue; }                                  // unsupported fn → skip (don't flag)
              if (Array.isArray(res) && res.length === 1 && res[0] === false) {
                issues.push({ ...resourceBase(r), severity: c.severity === "warning" ? "warning" : "error", code: String(c.key), path: el.path, message: String(c.human ?? c.expression), validator: "fhirpath" });
                break;                                             // one violation per constraint per resource
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
async function loadBaseIndex(ctx: PluginContext, opts: Opts, cached: Map<string, any> | null): Promise<Map<string, any>> {
  if (cached) return cached;
  const m = new Map<string, any>();
  const dir = resolvePath(ctx.config.projectRoot, opts.packagesDir ?? "input-cache/.fhir/packages");
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
