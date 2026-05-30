import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export default async function renderLanding(ctx: Context, opts: { projectRoot: string; pagecontent: string }): Promise<string> {
    const dir = resolve(opts.projectRoot, opts.pagecontent);
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        const indexMd = entries.find(e => e.isFile() && e.name === "index.md");
        if (!indexMd) return "";
        const md = await readFile(join(dir, "index.md"), "utf8");
        return ctx.fns.md.mdToHtml(ctx, { md });
    } catch {
        return "";
    }
}
