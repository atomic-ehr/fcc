export default function $render_CodeSystem(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });

    const concepts = (d.concept as Array<{ code: string; display?: string; definition?: string }> | undefined) ?? [];
    const conceptsHtml = ctx.fns.site.conceptTable(ctx, { concepts, showDefinition: true });

    const title = (d.title as string) ?? (d.id as string);

    const usedByVs = ctx.fns.site.codeSystemUsage(ctx, { resource: r });
    const referencesSection = usedByVs.length ? `
        <h2 class="mt-8 text-lg font-semibold text-slate-900">References</h2>
        <p class="mt-1 text-xs text-slate-500">This code system is referenced in the content logical definition of the following value sets:</p>
        <ul class="mt-2 grid grid-cols-1 gap-0.5 pl-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            ${usedByVs.map(v => `<li><a class="text-sky-700 hover:underline" href="${ctx.fns.site.pageHref(ctx, { resource: v })}">${esc(ctx.fns.site.titleOf(ctx, { resource: v }))}</a></li>`).join("")}
        </ul>` : "";

    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Code System", d })}
        ${opts.strip ?? ctx.fns.site.canonicalTabStrip(ctx, { resource: r, activeId: "content" })}
        ${ctx.fns.site.urlVersionStrip(ctx, { d })}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}
        ${d.description ? `<div class="prose prose-slate prose-sm mt-4 max-w-3xl">${ctx.fns.site.mdToHtml(ctx, { md: d.description as string })}</div>` : ""}
        <h2 class="mt-8 text-lg font-semibold text-slate-900">Concepts (${concepts.length})</h2>
        <div class="mt-2">${conceptsHtml}</div>
        ${referencesSection}
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
