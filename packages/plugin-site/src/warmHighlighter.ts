// Create the shared Shiki highlighter once per build and store the resolved
// instance on ctx.state.shiki, so the (sync) markdown pipeline can highlight
// fenced code blocks via codeToHtml without awaiting. Called at the top of
// writeBundle, before any page renders. Themes cover both the light docs code
// blocks and the dark JSON source pages.
import { createHighlighter } from "shiki";

export default async function warmHighlighter(ctx: Context, _opts?: Record<string, never>): Promise<void> {
    const st = ctx.state as Record<string, any>;
    if (st.shiki) return;
    const themes = ["github-light", "github-dark"];
    const langs = ["json", "jsonc", "js", "ts", "tsx", "bash", "shell", "html", "xml", "yaml", "sql", "http", "md"];
    try {
        st.shiki = await createHighlighter({ themes, langs });
    } catch {
        st.shiki = await createHighlighter({ themes, langs: ["json", "js"] });
    }
}
