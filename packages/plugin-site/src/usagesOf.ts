// Reverse index: which other StructureDefinitions reference this profile's
// canonical url — as a base (baseDefinition), as an element type profile, or
// as a reference target (type[].targetProfile). Mirrors the "Usages" section
// on the published IG. Examples are handled separately by examplesForProfile.
export default function usagesOf(ctx: Context, opts: { profile: types.fcc.Resource }): types.fcc.Resource[] {
    const url = opts.profile.url;
    if (!url) return [];
    const selfId = opts.profile.id;
    const out: types.fcc.Resource[] = [];

    for (const r of ctx.bundle.resources.values()) {
        if (r.id === selfId) continue;
        const d = r.data as Record<string, any>;

        // CapabilityStatements that name this profile anywhere in their JSON.
        if (r.resourceType === "CapabilityStatement") {
            if (JSON.stringify(d).includes(url)) out.push(r);
            continue;
        }
        if (r.resourceType !== "StructureDefinition") continue;

        let refs = d.baseDefinition === url;
        if (!refs) {
            const diff = d.differential?.element as Array<Record<string, any>> | undefined;
            const snap = d.snapshot?.element as Array<Record<string, any>> | undefined;
            for (const e of [...(diff ?? []), ...(snap ?? [])]) {
                for (const t of (e.type ?? []) as Array<Record<string, any>>) {
                    const cands = [...(t.profile ?? []), ...(t.targetProfile ?? [])];
                    if (cands.some((c: string) => c.split("|", 1)[0] === url)) { refs = true; break; }
                }
                if (refs) break;
            }
        }
        if (refs) out.push(r);
    }
    out.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    return out;
}
