// "Source JSON" block with server-side Shiki highlighting. Shiki emits its own
// <pre class="shiki">; we strip its margin and add padding + a scroll cap via
// Tailwind arbitrary variants so it sits in our bordered, height-capped frame.
export default async function jsonBlock(ctx: Context, opts: { d: Record<string, unknown>; heading?: boolean }): Promise<string> {
    const clean = { ...opts.d };
    delete (clean as { __wasExample?: boolean }).__wasExample;
    const code = JSON.stringify(clean, null, 2);
    const hl = await ctx.fns.site.highlightCode(ctx, { code, lang: "json" });

    const heading = (opts.heading ?? true)
        ? `<h2 class="mt-8 text-lg font-semibold text-slate-900">Source JSON</h2>`
        : "";
    return `${heading}
        <div class="mt-2 max-h-[70vh] overflow-auto rounded border border-slate-800 text-xs leading-relaxed [&_pre]:!m-0 [&_pre]:p-4">${hl}</div>`;
}
