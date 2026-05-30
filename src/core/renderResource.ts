// Render a resource's MAIN page (the "content" tab) through the canonical-
// resource template, which resolves the tab strip and dispatches to the
// resourceType's registered renderer (still a `$render_<RT>` fn under the hood).
export default async function renderResource(ctx: Context, opts: { resource: types.fcc.Resource }): Promise<string> {
    return await ctx.fns.core.canonicalResource(ctx, { resource: opts.resource, activeId: "content" });
}
