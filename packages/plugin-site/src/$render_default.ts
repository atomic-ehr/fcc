export default async function $render_default(ctx: Context, opts: { resource: types.fcc.Resource }): Promise<string> {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const profile = ((d.meta as { profile?: string[] } | undefined)?.profile ?? [])[0];
    const isExample = !!(d as { __wasExample?: boolean }).__wasExample;
    const title = (d.title as string) ?? `${r.resourceType} / ${d.id as string}`;
    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });

    const rows: Array<[string, string]> = [];
    if (profile) rows.push(["Profile", ctx.fns.site.linkCanonical(ctx, { url: profile })]);
    rows.push(["Resource type", `<code class="text-xs">${esc(r.resourceType)}</code>`]);
    rows.push(["Id",            `<code class="text-xs">${esc((d.id as string) ?? "")}</code>`]);
    if (d.url) rows.push(["Canonical", `<code class="text-xs">${esc(d.url as string)}</code>`]);

    const json = await ctx.fns.site.jsonBlock(ctx, { d });
    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: isExample ? "Example" : r.resourceType, d })}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}
        ${ctx.fns.site.metaDl(ctx, { rows })}
        ${ctx.fns.site.notesBlock(ctx, { html: notes })}
        ${json}
    `;
    return ctx.fns.site.layout(ctx, {
        title,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: isExample ? "Examples" : r.resourceType, href: isExample ? "artifacts.html#examples" : `artifacts.html#${r.resourceType}` },
            { label: title },
        ],
        activeNav: isExample ? "examples" : "artifacts",
    });
}
