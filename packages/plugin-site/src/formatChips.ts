// Top-level page tabs (IG-Publisher "Content | Detailed Descriptions |
// Examples | JSON"), as real Datastar tabs driven by the `$ptab` signal —
// matches the original IG layout where these switch the whole main view.
// The `.json` source download stays a real link on the right (not a tab).
//
// `opts.tabs` is the ordered list of {key,label} the renderer decided are
// available (Content always; Detailed/Examples only when there's content).
export default function formatChips(
    ctx: Context,
    opts: { resource: types.fcc.Resource; tabs: Array<{ key: string; label: string }> },
): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const base = ctx.fns.site.pageHref(ctx, { resource: opts.resource }).replace(/\.html$/, "");
    const tabStrip = ctx.fns.site.profileTabs(ctx, { tabs: opts.tabs, signal: "ptab" });
    return `<div class="mt-1 flex flex-wrap items-end justify-between gap-2">
        <div class="min-w-0">${tabStrip}</div>
        <a class="mb-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-sky-700 hover:bg-sky-50" href="${base}.json">JSON</a>
    </div>`;
}
