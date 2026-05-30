// @fcc/plugin-site entry. There is ONE ctx — the engine PluginContext. The site
// attaches its flat-namespace fns (loadAll) + opts (enable) onto that ctx, then
// its hooks delegate to ctx.fns.site_core.* with the same ctx. No separate
// render context.
import type { Plugin, PluginContext } from "fcc";
import loadAll from "./loadAll.ts";

type Opts = types.site_core.SiteOpts;

export default function site(opts: Opts = {}): Plugin {
    // Idempotent: attach fns + opts onto the build ctx. ctx.fns / ctx.state live
    // on the TargetState (persist across incremental rebuilds), so this runs its
    // body once per target.
    const attach = (ctx: PluginContext) => {
        if (!ctx.fns.site_core) loadAll(ctx as unknown as Context);
        if (!ctx.state.site) ctx.fns.site_core.enable(ctx, { opts });
    };

    // Order = config order, so list `site()` last to have its writeBundle run
    // after the other emitters.
    return (hooks) => {
        hooks.watchPaths((ctx) => { attach(ctx); return ctx.fns.site_core.watchPaths(ctx); });
        hooks.handleHotUpdate((ctx, { hot }) => { attach(ctx); return ctx.fns.site_core.handleHotUpdate(ctx, { hot }); });
        hooks.writeBundle(async (ctx, { bundle }) => {
            attach(ctx);
            void bundle;                                    // the bundle is just ctx now
            await ctx.fns.site_core.writeBundle(ctx, { pluginCtx: ctx });
        });
    };
}
