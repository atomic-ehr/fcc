// SearchParameters in the bundle whose `base` includes the given resource
// type. Powers the Quick Start section. Sorted by code for stable output.
export default function searchParamsFor(ctx: Context, opts: { resourceType: string }): types.fcc.Resource[] {
    const rt = opts.resourceType;
    const out: types.fcc.Resource[] = [];
    for (const r of ctx.resources.values()) {
        if (r.resourceType !== "SearchParameter") continue;
        const base = ([] as string[]).concat((r.data as { base?: string | string[] }).base ?? []);
        if (base.includes(rt)) out.push(r);
    }
    out.sort((a, b) => {
        const ca = (a.data as { code?: string }).code ?? "";
        const cb = (b.data as { code?: string }).code ?? "";
        return ca.localeCompare(cb);
    });
    return out;
}
