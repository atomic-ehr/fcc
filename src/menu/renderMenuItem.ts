// One menu item — plain link or Datastar-driven dropdown. `opts.key` is the
// unique identifier compared against the wrapper's $openMenu signal.
export default function renderMenuItem(
    ctx: Context,
    opts: { node: types.menu.MenuNode; key: string },
): string {
    const esc = (s: string) => ctx.fns.menu.htmlEscape(ctx, { s });
    const { node, key } = opts;
    const label = esc(node.label);

    if (node.children.length === 0) {
        return `<a href="${esc(node.href)}" class="border-b-2 border-transparent px-3 py-2 text-sm text-sky-100 hover:border-sky-200 hover:text-white">${label}</a>`;
    }

    const items = node.children.map(c =>
        `<a href="${esc(c.href)}" class="block whitespace-nowrap px-3 py-1.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-800">${esc(c.label)}</a>`,
    ).join("");

    // Single-quoted string in JS so the attribute's surrounding double quotes survive.
    const k = `'${key.replace(/'/g, "\\'")}'`;
    return `<div class="relative">
        <button
            type="button"
            class="flex items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm text-sky-100 hover:border-sky-200 hover:text-white"
            data-on-click="$openMenu = $openMenu === ${k} ? '' : ${k}"
            data-attr-aria-expanded="$openMenu === ${k}"
        >
            ${label}
            <span class="text-[10px]">▾</span>
        </button>
        <div
            class="absolute left-0 top-full z-30 min-w-[16rem] rounded-b border border-slate-200 bg-white py-1 shadow-lg"
            data-show="$openMenu === ${k}"
            style="display: none"
        >
            ${items}
        </div>
    </div>`;
}
