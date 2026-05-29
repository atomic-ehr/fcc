export default function $render_ValueSet(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });
    const title = (d.title as string) ?? (d.id as string);

    const tabs = opts.strip ?? ctx.fns.site.canonicalTabStrip(ctx, { resource: r, activeId: "content" });

    const cld = ctx.fns.site.vsCld(ctx, { compose: d.compose as Record<string, unknown> | undefined });
    const expansion = ctx.fns.site.vsExpand(ctx, { resource: r });
    const expansionHtml = expansion
        ? `<p class="mt-2 text-sm text-slate-600">This value set contains ${expansion.concepts.length} concept${expansion.concepts.length === 1 ? "" : "s"}.</p>
           <div class="mt-2">${ctx.fns.site.conceptTable(ctx, { concepts: expansion.concepts, showSystem: true })}</div>`
        : `<p class="mt-2 text-sm text-slate-500">Expansion is not available offline — this value set draws on filters, whole code systems, or imported value sets that require a terminology server to expand.</p>`;

    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Value Set", d })}
        ${tabs}
        ${ctx.fns.site.urlVersionStrip(ctx, { d })}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.1", title: "Description", id: "description" })}
        ${d.description ? `<div class="prose prose-slate prose-sm mt-2 max-w-3xl">${ctx.fns.site.mdToHtml(ctx, { md: d.description as string })}</div>` : ""}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.2", title: "Logical Definition (CLD)", id: "definition" })}
        ${cld}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.3", title: "Expansion", id: "expansion" })}
        ${expansionHtml}

        ${notes ? `${ctx.fns.site.sectionHeader(ctx, { num: "1.4", title: "Notes", id: "notes-section" })}
        <article class="prose prose-slate mt-2 max-w-3xl">${notes}</article>` : ""}
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
