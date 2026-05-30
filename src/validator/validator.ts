import { translate, validate as fsValidate } from "@atomic-ehr/fhirschema";
import type { Plugin, PluginContext } from "fcc";
import { resolve as resolvePath } from "node:path";

// The validation plugin (explicitly enabled). It runs a composed list of
// validators and writes their results into `ctx.issues` (per resource — the
// world's validation state, rendered as errors.html with a top-bar QA chip).
//
// A validator is a DESCRIPTOR — a function plus its config as plain data:
//
//   validator({ validators: [
//     { fn: structural },
//     { fn: schema, packagesDir: "…/.fhir/packages" },
//     { fn: fhirpathConstraints },
//   ] })
//
// The house signature is `fn(ctx, config, opts)`: `ctx` is the world (+ scratch
// state in `ctx.shared`), `config` is the descriptor's static data, `opts` is the
// per-call payload ({} here). Because config is data (not a closure), per-resource
// caches live in `ctx.shared`, gated by `ctx.changedIds` → incremental validation:
// only the changed closure is re-validated, the rest reused.

export type ValidatorIssue = {
  rid: string; rt: string; fhirId: string; title: string; href: string;
  severity: "error" | "warning" | "information";
  code: string; path: string; message?: string; expected?: string; got?: string;
  validator: string;
};

/** A validator function: `(ctx, config, opts) => issues`. Always async. */
export type ValidatorFn = (ctx: PluginContext, config: Record<string, unknown>, opts: Record<string, never>) => Promise<ValidatorIssue[]>;
/** A validator descriptor — the fn plus its config, spread inline. */
export type Validator = { fn: ValidatorFn } & Record<string, unknown>;

type Opts = { validators?: Validator[]; quiet?: boolean };

export default function validator(opts: Opts = {}): Plugin {
  return [{ hook: "afterValidate", fn: validateFn, validators: opts.validators ?? [{ fn: structural }], quiet: opts.quiet }];
}

async function validateFn(ctx: PluginContext, config: Record<string, unknown>, _opts: Record<string, never>): Promise<void> {
  const validators = (config.validators ?? []) as Validator[];
  const results = await Promise.all(validators.map(v =>
    v.fn(ctx, v, {}).catch((e: Error) => {
      ctx.warn({ severity: "warning", source: "fcc/validator", message: `validator threw: ${e.message}` });
      return [] as ValidatorIssue[];
    }),
  ));
  const all = results.flat();

  // Assemble the per-resource map — the world's ctx.issues.
  ctx.issues.clear();
  for (const i of all) (ctx.issues.get(i.rid) ?? ctx.issues.set(i.rid, []).get(i.rid)!).push(i);

  const errors = all.filter(i => i.severity === "error").length;
  const warnings = all.filter(i => i.severity === "warning").length;
  const resources = ctx.issues.size;
  (ctx.shared as any).validate = { issues: all, summary: { errors, warnings, resources, total: all.length } };
  if (!config.quiet) {
    ctx.warn({
      severity: errors ? "warning" : "info", source: "fcc/validator",
      message: `validated: ${errors} error(s), ${warnings} warning(s) across ${resources} resource(s) → errors.html`,
    });
  }
}

// ── per-resource incremental engine ──────────────────────────────────────────
// Reuse cached issues for unchanged resources; recompute only the changed
// closure; evict dropped. The cache lives in ctx.shared (persists across builds).
async function perResource(
  ctx: PluginContext,
  cacheKey: string,
  targets: R[],
  compute: (r: R) => ValidatorIssue[] | Promise<ValidatorIssue[]>,
): Promise<ValidatorIssue[]> {
  const cache = (((ctx.shared as any)[cacheKey] ??= new Map<string, ValidatorIssue[]>())) as Map<string, ValidatorIssue[]>;
  const changed = ctx.changedIds;
  const out: ValidatorIssue[] = [];
  for (const r of targets) {
    if (changed && !changed.has(r.id) && cache.has(r.id)) { out.push(...cache.get(r.id)!); continue; }
    const issues = await compute(r);
    cache.set(r.id, issues);
    out.push(...issues);
  }
  for (const id of [...cache.keys()]) if (!ctx.resources.has(id)) cache.delete(id);   // evict dropped
  return out;
}

// ── shared helpers ───────────────────────────────────────────────────────────

