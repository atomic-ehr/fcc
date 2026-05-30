// The single markdown → HTML pipeline. Uses Bun's built-in Markdown parser
// (Bun.markdown, Zig/GFM) — no third-party marked. Order: strip unrendered
// liquid → inject reference-link definitions → Bun.markdown → apply pluggable
// blocks (kramdown IAL callouts).
export default function mdToHtml(ctx: Context, opts: { md: string }): string {
    const expanded = ctx.fns.md.expandIncludes(ctx, { md: opts.md });
    const stripped = ctx.fns.md.stripUnrenderedLiquid(ctx, { md: expanded });
    const withRefs = ctx.fns.md.injectRefLinks(ctx, { md: stripped });
    const html = (Bun as any).markdown.html(withRefs, {
        tables: true,
        strikethrough: true,
        tasklists: true,
        autolinks: true,
        headings: { ids: true },
    }) as string;
    // Sanitize author HTML before our (trusted) block/Shiki transforms run.
    const safe = ctx.fns.md.sanitizeHtml(ctx, { html });
    const withBlocks = ctx.fns.md.applyBlocks(ctx, { html: safe });
    return ctx.fns.md.highlightBlocks(ctx, { html: withBlocks });
}
