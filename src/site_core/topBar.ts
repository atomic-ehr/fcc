export default function topBar(ctx: Context, opts: { active: string }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const igTitle = esc(ctx.config.title ?? ctx.config.id);
    void opts;   // the dropdown menu moved to topMenu (right column); this is just the package bar

    return `<header class="bg-slate-900 text-white shadow-sm">
        <div class="mx-auto flex max-w-screen-2xl items-baseline justify-between px-4 py-3 lg:px-8">
            <div class="flex items-baseline">
                <button type="button" title="Toggle navigation"
                    class="mr-3 self-center rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
                    data-on-click="$nav = !$nav">&#9776;</button>
                <span class="mr-2 h-2.5 w-2.5 self-center rounded-full bg-brand"></span>
                <a href="index.html" class="text-lg font-semibold tracking-tight hover:text-brand">${igTitle}</a>
                <span class="ml-3 text-xs text-slate-400">v${esc(ctx.config.version)} · FHIR ${esc(ctx.target.fhir)}</span>
            </div>
            <div class="flex items-center gap-2">
                ${qaChip(ctx)}
                <span class="rounded-full bg-slate-700/60 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-200">${esc(ctx.target.name)}</span>
                <span class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">${esc(ctx.config.status ?? "draft")}</span>
            </div>
        </div>
    </header>`;
}

// QA chip — shown when the fcc/validator plugin populated a report (buildRoutes
// stashes the summary on ctx.state). Links to errors.html.
function qaChip(ctx: Context): string {
    const qa = (ctx.state as any).validateSummary as { errors: number; warnings: number } | undefined;
    if (!qa) return "";
    const ok = qa.errors === 0;
    const cls = ok ? "bg-emerald-600" : "bg-rose-600";
    const label = ok ? "QA ✓" : `QA ${qa.errors}✕`;
    return `<a href="errors.html" title="${qa.errors} error(s), ${qa.warnings} warning(s)" class="rounded-full ${cls} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:opacity-90">${label}</a>`;
}
