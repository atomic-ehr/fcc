// Gather every ElementDefinition.binding across the supplied elements into one
// terminology-bindings table (Path / Strength / ValueSet / Description).
// Returns "" when the profile binds no value sets.
export default function bindingsTable(ctx: Context, opts: { elements: Array<Record<string, unknown>> }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });

    type B = { path: string; strength?: string; valueSet?: string; description?: string };
    const binds: B[] = [];
    for (const e of opts.elements) {
        const b = e.binding as Record<string, unknown> | undefined;
        if (!b) continue;
        binds.push({
            path:        String(e.path ?? ""),
            strength:    b.strength as string | undefined,
            valueSet:    b.valueSet as string | undefined,
            description: b.description as string | undefined,
        });
    }
    if (!binds.length) return "";

    const rows = binds.map(b => `
        <tr class="even:bg-slate-50/40 align-top">
            <td class="px-3 py-1.5 font-mono text-xs text-slate-900">${esc(b.path)}</td>
            <td class="px-3 py-1.5">${ctx.fns.site.tagBindingStrength(ctx, { s: b.strength ?? "" })}</td>
            <td class="px-3 py-1.5">${ctx.fns.site.linkCanonical(ctx, { url: b.valueSet, short: true })}</td>
            <td class="px-3 py-1.5 text-xs text-slate-600">${esc(b.description ?? "")}</td>
        </tr>`).join("");

    return `<div class="overflow-x-auto rounded-b border border-t-0 border-slate-200 bg-white">
        <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                    <th class="px-3 py-2">Path</th>
                    <th class="px-3 py-2">Strength</th>
                    <th class="px-3 py-2">ValueSet</th>
                    <th class="px-3 py-2">Description</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${rows}</tbody>
        </table>
    </div>`;
}
