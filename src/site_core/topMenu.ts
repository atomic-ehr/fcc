// The IG dropdown menu (Home / Conformance / Guidance / …). Rendered in the
// RIGHT column above the page content — at the same level as the left nav, not
// spanning over it. Uses the @fcc/plugin-menu HTML (author menu from
// sushi-config, via ctx.state.menuHtml) when present, else a static fallback.
export default function topMenu(ctx: Context, opts: { active: string }): string {
    const menuFromConfig = ctx.state.menuHtml as string | undefined | null;
    if (menuFromConfig) return menuFromConfig;

    const navItem = (label: string, href: string, key: string) => {
        const cls = key === opts.active
            ? "border-b-2 border-white px-3 py-2 text-sm font-medium text-white"
            : "border-b-2 border-transparent px-3 py-2 text-sm text-sky-100 hover:border-sky-200 hover:text-white";
        return `<a class="${cls}" href="${href}">${label}</a>`;
    };
    return `<nav class="bg-sky-900/70">
        <div class="flex flex-wrap gap-1 px-4 lg:px-8">
            ${navItem("Home", "index.html", "home")}
            ${navItem("Artifacts", "artifacts.html", "artifacts")}
            ${navItem("Profiles", "artifacts.html#StructureDefinition", "profiles")}
            ${navItem("Terminology", "artifacts.html#ValueSet", "terminology")}
            ${navItem("Capabilities", "artifacts.html#CapabilityStatement", "capabilities")}
            ${navItem("Examples", "artifacts.html#examples", "examples")}
        </div>
    </nav>`;
}
