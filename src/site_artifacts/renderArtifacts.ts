export default function renderArtifacts(ctx: Context, _opts: {} = {}): string {
    const groups: Record<string, types.fcc.Resource[]> = {};
    const examples: types.fcc.Resource[] = [];
    const split = ctx.fns.site_core.featureOn(ctx, { name: "splitExtensions" });
    for (const r of ctx.resources.values()) {
        if (r.resourceType === "ImplementationGuide" || r.resourceType === "Page") continue;
        if ((r.data as { __wasExample?: boolean }).__wasExample) { examples.push(r); continue; }
        // Split StructureDefinition into Profiles vs Extensions, like IG Publisher.
        const key = (split && r.resourceType === "StructureDefinition" && (r.data as { type?: string }).type === "Extension")
            ? "Extension" : r.resourceType;
        (groups[key] ||= []).push(r);
    }

    const sortedTypes = Object.entries(groups)
        .sort(([a], [b]) => ctx.fns.site_core.order(ctx, { t: a }) - ctx.fns.site_core.order(ctx, { t: b }) || a.localeCompare(b))
        .map(([type, list]) => ({ type, list, label: ctx.fns.site_core.humanType(ctx, { t: type }) }));

    const conformanceBlocks = sortedTypes
        .map(g => ctx.fns.site_artifacts.artifactTable(ctx, { label: g.label, anchor: g.type, list: g.list }))
        .join("");

    const examplesBlock = examples.length
        ? ctx.fns.site_artifacts.artifactTable(ctx, { label: "Examples", anchor: "examples", list: examples })
        : "";

    // Cross-view registry pages (IG-Publisher CrossViewRenderer).
    const crossViews = [
        ctx.byType.StructureDefinition.some(r => (r.data as { type?: string }).type === "Extension") ? { label: "Extensions registry", href: "extensions.html" } : null,
        ctx.byType.StructureDefinition.some(r => { const d = r.data as { type?: string; derivation?: string }; return d.type === "Observation" && d.derivation === "constraint"; }) ? { label: "Observations", href: "observations.html" } : null,
        ctx.byType.SearchParameter.length ? { label: "Search Parameters", href: "search-parameters.html" } : null,
        { label: "Status & maturity", href: "status.html" },
        Object.keys((ctx.config as { deps?: Record<string, string> }).deps ?? {}).length ? { label: "Dependencies", href: "dependencies.html" } : null,
        ctx.fns.site_md.collectUnresolvedRefs(ctx).size ? { label: "Unresolved references", href: "qa-links.html" } : null,
    ].filter(Boolean) as { label: string; href: string }[];
    const crossViewBlock = crossViews.length
        ? `<div class="mt-4 flex flex-wrap gap-2">${crossViews.map(v =>
            `<a href="${v.href}" class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-sky-700 hover:border-sky-300">${v.label} →</a>`).join("")}</div>`
        : "";

    const tocItems = [
        ...sortedTypes.map(g => ({ label: `${g.label} (${g.list.length})`, anchor: g.type })),
        ...(examples.length ? [{ label: `Examples (${examples.length})`, anchor: "examples" }] : []),
    ];

    return ctx.fns.site_core.layout(ctx, {
        title: "Artefacts",
        content: `
            <h1 class="text-3xl font-semibold text-slate-900">Artefacts</h1>
            <p class="mt-2 text-sm text-slate-600">All conformance resources and examples emitted by this IG.</p>
            ${crossViewBlock}
            ${ctx.fns.site_artifacts.pageToc(ctx, { items: tocItems })}
            ${conformanceBlocks}
            ${examplesBlock}
        `,
        breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Artefacts" }],
        activeNav: "artifacts",
    });
}
