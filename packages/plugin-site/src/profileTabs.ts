// IG-Publisher-style tab strip — real Datastar tabs. The enclosing element
// declares the signal (default `$sdtab`); each button sets it and each panel
// uses `data-show="$<signal> === '<key>'"`. Reused for both the inner
// Formal-Views table tabs and the top-level page tabs (signal `ptab`).
//
// `opts.tabs` is the ordered list of {key,label} to show — the renderer only
// passes tabs whose panel actually has content, so no tab is ever a dead end.
export default function profileTabs(
    ctx: Context,
    opts: { tabs: Array<{ key: string; label: string }>; signal?: string },
): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const sig = `$${opts.signal ?? "sdtab"}`;
    const base = "px-3 py-1.5 text-sm cursor-pointer";
    const activeCls = "rounded-t border-x border-t border-slate-200 bg-white font-semibold text-brand";
    const idleCls = "text-sky-700 hover:text-sky-900";

    const buttons = opts.tabs.map(t => {
        const k = `'${t.key.replace(/'/g, "\\'")}'`;
        // data-class toggles active vs idle styling off the shared signal.
        return `<button type="button" class="${base}"
            data-on-click="${sig} = ${k}"
            data-class="{'${activeCls}': ${sig} === ${k}, '${idleCls}': ${sig} !== ${k}}"
        >${esc(t.label)}</button>`;
    }).join("");

    return `<div class="mt-2 flex items-end gap-1 border-b border-slate-200 bg-slate-50 px-1 pt-1">${buttons}</div>`;
}
