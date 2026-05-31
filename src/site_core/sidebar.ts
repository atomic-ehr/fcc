// The unified left nav bar = the table of contents: the numbered page-tree
// (menu pages + nested artifact groups, FHIR-IG sequential numbering) computed
// in buildRoutes and stored on ctx.state.site.navRoots. Title/version and the
// collapse toggle live in the top bar, so the bar here is just the TOC.
export default function sidebar(ctx: Context, _opts: {} = {}): string {
    const roots = ((ctx.state.site as any)?.navRoots ?? []) as types.site_core.PageNode[];
    const tree = roots.length ? ctx.fns.site_core.renderNavTree(ctx, { roots }) : "";

    return `<aside data-show="$nav" class="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-3 py-4 lg:block">
        <nav id="site-nav">${tree}</nav>
        <script>${ctx.fns.site_core.navActiveScript(ctx)}</script>
    </aside>`;
}
