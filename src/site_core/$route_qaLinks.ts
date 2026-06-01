// /qa-links.html — the unresolved-reference (broken-link) report, IG-Publisher
// HTMLInspector parity (#4, the link-checker). Lists every reference-shaped
// [label] in author markdown that resolves to nothing — a typo, a profile that
// failed to build, or a cross-IG name with no resolver — and the pages using it.
// Broken links are WARNINGS (they flag problems but don't block the build).
// Present only when there are unresolved refs; works without a validator (so it
// covers FSH IGs like mCODE that run no QA validators).
export default function $route_qaLinks(ctx: Context, _opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef | null {
    const unresolved = ctx.fns.site_md.collectUnresolvedRefs(ctx);
    if (!unresolved.size) return null;

    return {
        path: "qa-links.html",
        id: null,                                                   // aggregate — always re-rendered
        contentType: "text/html",
        render: () => {
            const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
            const total = unresolved.size;
            const rows = [...unresolved.entries()].map(([label, pages]) => `
                <tr class="border-t border-slate-100 align-top">
                    <td class="py-1.5 pr-4"><code class="rounded bg-rose-50 px-1 text-rose-700">[${esc(label)}]</code></td>
                    <td class="py-1.5 pr-4 text-right tabular-nums text-slate-500">${pages.length}</td>
                    <td class="py-1.5 text-xs text-slate-600">${pages.slice(0, 8).map(p => `<a class="text-sky-700 hover:underline" href="${esc(p)}">${esc(p)}</a>`).join(", ")}${pages.length > 8 ? `, … +${pages.length - 8}` : ""}</td>
                </tr>`).join("");

            const content = `
                <h1 class="text-3xl font-semibold text-slate-900">Unresolved references</h1>
                <p class="mt-2 max-w-3xl text-sm text-slate-600">${total} reference-shaped <code>[Name]</code> link(s) in the IG's markdown resolve to nothing — a typo, a profile that failed to build, or a cross-IG name with no resolver. <span class="text-amber-700">Warnings</span>: these don't block the build, but each is a broken link on the published site. (IG-Publisher <code>HTMLInspector</code> link check.)</p>
                <table class="mt-6 w-full max-w-4xl text-sm">
                    <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th class="pb-2 pr-4">Reference</th><th class="pb-2 pr-4 text-right">Uses</th><th class="pb-2">On pages</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;

            return ctx.fns.site_core.layout(ctx, {
                title: "Unresolved references",
                content,
                breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Unresolved references" }],
                activeNav: "errors",
            });
        },
    };
}
