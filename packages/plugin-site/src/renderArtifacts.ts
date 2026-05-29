export default function renderArtifacts(ctx: Context, _opts: {} = {}): string {
    const groups: Record<string, types.fcc.Resource[]> = {};
    const examples: types.fcc.Resource[] = [];
    const split = ctx.fns.site.featureOn(ctx, { name: "splitExtensions" });
    for (const r of ctx.bundle.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if ((r.data as { __wasExample?: boolean }).__wasExample) { examples.push(r); continue; }
        // Split StructureDefinition into Profiles vs Extensions, like IG Publisher.
        const key = (split && r.resourceType === "StructureDefinition" && (r.data as { type?: string }).type === "Extension")
            ? "Extension" : r.resourceType;
        (groups[key] ||= []).push(r);
    }

    const sortedTypes = Object.entries(groups)
        .sort(([a], [b]) => ctx.fns.site.order(ctx, { t: a }) - ctx.fns.site.order(ctx, { t: b }) || a.localeCompare(b))
        .map(([type, list]) => ({ type, list, label: ctx.fns.site.humanType(ctx, { t: type }) }));

    const conformanceBlocks = sortedTypes
        .map(g => ctx.fns.site.artifactTable(ctx, { label: g.label, anchor: g.type, list: g.list }))
        .join("");

    const examplesBlock = examples.length
        ? ctx.fns.site.artifactTable(ctx, { label: "Examples", anchor: "examples", list: examples })
        : "";

    const tocItems = [
        ...sortedTypes.map(g => ({ label: `${g.label} (${g.list.length})`, anchor: g.type })),
        ...(examples.length ? [{ label: `Examples (${examples.length})`, anchor: "examples" }] : []),
    ];

    return ctx.fns.site.layout(ctx, {
        title: "Artefacts",
        content: `
            <h1 class="text-3xl font-semibold text-slate-900">Artefacts</h1>
            <p class="mt-2 text-sm text-slate-600">All conformance resources and examples emitted by this IG.</p>
            ${ctx.fns.site.pageToc(ctx, { items: tocItems })}
            ${conformanceBlocks}
            ${examplesBlock}
        `,
        breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Artefacts" }],
        activeNav: "artifacts",
    });
}
