// @fcc/plugin-site entry. Builds a per-build Context, loads every namespace
// (loadAll), runs enable, then delegates the fcc Plugin hooks to ctx.fns.core.
// The only file outside a namespace's loadFns allowed to import siblings.
import type { Plugin } from "fcc";
import loadAll from "./loadAll.ts";

type Opts = types.core.SiteOpts;

export default function site(opts: Opts = {}): Plugin {
    const ctx = makeFreshContext();
    loadAll(ctx);
    ctx.fns.core.enable(ctx, { opts });

    return {
        name: "fcc/site",
        enforce: "post",
        watchPaths(cfg) {
            (ctx as any).cfg = cfg;
            return ctx.fns.core.watchPaths(ctx);
        },
        handleHotUpdate(hot) {
            return ctx.fns.core.handleHotUpdate(ctx, { hot });
        },
        async writeBundle(bundle, pctx) {
            (ctx as any).cfg    = pctx.config;
            (ctx as any).target = pctx.target;
            (ctx as any).bundle = bundle;
            await ctx.fns.core.writeBundle(ctx, { pluginCtx: pctx });
        },
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
