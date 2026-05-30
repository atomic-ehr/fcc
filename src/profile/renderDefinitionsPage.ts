// The "Detailed Descriptions" companion page (…-definitions.html), matching
// IG Publisher. Every element block carries an id="<path>" anchor so links like
// …-definitions.html#Patient.name resolve.
export default function renderDefinitionsPage(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const title = (d.title as string) ?? (d.id as string);
    const elements = ((d.differential as { element?: Array<Record<string, unknown>> } | undefined)?.element) ?? [];

    const body = `
        ${ctx.fns.core.pageHeader(ctx, { title, kind: "Profile", d })}
        ${opts.strip ?? ctx.fns.core.canonicalTabStrip(ctx, { resource: r, activeId: "definitions" })}
        ${ctx.fns.core.urlVersionStrip(ctx, { d })}
        <h2 class="mt-6 text-lg font-semibold text-slate-900">Detailed Descriptions</h2>
        <div class="mt-2">${ctx.fns.profile.detailTable(ctx, { elements, anchors: true })}</div>
    `;
    return ctx.fns.core.layout(ctx, {
        title: `${title} - Detailed Descriptions`,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Profiles", href: "artifacts.html#StructureDefinition" },
            { label: title, href: ctx.fns.profile.sdHrefs(ctx, { resource: r }).content },
            { label: "Detailed Descriptions" },
        ],
        activeNav: "profiles",
    });
}
