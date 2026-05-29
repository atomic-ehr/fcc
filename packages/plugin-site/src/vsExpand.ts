// A best-effort local ValueSet expansion. We can only expand fully offline when
// every include is an explicit concept list (no filters, whole-system includes,
// imported value sets, or excludes — those need a terminology server). Returns
// the concept union when expandable, else null so the page can say so.
export default function vsExpand(
    ctx: Context,
    opts: { resource: types.fcc.Resource },
): { concepts: Array<{ code: string; display?: string; system?: string }> } | null {
    void ctx;
    const d = opts.resource.data as Record<string, unknown>;

    // Prefer a pre-computed expansion if the resource carries one.
    const pre = (d.expansion as { contains?: Array<{ code: string; display?: string; system?: string }> } | undefined)?.contains;
    if (pre?.length) return { concepts: pre };

    const compose = d.compose as { include?: Array<Record<string, unknown>>; exclude?: unknown[] } | undefined;
    if (!compose) return null;
    if (compose.exclude && compose.exclude.length) return null;
    const includes = compose.include ?? [];

    const out: Array<{ code: string; display?: string; system?: string }> = [];
    for (const inc of includes) {
        const concepts = inc.concept as Array<{ code: string; display?: string }> | undefined;
        if (!concepts || inc.filter || inc.valueSet) return null; // not locally expandable
        const system = inc.system as string | undefined;
        for (const c of concepts) out.push({ code: c.code, display: c.display, system });
    }
    return out.length ? { concepts: out } : null;
}
