export default function humanType(_ctx: Context, opts: { t: string }): string {
    return ({
        StructureDefinition: "Profiles",
        Extension:           "Extensions",
        ValueSet:            "Value Sets",
        CodeSystem:          "Code Systems",
        NamingSystem:        "Naming Systems",
        ConceptMap:          "Concept Maps",
        SearchParameter:     "Search Parameters",
        OperationDefinition: "Operations",
        CapabilityStatement: "Capabilities",
        Requirements:        "Requirements",
    } as Record<string, string>)[opts.t] ?? opts.t;
}
