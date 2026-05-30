// The shared canonical-resource page template. Resolves the tab strip for the
// active tab and dispatches to that tab's renderer (named by string in the
// registry), passing the prebuilt strip so the renderer owns header/body/layout
// while the template owns tab resolution. Used for both the main page
// (activeId "content") and every companion page (activeId = the tab's id).
export default async function canonicalResource(
    ctx: Context,
    opts: { resource: types.fcc.Resource; activeId?: string },
): Promise<string> {
    const r = opts.resource;
    const resolved = ctx.fns.core.tabsFor(ctx, { resource: r });
    const wanted = opts.activeId ?? "content";
    const active = resolved.find(t => t.d.id === wanted) ?? resolved[0];

    // Mark the resolved tab active (not the requested id) so a config that omits
    // e.g. a "content" tab still highlights the tab actually rendered.
    const strip = ctx.fns.core.canonicalTabStrip(ctx, { resource: r, activeId: active?.d.id ?? wanted });
    const renderKey = active?.d.render ?? "renderCanonical";
    const fn = ctx.fns.core.resolveFn(ctx, { key: renderKey }) ?? ctx.fns.core.renderCanonical;
    return await fn(ctx, { resource: r, strip });
}
