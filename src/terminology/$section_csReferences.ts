// "References" section (CodeSystem): value sets that reference this code system
// in their content logical definition. Null when none do.
export default function $section_csReferences(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const usedBy = ctx.fns.terminology.codeSystemUsage(ctx, { resource: r });
    if (!usedBy.length) return null;
    const html = `<p class="mt-1 text-xs text-slate-500">This code system is referenced in the content logical definition of the following value sets:</p>
        <ul class="mt-2 grid grid-cols-1 gap-0.5 pl-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            ${usedBy.map(v => `<li><a class="text-sky-700 hover:underline" href="${ctx.fns.core.pageHref(ctx, { resource: v })}">${esc(ctx.fns.core.titleOf(ctx, { resource: v }))}</a></li>`).join("")}
        </ul>`;
    return { title: "References", id: "references", html };
}
