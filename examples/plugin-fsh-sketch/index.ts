// @ts-nocheck
//
// Paper sketch of @fcc/plugin-fsh.
// Shows the contract a source plugin must implement against the API in
// ../../design.md. Not wired up to fcc core (which doesn't exist yet).

import { plugin } from "fcc";

type Options = {
  /** Optional sub-root inside the source dir, e.g. "profiles". */
  root?: string;
  /** Treat `// @fcc-if fhir >= X` text pragmas before handing to sushi. */
  preprocess?: boolean;
};

export default function fshPlugin(opts: Options = {}) {
  return plugin("fcc/fsh", {
    /**
     * Stage 1: file discovery.
     * The core walks the source dir and asks each loader which extensions
     * it claims. fcc routes matching files into `load`.
     */
    extensions: [".fsh"],

    /**
     * Stage 2: load.
     *
     * For .fsh files we batch the whole source dir into one sushi run —
     * FSH symbols (Aliases, Profiles, Instances) cross-reference each
     * other and sushi expects to see them together.
     *
     * We cache the sushi outcome by hash(all .fsh contents + target.fhir),
     * so dev-mode rebuilds skip sushi when nothing relevant changed.
     */
    async load(id, ctx) {
      if (!id.endsWith(".fsh")) return null;

      const batch = ctx.cache.get(["fsh-batch", ctx.target.name]);
      const compiled = batch ?? (await compileBatch(ctx, opts));
      ctx.cache.set(["fsh-batch", ctx.target.name], compiled);

      const file = compiled.byPath.get(id);
      if (!file) return null;

      return {
        // one .fsh can produce many Resources (Profile + Instances + VS)
        resources: file.resources.map((r) => ({
          id:           `${r.resourceType}/${r.id}`,
          resourceType: r.resourceType,
          url:          r.url,
          version:      r.version,
          data:         r,
          source:       { kind: "fsh", path: id, symbol: r.id },
          deps:         new Set(extractCanonicalRefs(r)),
        })),
      };
    },

    /**
     * Stage 3: preprocess.
     *
     * Text-pragma expansion. We run before plugin-preprocess sees the
     * structured `when()` macros — so by the time the resource enters
     * `transform`, both forms of conditional are gone.
     */
    preprocess(resource, ctx) {
      if (resource.source.kind !== "fsh") return null;
      if (!opts.preprocess) return null;
      // (handled at compileBatch time — left here for the contract surface)
      return resource;
    },

    /**
     * Dev mode: on .fsh change, invalidate the whole sushi batch.
     * Conservative but correct — FSH symbols are global within a project.
     */
    handleHotUpdate(hot) {
      if (!hot.file.endsWith(".fsh")) return;
      hot.ctx.cache.delete(["fsh-batch", hot.ctx.target.name]);
      return hot.ctx.query("StructureDefinition", { sourceKind: "fsh" })
        .concat(hot.ctx.query("ValueSet",     { sourceKind: "fsh" }))
        .concat(hot.ctx.query("CodeSystem",   { sourceKind: "fsh" }))
        .concat(hot.ctx.query("Instance",     { sourceKind: "fsh" }));
    },
  });
}

// ---------------------------------------------------------------------------

async function compileBatch(ctx, opts) {
  // 1. Read every .fsh in the configured source dir.
  const files = await ctx.glob("**/*.fsh", { cwd: opts.root });

  // 2. Optional textual preprocess: drop blocks that don't match target.
  const sources = await Promise.all(files.map(async (f) => ({
    path: f,
    text: opts.preprocess ? stripPragmas(await ctx.read(f), ctx.target) : await ctx.read(f),
  })));

  // 3. Call fsh-sushi as a library.
  const sushi = await import("fsh-sushi");
  const tank  = sushi.fhirdefs.FHIRDefinitions ? new sushi.fhirdefs.FHIRDefinitions() : sushi.makeTank();
  for (const d of await loadDeps(ctx)) sushi.loadDeps(tank, d);
  const result = await sushi.exportFHIR(sources, tank, {
    fhirVersion: ctx.target.fhir,
    canonical:   ctx.config.canonical,
    version:     ctx.config.version,
  });

  // 4. Group output by .fsh file (sushi knows which file each symbol came from).
  const byPath = new Map<string, { resources: any[] }>();
  for (const r of [...result.profiles, ...result.extensions, ...result.valueSets,
                   ...result.codeSystems, ...result.instances]) {
    const path = result.sourceMap.get(r.id) ?? "<unknown>";
    if (!byPath.has(path)) byPath.set(path, { resources: [] });
    byPath.get(path)!.resources.push(r);
  }

  // 5. Forward sushi diagnostics to fcc.
  for (const m of result.messages) {
    ctx.warn({ severity: m.severity, path: m.location, message: m.message });
  }

  return { byPath };
}

function stripPragmas(text: string, target: { fhir: string }): string {
  // Strip `// @fcc-if fhir >= X` ... `// @fcc-end` blocks that don't match.
  // Real implementation: a tiny line-oriented state machine.
  return text;
}

function extractCanonicalRefs(r: any): string[] {
  // Walk the FHIR resource, collect every `canonical` / `Reference` value.
  // Used to populate Resource.deps so the graph and dirty-tracking work.
  return [];
}

async function loadDeps(_ctx) { return []; }
