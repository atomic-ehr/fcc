// Quick Start: the SearchParameters that apply to this profile's resource
// type, rendered as a Conformance / Parameter / Type / Definition table.
// Returns "" when none apply.
export default function quickStartTable(ctx: Context, opts: { resourceType: string }): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const params = ctx.fns.profile.searchParamsFor(ctx, { resourceType: opts.resourceType });
    if (!params.length) return "";

    const rows = params.map(p => {
        const d = p.data as { code?: string; type?: string; description?: string };
        const href = ctx.fns.core.pageHref(ctx, { resource: p });
        return `<tr class="even:bg-slate-50/40 align-top">
            <td class="px-3 py-1.5"><a class="font-mono text-xs text-sky-700 hover:underline" href="${href}">${esc(d.code ?? "")}</a></td>
            <td class="px-3 py-1.5">${ctx.fns.core.pillType(ctx, { t: d.type ?? "" })}</td>
            <td class="prose prose-sm max-w-none px-3 py-1.5 text-xs text-slate-600">${ctx.fns.md.mdInline(ctx, { md: d.description })}</td>
        </tr>`;
    }).join("");

    return ctx.fns.core.dataTable(ctx, { columns: ["Parameter", "Type", "Definition"], rows });
}
