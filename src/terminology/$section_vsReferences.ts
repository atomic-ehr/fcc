// "References" section (ValueSet): profiles that bind this value set, with the
// IG-Publisher "not bound here" fallback sentence.
export default function $section_vsReferences(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const boundBy = ctx.fns.terminology.valueSetUsage(ctx, { resource: r });
    const html = boundBy.length
        ? ctx.fns.core.linkGrid(ctx, { resources: boundBy })
        : `<p class="mt-2 text-sm text-slate-500">This value set is not bound by any profile in this implementation guide; it may be used elsewhere.</p>`;
    return { title: "References", id: "references", html };
}
