export default function jsonBlock(ctx: Context, opts: { d: Record<string, unknown> }): string {
    const clean = { ...opts.d };
    delete (clean as { __wasExample?: boolean }).__wasExample;
    const safe = ctx.fns.site.htmlEscape(ctx, { s: JSON.stringify(clean, null, 2) });
    return `<h2 class="mt-8 text-lg font-semibold text-slate-900">Source JSON</h2>
        <pre class="mt-2 max-h-[60vh] overflow-auto rounded border border-slate-200 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100"><code>${safe}</code></pre>`;
}
