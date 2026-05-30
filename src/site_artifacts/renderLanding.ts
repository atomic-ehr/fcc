import { join, resolve } from "node:path";

export default async function renderLanding(ctx: Context, opts: { projectRoot: string; pagecontent: string }): Promise<string> {
    const indexMd = Bun.file(join(resolve(opts.projectRoot, opts.pagecontent), "index.md"));
    if (!(await indexMd.exists())) return "";
    return ctx.fns.site_md.mdToHtml(ctx, { md: await indexMd.text() });
}
