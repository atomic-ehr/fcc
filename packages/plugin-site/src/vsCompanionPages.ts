// Companion files for a ValueSet, matching IG Publisher: the JSON source page
// plus the raw .json download. (XML/TTL are omitted until we have serialisers.)
export default async function vsCompanionPages(
    ctx: Context,
    opts: { resource: types.fcc.Resource },
): Promise<Array<{ name: string; content: string }>> {
    const r = opts.resource;
    if (r.resourceType !== "ValueSet") return [];
    if ((r.data as { __wasExample?: boolean }).__wasExample) return [];

    const base = ctx.fns.site.pageHref(ctx, { resource: r }).replace(/\.html$/, "");
    const clean = { ...(r.data as Record<string, unknown>) };
    delete (clean as { __wasExample?: boolean }).__wasExample;

    return [
        { name: `${base}.json.html`, content: await ctx.fns.site.renderValueSetJsonPage(ctx, { resource: r }) },
        { name: `${base}.json`,      content: JSON.stringify(clean, null, 2) },
    ];
}
