export default function shortLabel(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    if (typeof d.title === "string" && d.title) return d.title;
    if (typeof d.name === "string" && d.name) return d.name;
    return ctx.fns.site.idOf(ctx, { resource: r });
}
