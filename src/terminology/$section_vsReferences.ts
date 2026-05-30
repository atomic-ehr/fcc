// "References" section (ValueSet): profiles that bind this value set, with the
// IG-Publisher "not bound here" fallback sentence.
export default function $section_vsReferences(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const boundBy = ctx.fns.terminology.valueSetUsage(ctx, { resource: r });
    const html = boundBy.length
        ? `<ul class="mt-2 grid grid-cols-1 gap-0.5 pl-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            ${boundBy.map(p => `<li><a class="text-sky-700 hover:underline" href="${ctx.fns.core.pageHref(ctx, { resource: p })}">${esc(ctx.fns.core.titleOf(ctx, { resource: p }))}</a></li>`).join("")}
        </ul>`
        : `<p class="mt-2 text-sm text-slate-500">This value set is not bound by any profile in this implementation guide; it may be used elsewhere.</p>`;
    return { title: "References", id: "references", html };
}
