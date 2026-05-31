// The unified left nav bar. Renders the numbered page-tree (menu pages +
// artifact groups, FHIR-IG sequential numbering) computed in buildRoutes and
// stored on ctx.state.site.navRoots. Header carries the IG logo/title and the
// collapse toggle right beside it (the top-bar ☰ re-opens it when collapsed).
export default function sidebar(ctx: Context, _opts: {} = {}): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const roots = ((ctx.state.site as any)?.navRoots ?? []) as types.site_core.PageNode[];
    const tree = roots.length ? ctx.fns.site_core.renderNavTree(ctx, { roots }) : "";

    return `<aside data-show="$nav" class="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-3 py-4 lg:block">
        <div class="flex items-start justify-between gap-2 px-2">
            <div class="min-w-0">
                <a href="index.html" class="block truncate text-sm font-semibold text-slate-900 hover:text-sky-700">${esc(ctx.config.title ?? ctx.config.id)}</a>
                <p class="text-xs text-slate-500">v${esc(ctx.config.version)} · ${esc(ctx.target.name)}</p>
            </div>
            <button type="button" title="Collapse navigation"
                class="-mr-1 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                data-on-click="$nav = !$nav">&#x2039;&#x2039;</button>
        </div>
        <a href="artifacts.html" class="mt-3 inline-block px-2 text-xs font-medium text-sky-700 hover:underline">All artefacts &rarr;</a>
        <nav id="site-nav" class="mt-3">${tree}</nav>
        <script>${ctx.fns.site_core.navActiveScript(ctx)}</script>
    </aside>`;
}
