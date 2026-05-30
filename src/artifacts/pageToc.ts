// A small intra-page Table of Contents box linking to the given sections.
// Toggle with site({ features: { pageToc: false } }); hidden when too few items.
export default function pageToc(ctx: Context, opts: { items: Array<{ label: string; anchor: string }> }): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    if (!ctx.fns.core.featureOn(ctx, { name: "pageToc" })) return "";
    if (opts.items.length < 3) return "";
    return `<nav class="mt-4 inline-block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Contents</div>
        <ul class="space-y-0.5">
            ${opts.items.map(i => `<li><a class="text-sky-700 hover:underline" href="#${esc(i.anchor)}">${esc(i.label)}</a></li>`).join("")}
        </ul>
    </nav>`;
}
