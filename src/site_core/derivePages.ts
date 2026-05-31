// Materialise a canonical Page resource for every conformance resource — a
// projection (`kind:"canonical"`, `ref` → backing resource graph id) that
// buildRoutes renders. The backing StructureDefinition / ValueSet / … stays a
// normal resource; the Page is the view, queryable via byType.Page / ctx.sql.
// (docs/page.md — canonical pages as Page resources.)
export default function derivePages(ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): void {
    const pctx = opts.pluginCtx;
    for (const r of [...pctx.resources.values()]) {
        if (r.resourceType === "ImplementationGuide" || r.resourceType === "Page") continue;
        const slug = ctx.fns.site_core.pageHref(ctx, { resource: r }).replace(/\.html$/, "");
        const d = r.data as { title?: string; name?: string };
        pctx.emitResource({
            resourceType: "Page",
            id: `Page/${slug}`,
            data: {
                resourceType: "Page", id: slug, slug,
                title: d.title ?? d.name ?? r.id.split("/").pop()!,
                kind: "canonical", ref: r.id, for: r.resourceType,
            },
        });
    }
}
