// Cross-view aggregate: /status.html — the maturity overview table (every
// conformance resource with its standards-status / FMM / work-group), the
// companion to the per-page status badges. IG-Publisher StatusRenderer aggregate
// (docs/ig-publisher-parity.md #7).
const SS = "http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status";
const FMM = "http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm";
const WG = "http://hl7.org/fhir/StructureDefinition/structuredefinition-wg";

export default function $route_status(ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef {
    const pctx = opts.pluginCtx;
    return {
        path: "status.html",
        id: null,
        contentType: "text/html",
        render: () => {
            const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
            const list = [...pctx.resources.values()]
                .filter(r => r.resourceType !== "ImplementationGuide" && r.resourceType !== "Page" && !(r.data as { __wasExample?: boolean }).__wasExample)
                .sort((a, b) => (a.resourceType + a.id).localeCompare(b.resourceType + b.id));

            const rows = list.map(r => {
                const d = r.data as Record<string, any>;
                const ext = (d.extension as Array<Record<string, any>> | undefined) ?? [];
                const find = (u: string) => ext.find(e => e.url === u);
                const ss = (find(SS)?.valueCode as string | undefined) ?? "";
                const fmm = find(FMM)?.valueInteger as number | undefined;
                const wg = (find(WG)?.valueCode as string | undefined) ?? "";
                const href = ctx.fns.site_core.pageHref(ctx, { resource: r });
                const title = esc((d.title as string) ?? (d.name as string) ?? (d.id as string));
                return `<tr class="border-t border-slate-100">
                    <td class="py-1.5 pr-4"><a href="${href}" class="text-sky-700 hover:underline">${title}</a></td>
                    <td class="py-1.5 pr-4 text-slate-500">${esc(ctx.fns.site_core.humanType(ctx, { t: r.resourceType }))}</td>
                    <td class="py-1.5 pr-4">${esc(ss.replace(/-/g, " "))}</td>
                    <td class="py-1.5 pr-4 text-right tabular-nums">${fmm ?? ""}</td>
                    <td class="py-1.5 text-slate-500">${esc(wg)}</td>
                </tr>`;
            }).join("");

            const content = `
                <h1 class="text-3xl font-semibold text-slate-900">Status &amp; maturity</h1>
                <p class="mt-1 text-sm text-slate-500">Standards-status, FMM and work-group for ${list.length} conformance resource${list.length === 1 ? "" : "s"}.</p>
                <table class="mt-6 w-full text-sm">
                    <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th class="pb-2 pr-4">Name</th><th class="pb-2 pr-4">Type</th><th class="pb-2 pr-4">Standards status</th><th class="pb-2 pr-4 text-right">FMM</th><th class="pb-2">WG</th>
                    </tr></thead><tbody>${rows}</tbody>
                </table>`;
            return ctx.fns.site_core.layout(ctx, {
                title: "Status & maturity",
                content,
                breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Status" }],
                activeNav: "artifacts",
            });
        },
    };
}
