// Linkify canonical URLs in highlighted JSON/source: any URL that resolves to a
// LOCAL resource (via ctx.byUrl) becomes an <a> to its page. External base-spec /
// dependency URLs stay plain until the dependency spec-map (#1) lands. Runs over
// the Shiki HTML (URLs appear only as JSON string content, never in attributes).
// IG-Publisher JsonXhtmlRenderer parity (docs/ig-publisher-parity.md #9).
export default function linkifyCanonicals(ctx: Context, opts: { html: string }): string {
    return opts.html.replace(/https?:\/\/[^\s"'<>&]+/g, (m) => {
        const base = m.split("|")[0]!;                              // canonical may carry |version
        const r = ctx.byUrl(base);
        if (!r) return m;                                           // external / unresolved → leave plain
        const href = ctx.fns.site_core.pageHref(ctx, { resource: r });
        return `<a href="${href}" class="underline decoration-dotted underline-offset-2 hover:text-sky-300">${m}</a>`;
    });
}
