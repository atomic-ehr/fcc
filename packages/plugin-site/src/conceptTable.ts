// Shared table of terminology concepts (Code / [System] / Display / [Definition]).
// Used by the CodeSystem page, the ValueSet CLD (explicit concept lists) and the
// ValueSet Expansion. `system` (when given) links each code to its code system.
export default function conceptTable(
    ctx: Context,
    opts: {
        concepts: Array<{ code: string; display?: string; definition?: string; system?: string }>;
        showSystem?: boolean;
        showDefinition?: boolean;
    },
): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    if (!opts.concepts.length) return `<p class="px-3 py-3 text-sm text-slate-500">No concepts.</p>`;

    const cols = ["Code", ...(opts.showSystem ? ["System"] : []), "Display", ...(opts.showDefinition ? ["Definition"] : [])];
    const rows = opts.concepts.map(c => {
        const sysCell = opts.showSystem ? `<td class="px-3 py-1.5 text-xs text-slate-500">${c.system ? ctx.fns.site.linkCanonical(ctx, { url: c.system, short: true }) : ""}</td>` : "";
        const defCell = opts.showDefinition ? `<td class="px-3 py-1.5 text-xs text-slate-600">${ctx.fns.site.mdInline(ctx, { md: c.definition })}</td>` : "";
        return `<tr class="even:bg-slate-50/40 align-top">
            <td class="px-3 py-1.5"><code class="rounded bg-slate-100 px-1 text-xs">${esc(c.code)}</code></td>
            ${sysCell}
            <td class="px-3 py-1.5 text-sm text-slate-800">${esc(c.display ?? "")}</td>
            ${defCell}
        </tr>`;
    }).join("");

    return `<div class="overflow-x-auto rounded border border-slate-200 bg-white">
        <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>${cols.map(c => `<th class="px-3 py-2">${esc(c)}</th>`).join("")}</tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${rows}</tbody>
        </table>
    </div>`;
}
