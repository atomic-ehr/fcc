// Cross-view aggregate: /extensions.html — the Extensions registry (every
// Extension StructureDefinition with its value type + context), the grid authors
// live in. A code-defined $route_ over ctx.byType — pure, lazy, re-derived on
// render so it stays correct incrementally. IG-Publisher CrossViewRenderer
// parity (docs/ig-publisher-parity.md #6).
export default function $route_extensions(ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef {
    const pctx = opts.pluginCtx;
    return {
        path: "extensions.html",
        id: null,                                                   // aggregate — always re-rendered
        contentType: "text/html",
        render: () => {
            const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
            const exts = pctx.byType.StructureDefinition
                .filter(r => (r.data as { type?: string }).type === "Extension")
                .sort((a, b) => a.id.localeCompare(b.id));

            const rows = exts.map(r => {
                const d = r.data as Record<string, any>;
                const href = ctx.fns.site_core.pageHref(ctx, { resource: r });
                const title = esc((d.title as string) ?? (d.name as string) ?? (d.id as string));
                const ctxs = ((d.context ?? []) as Array<{ expression?: string }>).map(c => esc(c.expression ?? "")).join("<br>");
                const valEl = ((d.differential?.element ?? []) as Array<{ path?: string; type?: Array<{ code?: string }> }>)
                    .find(e => /\.value\[x]$/.test(e.path ?? ""));
                const valType = (valEl?.type ?? []).map(t => esc(t.code ?? "")).join(" | ");
                return `<tr class="border-t border-slate-100">
                    <td class="py-1.5 pr-4"><a href="${href}" class="text-sky-700 hover:underline">${title}</a></td>
                    <td class="py-1.5 pr-4 text-slate-600">${valType}</td>
                    <td class="py-1.5 text-xs text-slate-500">${ctxs}</td>
                </tr>`;
            }).join("");

            const content = `
                <h1 class="text-3xl font-semibold text-slate-900">Extensions</h1>
                <p class="mt-1 text-sm text-slate-500">${exts.length} extension${exts.length === 1 ? "" : "s"} defined in this IG.</p>
                <table class="mt-6 w-full max-w-4xl text-sm">
                    <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th class="pb-2 pr-4">Name</th><th class="pb-2 pr-4">Value type</th><th class="pb-2">Context</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;

            return ctx.fns.site_core.layout(ctx, {
                title: "Extensions",
                content,
                breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Extensions" }],
                activeNav: "profiles",
            });
        },
    };
}
