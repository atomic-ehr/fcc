// Top-nav wrapper. Holds one `$openMenu` signal that names the currently-open
// dropdown (empty string = none). Click-outside the wrapper closes any open
// menu; pressing Escape (window-scope) closes too.
export default function renderMenu(ctx: Context, opts: { tree: types.menu.MenuNode[] }): string {
    if (!opts.tree.length) return "";
    const items = opts.tree
        .map((n, i) => ctx.fns.menu.renderMenuItem(ctx, { node: n, key: `m${i}` }))
        .join("");
    return `<nav
        class="bg-sky-900/70"
        data-signals="{openMenu: ''}"
        data-on-click__outside="$openMenu = ''"
        data-on-keydown__window="evt.key === 'Escape' && ($openMenu = '')"
    >
        <div class="relative mx-auto flex max-w-screen-2xl flex-wrap items-stretch gap-1 px-4 lg:px-8">
            ${items}
        </div>
    </nav>`;
}
