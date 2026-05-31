// The site's URL map — single source of truth for both prod (precompute every
// file to disk) and dev (render one page on demand from the in-memory graph).
//
// Enumerates every output path as a *lazy* render thunk WITHOUT rendering:
// resource pages (pageHref), companion tabs + raw side-cars (from tabsFor —
// cheap, no render), index/artifacts/style.css, and pagecontent pages. Also
// does the per-build setup (Shiki, pagecontent + ref-links, intro/notes, menu)
// that every render depends on. writeBundle walks the map to write files; the
// dev server calls one route's render() per request.
import { css } from "./style.ts";

export default async function buildRoutes(
    ctx: Context,
    opts: { pluginCtx: types.fcc.PluginContext },
): Promise<{ routes: Map<string, types.site_core.Route>; notesCount: number }> {
    const pctx = opts.pluginCtx;
    const o = (ctx.state.site ?? {}) as types.site_core.SiteOpts;
    const introNotes  = o.introNotes  ?? "input/intro-notes";

    // Warm the shared Shiki highlighter once so the (sync) markdown pipeline can
    // highlight fenced code blocks during the renders below.
    await ctx.fns.site_md.warmHighlighter(ctx);

    // Pages are Page resources in the graph (loaded by fcc/pages). Build the
    // pagecontent list + landing from them; ref-links ([Page Title] → slug.html).
    const pageResources = pctx.byType.Page;
    const pages = pageResources
        .filter(r => (r.data as { role?: string }).role === "page")
        .map(r => r.data as { slug: string; title: string; md: string });
    if (!ctx.state.site) ctx.state.site = {};
    const refs = ((ctx.state.site as any).refLinkMap ?? {}) as Record<string, string>;
    for (const p of pages) if (p.title && !(p.title in refs)) refs[p.title] = `${p.slug}.html`;
    (ctx.state.site as any).refLinkMap = refs;

    const landing = pageResources.find(r => (r.data as { role?: string }).role === "landing");
    const landingHtml = landing ? ctx.fns.site_md.mdToHtml(ctx, { md: (landing.data as { md: string }).md }) : "";

    // Per-resource intro/notes (cached in state across an incremental pass).
    const cached = (ctx.state.site as any)?.notesCache as Map<string, { intro?: string; notes?: string }> | null | undefined;
    const notes = cached ?? await ctx.fns.site_core.loadIntroNotes(ctx, { projectRoot: pctx.config.projectRoot, dir: introNotes });
    (ctx.state.site as any).notesCache = notes;
    (ctx as any).notes = notes;                                     // renderers read ctx.notes

    // IG-author menu emitted by @fcc/plugin-menu via pctx.shared.menu.
    ctx.state.menuHtml = (pctx.shared.menu as { html?: string } | undefined)?.html ?? null;

    const routes = new Map<string, types.site_core.Route>();

    // chrome / aggregates — id:null → always (re)written / served fresh
    routes.set("index.html",     { id: null, contentType: "text/html", render: () => ctx.fns.site_artifacts.renderIndex(ctx, { landingHtml }) });
    routes.set("artifacts.html", { id: null, contentType: "text/html", render: () => ctx.fns.site_artifacts.renderArtifacts(ctx) });
    routes.set("style.css",      { id: null, contentType: "text/css",  render: () => css });
    for (const r of pageResources) {
        const d = r.data as { slug: string; title: string; md: string; role: string };
        if (d.role !== "page") continue;
        // id = the Page resource id → editing one .md re-renders only that page.
        routes.set(`${d.slug}.html`, { id: r.id, contentType: "text/html", render: () => ctx.fns.site_artifacts.renderPage(ctx, { slug: d.slug, title: d.title, md: d.md }) });
    }

    // QA / validation report — only when the fcc/validator plugin populated it.
    const report = (pctx.shared as any).validate as types.site_artifacts.ValidationReport | undefined;
    if (report) {
        routes.set("errors.html", { id: null, contentType: "text/html", render: () => ctx.fns.site_artifacts.renderErrors(ctx, { report }) });
        (ctx.state as any).validateSummary = report.summary;   // for the topBar QA chip
    }

    // resource pages + companion tabs (tabsFor is cheap — no render here).
    // Every companion route carries the PARENT resource's id (not null, not a
    // unique id) so the incremental write-gate in writeBundle skips/rewrites a
    // resource and all its companions as a unit. Changing that breaks companion
    // incremental correctness.
    for (const r of pctx.resources.values()) {
        if (r.resourceType === "ImplementationGuide" || r.resourceType === "Page") continue;
        const href = ctx.fns.site_core.pageHref(ctx, { resource: r });
        routes.set(href, { id: r.id, contentType: "text/html", render: () => ctx.fns.site_core.renderResource(ctx, { resource: r }) });

        for (const t of ctx.fns.site_core.tabsFor(ctx, { resource: r })) {
            if (t.d.kind === "main") continue;                      // main page already mapped above
            routes.set(t.href, { id: r.id, contentType: "text/html", render: () => ctx.fns.site_core.canonicalResource(ctx, { resource: r, activeId: t.d.id }) });
            if (t.rawName) {
                routes.set(t.rawName, { id: r.id, contentType: "application/json", render: () => {
                    const clean = { ...(r.data as Record<string, unknown>) };
                    delete (clean as { __wasExample?: boolean }).__wasExample;
                    return JSON.stringify(clean, null, 2);
                } });
            }
        }
    }

    // Code-defined export routes. Every $route_<name>.ts fn — across all loaded
    // namespaces — contributes one or more RouteDefs (e.g. examples.json.zip).
    // fn names are globally unique, so this flat scan is deterministic. A route
    // can deliver bytes (zip/binary) through the same render() machinery.
    const allFns = ctx.fns as unknown as Record<string, Record<string, Function>>;
    for (const ns of Object.keys(allFns)) {
        for (const key of Object.keys(allFns[ns] ?? {})) {
            if (!key.startsWith("$route_")) continue;
            const out = await allFns[ns]![key]!(ctx, { pluginCtx: pctx });
            const defs = (Array.isArray(out) ? out : out ? [out] : []) as types.site_core.RouteDef[];
            for (const d of defs) routes.set(d.path, { id: d.id ?? null, contentType: d.contentType, render: d.render });
        }
    }

    let notesCount = 0;
    for (const id of notes.keys()) if (pctx.resources.has(id)) notesCount++;

    return { routes, notesCount };
}
