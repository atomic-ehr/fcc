import type { Plugin, PluginContext } from "fcc";
import { generateSnapshot } from "@atomic-ehr/fhirschema";
import { resolve } from "node:path";

// Generate StructureDefinition snapshots via @atomic-ehr/fhirschema (v2): merge
// each profile's differential against its base-definition chain into a full
// element set. The resolver indexes the IG's dependency packages (the FHIR
// install cache) plus the in-bundle SDs.
export default function snapshot(opts: { packagesDir?: string; quiet?: boolean } = {}): Plugin {
  return [{ hook: "afterValidate", fn: snapshotFn, ...opts }];
}

async function snapshotFn(ctx: PluginContext, config: Record<string, unknown>, _opts: Record<string, never>): Promise<void> {
  const base = await loadBaseIndex(ctx, config.packagesDir as string | undefined);
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

// Base index (dependency packages) is stable across rebuilds — cache it in
// ctx.shared (the fn is stateless; config is data, state lives on ctx).
async function loadBaseIndex(ctx: PluginContext, packagesDir: string | undefined): Promise<Map<string, any>> {
  const cached = (ctx.shared as any).__snapBase as Map<string, any> | undefined;
  if (cached) return cached;
  const m = new Map<string, any>();
  const dir = resolve(ctx.config.projectRoot, packagesDir ?? "input-cache/.fhir/packages");
  const deps = ((ctx.config as any).deps ?? {}) as Record<string, string>;
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
  (ctx.shared as any).__snapBase = m;
  return m;
}
