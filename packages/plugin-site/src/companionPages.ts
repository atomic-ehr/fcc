// Dispatch to the per-resourceType companion-page builders (extra HTML pages +
// raw source files IG Publisher emits next to a resource's main page). Returns
// [] for types without companions so writeBundle can call it unconditionally.
export default async function companionPages(
    ctx: Context,
    opts: { resource: types.fcc.Resource },
): Promise<Array<{ name: string; content: string }>> {
    switch (opts.resource.resourceType) {
        case "StructureDefinition": return ctx.fns.site.sdCompanionPages(ctx, opts);
        case "ValueSet":            return ctx.fns.site.vsCompanionPages(ctx, opts);
        default:                    return [];
    }
}
