import { basename } from "node:path";

export default function handleHotUpdate(_ctx: Context, opts: { hot: types.fcc.HotUpdateContext }): void {
    const hot = opts.hot;
    if (!hot.file.endsWith(".md")) return;
    const base = basename(hot.file);
    const m = base.match(/^([A-Z][A-Za-z]+)-(.+)-(intro|notes)\.md$/);
    if (!m) return;
    const [, rt, id] = m;
    const resId = `${rt}/${id}`;
    if (hot.ctx.resources.has(resId)) hot.invalidate(resId);
    // Cache will be rebuilt by writeBundle (it reloads when state.site.notesCache is null).
    const s = (hot.ctx as any).state ?? {};
    if (s.site) s.site.notesCache = null;
}
