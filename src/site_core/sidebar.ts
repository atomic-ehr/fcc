export default function sidebar(ctx: Context, _opts: {} = {}): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const groups: Record<string, types.fcc.Resource[]> = {};
    for (const r of ctx.bundle.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        // Examples are intentionally omitted from the left nav — they're linked
        // from each profile's Examples tab and the artefacts index instead.
        if ((r.data as { __wasExample?: boolean }).__wasExample) continue;
        (groups[r.resourceType] ||= []).push(r);
    }

    const sortedTypes = Object.keys(groups).sort((a, b) =>
        ctx.fns.site_core.order(ctx, { t: a }) - ctx.fns.site_core.order(ctx, { t: b }) || a.localeCompare(b),
    );
    const sections: string[] = sortedTypes.map(type =>
        ctx.fns.site_core.renderSidebarGroup(ctx, {
            label: ctx.fns.site_core.humanType(ctx, { t: type }),
            list: groups[type]!,
            anchor: type,
        }),
    );

    return `<aside data-show="$nav" class="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-3 py-4 lg:block">
        <a href="index.html" class="block px-2 text-sm font-semibold text-slate-900 hover:text-sky-700">${esc(ctx.cfg.title ?? ctx.cfg.id)}</a>
        <p class="px-2 text-xs text-slate-500">v${esc(ctx.cfg.version)} · ${esc(ctx.target.name)}</p>
        <a href="artifacts.html" class="mt-3 inline-block px-2 text-xs font-medium text-sky-700 hover:underline">All artefacts →</a>
        <nav id="site-nav" class="mt-3 space-y-1">${sections.join("\n")}</nav>
        <script>${ctx.fns.site_core.navActiveScript(ctx)}</script>
    </aside>`;
}
