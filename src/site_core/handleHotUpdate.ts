import { basename } from "node:path";

export default function handleHotUpdate(ctx: Context, opts: { hot: types.fcc.HotUpdateContext }): void {
    const hot = opts.hot;

    if (hot.file.endsWith(".md")) {
        const m = basename(hot.file).match(/^([A-Z][A-Za-z]+)-(.+)-(intro|notes)\.md$/);
        if (!m) return;
        const [, rt, id] = m;
        const resId = `${rt}/${id}`;
        if (hot.ctx.resources.has(resId)) hot.invalidate(resId);
        // Clear the notes cache (lives on the *render* ctx — `hot.ctx` is the
        // engine PluginContext and has no `.state`) so buildRoutes reloads it.
        if (ctx.state.site) (ctx.state.site as any).notesCache = null;
        return;
    }

    // Resource files: a changed example/instance only canonically references its
    // profile, so the dep-graph would re-render the example but NOT the profile
    // page whose "Examples" section lists it. Invalidate those profiles too so
    // that section stays correct on incremental prod rebuilds.
    for (const r of hot.ctx.resources.values()) {
        if (r.source?.path !== hot.file) continue;
        const profiles = (r.data as { meta?: { profile?: string[] } }).meta?.profile ?? [];
        for (const url of profiles) {
            const p = hot.ctx.byUrl(url);
            if (p) hot.invalidate(p.id);
        }
    }
}
