import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export default async function loadIntroNotes(
    ctx: Context,
    opts: { projectRoot: string; dir: string },
): Promise<Map<string, { intro?: string; notes?: string }>> {
    const out = new Map<string, { intro?: string; notes?: string }>();
    const absDir = resolve(opts.projectRoot, opts.dir);
    let entries;
    try {
        entries = await readdir(absDir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const e of entries) {
        if (!e.isFile() || !e.name.endsWith(".md")) continue;
        const m = e.name.match(/^([A-Z][A-Za-z]+)-(.+)-(intro|notes)\.md$/);
        if (!m) continue;
        const [, rt, id, kind] = m;
        const key = `${rt}/${id}`;
        const md = await readFile(join(absDir, e.name), "utf8");
        const html = ctx.fns.site.mdToHtml(ctx, { md });
        const bucket = out.get(key) ?? {};
        bucket[kind as "intro" | "notes"] = html;
        out.set(key, bucket);
    }
    return out;
}
