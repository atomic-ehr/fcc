// Resolve a fn by bare name across all loaded namespaces. fn names are unique
// across the codebase (they were one namespace), so this is deterministic. Used
// by the string-keyed registry dispatch (tabs render/avail, $section ids,
// $block render) which doesn't know which namespace a key lives in.
export default function resolveFn(ctx: Context, opts: { key: string }): any {
    const fns = ctx.fns as unknown as Record<string, Record<string, unknown>>;
    for (const ns of Object.keys(fns)) {
        const f = fns[ns]?.[opts.key];
        if (typeof f === "function") return f;
    }
    return undefined;
}
