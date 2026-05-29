// Resolve the ordered, available tab set for a resource from ctx.state.site
// .tabRegistry — the single source of truth shared by the tab strip
// (canonicalTabStrip) and companion-page enumeration (companionPages).
// Examples always use the "*" set (an example of a VS is not a canonical VS).
export default function tabsFor(
    ctx: Context,
    opts: { resource: types.fcc.Resource },
): Array<{ d: types.site.TabDescriptor; href: string; rawName?: string }> {
    const r = opts.resource;
    const reg = (ctx.state.site?.tabRegistry ?? {}) as Record<string, types.site.TabDescriptor[]>;
    const isExample = (r.data as { __wasExample?: boolean }).__wasExample === true;
    const set = isExample ? (reg["*"] ?? []) : (reg[r.resourceType] ?? reg["*"] ?? []);

    const base = ctx.fns.site.pageHref(ctx, { resource: r }).replace(/\.html$/, "");
    const out: Array<{ d: types.site.TabDescriptor; href: string; rawName?: string }> = [];
    for (const d of set) {
        if (d.avail) {
            const pred = (ctx.fns.site as any)[d.avail];
            if (typeof pred === "function" && !pred(ctx, { resource: r })) continue;
        }
        out.push({
            d,
            href: d.suffix === "" ? `${base}.html` : `${base}${d.suffix}`,
            rawName: d.raw ? `${base}${d.raw.suffix}` : undefined,
        });
    }
    return out;
}
