// Top-level page tabs for a StructureDefinition, IG-Publisher-style. Unlike the
// inner Formal-Views tabs (Datastar, hash-addressable), these are real links to
// separately-generated pages — matching IG Publisher's URL model exactly
// (…-definitions.html, …-mappings.html, …-examples.html, …profile.json.html).
// `opts.active` marks the current page so it renders as a non-link chip.
export default function formatChips(
    ctx: Context,
    opts: { resource: types.fcc.Resource; active: "content" | "definitions" | "mappings" | "examples" | "json" },
): string {
    const h = ctx.fns.profile.sdHrefs(ctx, { resource: opts.resource });
    const a = opts.active;
    return ctx.fns.core.tabLinks(ctx, {
        tabs: [
            { label: "Content",               href: h.content,     active: a === "content" },
            { label: "Detailed Descriptions", href: h.definitions, active: a === "definitions" },
            { label: "Mappings",              href: h.mappings,    active: a === "mappings" },
            { label: "Examples",              href: h.examples,    active: a === "examples" },
            { label: "JSON",                  href: h.jsonPage,    active: a === "json" },
        ],
        download: { label: "download .json", href: h.jsonRaw },
    });
}
