// "Quick Start" section (StructureDefinition): search parameters defined for the
// profile's resource type. Null when none apply.
export default function $section_quickStart(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const rt = (d.type as string) ?? "";
    const table = ctx.fns.site.quickStartTable(ctx, { resourceType: rt });
    if (!table) return null;
    const html = `<p class="mt-1 text-xs text-slate-500">Search parameters defined for the <code>${ctx.fns.site.htmlEscape(ctx, { s: rt })}</code> resource in this IG.</p>
        <div class="mt-2">${table}</div>`;
    return { title: "Quick Start", id: "quick-start", html };
}
