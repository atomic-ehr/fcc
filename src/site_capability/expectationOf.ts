// Read the FHIR conformance-expectation (SHALL/SHOULD/MAY/SHOULD-NOT) from a
// node's capabilitystatement-expectation extension. Shared by the
// CapabilityStatement grid and SearchParameter detail. Returns "" if absent.
export default function expectationOf(_ctx: Context, opts: { node: unknown }): string {
    const exts = (opts.node as { extension?: Array<{ url?: string; valueCode?: string }> } | undefined)?.extension ?? [];
    return exts.find(e => e.url === "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation")?.valueCode ?? "";
}
