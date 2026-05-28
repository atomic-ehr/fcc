// Only file that imports siblings. Builds ctx.fns.menu.
import htmlEscape from "./htmlEscape.ts";
import parseMenu from "./parseMenu.ts";
import renderMenu from "./renderMenu.ts";
import renderMenuItem from "./renderMenuItem.ts";
import buildStart from "./buildStart.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).menu = {
        htmlEscape, parseMenu, renderMenu, renderMenuItem, buildStart,
    };
}
