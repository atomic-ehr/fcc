// Linkify canonical URLs in highlighted JSON/source: a URL resolving to a LOCAL
// resource (via ctx.byUrl) links to its page; a dependency canonical (via the
// deps index, #1) links to the dependency's published page on its own site;
// anything else stays plain. Runs over the Shiki HTML (URLs appear only as JSON
// string content, never in attributes). IG-Publisher JsonXhtmlRenderer parity
// (docs/ig-publisher-parity.md #9).
export default function linkifyCanonicals(ctx: Context, opts: { html: string }): string {
    const deps = (ctx.state as { deps?: { byCanonical: Map<string, { webPath: string }> } }).deps;
    const link = (href: string, text: string) => `<a href="${href}" class="underline decoration-dotted underline-offset-2 hover:text-sky-300">${text}</a>`;
    return opts.html.replace(/https?:\/\/[^\s"'<>&]+/g, (m) => {
        const base = m.split("|")[0]!;                              // canonical may carry |version
        const r = ctx.byUrl(base);
        if (r) return link(ctx.fns.site_core.pageHref(ctx, { resource: r }), m);
        const ext = deps?.byCanonical.get(base)?.webPath;          // dependency canonical → its published page
        if (ext) return link(ext, m);
        return m;                                                   // truly external / unknown → plain
    });
}
