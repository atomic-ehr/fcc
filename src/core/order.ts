export default function order(_ctx: Context, opts: { t: string }): number {
    return ({
        StructureDefinition: 1,
        Extension:           2,
        ValueSet:            3,
        CodeSystem:          4,
        NamingSystem:        5,
        ConceptMap:          6,
        SearchParameter:     7,
        OperationDefinition: 8,
        CapabilityStatement: 9,
    } as Record<string, number>)[opts.t] ?? 50;
}
