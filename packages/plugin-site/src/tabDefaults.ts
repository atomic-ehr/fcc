// Built-in per-resourceType tab registry. Suffixes are copied verbatim from the
// previous sdHrefs / inline tabLinks so companion-page URLs stay byte-identical.
// "*" is the fallback set for examples and any other resourceType.
export default function tabDefaults(_ctx: Context, _opts?: Record<string, never>): Record<string, types.site.TabDescriptor[]> {
    const jsonDl = (suffix: string) => ({ label: "download .json", suffix });
    return {
        StructureDefinition: [
            { id: "content",     label: "Content",               kind: "main",      suffix: "",                   render: "$render_StructureDefinition" },
            { id: "definitions", label: "Detailed Descriptions", kind: "companion", suffix: "-definitions.html",  render: "renderDefinitionsPage", avail: "$avail_notExample" },
            { id: "mappings",    label: "Mappings",              kind: "companion", suffix: "-mappings.html",     render: "renderMappingsPage",    avail: "$avail_notExample" },
            { id: "examples",    label: "Examples",              kind: "companion", suffix: "-examples.html",     render: "renderExamplesPage",    avail: "$avail_notExample" },
            { id: "json",        label: "JSON",                  kind: "companion", suffix: ".profile.json.html", render: "renderProfileJsonPage", avail: "$avail_notExample", raw: { suffix: ".profile.json" }, download: jsonDl(".profile.json") },
        ],
        ValueSet: [
            { id: "content", label: "Content", kind: "main",      suffix: "",           render: "$render_ValueSet" },
            { id: "json",    label: "JSON",    kind: "companion", suffix: ".json.html", render: "renderValueSetJsonPage", raw: { suffix: ".json" }, download: jsonDl(".json") },
        ],
        CodeSystem: [
            { id: "content", label: "Content", kind: "main",      suffix: "",           render: "$render_CodeSystem" },
            { id: "json",    label: "JSON",    kind: "companion", suffix: ".json.html", render: "renderResourceJsonPage", raw: { suffix: ".json" }, download: jsonDl(".json") },
        ],
        "*": [
            { id: "content", label: "Content", kind: "main",      suffix: "",           render: "$render_default" },
            { id: "json",    label: "JSON",    kind: "companion", suffix: ".json.html", render: "renderResourceJsonPage", raw: { suffix: ".json" }, download: jsonDl(".json") },
        ],
    };
}
