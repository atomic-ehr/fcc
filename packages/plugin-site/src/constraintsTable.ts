// Gather every ElementDefinition.constraint across the supplied elements into
// one invariants table (Key / On / Severity / Requirements / Expression).
// Returns "" when the profile declares no constraints of its own.
export default function constraintsTable(ctx: Context, opts: { elements: Array<Record<string, unknown>> }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });

    type Inv = { key: string; severity?: string; human?: string; expression?: string; path: string };
    const invs: Inv[] = [];
    for (const e of opts.elements) {
        const cs = e.constraint as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(cs)) continue;
        for (const c of cs) {
            invs.push({
                key:        String(c.key ?? ""),
                severity:   c.severity as string | undefined,
                human:      c.human as string | undefined,
                expression: c.expression as string | undefined,
                path:       String(e.path ?? ""),
            });
        }
    }
    if (!invs.length) return "";

    const sev = (s?: string) => {
        const color = s === "error" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800";
        return `<span class="rounded ${color} px-1.5 py-0.5 text-[10px] font-semibold uppercase">${esc(s ?? "")}</span>`;
    };
    const rows = invs.map(c => `
        <tr class="even:bg-slate-50/40 align-top">
            <td class="px-3 py-1.5 font-mono text-xs text-slate-900">${esc(c.key)}</td>
            <td class="px-3 py-1.5 font-mono text-xs text-slate-500">${esc(c.path)}</td>
            <td class="px-3 py-1.5">${sev(c.severity)}</td>
            <td class="px-3 py-1.5 text-xs text-slate-700">${ctx.fns.site.mdInline(ctx, { md: c.human })}</td>
            <td class="px-3 py-1.5"><code class="text-[11px] text-slate-600">${esc(c.expression ?? "")}</code></td>
        </tr>`).join("");

    return `<div class="overflow-x-auto rounded-b border border-t-0 border-slate-200 bg-white">
        <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                    <th class="px-3 py-2">Key</th>
                    <th class="px-3 py-2">On</th>
                    <th class="px-3 py-2">Severity</th>
                    <th class="px-3 py-2">Requirements</th>
                    <th class="px-3 py-2">Expression</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${rows}</tbody>
        </table>
    </div>`;
}
