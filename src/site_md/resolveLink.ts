// Run the pluggable link-resolver chain (ctx.state.site.linkResolvers) for one
// bracket label: each resolver is `(ctx,{label}) -> href|null`, resolved across
// namespaces via resolveFn; the first non-null wins, so chain order is
// precedence. Shared by injectRefLinks (render) and collectUnresolvedRefs (the
// link-QA scan) so both judge "resolvable" identically.
export default function resolveLink(ctx: Context, opts: { label: string }): string | null {
    const chain = (ctx.state.site?.linkResolvers ?? []) as string[];
    for (const name of chain) {
        const fn = ctx.fns.site_core.resolveFn(ctx, { key: name }) as ((c: Context, o: { label: string }) => string | null) | undefined;
        const href = typeof fn === "function" ? fn(ctx, { label: opts.label }) : null;
        if (href) return href;
    }
    return null;
}
