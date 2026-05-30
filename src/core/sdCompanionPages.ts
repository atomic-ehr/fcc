// All companion files IG Publisher emits alongside a StructureDefinition's main
// page: the Detailed Descriptions / Mappings / Examples / JSON pages plus the
// raw .profile.json. Returns [] for anything that isn't a profile-style SD so
// writeBundle can call it unconditionally. Each entry is {name, content} where
// name is the output filename (already the IG-Publisher convention).
export default async function sdCompanionPages(
    ctx: Context,
    opts: { resource: types.fcc.Resource },
): Promise<Array<{ name: string; content: string }>> {
    const r = opts.resource;
    if (r.resourceType !== "StructureDefinition") return [];
    if ((r.data as { __wasExample?: boolean }).__wasExample) return [];

    const h = ctx.fns.profile.sdHrefs(ctx, { resource: r });
    const clean = { ...(r.data as Record<string, unknown>) };
    delete (clean as { __wasExample?: boolean }).__wasExample;

    return [
        { name: h.definitions, content: ctx.fns.profile.renderDefinitionsPage(ctx, { resource: r }) },
        { name: h.mappings,    content: ctx.fns.profile.renderMappingsPage(ctx, { resource: r }) },
        { name: h.examples,    content: ctx.fns.profile.renderExamplesPage(ctx, { resource: r }) },
        { name: h.jsonPage,    content: await ctx.fns.profile.renderProfileJsonPage(ctx, { resource: r }) },
        { name: h.jsonRaw,     content: JSON.stringify(clean, null, 2) },
    ];
}
