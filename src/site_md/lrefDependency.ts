// Link resolver (a step in injectRefLinks' chain-of-responsibility). Resolves a
// bracket label that names a DEPENDENCY resource — a full canonical URL, or the
// id of a resource in a `dependsOn` package — to its published page on the
// dependency's site (IG-Publisher #1, stage B). The index is built by the `deps`
// plugin onto ctx.state.deps; absent it (deps() not enabled), this defers.
// Sits after lrefResource in the chain, so a LOCAL resource of the same name
// still wins. Returns an absolute href, or null to defer to the next resolver.
type DepEntry = { webPath: string };
type DepIndex = { byCanonical: Map<string, DepEntry>; byId: Map<string, DepEntry> };

export default function lrefDependency(ctx: Context, opts: { label: string }): string | null {
    const idx = (ctx.state as { deps?: DepIndex }).deps;
    if (!idx) return null;
    const label = opts.label;

    const byUrl = idx.byCanonical.get(label);
    if (byUrl) return byUrl.webPath;

    // Match a dependency resource id/type name — but only for reference-shaped
    // labels (an uppercase letter or a hyphen: Patient, USCorePatient,
    // us-core-patient) so common lowercase prose words don't hit a package id.
    if (/[A-Z]/.test(label) || label.includes("-")) {
        const byId = idx.byId.get(label);
        if (byId) return byId.webPath;
    }
    return null;
}
