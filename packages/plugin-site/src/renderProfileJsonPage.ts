// The JSON source companion page (…profile.json.html), matching IG Publisher's
// "JSON" tab. Shiki-highlighted; the raw file is offered as a download link.
export default async function renderProfileJsonPage(ctx: Context, opts: { resource: types.fcc.Resource }): Promise<string> {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const title = (d.title as string) ?? (d.id as string);
    const h = ctx.fns.site.sdHrefs(ctx, { resource: r });
    const json = await ctx.fns.site.jsonBlock(ctx, { d, heading: false });

    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Profile", d })}
        ${ctx.fns.site.formatChips(ctx, { resource: r, active: "json" })}
        ${ctx.fns.site.urlVersionStrip(ctx, { d })}
        <h2 class="mt-6 text-lg font-semibold text-slate-900">JSON</h2>
        <p class="mt-1 text-xs text-slate-500">Raw: <a class="text-sky-700 hover:underline" href="${h.jsonRaw}">${h.jsonRaw}</a></p>
        <div class="mt-2">${json}</div>
    `;
    return ctx.fns.site.layout(ctx, {
        title: `${title} - JSON`,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Profiles", href: "artifacts.html#StructureDefinition" },
            { label: title, href: h.content },
            { label: "JSON" },
        ],
        activeNav: "profiles",
    });
}
