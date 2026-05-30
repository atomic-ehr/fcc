export default function artifactTable(
    ctx: Context,
    opts: { label: string; anchor: string; list: types.fcc.Resource[] },
): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const sorted = opts.list.slice().sort((a, b) =>
        ctx.fns.core.idOf(ctx, { resource: a }).localeCompare(ctx.fns.core.idOf(ctx, { resource: b })),
    );
    const rows = sorted.map(r => {
        const href = ctx.fns.core.pageHref(ctx, { resource: r });
        const title = esc(ctx.fns.core.titleOf(ctx, { resource: r }));
        const id    = esc(ctx.fns.core.idOf(ctx, { resource: r }));
        const desc  = (r.data as { description?: string }).description ?? "";
        return `
            <tr class="hover:bg-sky-50/40 align-top">
                <td class="px-3 py-2 whitespace-nowrap"><a class="text-sky-700 hover:underline" href="${href}">${title}</a></td>
                <td class="px-3 py-2"><code class="text-xs text-slate-500">${id}</code></td>
                <td class="px-3 py-2 text-sm text-slate-600">${ctx.fns.md.mdInline(ctx, { md: desc })}</td>
            </tr>`;
    }).join("");

    return `<section class="mt-8" id="${esc(opts.anchor)}">
        <h2 class="mb-2 text-lg font-semibold text-slate-900">${esc(opts.label)} <span class="ml-1 text-sm font-normal text-slate-400">${opts.list.length}</span></h2>
        ${ctx.fns.core.dataTable(ctx, { columns: ["Name", "Id", "Description"], rows })}
    </section>`;
}
