// Built-in per-resourceType ordered section list for the Content page. Section
// ids dispatch to `$section_<id>` fns. Projects reorder/replace via
// site({ sections: { ValueSet: [...] } }); individual sections also toggle via
// site({ features: { usages:false } }). "*" covers examples + other resources.
export default function sectionDefaults(_ctx: Context, _opts?: Record<string, never>): Record<string, string[]> {
    return {
        StructureDefinition: ["description", "formalViews", "usages", "quickStart", "notes"],
        ValueSet:            ["description", "cld", "expansion", "vsReferences", "notes"],
        CodeSystem:          ["description", "concepts", "csReferences", "notes"],
        CapabilityStatement: ["description", "capabilityGrid", "notes"],
        SearchParameter:     ["description", "searchParamDetail", "notes"],
        OperationDefinition: ["description", "operationDef", "notes"],
        "*":                 ["meta", "narrative", "notes"],
    };
}
