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

    // Authored per-resource intro/notes are now "intronotes" Page resources in
    // the graph (loaded by fcc/pages); the section renderers read them via
    // ctx.fns.site_core.notesFor — no side-loaded map here.

    // IG-author menu emitted by @fcc/plugin-menu via pctx.shared.menu.
    ctx.state.menuHtml = (pctx.shared.menu as { html?: string } | undefined)?.html ?? null;

    const routes = new Map<string, types.site_core.Route>();

    // chrome / aggregates — id:null → always (re)written / served fresh
    routes.set("index.html",     { id: null, contentType: "text/html", render: () => ctx.fns.site_artifacts.renderIndex(ctx, { landingHtml }) });
    routes.set("artifacts.html", { id: null, contentType: "text/html", render: () => ctx.fns.site_artifacts.renderArtifacts(ctx) });
    routes.set("style.css",      { id: null, contentType: "text/css",  render: () => css });
    for (const r of pageResources) {
        const d = r.data as { slug: string; title: string; role: string; sections: Record<string, unknown> };
        if (d.role !== "page") continue;
        // id = the Page resource id → editing one .md re-renders only that page.
        routes.set(`${d.slug}.html`, { id: r.id, contentType: "text/html", render: () => ctx.fns.site_artifacts.renderPage(ctx, { slug: d.slug, title: d.title, sections: d.sections, number: ((ctx.state.site as any).numbers as Map<string, string> | undefined)?.get(d.slug) }) });
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
    // Canonical pages are Page resources (kind:"canonical" → ref → backing
    // resource); render each via its backing resource. Same routes as the old
    // per-resource loop, now driven by byType.Page.
    ctx.fns.site_core.derivePages(ctx, { pluginCtx: pctx });
    for (const page of pctx.byType.Page) {
        if ((page.data as { kind?: string }).kind !== "canonical") continue;
        const r = pctx.byId((page.data as { ref?: string }).ref ?? "");
        if (!r) continue;
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

    // FHIR-IG sequential ("сквозная") page numbering. Compute AFTER derivePages
    // so byType.Page holds content + landing + canonical pages, then fold the
    // ordered page-tree (menu order → artifact groups) into dotted labels
    // (numberPages, the IGP createTocPage algorithm). Stored as slug → "3.1";
    // page renders read it lazily, so dev re-renders pick up reorders for free.
    {
        const menuTree = ((pctx.shared.menu as { tree?: { label: string; href: string; children: any[] }[] } | undefined)?.tree) ?? [];
        const pageDescs = pctx.byType.Page.filter(r => (r.data as { role?: string }).role !== "intronotes").map(r => {
            const d = r.data as { slug: string; title: string; kind?: string; role?: string; for?: string; sections?: Record<string, { order?: number; as?: string }> };
            const kind = d.kind ?? (d.role === "landing" ? "landing" : "content");
            const sections = d.sections
                ? Object.entries(d.sections)
                    .filter(([, s]) => s.as !== "raw")
                    .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
                    .map(([id]) => id)
                : undefined;
            return { slug: d.slug, title: d.title, kind, for: d.for, sections };
        });
        const roots = ctx.fns.site_core.pageTree(ctx, { menu: menuTree, pages: pageDescs });
        (ctx.state.site as any).numbers = ctx.fns.site_core.numberPages(ctx, { roots });  // stamps node.number too
        (ctx.state.site as any).navRoots = roots;                                          // the left-nav source

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
    for (const r of pctx.byType.Page) {
        const d = r.data as { role?: string; for?: string };
        if (d.role === "intronotes" && d.for && pctx.resources.has(d.for)) notesCount++;
    }

    return { routes, notesCount };
}
