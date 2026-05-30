// Find examples whose meta.profile references the given profile's url.
// FHIR allows `<canonical>|<version>` in meta.profile entries; compare on the
// base URL only so version pins still match.
export default function examplesForProfile(ctx: Context, opts: { profile: types.fcc.Resource }): types.fcc.Resource[] {
    const url = opts.profile.url;
    if (!url) return [];
    const out: types.fcc.Resource[] = [];
    for (const r of ctx.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if (!(r.data as { __wasExample?: boolean }).__wasExample) continue;
        const profiles = ((r.data as { meta?: { profile?: string[] } }).meta?.profile) ?? [];
        if (profiles.some(p => p.split("|", 1)[0] === url)) out.push(r);
    }
    return out;
}
