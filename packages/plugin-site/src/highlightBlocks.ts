// Syntax-highlight fenced code blocks in Bun.markdown output with Shiki (light
// theme, like the health-samurai docs/blog). Handles language-tagged blocks
// (```json) and untagged ones (```/~~~), auto-detecting JSON for the latter and
// otherwise rendering plaintext so every block still gets the consistent light
// frame. Runs synchronously off the warm highlighter (ctx.state.shiki); if it
// isn't ready the html is returned unchanged. Bun.markdown entity-encodes the
// code, so we decode before handing it to Shiki.
export default function highlightBlocks(ctx: Context, opts: { html: string }): string {
    const hl = (ctx.state as Record<string, any>).shiki;
    if (!hl) return opts.html;
    const decode = (s: string) =>
        s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

    return opts.html.replace(
        /<pre><code(?: class="language-([\w-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
        (m, lang: string | undefined, code: string) => {
            const decoded = decode(code);
            let use = lang ?? "";
            if (!use) {
                const t = decoded.trimStart();
                use = t.startsWith("{") || t.startsWith("[") ? "json" : "text";
            }
            if (use !== "text" && !hl.getLoadedLanguages().includes(use)) use = "text";
            try {
                return hl.codeToHtml(decoded, { lang: use, theme: "github-light" });
            } catch {
                return m;
            }
        },
    );
}
