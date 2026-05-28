export default function formatPath(ctx: Context, opts: { path: string }): string {
    return opts.path
        .split(".")
        .map(seg => ctx.fns.site.htmlEscape(ctx, { s: seg }))
        .join(`<span class="seg-sep">.</span>`);
}
