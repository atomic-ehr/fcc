export default function pageHref(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const id = ctx.fns.core.idOf(ctx, { resource: opts.resource });
    return `${opts.resource.resourceType}-${id}.html`;
}
