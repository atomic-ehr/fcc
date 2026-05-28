export default function topBar(ctx: Context, opts: { active: string }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const igTitle = esc(ctx.cfg.title ?? ctx.cfg.id);
    const navItem = (label: string, href: string, key: string) => {
        const isActive = key === opts.active;
        const cls = isActive
            ? "border-b-2 border-white px-3 py-2 text-sm font-medium text-white"
            : "border-b-2 border-transparent px-3 py-2 text-sm text-sky-100 hover:border-sky-200 hover:text-white";
        return `<a class="${cls}" href="${href}">${label}</a>`;
    };
    return `<header class="bg-sky-800 text-white shadow-sm">
        <div class="mx-auto flex max-w-screen-2xl items-baseline justify-between px-4 py-3 lg:px-8">
            <div>
                <a href="index.html" class="text-lg font-semibold tracking-tight hover:text-sky-100">${igTitle}</a>
                <span class="ml-3 text-xs text-sky-200">v${esc(ctx.cfg.version)} · FHIR ${esc(ctx.target.fhir)}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="rounded-full bg-sky-900/60 px-2 py-0.5 text-xs uppercase tracking-wide text-sky-100">${esc(ctx.target.name)}</span>
                <span class="rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950">${esc(ctx.cfg.status ?? "draft")}</span>
            </div>
        </div>
        <nav class="bg-sky-900/70">
            <div class="mx-auto flex max-w-screen-2xl gap-1 px-4 lg:px-8">
                ${navItem("Home", "index.html", "home")}
                ${navItem("Artifacts", "artifacts.html", "artifacts")}
                ${navItem("Profiles", "artifacts.html#StructureDefinition", "profiles")}
                ${navItem("Terminology", "artifacts.html#ValueSet", "terminology")}
                ${navItem("Capabilities", "artifacts.html#CapabilityStatement", "capabilities")}
                ${navItem("Examples", "artifacts.html#examples", "examples")}
            </div>
        </nav>
    </header>`;
}
