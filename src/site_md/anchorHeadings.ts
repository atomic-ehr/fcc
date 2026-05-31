// Make every content heading a linkable anchor (FHIR-spec style). Bun.markdown
// already emits `<h2 id="slug">…` ids; this adds a hover "#" self-link and a
// scroll-margin so the sticky chrome doesn't cover the target. Only headings
// that carry an `id` are touched (markdown headings do; the page-title H1 from
// renderPage has none, so it's left alone).
export default function anchorHeadings(_ctx: Context, opts: { html: string }): string {
    return opts.html.replace(
        /<(h[1-6])([^>]*?)\sid="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g,
        (_m, tag: string, pre: string, id: string, post: string, inner: string) =>
            `<${tag}${pre} id="${id}"${post} class="group relative scroll-mt-24">` +
            `${inner}` +
            `<a href="#${id}" class="anchor-link ml-2 align-middle text-slate-300 no-underline opacity-0 transition group-hover:opacity-100 hover:text-sky-600" aria-label="Link to this heading">#</a>` +
            `</${tag}>`,
    );
}
