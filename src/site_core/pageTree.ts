// Assemble the ordered page-tree forest that `numberPages` walks. Mirrors IG
// Publisher's source-of-truth precedence, adapted to fcc's data:
//   1. the IG-author menu (sushi-config `menu:` → ctx.shared.menu.tree) gives
//      explicit order + hierarchy for content pages (IGP's ImplementationGuide.
//      definition.page tree plays the same role);
//   2. canonical pages not placed by the menu fall into fixed artifact groups
//      (Profiles & Extensions, Value Sets, Code Systems, …), each a structural
//      container, pages within a group sorted by title then slug.
// The landing page (`index`, kind "landing") is the site home and is left
// unnumbered. Tie-break overall: menu position → group order → title → slug
// (docs/page.md).
//
// Pure: takes already-resolved menu + page descriptors so it is trivially
// testable and decoupled from the menu namespace (structural MenuNode shape).

type MenuNodeLike = { label: string; href: string; children: MenuNodeLike[] };
type PageDesc = { slug: string; title: string; kind?: string; for?: string; sections?: string[] };

const GROUP_ORDER = ["StructureDefinition", "ValueSet", "CodeSystem", "CapabilityStatement", "OperationDefinition", "SearchParameter", "ConceptMap"];
const GROUP_LABEL: Record<string, string> = {
    StructureDefinition: "Profiles & Extensions",
    ValueSet: "Value Sets",
    CodeSystem: "Code Systems",
    CapabilityStatement: "Capability Statements",
    OperationDefinition: "Operations",
    SearchParameter: "Search Parameters",
    ConceptMap: "Concept Maps",
};

export default function pageTree(_ctx: Context, opts: { menu: MenuNodeLike[]; pages: PageDesc[] }): types.site_core.PageNode[] {
    const bySlug = new Map<string, PageDesc>();
    for (const p of opts.pages) bySlug.set(p.slug, p);

    // href ("must-support.html" | "#conformance.html" | "#") → slug ("" = no page)
    const hrefToSlug = (href: string): string => href.replace(/^#/, "").replace(/\.html$/, "");

    const placed = new Set<string>();
    const fromMenu = (node: MenuNodeLike): types.site_core.PageNode => {
        const slug = hrefToSlug(node.href);
        const page = slug ? bySlug.get(slug) : undefined;
        if (page) placed.add(slug);
        // "#foo.html" is an anchor-only dropdown header → no link; "foo.html#frag"
        // (starts with a letter) is a real link to an aggregate page.
        const href = node.href.startsWith("#") ? undefined : node.href;
        return {
            slug: page ? slug : "",                       // unmatched/anchor-only → container
            title: node.label,                            // the author's menu label wins for nav ("USCDI", not "Uscdi")
            href,
            sections: page?.sections,
            children: node.children.map(fromMenu),
        };
    };
    const roots: types.site_core.PageNode[] = opts.menu.map(fromMenu);

    // Canonical/content pages the menu didn't place → artifact-group containers.
    const leftovers = opts.pages.filter(p => p.kind !== "landing" && !placed.has(p.slug));
    const groups = new Map<string, PageDesc[]>();
    for (const p of leftovers) {
        const key = p.for && GROUP_LABEL[p.for] ? p.for : "Other";
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
    }
    const groupKeys = [...groups.keys()].sort((a, b) => {
        const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);   // known groups in order, "Other" last
    });
    const key2 = (p: PageDesc) => String(p.title || p.slug || "");
    const groupNodes: types.site_core.PageNode[] = groupKeys.map(key => ({
        slug: "",
        title: GROUP_LABEL[key] ?? "Other",
        children: groups.get(key)!
            .sort((a, b) => key2(a).localeCompare(key2(b)) || String(a.slug).localeCompare(String(b.slug)))
            .map(p => ({ slug: p.slug, title: p.title, href: `${p.slug}.html`, sections: p.sections, children: [] })),
    }));

    // Prefer to nest the per-resource groups UNDER the menu's "FHIR Artifacts"
    // container (so the left tree reads FHIR Artifacts → Profiles & Extensions →
    // <each profile>, no duplicate top-level groups). If the menu has no such
    // node, the groups become top-level roots.
    const findArtifacts = (nodes: types.site_core.PageNode[]): types.site_core.PageNode | undefined => {
        for (const n of nodes) {
            if (!n.slug && /artifact/i.test(n.title)) return n;
            const d = findArtifacts(n.children);
            if (d) return d;
        }
        return undefined;
    };
    const artifactsParent = groupNodes.length ? findArtifacts(roots) : undefined;
    if (artifactsParent) artifactsParent.children = groupNodes;   // replaces curated aggregate-link children
    else roots.push(...groupNodes);

    return roots;
}
