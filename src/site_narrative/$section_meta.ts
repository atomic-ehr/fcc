// Headerless metadata dl (Profile / Resource type / Id / Canonical) for
// examples and resources without a richer section set. Empty title → rendered
// without a numbered section header.
export default function $section_meta(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const profile = ((d.meta as { profile?: string[] } | undefined)?.profile ?? [])[0];

    const rows: Array<[string, string]> = [];
    if (profile) rows.push(["Profile", ctx.fns.site_core.linkCanonical(ctx, { url: profile, short: true })]);
    rows.push(["Resource type", `<code class="text-xs">${esc(r.resourceType)}</code>`]);
    rows.push(["Id", `<code class="text-xs">${esc((d.id as string) ?? "")}</code>`]);
    if (d.url) rows.push(["Canonical", `<code class="text-xs">${esc(d.url as string)}</code>`]);
    return { title: "", id: "meta", html: ctx.fns.site_core.metaDl(ctx, { rows }) };
}
