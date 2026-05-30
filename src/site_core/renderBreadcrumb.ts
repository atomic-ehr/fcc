export default function renderBreadcrumb(ctx: Context, opts: { crumbs: types.site_core.Breadcrumb }): string {
    const parts = opts.crumbs.map((c, i) => {
        const isLast = i === opts.crumbs.length - 1;
        const label = ctx.fns.site_core.htmlEscape(ctx, { s: c.label });
        if (isLast || !c.href) return `<span class="text-slate-700">${label}</span>`;
        return `<a href="${c.href}" class="text-sky-700 hover:underline">${label}</a>`;
    });
    return `<nav class="mb-3 flex items-center gap-2 text-xs text-slate-500">${
        parts.join(`<span class="text-slate-300">/</span>`)
    }</nav>`;
}
