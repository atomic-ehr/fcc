// "Narrative" section: a meaningful authored text.div, else a generated
// IG-Publisher-style narrative (generateNarrative, which special-cases Bundles).
export default function $section_narrative(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const authored = ((r.data as { text?: { div?: string } }).text?.div) ?? "";
    const inner = authored.replace(/<[^>]+>/g, "").trim().length > 40
        ? `<div class="prose prose-slate max-w-none">${ctx.fns.md.sanitizeHtml(ctx, { html: authored })}</div>`
        : ctx.fns.narrative.generateNarrative(ctx, { resource: r });
    return inner
        ? { title: "Narrative", id: "narrative", html: `<div class="mt-2 overflow-x-auto rounded border border-slate-200 bg-white p-1">${inner}</div>` }
        : null;
}
