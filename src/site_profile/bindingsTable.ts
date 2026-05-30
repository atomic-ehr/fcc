// Gather every ElementDefinition.binding across the supplied elements into one
// terminology-bindings table (Path / Strength / ValueSet / Description).
// Returns "" when the profile binds no value sets.
export default function bindingsTable(ctx: Context, opts: { elements: Array<Record<string, unknown>> }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });

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
            <td class="px-3 py-1.5">${ctx.fns.site_core.tagBindingStrength(ctx, { s: b.strength ?? "" })}</td>
            <td class="px-3 py-1.5">${ctx.fns.site_core.linkCanonical(ctx, { url: b.valueSet, short: true })}</td>
            <td class="px-3 py-1.5 text-xs text-slate-600">${ctx.fns.site_md.mdInline(ctx, { md: b.description })}</td>
        </tr>`).join("");

    return ctx.fns.site_core.dataTable(ctx, { columns: ["Path", "Strength", "ValueSet", "Description"], rows, attached: true });
}
