export default function $render_ValueSet(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });

    const compose = d.compose as { include?: Array<Record<string, unknown>> } | undefined;
    const includes = compose?.include ?? [];
    const blocks = includes.map(inc => {
        const sys = inc.system as string | undefined;
        const concepts = (inc.concept as Array<{ code: string; display?: string }> | undefined) ?? [];
        const items = concepts.length
            ? `<ul class="mt-1 list-disc space-y-0.5 pl-6 text-sm">${concepts.map(c =>
                `<li><code class="rounded bg-slate-100 px-1">${esc(c.code)}</code>${c.display ? ` — ${esc(c.display)}` : ""}</li>`,
              ).join("")}</ul>`
            : `<p class="mt-1 text-sm text-slate-500">All codes from system.</p>`;
        return `
            <h3 class="mt-4 text-sm font-semibold text-slate-700">${sys ? `From <code class="text-xs">${esc(sys)}</code>` : `From ValueSet`}</h3>
            ${items}
        `;
    }).join("");

    const title = (d.title as string) ?? (d.id as string);
    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Value Set", d })}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}
        ${ctx.fns.site.metaDl(ctx, { rows: [
            ["Canonical",   `<code class="text-xs">${esc((d.url as string) ?? "")}</code>`],
            ["Description", esc((d.description as string) ?? "—")],
        ] })}
        <h2 class="mt-8 text-lg font-semibold text-slate-900">Compose</h2>
        ${blocks}
        ${ctx.fns.site.notesBlock(ctx, { html: notes })}
        ${ctx.fns.site.jsonBlock(ctx, { d })}
    `;
    return ctx.fns.site.layout(ctx, {
        title,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Terminology", href: "artifacts.html#ValueSet" },
            { label: title },
        ],
        activeNav: "terminology",
    });
}
