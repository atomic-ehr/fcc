// The single markdown → HTML pipeline. Uses Bun's built-in Markdown parser
// (Bun.markdown, Zig/GFM) — no third-party marked. Order: strip unrendered
// liquid → inject reference-link definitions → Bun.markdown → apply pluggable
// blocks (kramdown IAL callouts).
export default function mdToHtml(ctx: Context, opts: { md: string }): string {
    const stripped = ctx.fns.site.stripUnrenderedLiquid(ctx, { md: opts.md });
    const withRefs = ctx.fns.site.injectRefLinks(ctx, { md: stripped });
    const html = (Bun as any).markdown.html(withRefs, {
        tables: true,
        strikethrough: true,
        tasklists: true,
        autolinks: true,
        headings: { ids: true },
    }) as string;
    return ctx.fns.site.applyBlocks(ctx, { html });
}
