// Link resolver (a step in injectRefLinks' chain-of-responsibility). Resolves a
// FHIR element-path label like [CarePlan.status] to its R4 element definition.
// Gated by the `fhirPathLinks` feature; base via site({ fhirSpecBase }).
// Returns an href, or null to defer to the next resolver.
export default function lrefFhirPath(ctx: Context, opts: { label: string }): string | null {
    if (!ctx.fns.site_core.featureOn(ctx, { name: "fhirPathLinks" })) return null;
    if (!/^[A-Z][A-Za-z]+(?:\.[A-Za-z0-9[\]]+)+$/.test(opts.label)) return null;
    const base = (ctx.state.site?.fhirSpecBase as string | undefined) ?? "http://hl7.org/fhir/R4/";
    const type = opts.label.split(".")[0]!.toLowerCase();
    return `${base}${type}-definitions.html#${opts.label}`;
}
