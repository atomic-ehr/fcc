// Read sushi-config.yaml once at build start, parse the menu tree, render
// to HTML, and hand off via pctx.shared.menu so consumers (plugin-site)
// can pick it up in their writeBundle pass.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export default async function buildStart(ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): Promise<void> {
    const pctx = opts.pluginCtx;
    const o = (ctx.state.menu ?? {}) as types.menu.MenuOpts;
    const configPath = resolve(pctx.config.projectRoot, o.config ?? "sushi-config.yaml");
    let text: string;
    try {
        text = await readFile(configPath, "utf8");
    } catch {
        pctx.warn({ severity: "info", source: "fcc/menu", message: `no sushi-config at ${configPath} — skipping menu` });
        return;
    }

    const tree = ctx.fns.menu.parseMenu(ctx, { text });
    if (tree.length === 0) {
        pctx.warn({ severity: "info", source: "fcc/menu", message: `sushi-config has no menu: section — skipping menu` });
        return;
    }

    const html = ctx.fns.menu.renderMenu(ctx, { tree });
    pctx.shared.menu = { html, tree };
    pctx.warn({
        severity: "info", source: "fcc/menu",
        message: `menu loaded: ${tree.length} top-level item(s) from ${o.config ?? "sushi-config.yaml"}`,
    });
}
