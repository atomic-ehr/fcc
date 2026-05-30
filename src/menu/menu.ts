// Plugin entry: a single buildStart step. The fn attaches ctx.fns.menu + opts
// onto the build ctx (idempotent), then renders the menu. One ctx.
import type { Plugin, PluginContext } from "fcc";
import loadFns from "./loadFns.ts";

type Opts = { config?: string };

export default function menu(opts: Opts = {}): Plugin {
  return [{ hook: "buildStart", fn: menuFn, configPath: opts.config }];
}

async function menuFn(ctx: PluginContext, config: Record<string, unknown>, _opts: Record<string, never>): Promise<void> {
  if (!ctx.fns.menu) loadFns(ctx as unknown as Context);
  if (!ctx.state.menu) ctx.state.menu = { config: config.configPath };
  await ctx.fns.menu.buildStart(ctx, { pluginCtx: ctx });
}
