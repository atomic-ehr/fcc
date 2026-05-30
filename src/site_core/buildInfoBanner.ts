// IG-Publisher-style yellow build info strip shown at the top of every page.
export default function buildInfoBanner(ctx: Context, _opts: {} = {}): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const title = esc(ctx.cfg.title ?? ctx.cfg.id);
    const v = esc(ctx.cfg.version);
    return `<div class="border-y border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-900 lg:px-8">
        <strong>${title}</strong> — Local Development build (v${v}) built by fcc.
        See the <a class="font-medium underline" href="artifacts.html">Directory of published versions</a>.
    </div>`;
}
