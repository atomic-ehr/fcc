import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { css } from "./style.ts";

export default async function writeBundle(
    ctx: Context,
    opts: { pluginCtx: types.fcc.PluginContext },
): Promise<void> {
    const pctx = opts.pluginCtx;
    const o = (ctx.state.site ?? {}) as types.site.SiteOpts;
    const pagecontent = o.pagecontent ?? "input/pagecontent";
    const introNotes  = o.introNotes  ?? "input/intro-notes";
    const outSub      = o.out         ?? "site";

    const outDir = resolve(pctx.config.projectRoot, pctx.target.out, outSub);
    await mkdir(outDir, { recursive: true });

    const landingHtml = await ctx.fns.site.renderLanding(ctx, { projectRoot: pctx.config.projectRoot, pagecontent });

    // Per-resource intro/notes — loaded once per writeBundle pass, cached in state.
    const cached = (ctx.state.site as any)?.notesCache as Map<string, { intro?: string; notes?: string }> | null | undefined;
    const notes = cached
        ?? await ctx.fns.site.loadIntroNotes(ctx, { projectRoot: pctx.config.projectRoot, dir: introNotes });
    if (!ctx.state.site) ctx.state.site = {};
    (ctx.state.site as any).notesCache = notes;

    // Bind notes into ctx so renderers see them via ctx.notes.
    (ctx as any).notes = notes;

    // Pick up an IG-author menu emitted by @fcc/plugin-menu via pctx.shared.menu.
    // Stored on ctx.state so topBar can read it without a new opts plumbing.
    const sharedMenu = (pctx.shared.menu as { html?: string } | undefined);
    ctx.state.menuHtml = sharedMenu?.html ?? null;

    const indexHtml     = ctx.fns.site.renderIndex(ctx, { landingHtml });
    const artifactsHtml = ctx.fns.site.renderArtifacts(ctx);

    await writeOne(outDir, "index.html", indexHtml);
    await writeOne(outDir, "artifacts.html", artifactsHtml);
    await writeOne(outDir, "style.css", css);

    // Render every pagecontent/*.md (except index.md) as <slug>.html so the
    // IG-author menu links resolve. Done on every pass — these aren't tied
    // to per-resource changedIds.
    const pages = await ctx.fns.site.loadPagecontent(ctx, { projectRoot: pctx.config.projectRoot, dir: pagecontent });
    for (const p of pages) {
        const html = ctx.fns.site.renderPage(ctx, p);
        await writeOne(outDir, `${p.slug}.html`, html);
    }

    const changed = pctx.changedIds;
    let pageCount = 0;
    for (const r of pctx.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if (changed && !changed.has(r.id)) continue;
        const html = ctx.fns.site.renderResource(ctx, { resource: r });
        const href = ctx.fns.site.pageHref(ctx, { resource: r });
        await writeOne(outDir, href, html);
        pageCount++;
    }

    pctx.emitFile({ path: join(outDir, "index.html"), bytes: ctx.fns.site.bytes(ctx, { s: "" }) });

    let withNotes = 0;
    for (const id of notes.keys()) if (pctx.resources.has(id)) withNotes++;

    pctx.warn({
        severity: "info", source: "fcc/site",
        message: changed
            ? `site: ${pageCount} page(s) re-rendered + chrome (${withNotes} have intro/notes)`
            : `site rendered: ${pctx.resources.size + 1} pages → ${outDir} (${withNotes} have intro/notes)`,
    });

    // Drop cache between full builds (so file additions/deletions are picked up).
    if (!changed) (ctx.state.site as any).notesCache = null;
}

async function writeOne(dir: string, name: string, content: string): Promise<void> {
    await writeFile(join(dir, name), content, "utf8");
}
