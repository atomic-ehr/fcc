// Render one pagecontent markdown file as a standalone site page.
// Used for the IG-author top-nav targets (general-requirements.html,
// must-support.html, ...) that aren't backed by a FHIR resource.

export default async function renderPage(ctx: Context, opts: { slug: string; title: string; sections: Record<string, unknown>; number?: string }): Promise<string> {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const html = await ctx.fns.site_core.composeSections(ctx, { sections: opts.sections as any });
    // FHIR-IG sequential number ("3.1") prefixing the page title, when computed.
    const num = opts.number ? `<span class="mr-2 font-normal tabular-nums text-slate-400">${esc(opts.number)}</span>` : "";
    const crumb = opts.number ? `${opts.number} ${opts.title}` : opts.title;
    return ctx.fns.site_core.layout(ctx, {
        title: opts.title,
        content: `
            <h1 class="text-3xl font-semibold text-slate-900">${num}${esc(opts.title)}</h1>
            <article class="prose prose-slate mt-6 max-w-3xl">${html}</article>
        `,
        breadcrumb: [{ label: "Home", href: "index.html" }, { label: crumb }],
        activeNav: opts.slug,
    });
}
