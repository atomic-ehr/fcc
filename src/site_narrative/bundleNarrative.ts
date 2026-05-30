// Render a Bundle as IG-Publisher does: a summary line, then one section per
// entry (fullUrl heading + the contained resource's narrative — authored
// text.div if present, else a generated narrative for that entry).
export default function bundleNarrative(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const r = opts.resource;
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const d = r.data as Record<string, any>;
    const entries = (d.entry ?? []) as Array<Record<string, any>>;

    const summary = `<p class="text-sm text-slate-700">Bundle <code class="text-xs">${esc(d.id ?? "")}</code> of type <code class="text-xs">${esc(d.type ?? "")}</code> — ${entries.length} entr${entries.length === 1 ? "y" : "ies"}.</p>`;
    if (!entries.length) return summary;

    const blocks = entries.map((e, i) => {
        const res = e.resource as { resourceType?: string; id?: string; text?: { div?: string } } | undefined;
        const inner = res?.text?.div && res.text.div.replace(/<[^>]+>/g, "").trim().length > 40
            ? `<div class="prose prose-slate max-w-none">${ctx.fns.site_md.sanitizeHtml(ctx, { html: res.text.div })}</div>`
            : (res ? ctx.fns.site_narrative.generateNarrative(ctx, { resource: { resourceType: res.resourceType ?? "Resource", id: res.id ?? String(i), data: res } as types.fcc.Resource }) : "");
        const label = res ? `${res.resourceType}/${res.id ?? ""}` : "entry";
        return `<div class="mt-3 border-t border-slate-100 pt-2">
            <p class="text-xs font-semibold text-slate-600">Entry ${i + 1} — <code>${esc(e.fullUrl ?? label)}</code></p>
            <div class="mt-1">${inner}</div>
        </div>`;
    }).join("");
    return `${summary}${blocks}`;
}
