export default function linkCanonical(ctx: Context, opts: { url: string | undefined }): string {
    const url = opts.url;
    if (!url) return `<span class="text-slate-400">—</span>`;
    const safe = ctx.fns.site.htmlEscape(ctx, { s: url });
    const rid = ctx.bundle.byCanonical.get(url);
    if (rid) {
        const target = ctx.bundle.resources.get(rid);
        if (target) {
            const href = ctx.fns.site.pageHref(ctx, { resource: target });
            return `<a class="text-sky-700 hover:underline" href="${href}"><code class="text-xs">${safe}</code></a>`;
        }
    }
    return `<code class="text-xs text-slate-600">${safe}</code>`;
}
