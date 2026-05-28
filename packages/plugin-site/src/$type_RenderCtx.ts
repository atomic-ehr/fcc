// All cross-file types come through the ambient `types.*` registry declared
// in ctx_ns.d.ts — never via `import`.

export type RenderCtx = {
    cfg: types.fcc.ResolvedConfig;
    target: types.fcc.Target;
    bundle: types.fcc.Bundle;
    /** Per-resource intro/notes HTML, keyed by `${resourceType}/${id}`. */
    notes?: Map<string, { intro?: string; notes?: string }>;
};

export type Breadcrumb = Array<{ label: string; href?: string }>;
