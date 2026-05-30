// The shared top tab strip for any resource page. Resolves the resource's tab
// set (tabsFor) and renders it via tabLinks, marking the active tab. The
// download chip comes from the active tab's `download`, else the set's first
// download (so the Content page still shows "download .json" pointing at the
// JSON companion's raw file, the JSON companion download).
export default function canonicalTabStrip(ctx: Context, opts: { resource: types.fcc.Resource; activeId: string }): string {
    const resolved = ctx.fns.site_core.tabsFor(ctx, { resource: opts.resource });
    if (!resolved.length) return "";
    const base = ctx.fns.site_core.pageHref(ctx, { resource: opts.resource }).replace(/\.html$/, "");

    const active = resolved.find(t => t.d.id === opts.activeId);
    const dlSpec = active?.d.download ?? resolved.find(t => t.d.download)?.d.download;
    const download = dlSpec ? { label: dlSpec.label, href: `${base}${dlSpec.suffix}` } : undefined;

    return ctx.fns.site_core.tabLinks(ctx, {
        tabs: resolved.map(t => ({ label: t.d.label, href: t.href, active: t.d.id === opts.activeId })),
        download,
    });
}
