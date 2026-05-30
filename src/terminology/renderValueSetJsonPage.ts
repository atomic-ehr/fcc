// The JSON source companion page for a ValueSet (ValueSet-<id>.json.html),
// matching IG Publisher. Shiki-highlighted; raw .json offered as a download.
export default async function renderValueSetJsonPage(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): Promise<string> {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const title = (d.title as string) ?? (d.id as string);
    const base = ctx.fns.core.pageHref(ctx, { resource: r }).replace(/\.html$/, "");
    const json = await ctx.fns.core.jsonBlock(ctx, { d, heading: false });

    const body = `
        ${ctx.fns.core.pageHeader(ctx, { title, kind: "Value Set", d })}
        ${opts.strip ?? ctx.fns.core.canonicalTabStrip(ctx, { resource: r, activeId: "json" })}
        ${ctx.fns.core.urlVersionStrip(ctx, { d })}
        <h2 class="mt-6 text-lg font-semibold text-slate-900">JSON</h2>
        <p class="mt-1 text-xs text-slate-500">Raw: <a class="text-sky-700 hover:underline" href="${base}.json">${base}.json</a></p>
        <div class="mt-2">${json}</div>
    `;
    return ctx.fns.core.layout(ctx, {
        title: `${title} - JSON`,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Terminology", href: "artifacts.html#ValueSet" },
            { label: title, href: `${base}.html` },
            { label: "JSON" },
        ],
        activeNav: "terminology",
    });
}
