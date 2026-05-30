// "REST Capabilities" section (CapabilityStatement): the per-resource grid
// (Resource | Profile | Interactions | Search params | _includes | Operations),
// with SHALL/SHOULD/MAY expectation badges read from the
// capabilitystatement-expectation extension. Replaces the truncated narrative.
export default function $section_capabilityGrid(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const rest = ((r.data as { rest?: Array<Record<string, any>> }).rest ?? [])[0];
    const resources = (rest?.resource ?? []) as Array<Record<string, any>>;
    if (!resources.length) return null;

    const badge = (node: unknown) => {
        const e = ctx.fns.capability.expectationOf(ctx, { node });
        if (!e) return "";
        const color = e === "SHALL" ? "bg-rose-100 text-rose-800" : e === "SHOULD" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";
        return `<span class="mr-0.5 rounded ${color} px-1 text-[10px] font-semibold">${esc(e)}</span>`;
    };
    const join = (xs: string[]) => xs.filter(Boolean).join(" ");

    const rows = resources.map(res => {
        const profiles = ([] as string[]).concat(res.supportedProfile ?? res.profile ?? [])
            .map((p: string) => ctx.fns.core.linkCanonical(ctx, { url: p, short: true })).join("<br>");
        const interactions = join((res.interaction ?? []).map((i: any) => `${badge(i)}<code class="text-xs">${esc(i.code)}</code>`));
        const search = join((res.searchParam ?? []).map((s: any) => `${badge(s)}<code class="text-xs">${esc(s.name)}</code>`));
        const includes = (res.searchInclude ?? []).map((s: string) => esc(s)).join(", ");
        const ops = (res.operation ?? []).map((o: any) => esc(o.name)).join(", ");
        return `<tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-1.5 text-sm font-medium text-slate-900">${esc(res.type ?? "")}</td>
            <td class="px-3 py-1.5 text-xs">${profiles}</td>
            <td class="px-3 py-1.5 text-xs leading-6">${interactions}</td>
            <td class="px-3 py-1.5 text-xs leading-6">${search || "—"}</td>
            <td class="px-3 py-1.5 text-xs text-slate-600">${includes || "—"}</td>
            <td class="px-3 py-1.5 text-xs text-slate-600">${ops || "—"}</td>
        </tr>`;
    }).join("");

    const mode = esc(rest?.mode ?? "server");
    const html = `<p class="mt-1 text-xs text-slate-500">RESTful capabilities by resource for the <code>${mode}</code>. Expectation badges: <span class="rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-800">SHALL</span> <span class="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">SHOULD</span> <span class="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600">MAY</span>.</p>
        <div class="mt-2 overflow-x-auto rounded border border-slate-200 bg-white">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th class="px-3 py-2">Resource</th><th class="px-3 py-2">Profile</th><th class="px-3 py-2">Interactions</th><th class="px-3 py-2">Search params</th><th class="px-3 py-2">_includes</th><th class="px-3 py-2">Operations</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    return { title: "REST Capabilities", id: "rest", html };
}
