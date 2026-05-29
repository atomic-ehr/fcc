export default function $render_default(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const profile = ((d.meta as { profile?: string[] } | undefined)?.profile ?? [])[0];
    const isExample = !!(d as { __wasExample?: boolean }).__wasExample;
    const title = (d.title as string) ?? `${r.resourceType} / ${d.id as string}`;
    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });
    const base = ctx.fns.site.pageHref(ctx, { resource: r }).replace(/\.html$/, "");

    const rows: Array<[string, string]> = [];
    if (profile) rows.push(["Profile", ctx.fns.site.linkCanonical(ctx, { url: profile, short: true })]);
    rows.push(["Resource type", `<code class="text-xs">${esc(r.resourceType)}</code>`]);
    rows.push(["Id",            `<code class="text-xs">${esc((d.id as string) ?? "")}</code>`]);
    if (d.url) rows.push(["Canonical", `<code class="text-xs">${esc(d.url as string)}</code>`]);

    // FHIR narrative (text.div) — IG Publisher shows the rendered narrative on
    // the example/resource page; the JSON source lives on the JSON tab.
    const narrative = (d.text as { div?: string } | undefined)?.div;
    const narrativeBlock = narrative
        ? `<h2 class="mt-6 text-lg font-semibold text-slate-900">Narrative</h2>
           <div class="prose prose-slate mt-2 max-w-none rounded border border-slate-200 bg-white p-4">${narrative}</div>`
        : "";

    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: isExample ? "Example" : r.resourceType, d })}
        ${opts.strip ?? ctx.fns.site.canonicalTabStrip(ctx, { resource: r, activeId: "content" })}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}
        ${ctx.fns.site.metaDl(ctx, { rows })}
        ${narrativeBlock}
        ${ctx.fns.site.notesBlock(ctx, { html: notes })}
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
