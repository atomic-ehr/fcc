export default function topBar(ctx: Context, opts: { active: string }): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const igTitle = esc(ctx.cfg.title ?? ctx.cfg.id);

    // If @fcc/plugin-menu supplied a rendered menu via pctx.shared, use it
    // (IG-author-defined nav from sushi-config). Otherwise fall back to fcc's
    // static section nav.
    const menuFromConfig = ctx.state.menuHtml as string | undefined | null;
    const navHtml = menuFromConfig ?? fallbackNav(ctx, opts);

    return `<header class="bg-slate-900 text-white shadow-sm">
        <div class="mx-auto flex max-w-screen-2xl items-baseline justify-between px-4 py-3 lg:px-8">
            <div class="flex items-baseline">
                <span class="mr-2 h-2.5 w-2.5 self-center rounded-full bg-brand"></span>
                <a href="index.html" class="text-lg font-semibold tracking-tight hover:text-brand">${igTitle}</a>
                <span class="ml-3 text-xs text-slate-400">v${esc(ctx.cfg.version)} · FHIR ${esc(ctx.target.fhir)}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="rounded-full bg-slate-700/60 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-200">${esc(ctx.target.name)}</span>
                <span class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">${esc(ctx.cfg.status ?? "draft")}</span>
            </div>
        </div>
        ${navHtml}
    </header>`;
}

function fallbackNav(ctx: Context, opts: { active: string }): string {
    const navItem = (label: string, href: string, key: string) => {
        const isActive = key === opts.active;
        const cls = isActive
            ? "border-b-2 border-white px-3 py-2 text-sm font-medium text-white"
            : "border-b-2 border-transparent px-3 py-2 text-sm text-sky-100 hover:border-sky-200 hover:text-white";
        return `<a class="${cls}" href="${href}">${label}</a>`;
    };
    void ctx;
    return `<nav class="bg-sky-900/70">
        <div class="mx-auto flex max-w-screen-2xl gap-1 px-4 lg:px-8">
            ${navItem("Home", "index.html", "home")}
            ${navItem("Artifacts", "artifacts.html", "artifacts")}
            ${navItem("Profiles", "artifacts.html#StructureDefinition", "profiles")}
            ${navItem("Terminology", "artifacts.html#ValueSet", "terminology")}
            ${navItem("Capabilities", "artifacts.html#CapabilityStatement", "capabilities")}
            ${navItem("Examples", "artifacts.html#examples", "examples")}
        </div>
    </nav>`;
}
