import { resolve } from "node:path";

export default function watchPaths(ctx: Context, _opts: {} = {}): Array<{ path: string; recursive?: boolean }> {
    const o = (ctx.state.site ?? {}) as types.site.SiteOpts;
    const projectRoot = ctx.cfg.projectRoot;
    return [
        { path: resolve(projectRoot, o.pagecontent ?? "input/pagecontent"), recursive: true },
        { path: resolve(projectRoot, o.introNotes  ?? "input/intro-notes"), recursive: true },
    ];
}
