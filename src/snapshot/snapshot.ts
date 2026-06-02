import type { Plugin, PluginContext } from "fcc";
import { loadBaseStructureDefinitions } from "fcc";
import { generateSnapshot } from "@atomic-ehr/fhirschema";

// Generate StructureDefinition snapshots via @atomic-ehr/fhirschema (v2): merge
// each profile's differential against its base-definition chain into a full
// element set. The resolver indexes the IG's dependency packages (the FHIR
// install cache) plus the in-bundle SDs.
export default function snapshot(opts: { packagesDir?: string; quiet?: boolean } = {}): Plugin {
  return [{ hook: "afterValidate", fn: snapshotFn, ...opts }];
}

async function snapshotFn(ctx: PluginContext, config: Record<string, unknown>, _opts: Record<string, never>): Promise<void> {
  const base = await loadBaseStructureDefinitions(ctx, config.packagesDir as string | undefined);
  // In-bundle SDs override the cached packages (current build wins).
  const byUrl = new Map(base);
  for (const r of ctx.byType.StructureDefinition) {
    if ((r.data as any)?.url) byUrl.set((r.data as any).url, r.data);
  }
  const resolver = (input: { canonical: string }) => byUrl.get(input.canonical);

  let made = 0, failed = 0;
  for (const r of ctx.byType.StructureDefinition) {
    const d = r.data as Record<string, unknown>;
    if (d.snapshot) continue;
    try {
      const out = await generateSnapshot(d as any, { resolver });
      const snap = (out as any)?.snapshot;
      if (snap?.element?.length) {
        // fhirschema's FHIRSchema round-trip represents "not required + not array"
        // as absence, so purely-inherited 0..1 elements come back with no min/max.
        // The inverse is exact (missing min ⟺ 0, missing max ⟺ "1"; 1.., ..* survive),
        // so backfill the defaults.
        for (const e of snap.element as Array<{ min?: number; max?: string }>) {
          if (e.min === undefined) e.min = 0;
          if (e.max === undefined) e.max = "1";
        }
        d.snapshot = snap; made++;
      }
    } catch { failed++; }
  }
  if (!config.quiet) {
    ctx.warn({
      severity: "info", source: "fcc/snapshot",
      message: `generated ${made} snapshot(s)${failed ? `; ${failed} kept differential (base unresolved)` : ""}`,
    });
  }
}
