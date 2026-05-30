// Discover every *.md file in the pagecontent dir. Returns slug+title+md
// for each, ready to be passed to renderPage.
import { readFile, readdir } from "node:fs/promises";
import { join, resolve, basename } from "node:path";

export default async function loadPagecontent(
    _ctx: Context,
    opts: { projectRoot: string; dir: string },
): Promise<Array<{ slug: string; title: string; md: string }>> {
    const absDir = resolve(opts.projectRoot, opts.dir);
    let entries;
    try {
        entries = await readdir(absDir, { withFileTypes: true });
    } catch {
        return [];
    }

    const out: Array<{ slug: string; title: string; md: string }> = [];
    for (const e of entries) {
        if (!e.isFile() || !e.name.endsWith(".md")) continue;
        // Skip index.md — landing page rendered separately.
        if (e.name === "index.md") continue;
        // Skip IG-resource MD files (handled by ig-resource plugin/IG Publisher convention).
        if (e.name.startsWith("ImplementationGuide-")) continue;
        const slug = basename(e.name, ".md");
        const md = await readFile(join(absDir, e.name), "utf8");
        // Try to lift an H1 from the first line; fall back to title-cased slug.
        const h1Match = md.match(/^#\s+(.+?)\s*$/m);
        const title = h1Match ? h1Match[1] : titleCase(slug);
        out.push({ slug, title, md });
    }
    return out;
}

function titleCase(slug: string): string {
    return slug.split("-").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}
