// @fcc/plugin-site entry. Builds a per-build Context, loads every namespace
// (loadAll), runs enable, then delegates the fcc Plugin hooks to ctx.fns.site_core.
// The only file outside a namespace's loadFns allowed to import siblings.
import type { Plugin } from "fcc";
import loadAll from "./loadAll.ts";

type Opts = types.site_core.SiteOpts;

export default function site(opts: Opts = {}): Plugin {
    const ctx = makeFreshContext();
    loadAll(ctx);
    ctx.fns.site_core.enable(ctx, { opts });

    // Register hooks. Order = config order, so list `site()` last to have its
    // writeBundle run after other emitters.
    return (hooks) => {
        hooks.watchPaths((cfg) => {
            (ctx as any).cfg = cfg;
            return ctx.fns.site_core.watchPaths(ctx);
        });
        hooks.handleHotUpdate((hot) => {
            return ctx.fns.site_core.handleHotUpdate(ctx, { hot });
        });
        hooks.writeBundle(async (bundle, pctx) => {
            (ctx as any).cfg    = pctx.config;
            (ctx as any).target = pctx.target;
            (ctx as any).bundle = bundle;
            await ctx.fns.site_core.writeBundle(ctx, { pluginCtx: pctx });
        });
    };
}

function makeFreshContext(): Context {
    return {
        cfg:    {} as Context["cfg"],
        target: {} as Context["target"],
        bundle: {} as Context["bundle"],
        notes:  undefined,
        state:  {},
        env:    process.env as Record<string, string | undefined>,
        fns:    {} as FnsRegistry,
    };
}
