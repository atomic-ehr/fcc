// Render a canonical URL as a link. By default the visible text is the full
// URL (good for metadata rows). With `short`, the label collapses to the
// resolved resource title (if in-bundle) or the URL's last path segment, and
// the full URL moves to the title= tooltip — keeps dense tables readable.
export default function linkCanonical(ctx: Context, opts: { url: string | undefined; short?: boolean }): string {
    const url = opts.url;
    if (!url) return `<span class="text-slate-400">—</span>`;
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const bare = url.split("|", 1)[0];
    const rid = ctx.byCanonical.get(bare) ?? ctx.byCanonical.get(url);
    const target = rid ? ctx.resources.get(rid) : undefined;

    if (opts.short) {
        const label = target ? ctx.fns.site_core.shortLabel(ctx, { resource: target }) : (bare.split("/").pop() || bare);
        const tip = ` title="${esc(url)}"`;
        return target
            ? `<a class="text-sky-700 hover:underline"${tip} href="${ctx.fns.site_core.pageHref(ctx, { resource: target })}">${esc(label)}</a>`
            : `<span${tip} class="text-slate-600">${esc(label)}</span>`;
    }

    const safe = esc(url);
    return target
        ? `<a class="text-sky-700 hover:underline" href="${ctx.fns.site_core.pageHref(ctx, { resource: target })}"><code class="text-xs">${safe}</code></a>`
        : `<code class="text-xs text-slate-600">${safe}</code>`;
}
