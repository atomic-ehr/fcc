// IG-Publisher-style tab strip — real Datastar tabs. The enclosing element
// declares the signal (default `$sdtab`); each button sets it and each panel
// uses `data-show="$<signal> === '<key>'"`. Reused for both the inner
// Formal-Views table tabs and the top-level page tabs (signal `ptab`).
//
// `opts.tabs` is the ordered list of {key,label,anchor?} to show — the renderer
// only passes tabs whose panel has content, so no tab is ever a dead end. When
// a tab carries an `anchor` (e.g. IG-Publisher's `tabs-diff`), clicking it also
// writes `#<anchor>` to the URL so tabs are deep-linkable; `tabHashScript`
// drives the reverse (hash → active tab). `opts.parent` marks every tab in this
// strip as living inside a top-level tab, so deep-linking activates both levels.
export default function profileTabs(
    ctx: Context,
    opts: { tabs: Array<{ key: string; label: string; anchor?: string }>; signal?: string; parent?: string },
): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const sig = `$${opts.signal ?? "sdtab"}`;
    const base = "px-3 py-1.5 text-sm cursor-pointer";
    const activeCls = "rounded-t border-x border-t border-slate-200 bg-white font-semibold text-brand";
    const idleCls = "text-sky-700 hover:text-sky-900";
    const parentAttr = opts.parent ? ` data-tab-parent="${esc(opts.parent)}"` : "";

    const buttons = opts.tabs.map(t => {
        const k = `'${t.key.replace(/'/g, "\\'")}'`;
        const setHash = t.anchor ? `; window.location.hash = '${t.anchor.replace(/'/g, "\\'")}'` : "";
        const tabId = esc(t.anchor ?? t.key);
        // data-class toggles active vs idle styling off the shared signal.
        return `<button type="button" class="${base}" data-tab="${tabId}"${parentAttr}
            data-on-click="${sig} = ${k}${setHash}"
            data-class="{'${activeCls}': ${sig} === ${k}, '${idleCls}': ${sig} !== ${k}}"
        >${esc(t.label)}</button>`;
    }).join("");

    return `<div class="mt-2 flex items-end gap-1 border-b border-slate-200 bg-slate-50 px-1 pt-1">${buttons}</div>`;
}
