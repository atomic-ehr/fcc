// Render the numbered page-tree forest (from pageTree + numberPages) as the
// unified left-nav: menu pages + artifact groups, each node carrying its FHIR-IG
// sequential number. Structural containers (empty slug / "#"-anchor menu headers,
// artifact groups) become collapsible <details>; leaves become links. Active-page
// highlighting + ancestor-expand is handled client-side by navActiveScript (it
// matches on href basename), so the markup is page-independent.
export default function renderNavTree(ctx: Context, opts: { roots: types.site_core.PageNode[] }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const num = (n?: string) => (n ? `<span class="mr-1.5 tabular-nums text-slate-400">${esc(n)}</span>` : "");

    const leafLink = (node: types.site_core.PageNode): string =>
        node.href
            ? `<a href="${esc(node.href)}" class="block truncate rounded px-2 py-0.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-800" title="${esc(node.title)}">${num(node.number)}${esc(node.title)}</a>`
            : `<span class="block truncate px-2 py-0.5 text-sm text-slate-500">${num(node.number)}${esc(node.title)}</span>`;

    const inline = (node: types.site_core.PageNode): string => {
        if (node.children.length === 0) return leafLink(node);
        const isOpen = node.children.length <= 25;
        // A header with its own page (href) links; otherwise it's just a toggle label.
        const head = node.href
            ? `<a href="${esc(node.href)}" class="hover:text-sky-700" title="${esc(node.title)}">${num(node.number)}${esc(node.title)}</a>`
            : `<span>${num(node.number)}${esc(node.title)}</span>`;
        return `<details class="group-block" ${isOpen ? "open" : ""}>
            <summary class="cursor-pointer list-none rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                <span class="inline-flex min-w-0 items-center gap-1.5"><span class="truncate">${head}</span><span class="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500">${node.children.length}</span></span>
            </summary>
            <ul class="mt-1 space-y-0.5 border-l border-slate-200 pl-2">${node.children.map(li).join("")}</ul>
        </details>`;
    };
    const li = (node: types.site_core.PageNode): string => `<li>${inline(node)}</li>`;

    return `<ul class="space-y-1">${opts.roots.map(li).join("")}</ul>`;
}
