// Standards-status / FMM / Work-Group badges from a canonical resource's standard
// extensions (IG-Publisher StatusRenderer). Pure ctx — reads only the resource
// data. docs/ig-publisher-parity.md #7.
const SS = "http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status";
const FMM = "http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm";
const WG = "http://hl7.org/fhir/StructureDefinition/structuredefinition-wg";

const SS_COLOR: Record<string, string> = {
    normative: "bg-green-100 text-green-800",
    "trial-use": "bg-amber-100 text-amber-800",
    draft: "bg-slate-100 text-slate-600",
    informative: "bg-sky-100 text-sky-800",
    deprecated: "bg-red-100 text-red-700",
    withdrawn: "bg-red-100 text-red-700",
};

export default function statusBadge(ctx: Context, opts: { data: Record<string, unknown> }): string {
    const ext = (opts.data.extension as Array<Record<string, unknown>> | undefined) ?? [];
    const find = (url: string) => ext.find(e => e.url === url);
    const pill = (color: string, label: string) =>
        `<span class="rounded-full ${color} px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">${ctx.fns.site_core.htmlEscape(ctx, { s: label })}</span>`;

    const out: string[] = [];
    const ss = find(SS)?.valueCode as string | undefined;
    if (ss) out.push(pill(SS_COLOR[ss] ?? "bg-slate-100 text-slate-600", ss.replace(/-/g, " ")));
    const fmm = find(FMM)?.valueInteger;
    if (typeof fmm === "number") out.push(pill("bg-indigo-100 text-indigo-800", `FMM ${fmm}`));
    const wg = find(WG)?.valueCode as string | undefined;
    if (wg) out.push(pill("bg-slate-100 text-slate-600", wg));
    return out.join("");
}
