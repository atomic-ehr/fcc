export default function $render_CodeSystem(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });

    const concepts = (d.concept as Array<{ code: string; display?: string; definition?: string }> | undefined) ?? [];
    const conceptsHtml = ctx.fns.site.conceptTable(ctx, { concepts, showDefinition: true });

    const title = (d.title as string) ?? (d.id as string);
    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Code System", d })}
        ${opts.strip ?? ctx.fns.site.canonicalTabStrip(ctx, { resource: r, activeId: "content" })}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}
        ${ctx.fns.site.metaDl(ctx, { rows: [
            ["Canonical",   `<code class="text-xs">${esc((d.url as string) ?? "")}</code>`],
            ["Description", d.description ? ctx.fns.site.mdInline(ctx, { md: d.description as string }) : "—"],
            ["Concepts",    `${concepts.length}`],
        ] })}
        <h2 class="mt-8 text-lg font-semibold text-slate-900">Concepts</h2>
        <div class="mt-2">${conceptsHtml}</div>
        ${ctx.fns.site.notesBlock(ctx, { html: notes })}
    `;
    return ctx.fns.site.layout(ctx, {
        title,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Terminology", href: "artifacts.html#CodeSystem" },
            { label: title },
        ],
        activeNav: "terminology",
    });
}
