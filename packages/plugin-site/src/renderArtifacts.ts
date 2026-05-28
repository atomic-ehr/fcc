export default function renderArtifacts(ctx: Context, _opts: {} = {}): string {
    const groups: Record<string, types.fcc.Resource[]> = {};
    const examples: types.fcc.Resource[] = [];
    for (const r of ctx.bundle.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if ((r.data as { __wasExample?: boolean }).__wasExample) { examples.push(r); continue; }
        (groups[r.resourceType] ||= []).push(r);
    }

    const conformanceBlocks = Object.entries(groups)
        .sort(([a], [b]) => ctx.fns.site.order(ctx, { t: a }) - ctx.fns.site.order(ctx, { t: b }) || a.localeCompare(b))
        .map(([type, list]) => ctx.fns.site.artifactTable(ctx, {
            label: ctx.fns.site.humanType(ctx, { t: type }),
            anchor: type,
            list,
        }))
        .join("");

    const examplesBlock = examples.length
        ? ctx.fns.site.artifactTable(ctx, { label: "Examples", anchor: "examples", list: examples })
        : "";

    return ctx.fns.site.layout(ctx, {
        title: "Artefacts",
        content: `
            <h1 class="text-3xl font-semibold text-slate-900">Artefacts</h1>
            <p class="mt-2 text-sm text-slate-600">All conformance resources and examples emitted by this IG.</p>
            ${conformanceBlocks}
            ${examplesBlock}
        `,
        breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Artefacts" }],
        activeNav: "artifacts",
    });
}
