// "Expansion" section (ValueSet): locally-computed concept list (when the
// compose is explicit-concepts only), else a terminology-server notice.
export default function $section_expansion(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const exp = ctx.fns.site.vsExpand(ctx, { resource: r });
    const html = exp
        ? `<p class="mt-2 text-sm text-slate-600">This value set contains ${exp.concepts.length} concept${exp.concepts.length === 1 ? "" : "s"}.
           <span class="text-slate-400">Locally computed from the explicit concept lists (no terminology server).</span></p>
           <div class="mt-2">${ctx.fns.site.conceptTable(ctx, { concepts: exp.concepts, showSystem: true })}</div>`
        : `<p class="mt-2 text-sm text-slate-500">Expansion is not available offline — this value set draws on filters, whole code systems, or imported value sets that require a terminology server to expand.</p>`;
    return { title: "Expansion", id: "expansion", html };
}
