// The "Mappings" companion page (…-mappings.html), matching IG Publisher.
// Renders ElementDefinition.mapping entries grouped per declared map
// (StructureDefinition.mapping → identity/name/uri). US Core differentials
// carry no mappings, so the page degrades to an explicit "none" notice.
export default function renderMappingsPage(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const title = (d.title as string) ?? (d.id as string);
    const elements = ((d.differential as { element?: Array<Record<string, unknown>> } | undefined)?.element) ?? [];

    const maps = (d.mapping as Array<{ identity?: string; name?: string; uri?: string }> | undefined) ?? [];
    const nameFor = (identity: string) => {
        const m = maps.find(x => x.identity === identity);
        return m?.name ?? m?.uri ?? identity;
    };

    type Row = { path: string; map: string };
    const rows: Row[] = [];
    for (const e of elements) {
        const ms = (e.mapping as Array<{ identity?: string; map?: string }> | undefined) ?? [];
        for (const m of ms) rows.push({ path: String(e.path ?? ""), map: `${nameFor(m.identity ?? "")}: ${m.map ?? ""}` });
    }

    const bodyInner = rows.length
        ? `<div class="mt-2 overflow-x-auto rounded border border-slate-200 bg-white">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th class="px-3 py-2">Path</th><th class="px-3 py-2">Mapping</th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${rows.map(x => `<tr class="even:bg-slate-50/40"><td class="px-3 py-1.5 font-mono text-xs text-slate-900">${esc(x.path)}</td><td class="px-3 py-1.5 text-xs text-slate-700">${esc(x.map)}</td></tr>`).join("")}
                </tbody>
            </table>
        </div>`
        : `<p class="mt-2 text-sm text-slate-500">This profile defines no element mappings.</p>`;

    const body = `
        ${ctx.fns.site_core.pageHeader(ctx, { title, kind: "Profile", d })}
        ${opts.strip ?? ctx.fns.site_core.canonicalTabStrip(ctx, { resource: r, activeId: "mappings" })}
        ${ctx.fns.site_core.urlVersionStrip(ctx, { d })}
        <h2 class="mt-6 text-lg font-semibold text-slate-900">Mappings</h2>
        ${bodyInner}
    `;
    return ctx.fns.site_core.layout(ctx, {
        title: `${title} - Mappings`,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Profiles", href: "artifacts.html#StructureDefinition" },
            { label: title, href: ctx.fns.site_profile.sdHrefs(ctx, { resource: r }).content },
            { label: "Mappings" },
        ],
        activeNav: "profiles",
    });
}
