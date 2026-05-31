// One node of the ordered page tree that drives FHIR-IG "сквозная" (sequential)
// numbering. The tree is a *forest* of top-level nav items (not IGP's single
// "0" root): `pageTree` assembles it from the menu + Page resources + artifact
// groups, and `numberPages` walks it pre-order assigning dotted labels.
//
// A node with an empty `slug` is a structural container (a menu dropdown header
// like "Conformance: #conformance.html", or an artifact group like "Profiles"):
// it occupies a numbering slot and its children number under it, but it has no
// page route of its own, so `numberPages` emits no entry for it.
export type PageNode = {
    slug: string;            // route slug + numbering key; "" → structural container
    title: string;
    href?: string;           // nav link target as written in the menu (may carry #frag); "" → no link
    children: PageNode[];
    sections?: string[];     // ordered on-page section ids → section numbers "3.1.2"
    number?: string;         // COMPUTED by numberPages — stamped on every node incl. containers
};
