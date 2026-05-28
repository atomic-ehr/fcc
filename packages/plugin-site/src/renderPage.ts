// Render one pagecontent markdown file as a standalone site page.
// Used for the IG-author top-nav targets (general-requirements.html,
// must-support.html, ...) that aren't backed by a FHIR resource.
import { marked } from "marked";

export default function renderPage(ctx: Context, opts: { slug: string; title: string; md: string }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const stripped = ctx.fns.site.stripUnrenderedLiquid(ctx, { md: opts.md });
    const html = marked.parse(stripped, { async: false }) as string;
    return ctx.fns.site.layout(ctx, {
        title: opts.title,
        content: `
            <h1 class="text-3xl font-semibold text-slate-900">${esc(opts.title)}</h1>
            <article class="prose prose-slate mt-6 max-w-3xl">${html}</article>
        `,
        breadcrumb: [{ label: "Home", href: "index.html" }, { label: opts.title }],
        activeNav: opts.slug,
    });
}
