// Cross-view aggregate: /search-parameters.html — every SearchParameter (name →
// code → base → type → expression), the list authors check against a server's
// capabilities. A code-defined $route_ over ctx.byType.SearchParameter; pure,
// lazy. IG-Publisher CrossViewRenderer parity (docs/ig-publisher-parity.md #6).
export default function $route_searchParameters(ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef {
    const pctx = opts.pluginCtx;
    return {
        path: "search-parameters.html",
        id: null,
        contentType: "text/html",
        render: () => {
            const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
            const sps = pctx.byType.SearchParameter.slice().sort((a, b) => a.id.localeCompare(b.id));
            const rows = sps.map(r => {
                const d = r.data as Record<string, any>;
                const href = ctx.fns.site_core.pageHref(ctx, { resource: r });
                const title = esc((d.title as string) ?? (d.name as string) ?? (d.id as string));
                const base = ((d.base ?? []) as string[]).map(esc).join(", ");
                return `<tr class="border-t border-slate-100">
                    <td class="py-1.5 pr-4"><a href="${href}" class="text-sky-700 hover:underline">${title}</a></td>
                    <td class="py-1.5 pr-4"><code class="text-xs text-slate-600">${esc(d.code ?? "")}</code></td>
                    <td class="py-1.5 pr-4 text-slate-600">${base}</td>
                    <td class="py-1.5 pr-4 text-slate-600">${esc(d.type ?? "")}</td>
                    <td class="py-1.5 font-mono text-xs text-violet-700">${esc(d.expression ?? "")}</td>
                </tr>`;
            }).join("");
            const content = `
                <h1 class="text-3xl font-semibold text-slate-900">Search Parameters</h1>
                <p class="mt-1 text-sm text-slate-500">${sps.length} search parameter${sps.length === 1 ? "" : "s"} defined in this IG.</p>
                <table class="mt-6 w-full text-sm">
                    <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th class="pb-2 pr-4">Name</th><th class="pb-2 pr-4">Code</th><th class="pb-2 pr-4">Base</th><th class="pb-2 pr-4">Type</th><th class="pb-2">Expression</th>
                    </tr></thead><tbody>${rows}</tbody>
                </table>`;
            return ctx.fns.site_core.layout(ctx, {
                title: "Search Parameters",
                content,
                breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Search Parameters" }],
                activeNav: "artifacts",
            });
        },
    };
}
