// One menu item — a plain link or a CSS-only dropdown via <details>.
export default function renderMenuItem(ctx: Context, opts: { node: types.menu.MenuNode }): string {
    const esc = (s: string) => ctx.fns.menu.htmlEscape(ctx, { s });
    const node = opts.node;
    const label = esc(node.label);

    if (node.children.length === 0) {
        const href = node.href.startsWith("#") ? node.href : node.href;
        return `<a href="${esc(href)}" class="border-b-2 border-transparent px-3 py-2 text-sm text-sky-100 hover:border-sky-200 hover:text-white">${label}</a>`;
    }

    // Dropdown — anchor-only parents get no own page; children listed inside.
    const items = node.children.map(c => {
        const childLabel = esc(c.label);
        return `<a href="${esc(c.href)}" class="block whitespace-nowrap px-3 py-1.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-800">${childLabel}</a>`;
    }).join("");

    return `<details class="group/menu relative">
        <summary class="cursor-pointer list-none border-b-2 border-transparent px-3 py-2 text-sm text-sky-100 hover:border-sky-200 hover:text-white">
            ${label} <span class="text-[10px]">▾</span>
        </summary>
        <div class="absolute left-0 z-30 mt-0 min-w-[14rem] rounded-b border border-slate-200 bg-white py-1 shadow-lg">
            ${items}
        </div>
    </details>`;
}
