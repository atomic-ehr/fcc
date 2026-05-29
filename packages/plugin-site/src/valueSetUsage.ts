// StructureDefinitions that bind this ValueSet (any element.binding.valueSet) —
// IG Publisher's ValueSet "References" section. Scans differential + snapshot
// element bindings; compares on the base canonical (ignoring |version).
export default function valueSetUsage(ctx: Context, opts: { resource: types.fcc.Resource }): types.fcc.Resource[] {
    const url = (opts.resource.data as { url?: string }).url;
    if (!url) return [];
    const out: types.fcc.Resource[] = [];
    for (const r of ctx.bundle.resources.values()) {
        if (r.resourceType !== "StructureDefinition") continue;
        const d = r.data as { differential?: { element?: any[] }; snapshot?: { element?: any[] } };
        const els = [...(d.differential?.element ?? []), ...(d.snapshot?.element ?? [])];
        if (els.some(e => e?.binding?.valueSet && String(e.binding.valueSet).split("|", 1)[0] === url)) out.push(r);
    }
    out.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    return out;
}
