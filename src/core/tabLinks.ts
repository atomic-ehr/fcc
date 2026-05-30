// IG-Publisher-style top tab strip rendered as real links between separately
// generated pages (Content / Detailed Descriptions / JSON / …). Shared by every
// resource page (profiles, value sets, code systems). The active tab renders as
// a non-link brand chip; an optional download link sits on the right.
export default function tabLinks(
    ctx: Context,
    opts: { tabs: Array<{ label: string; href?: string; active?: boolean }>; download?: { label: string; href: string } },
): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const chip = (t: { label: string; href?: string; active?: boolean }) =>
        t.active || !t.href
            ? `<span class="rounded-t border-x border-t border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand">${esc(t.label)}</span>`
            : `<a class="px-3 py-1.5 text-sm text-sky-700 hover:text-sky-900" href="${esc(t.href)}">${esc(t.label)}</a>`;

    const dl = opts.download
        ? `<a class="mb-1 mr-2 text-[11px] text-sky-700 hover:underline" href="${esc(opts.download.href)}">${esc(opts.download.label)}</a>`
        : "";
    return `<div class="mt-2 flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 bg-slate-50 px-1 pt-1">
        <div class="flex flex-wrap items-end gap-1">${opts.tabs.map(chip).join("")}</div>
        ${dl}
    </div>`;
}
