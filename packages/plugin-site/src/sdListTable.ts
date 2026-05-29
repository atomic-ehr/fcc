// Generate the profiles- or extensions-list table IG Publisher injects on the
// "Profiles and Extensions" page (from the SD set the liquid include would
// enumerate). kind "profile" = constraint SDs that aren't extensions; kind
// "extension" = type==="Extension". Name links to the SD page + description.
export default function sdListTable(ctx: Context, opts: { kind: "profile" | "extension" }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const out: types.fcc.Resource[] = [];
    for (const r of ctx.bundle.resources.values()) {
        if (r.resourceType !== "StructureDefinition") continue;
        if ((r.data as { __wasExample?: boolean }).__wasExample) continue;
        const isExt = (r.data as { type?: string }).type === "Extension";
        if (opts.kind === "extension" ? isExt : !isExt) out.push(r);
    }
    out.sort((a, b) => ctx.fns.site.titleOf(ctx, { resource: a }).localeCompare(ctx.fns.site.titleOf(ctx, { resource: b })));
    if (!out.length) return "";

    const rows = out.map(r => {
        const href = ctx.fns.site.pageHref(ctx, { resource: r });
        const title = esc(ctx.fns.site.titleOf(ctx, { resource: r }));
        const desc = (r.data as { description?: string }).description ?? "";
        return `<tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-1.5 text-sm whitespace-nowrap"><a class="text-sky-700 hover:underline" href="${href}">${title}</a></td>
            <td class="px-3 py-1.5 text-sm text-slate-600">${ctx.fns.site.mdInline(ctx, { md: desc })}</td>
        </tr>`;
    }).join("");

    return `<table class="grid min-w-full text-sm">
        <thead><tr class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th class="px-3 py-2">Name</th><th class="px-3 py-2">Description</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}
