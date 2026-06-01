// Link resolver (a step in injectRefLinks' chain-of-responsibility). Resolves a
// bracket label that is an FSH `Alias: Name = <url>` declaration (collected by
// the fsh loader into ctx.state.fshAliases) to the page of the canonical it
// names — a LOCAL resource's page if the url is in-bundle, else the dependency's
// published page. Lets mCODE-style [USCorePatient] links work. Sits after
// lrefResource (a real local name of the same spelling still wins). Returns an
// href, or null to defer to the next resolver.
export default function lrefAlias(ctx: Context, opts: { label: string }): string | null {
    const aliases = (ctx.state as { fshAliases?: Record<string, string> }).fshAliases;
    const url = aliases?.[opts.label];
    if (!url) return null;
    const bare = url.split("|", 1)[0]!;

    // in-bundle canonical → its local page
    const localId = ctx.byCanonical?.get(bare) ?? ctx.byCanonical?.get(url);
    if (localId) {
        const r = ctx.resources.get(localId);
        if (r) return ctx.fns.site_core.pageHref(ctx, { resource: r });
    }
    // dependency canonical → its published page
    const dep = (ctx.state as { deps?: { byCanonical: Map<string, { webPath: string }> } }).deps?.byCanonical.get(bare);
    return dep ? dep.webPath : null;
}
