// Link resolver (a step in injectRefLinks' chain-of-responsibility). Resolves a
// bare [Name] / [id] / [Title] markdown reference to a conformance resource's
// page — fcc's graph-native equivalent of IG-Publisher's SUSHI-generated
// `fsh-link-references.md` (which fcc doesn't need, having the resource graph in
// memory). So `[RadiotherapyDoseDeliveredToVolume]` links to its profile page.
// Returns an href, or null to defer to the next resolver.
export default function lrefResource(ctx: Context, opts: { label: string }): string | null {
    return resourceLinkIndex(ctx).get(opts.label) ?? null;
}

// label → page href for every NAMED resource (name + bare id + title). Only
// named (canonical/conformance) resources are indexed — examples have generic
// ids (e.g. "example") that would falsely match prose. Built once and cached on
// ctx.state.site; re-derived when the resource-set size changes (covers add/drop
// across incremental rebuilds; a same-count rename is fixed by a dev restart).
function resourceLinkIndex(ctx: Context): Map<string, string> {
    const st = (ctx.state.site ?? (ctx.state.site = {})) as Record<string, any>;
    const all = ctx.resources as Map<string, types.fcc.Resource>;
    if (st.__resourceLinks instanceof Map && st.__resourceLinksSize === all.size) return st.__resourceLinks as Map<string, string>;

    const idx = new Map<string, string>();
    for (const r of all.values()) {
        const d = r.data as { name?: string; title?: string };
        if (r.resourceType === "Page" || !d.name) continue;             // named resources only
        const href = ctx.fns.site_core.pageHref(ctx, { resource: r });
        const bareId = r.id.includes("/") ? r.id.slice(r.id.indexOf("/") + 1) : r.id;
        for (const key of [d.name, bareId, d.title]) if (key && !idx.has(key)) idx.set(key, href);
    }
    st.__resourceLinks = idx;
    st.__resourceLinksSize = all.size;
    return idx;
}
