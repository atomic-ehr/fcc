// Render a short markdown string for inline contexts (e.g. table cells, where
// SearchParameter / element descriptions carry **bold**, `code`, [links] and
// *SHOULD*). Renders via Bun.markdown then unwraps a single enclosing <p> so it
// sits naturally inside a <td>. Multi-paragraph input keeps its paragraphs.
export default function mdInline(_ctx: Context, opts: { md: unknown }): string {
    const md = (typeof opts.md === "string" ? opts.md : "").trim();
    if (!md) return "";
    const html = ((Bun as any).markdown.html(md, {
        strikethrough: true,
        autolinks: true,
    }) as string).trim();
    return html.replace(/^<p>([\s\S]*)<\/p>$/, "$1").trim();
}
