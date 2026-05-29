// Render a FHIR type as a styled pill, linked to its definition. Extension
// slices carrying a profile link to that profile (in-bundle if present). Base
// FHIR datatypes / resources link to the published R4 spec. Unknown codes
// render as a plain pill.
const DATATYPES = new Set([
    // primitives
    "base64Binary", "boolean", "canonical", "code", "date", "dateTime", "decimal",
    "id", "instant", "integer", "markdown", "oid", "positiveInt", "string", "time",
    "unsignedInt", "uri", "url", "uuid",
    // general-purpose complex types
    "Address", "Age", "Annotation", "Attachment", "CodeableConcept", "Coding",
    "ContactPoint", "Count", "Distance", "Duration", "HumanName", "Identifier",
    "Money", "Period", "Quantity", "Range", "Ratio", "Reference", "SampledData",
    "Signature", "Timing", "ContactDetail", "Contributor", "DataRequirement",
    "Expression", "ParameterDefinition", "RelatedArtifact", "TriggerDefinition",
    "UsageContext", "Dosage", "Meta", "Narrative", "Extension", "BackboneElement",
    "Element", "ElementDefinition",
]);

export default function linkType(ctx: Context, opts: { code: string; profile?: string }): string {
    const pill = ctx.fns.site.pillType(ctx, { t: opts.code });

    // Extension/profiled type → short link to the profile (label = its title,
    // not the full canonical URL) so the Type column stays narrow.
    if (opts.profile) return ctx.fns.site.linkCanonical(ctx, { url: opts.profile, short: true });

    if (!opts.code) return "";
    let href: string | undefined;
    if (DATATYPES.has(opts.code)) {
        href = `https://hl7.org/fhir/R4/datatypes.html#${opts.code}`;
    } else if (/^[A-Z]/.test(opts.code)) {
        // Capitalised, not a datatype → treat as a resource type.
        href = `https://hl7.org/fhir/R4/${opts.code.toLowerCase()}.html`;
    }
    if (!href) return pill;
    return `<a class="hover:underline" href="${ctx.fns.site.htmlEscape(ctx, { s: href })}" target="_blank" rel="noopener">${pill}</a>`;
}
