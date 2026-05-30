// Plugin entry: attaches ctx.fns.menu + opts onto the build ctx, then delegates.
// One ctx (the engine PluginContext).
import type { Plugin, PluginContext } from "fcc";
import loadFns from "./loadFns.ts";

type Opts = {
    config?: string;
};

export default function menu(opts: Opts = {}): Plugin {
    const attach = (ctx: PluginContext) => {
        if (!ctx.fns.menu) loadFns(ctx as unknown as Context);
        if (!ctx.state.menu) ctx.state.menu = { ...opts };
    };

    return (hooks) => hooks.buildStart(async (ctx) => {
        attach(ctx);
        await ctx.fns.menu.buildStart(ctx, { pluginCtx: ctx });
    });
}
