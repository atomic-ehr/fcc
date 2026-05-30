// A responsive grid of links to resource pages — shared by the Usages /
// References sections (profiles, value sets, code systems). Each item links to
// the resource's page, labelled by its title.
export default function linkGrid(ctx: Context, opts: { resources: types.fcc.Resource[] }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    return `<ul class="mt-1 grid grid-cols-1 gap-0.5 pl-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
        ${opts.resources.map(r => `<li><a class="text-sky-700 hover:underline" href="${esc(ctx.fns.site_core.pageHref(ctx, { resource: r }))}">${esc(ctx.fns.site_core.titleOf(ctx, { resource: r }))}</a></li>`).join("")}
    </ul>`;
}