const CONFORMANCE = new Set([
  "Page",   // non-FHIR (markdown page resource) — skip in instance validators
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

// ── structural — lite lint; global (dup checks need the whole set), cheap, full ─

export async function structural(ctx: PluginContext, _config: Record<string, unknown>, _opts: Record<string, never>): Promise<ValidatorIssue[]> {
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
}

// ── schema — @atomic-ehr/fhirschema; per-resource, incremental ───────────────

export async function schema(ctx: PluginContext, config: Record<string, unknown>, _opts: Record<string, never>): Promise<ValidatorIssue[]> {
  const base = await loadBaseIndex(ctx, config.packagesDir as string | undefined);
  const sdByUrl = new Map(base);
  for (const r of ctx.byType.StructureDefinition) if ((r.data as any)?.url) sdByUrl.set((r.data as any).url, r.data);
  const tcache = new Map<string, any>();
  const resolveSchema = (ref: string) => {
    const url = normRef(ref);
    if (tcache.has(url)) return tcache.get(url);
    const sd = sdByUrl.get(url);
    let s: any; try { s = sd ? translate(sd) : undefined; } catch { s = undefined; }
    tcache.set(url, s);
    return s;
  };
  const vctx = { resolve: resolveSchema };

  const targets = [...ctx.resources.values()].filter(r => !CONFORMANCE.has(r.resourceType) || r.resourceType === "StructureDefinition");
  return perResource(ctx, "__vc_schema", targets, (r) => {
    if (r.resourceType === "StructureDefinition") {
      try { translate(r.data as any); return []; }
      catch (e) { return [mkIssue(r, { severity: "error", code: "translate", message: `StructureDefinition does not translate: ${(e as Error).message}` }, "schema")]; }
    }
    const d = r.data as any;
    const schemas = ((d.meta?.profile as string[] | undefined) ?? []).map(stripVer).map(resolveSchema).filter(Boolean);
    let res: any; try { res = fsValidate(vctx, schemas, d, { strict: false }); } catch { return []; }
    return (res?.issues ?? []).map((i: any) => mkIssue(r, {
      severity: (i.severity ?? "error"), code: String(i.code ?? "?"),
      path: Array.isArray(i.path) ? i.path.join(".") : String(i.path ?? ""),
      message: i.message, expected: i.expected, got: i.got,
    }, "schema"));
  });
}

// ── fhirpathConstraints — @atomic-ehr/fhirpath invariants; per-resource, incremental ─

export async function fhirpathConstraints(ctx: PluginContext, _config: Record<string, unknown>, _opts: Record<string, never>): Promise<ValidatorIssue[]> {
  const { evaluate } = await import("@atomic-ehr/fhirpath");
  const instances = [...ctx.resources.values()].filter(r => !CONFORMANCE.has(r.resourceType));
  return perResource(ctx, "__vc_fhirpath", instances, async (r) => {
    const issues: ValidatorIssue[] = [];
    const d = r.data as any;
    for (const purl of ((d.meta?.profile as string[] | undefined) ?? []).map(stripVer)) {
      const sd = ctx.byUrl(purl);
      const elements = (sd?.data as any)?.snapshot?.element as any[] | undefined;
      if (!elements) continue;
      const rootType = (sd!.data as any).type ?? r.resourceType;
      for (const el of elements) {
        const rel = el.path === rootType ? null : el.path.slice(rootType.length + 1);
        if (rel && /[[:]/.test(rel)) continue;
        for (const c of (el.constraint ?? [])) {
          if (!c.expression) continue;
          let nodes: unknown[];
          try { nodes = rel ? await evaluate(rel, { input: d }) : [d]; } catch { continue; }
          for (const node of nodes) {
            let res: unknown;
            try { res = await evaluate(c.expression, { input: node, variables: { resource: d, rootResource: d, context: node } }); }
            catch { continue; }
            if (Array.isArray(res) && res.length === 1 && res[0] === false) {
              issues.push(mkIssue(r, { severity: c.severity === "warning" ? "warning" : "error", code: String(c.key), path: el.path, message: String(c.human ?? c.expression) }, "fhirpath"));
              break;
            }
          }
        }
      }
    }
    return issues;
  });
}

// Index base StructureDefinitions from the FHIR package cache. Cached in
// ctx.shared (the validator fns are stateless — config is data, state is in ctx).
async function loadBaseIndex(ctx: PluginContext, packagesDir: string | undefined): Promise<Map<string, any>> {
  const cached = (ctx.shared as any).__vc_baseIndex as Map<string, any> | undefined;
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
  (ctx.shared as any).__vc_baseIndex = m;
  return m;
}
