// Scan author markdown — content pages + canonical resource descriptions — for
// reference-shaped [labels] the resolver chain can't resolve: the broken cross-
// and intra-IG links the link-QA report surfaces (IG-Publisher HTMLInspector
// parity). Deterministic (a graph scan, not render-order dependent), so the
// report is the same however routes get rendered. Returns label → the page
// hrefs that use it (both sorted). Recomputed each call (invoked ~twice per
// build — the report + the artifacts link); not cached, because the obvious
// cache key (resource count) wouldn't invalidate on the common case of editing a
// page's markdown to fix a ref.
export default function collectUnresolvedRefs(ctx: Context, _opts: Record<string, never> = {} as Record<string, never>): Map<string, string[]> {
    const all = ctx.resources as Map<string, types.fcc.Resource>;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Same heuristic as injectRefLinks' red flag: a single PascalCase token (an
    // uppercase start + a lowercase letter) — excludes prose, [1], [TODO], paths.
    const isRefShaped = (l: string) => /^[A-Z][A-Za-z0-9]+$/.test(l) && /[a-z]/.test(l);

    const hits = new Map<string, Set<string>>();
    const scan = (md: string | undefined, source: string): void => {
        if (!md) return;
        const seen = new Set<string>();
        for (const m of md.matchAll(/\[([^\]\n]+)\](?!\()/g)) {
            const label = m[1]!;
            if (seen.has(label)) continue;
            seen.add(label);
            if (!isRefShaped(label)) continue;
            if (new RegExp(`^\\s*\\[${esc(label)}\\]:`, "m").test(md)) continue;     // author-defined → not broken
            if (ctx.fns.site_md.resolveLink(ctx, { label })) continue;               // resolves → not broken
            (hits.get(label) ?? hits.set(label, new Set()).get(label)!).add(source);
        }
    };

    for (const r of all.values()) {
        const d = r.data as { role?: string; slug?: string; md?: string; description?: string };
        if (r.resourceType === "Page") {
            if (d.role === "page") scan(d.md, `${d.slug}.html`);
        } else if (typeof d.description === "string") {
            scan(d.description, ctx.fns.site_core.pageHref(ctx, { resource: r }));
        }
    }

    return new Map(
        [...hits].map(([k, v]) => [k, [...v].sort()] as [string, string[]])
            .sort((a, b) => a[0].localeCompare(b[0])),
    );
}
