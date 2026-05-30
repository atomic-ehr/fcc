// Render a short markdown string for inline contexts (e.g. table cells, where
// SearchParameter / element descriptions carry **bold**, `code`, [links] and
// *SHOULD*). Renders via Bun.markdown then unwraps a single enclosing <p> so it
// sits naturally inside a <td>. Multi-paragraph input keeps its paragraphs.
export default function mdInline(ctx: Context, opts: { md: unknown }): string {
    const md = (typeof opts.md === "string" ? opts.md : "").trim();
    if (!md) return "";
    const raw = ((Bun as any).markdown.html(md, {
        strikethrough: true,
        autolinks: true,
    }) as string).trim();
    const html = ctx.fns.site_md.sanitizeHtml(ctx, { html: raw });
    // Unwrap only a *single* enclosing <p> — never corrupt multi-paragraph input.
    const m = html.match(/^<p>([\s\S]*)<\/p>$/);
    return (m && !m[1]!.includes("<p>")) ? m[1]!.trim() : html;
}
