import type { Plugin } from "fcc";
import { generateSnapshot } from "@atomic-ehr/fhirschema";
import { resolve } from "node:path";

// Generate StructureDefinition snapshots via @atomic-ehr/fhirschema (v2): merge
// each profile's differential against its base-definition chain into a full
// element set. The resolver indexes the IG's dependency packages (the FHIR
// install cache) plus the in-bundle SDs, so derived US-Core-on-US-Core profiles
// resolve to the current build's definitions.
export default function snapshot(opts: { packagesDir?: string; quiet?: boolean } = {}): Plugin {
  // Base index (dependency packages) is stable across incremental rebuilds — cache it.
  let baseIndex: Map<string, any> | null = null;

  async function loadBaseIndex(ctx: any): Promise<Map<string, any>> {
    if (baseIndex) return baseIndex;
    const m = new Map<string, any>();
    const dir = resolve(ctx.config.projectRoot, opts.packagesDir ?? "input-cache/.fhir/packages");
    const deps = (ctx.config.deps ?? {}) as Record<string, string>;
    // Always include FHIR R4 core; then each declared dependency at its version.
    const wanted = new Set<string>(["hl7.fhir.r4.core#4.0.1"]);
    for (const [pkg, version] of Object.entries(deps)) wanted.add(`${pkg}#${version}`);
    for (const pv of wanted) {
      try {
        for await (const rel of new Bun.Glob("StructureDefinition-*.json").scan({ cwd: resolve(dir, pv, "package") })) {
          try {
            const d = await Bun.file(resolve(dir, pv, "package", rel)).json();
            if (d?.url && !m.has(d.url)) m.set(d.url, d);
          } catch { /* skip unreadable */ }
        }
      } catch { /* package dir absent */ }
    }
    baseIndex = m;
    return m;
  }

  return (hooks) => hooks.afterValidate(async (ctx) => {
      const base = await loadBaseIndex(ctx);
      // In-bundle SDs override the cached packages (current build wins).
      const byUrl = new Map(base);
      for (const r of ctx.resources.values()) {
        if (r.resourceType === "StructureDefinition" && (r.data as any)?.url) byUrl.set((r.data as any).url, r.data);
      }
      const resolver = (input: { canonical: string }) => byUrl.get(input.canonical);

      let made = 0, failed = 0;
      for (const r of ctx.resources.values()) {
        if (r.resourceType !== "StructureDefinition") continue;
        const d = r.data as Record<string, unknown>;
        if (d.snapshot) continue;
        try {
          const out = await generateSnapshot(d as any, { resolver });
          const snap = (out as any)?.snapshot;
          if (snap?.element?.length) {
            // fhirschema's FHIRSchema round-trip represents "not required + not
            // array" as absence, so purely-inherited 0..1 elements come back with
            // no min/max. The inverse is exact (missing min ⟺ 0, missing max ⟺ "1";
            // 1.., ..* survive as required/array), so backfill the defaults.
            for (const e of snap.element as Array<{ min?: number; max?: string }>) {
              if (e.min === undefined) e.min = 0;
              if (e.max === undefined) e.max = "1";
            }
            d.snapshot = snap; made++;
          }
        } catch { failed++; }
      }
      if (!opts.quiet) {
        ctx.warn({
          severity: "info", source: "fcc/snapshot",
          message: `generated ${made} snapshot(s)${failed ? `; ${failed} kept differential (base unresolved)` : ""}`,
        });
      }
  });
}
