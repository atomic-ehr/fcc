// Render the menu tree as a flat row of links with `<details>`-based
// dropdowns for items that have children. Links whose href starts with `#`
// are treated as anchor-only (no navigation) — used by SUSHI as dropdown
// headings.
export default function renderMenu(ctx: Context, opts: { tree: types.menu.MenuNode[] }): string {
    if (!opts.tree.length) return "";
    return `<nav class="bg-sky-900/70">
        <div class="mx-auto flex max-w-screen-2xl flex-wrap items-stretch gap-1 px-4 lg:px-8">
            ${opts.tree.map(n => ctx.fns.menu.renderMenuItem(ctx, { node: n })).join("")}
        </div>
    </nav>`;
}
