export default function renderSidebarGroup(
    ctx: Context,
    opts: { label: string; list: types.fcc.Resource[]; anchor: string; open?: boolean },
): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const isOpen = (opts.open ?? true) && opts.list.length <= 25;
    const sorted = opts.list.slice().sort((a, b) =>
        ctx.fns.site.idOf(ctx, { resource: a }).localeCompare(ctx.fns.site.idOf(ctx, { resource: b })),
    );
    const items = sorted.map(r => {
        const href = ctx.fns.site.pageHref(ctx, { resource: r });
        const title = esc(ctx.fns.site.titleOf(ctx, { resource: r }));
        const label = esc(ctx.fns.site.shortLabel(ctx, { resource: r }));
        return `
            <li>
                <a href="${href}" class="block truncate rounded px-2 py-0.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-800" title="${title}">${label}</a>
            </li>`;
    }).join("");
    return `<details class="group-block" ${isOpen ? "open" : ""} id="${esc(opts.anchor)}">
        <summary class="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100">
            ${esc(opts.label)} <span class="ml-1 text-slate-400">${opts.list.length}</span>
        </summary>
        <ul class="mt-1 space-y-0.5 pl-3">${items}</ul>
    </details>`;
}
