import { isAuthored, materializeAuthored } from "fcc";
import type { Loader, LoadOutput, ResolvedConfig, Target } from "fcc";

export default function ts(): Loader {
  return {
    name: "fcc/ts",
    extensions: [".ts"],
    async load(ctx, { file }): Promise<LoadOutput | null> {
      // Dynamic import — Bun handles .ts natively.
      // Bust the ESM cache on incremental rebuilds (ctx.cycle > 1).
      const url = ctx.cycle > 1 ? `${file}?t=${Date.now()}` : file;
      const mod = await import(url);
      const def = mod.default;
      if (!def) {
        ctx.warn({ severity: "warning", path: file, message: `no default export` });
        return null;
      }
      if (!isAuthored(def)) {
        ctx.warn({ severity: "warning", path: file, message: `default export is not an fcc authored object` });
        return null;
      }
      const { resource } = materializeAuthored(def, ctx.config as ResolvedConfig, ctx.target as Target);
      resource.source = { kind: "ts", path: file };
      return { resources: [resource] };
    },
  };
}
