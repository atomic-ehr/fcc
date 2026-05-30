// "Concepts" section (CodeSystem): the code list.
export default function $section_concepts(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const concepts = ((opts.resource.data as { concept?: Array<{ code: string; display?: string; definition?: string }> }).concept) ?? [];
    const html = `<div class="mt-2">${ctx.fns.terminology.conceptTable(ctx, { concepts, showDefinition: true })}</div>`;
    return { title: `Concepts (${concepts.length})`, id: "concepts", html };
}
