// Is a named page section/feature enabled? Reads the project's site({ features })
// toggle map (ctx.state.site.features), falling back to the caller's default
// (most features default on). The single switch every optional section checks,
// so features are uniformly configurable and new ones plug in for free.
export default function featureOn(ctx: Context, opts: { name: string; default?: boolean }): boolean {
    const f = (ctx.state.site?.features ?? {}) as Record<string, boolean>;
    return f[opts.name] ?? (opts.default ?? true);
}
