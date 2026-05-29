// "Description" section: the resource's markdown description + authored intro
// notes. Shared by every canonical resourceType.
export default function $section_description(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const { intro } = ctx.fns.site.notesFor(ctx, { resource: r });
    const desc = d.description as string | undefined;
    const descHtml = desc ? `<div class="prose prose-slate prose-sm mt-2 max-w-3xl">${ctx.fns.site.mdToHtml(ctx, { md: desc })}</div>` : "";
    const html = `${descHtml}${ctx.fns.site.introBlock(ctx, { html: intro })}`;
    return html.trim() ? { title: "Description", id: "description", html } : null;
}
