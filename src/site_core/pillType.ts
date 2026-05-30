export default function pillType(ctx: Context, opts: { t: string }): string {
    const safe = ctx.fns.site_core.htmlEscape(ctx, { s: opts.t });
    return `<span class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">${safe}</span>`;
}
