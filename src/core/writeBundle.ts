import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { css } from "./style.ts";

export default async function writeBundle(
    ctx: Context,
    opts: { pluginCtx: types.fcc.PluginContext },
): Promise<void> {
    const pctx = opts.pluginCtx;
    const o = (ctx.state.site ?? {}) as types.core.SiteOpts;
    const pagecontent = o.pagecontent ?? "input/pagecontent";
    const introNotes  = o.introNotes  ?? "input/intro-notes";
    const outSub      = o.out         ?? "site";

    const outDir = resolve(pctx.config.projectRoot, pctx.target.out, outSub);
    await mkdir(outDir, { recursive: true });

    // Warm the shared Shiki highlighter once so the (sync) markdown pipeline can
    // highlight fenced code blocks during the renders below.
    await ctx.fns.md.warmHighlighter(ctx);

    // Auto-resolve bare reference links to internal pages: [Page Title] → slug.html.
    // Loaded once here (before any markdown render) and reused for the page loop.
    const pages = await ctx.fns.artifacts.loadPagecontent(ctx, { projectRoot: pctx.config.projectRoot, dir: pagecontent });
    if (!ctx.state.site) ctx.state.site = {};
    const refs = ((ctx.state.site as any).refLinkMap ?? {}) as Record<string, string>;
    for (const p of pages) if (p.title && !(p.title in refs)) refs[p.title] = `${p.slug}.html`;
    (ctx.state.site as any).refLinkMap = refs;

    const landingHtml = await ctx.fns.artifacts.renderLanding(ctx, { projectRoot: pctx.config.projectRoot, pagecontent });

    // Per-resource intro/notes — loaded once per writeBundle pass, cached in state.
    const cached = (ctx.state.site as any)?.notesCache as Map<string, { intro?: string; notes?: string }> | null | undefined;
    const notes = cached
        ?? await ctx.fns.core.loadIntroNotes(ctx, { projectRoot: pctx.config.projectRoot, dir: introNotes });
    if (!ctx.state.site) ctx.state.site = {};
    (ctx.state.site as any).notesCache = notes;

    // Bind notes into ctx so renderers see them via ctx.notes.
    (ctx as any).notes = notes;

    // Pick up an IG-author menu emitted by @fcc/plugin-menu via pctx.shared.menu.
    // Stored on ctx.state so topBar can read it without a new opts plumbing.
    const sharedMenu = (pctx.shared.menu as { html?: string } | undefined);
    ctx.state.menuHtml = sharedMenu?.html ?? null;

    const indexHtml     = ctx.fns.artifacts.renderIndex(ctx, { landingHtml });
    const artifactsHtml = ctx.fns.artifacts.renderArtifacts(ctx);

    await writeOne(outDir, "index.html", indexHtml);
    await writeOne(outDir, "artifacts.html", artifactsHtml);
    await writeOne(outDir, "style.css", css);

    // Render every pagecontent/*.md (except index.md) as <slug>.html so the
    // IG-author menu links resolve. `pages` was loaded above (for ref-links).
    for (const p of pages) {
        const html = ctx.fns.artifacts.renderPage(ctx, p);
        await writeOne(outDir, `${p.slug}.html`, html);
    }

    const changed = pctx.changedIds;
    let pageCount = 0;
    for (const r of pctx.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if (changed && !changed.has(r.id)) continue;
        const html = await ctx.fns.core.renderResource(ctx, { resource: r });
        const href = ctx.fns.core.pageHref(ctx, { resource: r });
        await writeOne(outDir, href, html);
        pageCount++;

        // IG-Publisher companion pages per resourceType (profiles: definitions/
        // mappings/examples/json + raw; value sets: json + raw).
        for (const page of await ctx.fns.core.companionPages(ctx, { resource: r })) {
            await writeOne(outDir, page.name, page.content);
            pageCount++;
        }
    }

    pctx.emitFile({ path: join(outDir, "index.html"), bytes: ctx.fns.core.bytes(ctx, { s: "" }) });

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
