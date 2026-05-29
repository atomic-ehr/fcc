// Dispatcher: picks `$render_<ResourceType>` from the registry or falls back to default.
export default async function renderResource(ctx: Context, opts: { resource: types.fcc.Resource }): Promise<string> {
    const key = `$render_${opts.resource.resourceType}` as keyof FnsRegistry["site"];
    const fn = (ctx.fns.site as any)[key] ?? ctx.fns.site.$render_default;
    return await fn(ctx, opts);
}
