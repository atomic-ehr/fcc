// Layer a project's per-resourceType tab overrides over the built-in defaults.
// Each opts.tabs[key] is either a full TabDescriptor[] (replace the set) or a
// merge-spec { replace?, remove?, extend? } applied over the default set.
export default function mergeTabs(
    ctx: Context,
    opts: { defaults: Record<string, types.core.TabDescriptor[]>; overrides?: Record<string, types.core.TabDescriptor[] | types.core.TabMergeSpec> },
): Record<string, types.core.TabDescriptor[]> {
    void ctx;
    const out: Record<string, types.core.TabDescriptor[]> = {};
    for (const [k, v] of Object.entries(opts.defaults)) out[k] = v.slice();
    if (!opts.overrides) return out;

    for (const [key, spec] of Object.entries(opts.overrides)) {
        if (Array.isArray(spec)) { out[key] = spec.slice(); continue; }
        const base = (spec.replace ?? out[key] ?? out["*"] ?? []).slice();
        const removed = spec.remove?.length ? base.filter(t => !spec.remove!.includes(t.id)) : base;
        out[key] = spec.extend?.length ? [...removed, ...spec.extend] : removed;
    }
    return out;
}
