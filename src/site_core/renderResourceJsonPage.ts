// Generic JSON source companion page for any resource (examples + canonicals
// that don't have a bespoke source page). Shiki-highlighted, with a Content/JSON
// tab strip (shared tabLinks) and a raw .json download — mirroring IG Publisher,
// which renders every example/canonical with code highlighting plus a raw link.
export default async function renderResourceJsonPage(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): Promise<string> {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const title = ctx.fns.site_core.titleOf(ctx, { resource: r });
    const base = ctx.fns.site_core.pageHref(ctx, { resource: r }).replace(/\.html$/, "");
    const isExample = !!(d as { __wasExample?: boolean }).__wasExample;
    const json = await ctx.fns.site_core.jsonBlock(ctx, { d, heading: false });

    const body = `
        ${ctx.fns.site_core.pageHeader(ctx, { title, kind: isExample ? "Example" : r.resourceType, d })}
        ${opts.strip ?? ctx.fns.site_core.canonicalTabStrip(ctx, { resource: r, activeId: "json" })}
        <h2 class="mt-6 text-lg font-semibold text-slate-900">JSON</h2>
        <p class="mt-1 text-xs text-slate-500">Raw: <a class="text-sky-700 hover:underline" href="${base}.json">${base}.json</a></p>
        <div class="mt-2">${json}</div>
    `;
    return ctx.fns.site_core.layout(ctx, {
        title: `${title} - JSON`,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: isExample ? "Examples" : r.resourceType, href: isExample ? "artifacts.html#examples" : `artifacts.html#${r.resourceType}` },
            { label: title, href: `${base}.html` },
            { label: "JSON" },
        ],
        activeNav: isExample ? "examples" : "artifacts",
    });
}
