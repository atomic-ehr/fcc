import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { marked } from "marked";

export default async function renderLanding(ctx: Context, opts: { projectRoot: string; pagecontent: string }): Promise<string> {
    const dir = resolve(opts.projectRoot, opts.pagecontent);
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        const indexMd = entries.find(e => e.isFile() && e.name === "index.md");
        if (!indexMd) return "";
        const md = await readFile(join(dir, "index.md"), "utf8");
        const stripped = ctx.fns.site.stripUnrenderedLiquid(ctx, { md });
        return marked.parse(stripped, { async: false }) as string;
    } catch {
        return "";
    }
}
