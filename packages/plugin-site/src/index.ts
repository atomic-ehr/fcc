// Plugin entry. Builds a per-build Context, runs loadFns to populate
// ctx.fns.site, then delegates the fcc Plugin hooks to fns in the registry.
// This is the *only* place outside loadFns where sibling imports are allowed:
// here we import loadFns itself.

import type { Plugin } from "fcc";
import loadFns from "./loadFns.ts";

type Opts = {
    pagecontent?: string;
    introNotes?: string;
    out?: string;
};

export default function site(opts: Opts = {}): Plugin {
    // One Context shared across hooks for this plugin instance. The fcc
    // PluginContext gets injected per-hook into ctx via writeBundle/etc.
    const ctx = makeFreshContext();
    loadFns(ctx);
    ctx.state.site = { ...opts };

    return {
        name: "fcc/site",
        enforce: "post",

        watchPaths(cfg) {
            (ctx as any).cfg = cfg;
            return ctx.fns.site.watchPaths(ctx);
        },

        handleHotUpdate(hot) {
            return ctx.fns.site.handleHotUpdate(ctx, { hot });
        },

        async writeBundle(bundle, pctx) {
            (ctx as any).cfg    = pctx.config;
            (ctx as any).target = pctx.target;
            (ctx as any).bundle = bundle;
            await ctx.fns.site.writeBundle(ctx, { pluginCtx: pctx });
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
