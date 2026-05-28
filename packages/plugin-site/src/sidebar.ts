export default function sidebar(ctx: Context, _opts: {} = {}): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const groups: Record<string, types.fcc.Resource[]> = {};
    const examples: types.fcc.Resource[] = [];
    for (const r of ctx.bundle.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if ((r.data as { __wasExample?: boolean }).__wasExample) { examples.push(r); continue; }
        (groups[r.resourceType] ||= []).push(r);
    }

    const sortedTypes = Object.keys(groups).sort((a, b) =>
        ctx.fns.site.order(ctx, { t: a }) - ctx.fns.site.order(ctx, { t: b }) || a.localeCompare(b),
    );
    const sections: string[] = sortedTypes.map(type =>
        ctx.fns.site.renderSidebarGroup(ctx, {
            label: ctx.fns.site.humanType(ctx, { t: type }),
            list: groups[type]!,
            anchor: type,
        }),
    );

    if (examples.length) {
        const byType: Record<string, types.fcc.Resource[]> = {};
        for (const r of examples) (byType[r.resourceType] ||= []).push(r);
        const sub = Object.entries(byType).sort(([a], [b]) => a.localeCompare(b)).map(([t, list]) =>
            ctx.fns.site.renderSidebarGroup(ctx, { label: `${t} examples`, list, anchor: `example-${t}`, open: false }),
        ).join("");
        sections.push(`<details class="group-block mt-3" open id="examples">
            <summary class="ml-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Examples (${examples.length})</summary>
            <div class="mt-1 space-y-2">${sub}</div>
        </details>`);
    }

    return `<aside class="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 lg:block">
        <a href="index.html" class="block px-2 text-sm font-semibold text-slate-900 hover:text-sky-700">${esc(ctx.cfg.title ?? ctx.cfg.id)}</a>
        <p class="px-2 text-xs text-slate-500">v${esc(ctx.cfg.version)} · ${esc(ctx.target.name)}</p>
        <a href="artifacts.html" class="mt-3 inline-block px-2 text-xs font-medium text-sky-700 hover:underline">All artefacts →</a>
        <div class="mt-3 space-y-1">${sections.join("\n")}</div>
    </aside>`;
}
