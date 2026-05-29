export default function artifactTable(
    ctx: Context,
    opts: { label: string; anchor: string; list: types.fcc.Resource[] },
): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const sorted = opts.list.slice().sort((a, b) =>
        ctx.fns.site.idOf(ctx, { resource: a }).localeCompare(ctx.fns.site.idOf(ctx, { resource: b })),
    );
    const rows = sorted.map(r => {
        const href = ctx.fns.site.pageHref(ctx, { resource: r });
        const title = esc(ctx.fns.site.titleOf(ctx, { resource: r }));
        const id    = esc(ctx.fns.site.idOf(ctx, { resource: r }));
        const desc  = (r.data as { description?: string }).description ?? "";
        return `
            <tr class="hover:bg-sky-50/40 align-top">
                <td class="px-3 py-2 whitespace-nowrap"><a class="text-sky-700 hover:underline" href="${href}">${title}</a></td>
                <td class="px-3 py-2"><code class="text-xs text-slate-500">${id}</code></td>
                <td class="px-3 py-2 text-sm text-slate-600">${ctx.fns.site.mdInline(ctx, { md: desc })}</td>
            </tr>`;
    }).join("");

    return `<section class="mt-8" id="${esc(opts.anchor)}">
        <h2 class="mb-2 text-lg font-semibold text-slate-900">${esc(opts.label)} <span class="ml-1 text-sm font-normal text-slate-400">${opts.list.length}</span></h2>
        <div class="overflow-x-auto rounded border border-slate-200 bg-white">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th class="px-3 py-2">Name</th><th class="px-3 py-2">Id</th><th class="px-3 py-2">Description</th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100">${rows}</tbody>
            </table>
        </div>
    </section>`;
}
