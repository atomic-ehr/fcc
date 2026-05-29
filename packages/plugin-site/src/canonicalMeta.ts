// Per-resourceType page chrome metadata (kind label, breadcrumb, active nav) for
// the shared canonical-resource template. Examples always read as "Example".
export default function canonicalMeta(ctx: Context, opts: { resource: types.fcc.Resource }): {
    title: string; kind: string; activeNav: string; breadcrumb: types.site.Breadcrumb;
} {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const title = (d.title as string) ?? (d.id as string) ?? r.id;
    const isExample = (d as { __wasExample?: boolean }).__wasExample === true;

    let kind = r.resourceType, nav = "artifacts";
    let parent = { label: r.resourceType, href: `artifacts.html#${r.resourceType}` };
    if (isExample) {
        kind = "Example"; nav = "examples"; parent = { label: "Examples", href: "artifacts.html#examples" };
    } else {
        switch (r.resourceType) {
            case "StructureDefinition": kind = d.type === "Extension" ? "Extension" : "Profile"; nav = "profiles"; parent = { label: "Profiles", href: "artifacts.html#StructureDefinition" }; break;
            case "ValueSet": kind = "Value Set"; nav = "terminology"; parent = { label: "Terminology", href: "artifacts.html#ValueSet" }; break;
            case "CodeSystem": kind = "Code System"; nav = "terminology"; parent = { label: "Terminology", href: "artifacts.html#CodeSystem" }; break;
            case "CapabilityStatement": kind = "Capability Statement"; nav = "capabilities"; parent = { label: "Capabilities", href: "artifacts.html#CapabilityStatement" }; break;
            case "SearchParameter": kind = "Search Parameter"; parent = { label: "Search Parameters", href: "artifacts.html#SearchParameter" }; break;
            case "OperationDefinition": kind = "Operation"; parent = { label: "Operations", href: "artifacts.html#OperationDefinition" }; break;
        }
    }
    void ctx;
    return { title, kind, activeNav: nav, breadcrumb: [{ label: "Home", href: "index.html" }, parent, { label: title }] };
}
