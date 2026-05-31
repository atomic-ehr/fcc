export default function pageHeader(ctx: Context, opts: { title: string; kind: string; d: Record<string, unknown> }): string {
    const safeTitle = ctx.fns.site_core.htmlEscape(ctx, { s: opts.title });
    const safeKind  = ctx.fns.site_core.htmlEscape(ctx, { s: opts.kind });
    const safeId    = ctx.fns.site_core.htmlEscape(ctx, { s: (opts.d.id as string) ?? "" });
    const statusPill = opts.d.status
        ? `<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">${ctx.fns.site_core.htmlEscape(ctx, { s: opts.d.status as string })}</span>`
        : "";
    return `
        <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-3xl font-semibold text-slate-900">${safeTitle}</h1>
            <span class="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800">${safeKind}</span>
            ${statusPill}
            ${ctx.fns.site_core.statusBadge(ctx, { data: opts.d })}
        </div>
        <p class="mt-1 text-xs text-slate-500"><code class="rounded bg-slate-100 px-1">${safeId}</code></p>
    `;
}
