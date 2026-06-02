// Authored intro/notes (input/intro-notes/<RT>-<id>-{intro,notes}.md) for a
// resource's canonical page. The pages() loader turns each file into an
// "intronotes" Page (role:"intronotes", soft `for` edge → "<RT>/<id>"); this
// reads them from the graph, rendering markdown → HTML and dropping comment-only
// templates, keyed by the target resource id. Built once + cached on
// ctx.state.site (re-rendered on a fresh build).
export default function notesFor(ctx: Context, opts: { resource: types.fcc.Resource }): { intro?: string; notes?: string } {
    return introNotesIndex(ctx).get(opts.resource.id) ?? {};
}

function introNotesIndex(ctx: Context): Map<string, { intro?: string; notes?: string }> {
    const st = (ctx.state.site ?? (ctx.state.site = {})) as Record<string, unknown>;
    if (st.__introNotes instanceof Map) return st.__introNotes as Map<string, { intro?: string; notes?: string }>;

    const idx = new Map<string, { intro?: string; notes?: string }>();
    for (const r of ctx.resources.values()) {
        const d = r.data as { role?: string; for?: string; intro?: string; notes?: string };
        if (r.resourceType !== "Page" || d.role !== "intronotes" || !d.for) continue;
        const out: { intro?: string; notes?: string } = {};
        for (const kind of ["intro", "notes"] as const) {
            const md = d[kind];
            if (!md) continue;
            const html = ctx.fns.site_md.mdToHtml(ctx, { md });
            // Drop unfilled templates: HTML that is only comments / whitespace once
            // tags are stripped — otherwise an empty "Notes" section would render.
            if (html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").trim()) out[kind] = html;
        }
        if (out.intro || out.notes) idx.set(d.for, out);
    }
    st.__introNotes = idx;
    return idx;
}
