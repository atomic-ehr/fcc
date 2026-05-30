// IG-Publisher-style multi-row metadata strip:
//   Official URL: <url>             | Version: <ver>
//   Status: <standards-status>      | Maturity Level: <fmm>     | Computable Name: <name>
//   Other Identifiers: OID:<oid>    | Copyright/Legal: <copyright>
export default function urlVersionStrip(ctx: Context, opts: { d: Record<string, unknown> }): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const d = opts.d;
    const url       = (d.url as string | undefined) ?? "";
    const version   = (d.version as string | undefined) ?? ctx.cfg.version;
    const status    = (d.status as string | undefined) ?? "";
    const date      = (d.date as string | undefined) ?? "";
    const name      = (d.name as string | undefined) ?? (d.id as string | undefined) ?? "";
    const copyright = (d.copyright as string | undefined) ?? "";
    const fhirVer   = (d.fhirVersion as string | undefined) ?? "";
    const sdType    = (d.type as string | undefined) ?? "";
    const deriv     = (d.derivation as string | undefined) ?? "";

    // Pull standards-status and fmm from extensions if present.
    const exts = (d.extension as Array<{ url: string; valueCode?: string; valueInteger?: number }> | undefined) ?? [];
    const standardsStatus = exts.find(e => e.url === "http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status")?.valueCode;
    const fmm             = exts.find(e => e.url === "http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm")?.valueInteger;

    // identifiers → "OID:<value>" labels.
    const identifiers = (d.identifier as Array<{ system?: string; value?: string }> | undefined) ?? [];
    const oids = identifiers
        .filter(i => (i.system === "urn:ietf:rfc:3986" || i.system?.startsWith("urn:")) && typeof i.value === "string")
        .map(i => (i.value as string).replace(/^urn:oid:/, "OID:"));

    const row = (left: string, right: string) =>
        `<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">${left}${right}</div>`;
    const cell = (label: string, body: string) =>
        body ? `<span><span class="text-slate-500">${esc(label)}:</span> ${body}</span>` : "";

    return `<div class="mt-3 border-y border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        ${row(
            cell("Official URL", `<code class="text-slate-800">${esc(url)}</code>`),
            cell("Version", `<span class="font-medium text-slate-900">${esc(version)}</span>`),
        )}
        ${row(
            [
                standardsStatus ? cell("Standards Status", `<span class="capitalize">${esc(standardsStatus.replace(/-/g, " "))}</span>`) : "",
                fmm !== undefined ? cell("Maturity Level", `<span class="font-medium">${esc(String(fmm))}</span>`) : "",
                status ? cell(status === "active" ? "Active" : (status[0].toUpperCase() + status.slice(1)), date ? `as of ${esc(date)}` : "—") : "",
            ].filter(Boolean).join(" "),
            cell("Computable Name", `<code class="text-slate-800">${esc(name)}</code>`),
        )}
        ${(fhirVer || sdType || deriv)
            ? row(
                [
                    fhirVer ? cell("FHIR Version", `<span class="font-medium">${esc(fhirVer)}</span>`) : "",
                    sdType  ? cell("Type", `<code class="text-slate-800">${esc(sdType)}</code>`) : "",
                    deriv   ? cell("Derivation", `<span class="capitalize">${esc(deriv)}</span>`) : "",
                ].filter(Boolean).join(" "),
                "",
              )
            : ""}
        ${oids.length || copyright
            ? row(
                oids.length ? cell("Other Identifiers", oids.map(o => `<code class="text-slate-800">${esc(o)}</code>`).join(", ")) : "",
                copyright ? `<span class="text-slate-500"><span class="text-slate-500">Copyright/Legal:</span> ${esc(copyright)}</span>` : "",
              )
            : ""}
    </div>`;
}
