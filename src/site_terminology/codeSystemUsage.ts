// ValueSets that reference this CodeSystem in their compose (include/exclude
// .system) — IG Publisher's "referenced in the content logical definition of
// the following value sets" section. Sorted by id for stable output.
export default function codeSystemUsage(ctx: Context, opts: { resource: types.fcc.Resource }): types.fcc.Resource[] {
    const url = (opts.resource.data as { url?: string }).url;
    if (!url) return [];
    const out: types.fcc.Resource[] = [];
    for (const r of ctx.resources.values()) {
        if (r.resourceType !== "ValueSet") continue;
        const compose = (r.data as { compose?: { include?: any[]; exclude?: any[] } }).compose;
        const groups = [...(compose?.include ?? []), ...(compose?.exclude ?? [])];
        if (groups.some(g => g?.system && String(g.system).split("|", 1)[0] === url)) out.push(r);
    }
    out.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    return out;
}
