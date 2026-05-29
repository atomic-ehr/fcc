// Server-side syntax highlighting via Shiki. The highlighter is expensive to
// create (loads grammars + theme), so we build it once per build and cache the
// promise on ctx.state — every page reuses the same instance.
import { createHighlighter } from "shiki";

export default async function highlightCode(
    ctx: Context,
    opts: { code: string; lang?: string; theme?: string },
): Promise<string> {
    const lang = opts.lang ?? "json";
    const theme = opts.theme ?? "github-dark";

    const st = ctx.state as Record<string, any>;
    if (!st._shiki) {
        st._shiki = createHighlighter({ themes: [theme], langs: [lang] });
    }
    const hl = await st._shiki;
    // Lazily load any lang/theme not requested at creation time.
    if (!hl.getLoadedLanguages().includes(lang)) await hl.loadLanguage(lang as any);
    if (!hl.getLoadedThemes().includes(theme)) await hl.loadTheme(theme as any);

    return hl.codeToHtml(opts.code, { lang, theme });
}
