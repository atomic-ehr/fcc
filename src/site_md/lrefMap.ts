// Link resolver (a step in injectRefLinks' chain-of-responsibility). Resolves a
// bracket label against the static reference-link map — built-in IG page labels,
// author `site({ refLinks })`, and pagecontent page titles (buildRoutes). First
// in the default chain, so these win over graph-derived names on a collision.
// Returns an href, or null to defer to the next resolver.
export default function lrefMap(ctx: Context, opts: { label: string }): string | null {
    const map = (ctx.state.site?.refLinkMap ?? {}) as Record<string, string>;
    return map[opts.label] ?? null;
}
