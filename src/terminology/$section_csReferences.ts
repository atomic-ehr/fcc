// "References" section (CodeSystem): value sets that reference this code system
// in their content logical definition. Null when none do.
export default function $section_csReferences(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const usedBy = ctx.fns.terminology.codeSystemUsage(ctx, { resource: r });
    if (!usedBy.length) return null;
    const html = `<p class="mt-1 text-xs text-slate-500">This code system is referenced in the content logical definition of the following value sets:</p>
        ${ctx.fns.core.linkGrid(ctx, { resources: usedBy })}`;
    return { title: "References", id: "references", html };
}
