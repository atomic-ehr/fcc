// "Search Parameter" detail section: the formal properties (type, base,
// expression, multipleAnd/Or with conformance expectation, modifiers,
// comparators). The description renders via $section_description (markdown).
export default function $section_searchParamDetail(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const d = opts.resource.data as Record<string, any>;
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });

    const exp = (key: string) => {
        const e = ctx.fns.site_capability.expectationOf(ctx, { node: d[`_${key}`] });
        return e ? ` <span class="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600">Conformance Expectation = ${esc(e)}</span>` : "";
    };
    const rows: Array<[string, string]> = [];
    if (d.code) rows.push(["Code", `<code class="text-xs">${esc(d.code)}</code>`]);
    if (d.type) rows.push(["Type", `<code class="text-xs">${esc(d.type)}</code>`]);
    if (d.base) rows.push(["Base", ([] as string[]).concat(d.base).map((b: string) => `<code class="text-xs">${esc(b)}</code>`).join(", ")]);
    if (d.expression) rows.push(["Expression", `<code class="text-xs">${esc(d.expression)}</code>`]);
    if (d.multipleOr !== undefined) rows.push(["Multiple Or", `${esc(String(d.multipleOr))}${exp("multipleOr")}`]);
    if (d.multipleAnd !== undefined) rows.push(["Multiple And", `${esc(String(d.multipleAnd))}${exp("multipleAnd")}`]);
    if (Array.isArray(d.modifier)) rows.push(["Modifiers", d.modifier.map((m: string) => `<code class="text-xs">${esc(m)}</code>`).join(", ")]);
    if (Array.isArray(d.comparator)) rows.push(["Comparators", d.comparator.map((m: string) => `<code class="text-xs">${esc(m)}</code>`).join(", ")]);
    if (!rows.length) return null;

    return { title: "Search Parameter", id: "searchparam", html: ctx.fns.site_core.metaDl(ctx, { rows }) };
}
