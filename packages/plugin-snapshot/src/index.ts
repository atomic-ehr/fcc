import type { Plugin } from "fcc";

// v0: no real snapshot expansion. We just leave .differential as-is and
// emit a diagnostic so callers know snapshots are missing.
export default function snapshot(opts: { quiet?: boolean } = {}): Plugin {
  return {
    name: "fcc/snapshot",
    async afterValidate(ctx) {
      if (opts.quiet) return;
      let count = 0;
      for (const r of ctx.resources.values()) {
        if (r.resourceType !== "StructureDefinition") continue;
        const d = r.data as Record<string, unknown>;
        if (d.snapshot) continue;
        count++;
      }
      if (count > 0) {
        ctx.warn({
          severity: "info", source: "fcc/snapshot",
          message: `${count} StructureDefinition(s) without snapshot (v0 emits differential only)`,
        });
      }
    },
  };
}
