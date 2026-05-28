// IG-Publisher-style "Content | Detailed Descriptions | Mappings | Examples | XML | JSON" chip row.
// Right-aligned download links + left-aligned section links.
export default function formatChips(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const href = ctx.fns.site.pageHref(ctx, { resource: opts.resource });
    const base = href.replace(/\.html$/, "");
    const chip = (label: string, target?: string) => target
        ? `<a class="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-sky-700 hover:bg-sky-50" href="${target}">${esc(label)}</a>`
        : `<span class="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">${esc(label)}</span>`;
    return `<div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
        <div class="flex flex-wrap gap-1.5">
            ${chip("Content")}
            ${chip("Detailed Descriptions", `${base}#description`)}
            ${chip("Examples",              `${base}#profile-examples`)}
        </div>
        <div class="ml-auto flex flex-wrap gap-1.5">
            ${chip("JSON", `${base}.json`)}
        </div>
    </div>`;
}
