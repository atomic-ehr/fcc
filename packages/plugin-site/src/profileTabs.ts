// IG-Publisher-style horizontal tab strip above the structure table.
// We render anchor links to in-page section ids so no JS is needed.
export default function profileTabs(ctx: Context, opts: { active: "differential" | "snapshot" | "key" | "all" | "bindings" }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const tab = (key: string, label: string, href: string) => {
        const active = key === opts.active;
        const cls = active
            ? "rounded-t border-x border-t border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-600"
            : "px-3 py-1.5 text-sm text-sky-700 hover:text-sky-900";
        return `<a href="${href}" class="${cls}">${esc(label)}</a>`;
    };
    return `<div class="mt-2 flex items-end gap-1 border-b border-slate-200 bg-slate-50 px-1 pt-1">
        ${tab("differential", "Differential Table", "#differential")}
        ${tab("key",          "Key Elements Table", "#key-elements")}
        ${tab("snapshot",     "Snapshot Table",     "#snapshot")}
        ${tab("bindings",     "Bindings",           "#bindings")}
        ${tab("all",          "All",                "#all")}
    </div>`;
}
