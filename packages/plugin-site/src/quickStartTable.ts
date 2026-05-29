// Quick Start: the SearchParameters that apply to this profile's resource
// type, rendered as a Conformance / Parameter / Type / Definition table.
// Returns "" when none apply.
export default function quickStartTable(ctx: Context, opts: { resourceType: string }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const params = ctx.fns.site.searchParamsFor(ctx, { resourceType: opts.resourceType });
    if (!params.length) return "";

    const rows = params.map(p => {
        const d = p.data as { code?: string; type?: string; description?: string };
        const href = ctx.fns.site.pageHref(ctx, { resource: p });
        return `<tr class="even:bg-slate-50/40 align-top">
            <td class="px-3 py-1.5"><a class="font-mono text-xs text-sky-700 hover:underline" href="${href}">${esc(d.code ?? "")}</a></td>
            <td class="px-3 py-1.5">${ctx.fns.site.pillType(ctx, { t: d.type ?? "" })}</td>
            <td class="prose prose-sm max-w-none px-3 py-1.5 text-xs text-slate-600">${ctx.fns.site.mdInline(ctx, { md: d.description })}</td>
        </tr>`;
    }).join("");

    return `<div class="overflow-x-auto rounded border border-slate-200 bg-white">
        <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                    <th class="px-3 py-2">Parameter</th>
                    <th class="px-3 py-2">Type</th>
                    <th class="px-3 py-2">Definition</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${rows}</tbody>
        </table>
    </div>`;
}
