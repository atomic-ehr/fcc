// Discover every *.md file in the pagecontent dir. Returns slug+title+md
// for each, ready to be passed to renderPage.
import { join, resolve, basename } from "node:path";

export default async function loadPagecontent(
    _ctx: Context,
    opts: { projectRoot: string; dir: string },
): Promise<Array<{ slug: string; title: string; md: string }>> {
    const absDir = resolve(opts.projectRoot, opts.dir);
    const out: Array<{ slug: string; title: string; md: string }> = [];
    try {
      for await (const name of new Bun.Glob("*.md").scan({ cwd: absDir })) {
        // Skip index.md (landing page) + IG-resource MD (handled elsewhere).
        if (name === "index.md" || name.startsWith("ImplementationGuide-")) continue;
        const slug = basename(name, ".md");
        const md = await Bun.file(join(absDir, name)).text();
        // Lift an H1 for the title; fall back to title-cased slug.
        const h1 = md.match(/^#\s+(.+?)\s*$/m);
        out.push({ slug, title: h1 ? h1[1]! : titleCase(slug), md });
      }
    } catch { /* dir absent → no pages */ }
    return out;
}

function titleCase(slug: string): string {
    return slug.split("-").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}
