// Build-info line shown in the page footer (moved out of the old top yellow
// strip — the top bar now carries a "versions" link instead).
export default function buildInfoBanner(ctx: Context, _opts: {} = {}): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const title = esc(ctx.config.title ?? ctx.config.id);
    const v = esc(ctx.config.version);
    return `<p class="mt-1"><strong class="font-medium text-slate-700">${title}</strong> — Local Development build (v${v}) built by fcc. See the <a class="text-sky-700 hover:underline" href="artifacts.html">Directory of published versions</a>.</p>`;
}
