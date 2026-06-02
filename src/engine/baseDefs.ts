import { resolve } from "node:path";
import type { PluginContext } from "./types.ts";

// Eagerly load the base StructureDefinition bodies a profile build resolves
// against — FHIR core plus every declared dependsOn — from the FHIR package
// cache, keyed by canonical url. The snapshot and validator plugins both need
// this identical base set (a profile's differential is merged / validated
// against its base chain), so the loader lives in the engine and is cached on
// ctx.shared per packagesDir — read once per build, shared by both plugins.
export async function loadBaseStructureDefinitions(ctx: PluginContext, packagesDir?: string): Promise<Map<string, any>> {
  const key = `__baseSDs:${packagesDir ?? ""}`;
  const cached = (ctx.shared as Record<string, unknown>)[key] as Map<string, any> | undefined;
  if (cached) return cached;

  const m = new Map<string, any>();
  const dir = resolve(ctx.config.projectRoot, packagesDir ?? "input-cache/.fhir/packages");
  const wanted = new Set<string>(["hl7.fhir.r4.core#4.0.1"]);
  for (const [pkg, version] of Object.entries(((ctx.config as { deps?: Record<string, string> }).deps ?? {}))) wanted.add(`${pkg}#${version}`);
  for (const pv of wanted) {
    try {
      for await (const rel of new Bun.Glob("StructureDefinition-*.json").scan({ cwd: resolve(dir, pv, "package") })) {
        try {
          const d = await Bun.file(resolve(dir, pv, "package", rel)).json() as { url?: string };
          if (d?.url && !m.has(d.url)) m.set(d.url, d);
        } catch { /* skip unreadable */ }
      }
    } catch { /* package dir absent */ }
  }
  (ctx.shared as Record<string, unknown>)[key] = m;
  return m;
}
