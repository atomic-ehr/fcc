// The single Content-page renderer for every canonical resource + example. It
// owns the shared chrome (header, tab strip, metadata strip, layout) and
// composes an ordered list of pluggable sections ($section_<id>) chosen per
// resourceType by sectionsFor. Replaces the bespoke $render_<RT> renderers —
// each of those became a set of $section_ fns + a sectionDefaults entry.
//
// A $section_<id> fn returns { title, id, html } | null. A non-empty title gets
// a numbered section header; an empty title renders the html headerless.
export default function renderCanonical(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const meta = ctx.fns.site_core.canonicalMeta(ctx, { resource: r });
    const strip = opts.strip ?? ctx.fns.site_core.canonicalTabStrip(ctx, { resource: r, activeId: "content" });

    let n = 0;
    const parts: string[] = [];
    for (const id of ctx.fns.site_core.sectionsFor(ctx, { resource: r })) {
        const fn = ctx.fns.site_core.resolveFn(ctx, { key: `$section_${id}` });
        if (typeof fn !== "function") continue;
        const s = fn(ctx, { resource: r }) as { title: string; id: string; html: string } | null;
        if (!s || !s.html) continue;
        parts.push(s.title
            ? `${ctx.fns.site_core.sectionHeader(ctx, { num: `1.${++n}`, title: s.title, id: s.id })}${s.html}`
            : s.html);
    }

    const body = `
        ${ctx.fns.site_core.pageHeader(ctx, { title: meta.title, kind: meta.kind, d })}
        ${strip}
        ${ctx.fns.site_core.urlVersionStrip(ctx, { d })}
        ${parts.join("\n")}
    `;
    return ctx.fns.site_core.layout(ctx, { title: meta.title, content: body, breadcrumb: meta.breadcrumb, activeNav: meta.activeNav });
}
