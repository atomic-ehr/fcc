// FHIR-IG sequential ("сквозная") numbering — the algorithm IG Publisher runs in
// PublisherGenerator.createTocPage()/addPageData() (vendor/fhir-ig-publisher/…/
// publisher/PublisherGenerator.java:3483/3583). Pre-order DFS over the page tree:
// each child's label = parentLabel + "." + (1-based sibling index). IGP starts
// its single root at "0" and suppresses that prefix so level-1 pages read 1,2,3;
// fcc's nav is a *forest*, so each top-level node is numbered 1,2,3… directly —
// same dotted result, no synthetic "0" root.
//
// Granularity is the page (IGP has no markdown-heading numbering). As a documented
// superset, a node's ordered `sections` continue the page number — page "3.1" →
// sections "3.1.1", "3.1.2" — keyed `"<slug>#<sectionId>"`.
//
// Pure + deterministic per build: numbering is a fold over the ordered tree, so a
// content edit never shifts numbers and never touches slugs/anchors. Returns a
// flat Map keyed by slug (and "<slug>#<sectionId>" for sections).
export default function numberPages(_ctx: Context, opts: { roots: types.site_core.PageNode[] }): Map<string, string> {
    const out = new Map<string, string>();

    const walk = (node: types.site_core.PageNode, label: string): void => {
        node.number = label;                      // stamp every node (incl. containers) for the nav tree
        if (node.slug) {
            out.set(node.slug, label);
            (node.sections ?? []).forEach((sid, i) => out.set(`${node.slug}#${sid}`, `${label}.${i + 1}`));
        }
        node.children.forEach((child, i) => {
            // IGP rule: childLabel = (parent=="" ? "" : parent+".") + index.
            const childLabel = (label === "" ? "" : `${label}.`) + (i + 1);
            walk(child, childLabel);
        });
    };

    opts.roots.forEach((root, i) => walk(root, String(i + 1)));
    return out;
}
