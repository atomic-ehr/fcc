// The ordered, enabled section ids for a resource's Content page — from
// ctx.state.site.sectionRegistry (examples force "*"), each gated by featureOn
// so a project can switch any section off via site({ features }).
export default function sectionsFor(ctx: Context, opts: { resource: types.fcc.Resource }): string[] {
    const r = opts.resource;
    const reg = (ctx.state.site?.sectionRegistry ?? {}) as Record<string, string[]>;
    const isExample = (r.data as { __wasExample?: boolean }).__wasExample === true;
    const ids = isExample ? (reg["*"] ?? []) : (reg[r.resourceType] ?? reg["*"] ?? []);
    return ids.filter(id => ctx.fns.core.featureOn(ctx, { name: id }));
}
