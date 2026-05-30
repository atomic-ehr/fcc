import { resolve } from "node:path";

export default function watchPaths(ctx: Context, _opts: {} = {}): Array<{ path: string; recursive?: boolean }> {
    const o = (ctx.state.site ?? {}) as types.site_core.SiteOpts;
    const projectRoot = ctx.cfg.projectRoot;
    // pagecontent is a source dir now (fcc/pages loader) → auto-watched. Only the
    // intro/notes dir still needs declaring here.
    return [
        { path: resolve(projectRoot, o.introNotes ?? "input/intro-notes"), recursive: true },
    ];
}
