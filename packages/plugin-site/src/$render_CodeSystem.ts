export default function $render_CodeSystem(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });

    const concepts = (d.concept as Array<{ code: string; display?: string; definition?: string }> | undefined) ?? [];
    const rows = concepts.map(c => `
        <tr class="hover:bg-slate-50/60">
            <td class="px-3 py-1.5"><code class="rounded bg-slate-100 px-1 text-xs">${esc(c.code)}</code></td>
            <td class="px-3 py-1.5 text-sm">${esc(c.display ?? "")}</td>
            <td class="px-3 py-1.5 text-sm text-slate-600">${esc(c.definition ?? "")}</td>
        </tr>`).join("");

    const title = (d.title as string) ?? (d.id as string);
    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Code System", d })}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}
        ${ctx.fns.site.metaDl(ctx, { rows: [
            ["Canonical",   `<code class="text-xs">${esc((d.url as string) ?? "")}</code>`],
            ["Description", esc((d.description as string) ?? "—")],
            ["Concepts",    `${concepts.length}`],
        ] })}
        <h2 class="mt-8 text-lg font-semibold text-slate-900">Concepts</h2>
        <div class="mt-2 overflow-x-auto rounded border border-slate-200 bg-white">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th class="px-3 py-2">Code</th><th class="px-3 py-2">Display</th><th class="px-3 py-2">Definition</th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100">${rows}</tbody>
            </table>
        </div>
        ${ctx.fns.site.notesBlock(ctx, { html: notes })}
        ${ctx.fns.site.jsonBlock(ctx, { d })}
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
