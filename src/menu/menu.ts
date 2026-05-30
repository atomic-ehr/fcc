// Plugin entry: assembles ctx.fns.menu, then delegates fcc Plugin hooks.
import type { Plugin } from "fcc";
import loadFns from "./loadFns.ts";

type Opts = {
    config?: string;
};

export default function menu(opts: Opts = {}): Plugin {
    const ctx = makeFreshContext();
    loadFns(ctx);
    ctx.state.menu = { ...opts };

    return (hooks) => hooks.buildStart(async (pctx) => {
        (ctx as any).cfg    = pctx.config;
        (ctx as any).target = pctx.target;
        await ctx.fns.menu.buildStart(ctx, { pluginCtx: pctx });
    });
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
