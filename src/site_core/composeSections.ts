// Compose a Page's `sections` keyed-map into the page body HTML: sort by `order`,
// dispatch each section by `type` to its `$section_<type>` renderer (resolved
// across namespaces via resolveFn — fn names are globally unique), drop null/empty
// renders, join. The inline body of the unified Page model (docs/page.md § Sections);
// `as: "tab"|"raw"` sections are handled by route emission, not here.
export default async function composeSections(
    ctx: Context,
    opts: { sections?: Record<string, { type: string; order?: number; as?: string }> },
): Promise<string> {
    const list = Object.entries(opts.sections ?? {})
        .map(([id, s]) => ({ id, ...s }))
        .filter(s => (s.as ?? "inline") === "inline")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const out: string[] = [];
    for (const s of list) {
        const fn = ctx.fns.site_core.resolveFn(ctx, { key: "$section_" + s.type });
        if (!fn) continue;
        const r = await fn(ctx, { section: s });
        if (r && r.html) out.push(r.html as string);
    }
    return out.join("\n");
}
