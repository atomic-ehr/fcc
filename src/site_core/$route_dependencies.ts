// /dependencies.html — the IG's dependency table (IG-Publisher DependencyRenderer
// parity, #10). Lists every `dependsOn` package: version, FHIR version, published
// site, and whether it was found in the FHIR package cache + indexed for cross-IG
// resolution. Reads the declared deps (config) cross-referenced with the deps
// plugin's index (ctx.state.deps). Present only when the IG declares dependencies.
export default function $route_dependencies(ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef | null {
    const declared = ((opts.pluginCtx.config as { deps?: Record<string, string> }).deps ?? {});
    const ids = Object.keys(declared);
    if (!ids.length) return null;

    return {
        path: "dependencies.html",
        id: null,                                                   // aggregate — always re-rendered
        contentType: "text/html",
        render: () => {
            const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
            type DepPkg = { id: string; version: string; base: string; fhirVersion?: string };
            const index = (ctx.state as { deps?: { packages: DepPkg[] } }).deps;
            const byKey = new Map((index?.packages ?? []).map(p => [`${p.id}#${p.version}`, p]));

            const rows = ids.map(id => {
                const version = declared[id]!;
                const pkg = byKey.get(`${id}#${version}`);
                const loaded = !!pkg;
                const site = pkg?.base ? `<a class="text-sky-700 hover:underline" href="${esc(pkg.base)}">${esc(pkg.base)}</a>` : `<span class="text-slate-300">—</span>`;
                const status = loaded
                    ? `<span class="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">cached</span>`
                    : `<span class="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">not in cache</span>`;
                return `<tr class="border-t border-slate-100 align-top">
                    <td class="py-1.5 pr-4"><code class="text-xs text-slate-700">${esc(id)}</code></td>
                    <td class="py-1.5 pr-4 text-slate-600">${esc(version)}</td>
                    <td class="py-1.5 pr-4 text-slate-500">${esc(pkg?.fhirVersion ?? "—")}</td>
                    <td class="py-1.5 pr-4 text-xs">${site}</td>
                    <td class="py-1.5">${status}</td>
                </tr>`;
            }).join("");

            const loaded = ids.filter(id => byKey.has(`${id}#${declared[id]}`)).length;
            const content = `
                <h1 class="text-3xl font-semibold text-slate-900">Dependencies</h1>
                <p class="mt-1 text-sm text-slate-500">${ids.length} declared dependenc${ids.length === 1 ? "y" : "ies"}${index ? `, ${loaded} indexed from the FHIR package cache for cross-IG resolution` : ""}.</p>
                <table class="mt-6 w-full max-w-4xl text-sm">
                    <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th class="pb-2 pr-4">Package</th><th class="pb-2 pr-4">Version</th><th class="pb-2 pr-4">FHIR</th><th class="pb-2 pr-4">Site</th><th class="pb-2">Status</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;

            return ctx.fns.site_core.layout(ctx, {
                title: "Dependencies",
                content,
                breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Dependencies" }],
                activeNav: "artifacts",
            });
        },
    };
}
