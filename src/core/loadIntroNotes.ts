import { join, resolve } from "node:path";

export default async function loadIntroNotes(
    ctx: Context,
    opts: { projectRoot: string; dir: string },
): Promise<Map<string, { intro?: string; notes?: string }>> {
    const out = new Map<string, { intro?: string; notes?: string }>();
    const absDir = resolve(opts.projectRoot, opts.dir);
    try {
      for await (const name of new Bun.Glob("*.md").scan({ cwd: absDir })) {
        const m = name.match(/^([A-Z][A-Za-z]+)-(.+)-(intro|notes)\.md$/);
        if (!m) continue;
        const [, rt, id, kind] = m;
        const key = `${rt}/${id}`;
        const md = await Bun.file(join(absDir, name)).text();
        const html = ctx.fns.md.mdToHtml(ctx, { md });
        // Skip unfilled templates: content that is only HTML comments / whitespace
        // once tags are stripped — otherwise an empty "Notes" section renders.
        const meaningful = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").trim();
        if (!meaningful) continue;
        const bucket = out.get(key) ?? {};
        bucket[kind as "intro" | "notes"] = html;
        out.set(key, bucket);
      }
    } catch { /* dir absent → no intro/notes */ }
    return out;
}
