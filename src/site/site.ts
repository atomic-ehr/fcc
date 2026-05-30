// @fcc/plugin-site entry. Three steps (writeBundle, watchPaths, handleHotUpdate),
// each a fn(ctx, config, opts). They attach the site's flat-ns fns + opts onto
// the one build ctx (idempotent) and delegate to ctx.fns.site_core.*.
import type { Plugin, PluginContext } from "fcc";
import loadAll from "./loadAll.ts";

type Opts = types.site_core.SiteOpts;

export default function site(opts: Opts = {}): Plugin {
  return [
    { hook: "writeBundle", fn: siteWrite, ...opts },
    { hook: "watchPaths", fn: siteWatch, ...opts },
    { hook: "handleHotUpdate", fn: siteHot, ...opts },
  ];
}

// ctx.fns / ctx.state live on the TargetState (persist across rebuilds), so this
// runs its body once per target.
function attach(ctx: PluginContext, config: Record<string, unknown>) {
  if (!ctx.fns.site_core) loadAll(ctx as unknown as Context);
  if (!ctx.state.site) ctx.fns.site_core.enable(ctx, { opts: config });
}

async function siteWrite(ctx: PluginContext, config: Record<string, unknown>, _opts: { bundle: unknown }): Promise<void> {
  attach(ctx, config);
  await ctx.fns.site_core.writeBundle(ctx, { pluginCtx: ctx });
}

function siteWatch(ctx: PluginContext, config: Record<string, unknown>, _opts: Record<string, never>) {
  attach(ctx, config);
  return ctx.fns.site_core.watchPaths(ctx);
}

function siteHot(ctx: PluginContext, config: Record<string, unknown>, { hot }: { hot: unknown }) {
  attach(ctx, config);
  return ctx.fns.site_core.handleHotUpdate(ctx, { hot });
}
