// Resolve bare reference-style links like [Change Log] / [Changes Between
// Versions] the way IG Publisher does: append a kramdown-style reference
// definition for each known label that the markdown uses but hasn't defined
// itself. marked's native reference-link support then turns [Label] into a link.
// Author-supplied definitions always win (we only append when absent).
export default function injectRefLinks(ctx: Context, opts: { md: string }): string {
    const map = (ctx.state.site?.refLinkMap ?? {}) as Record<string, string>;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const isDefined = (label: string) => new RegExp(`^\\s*\\[${esc(label)}\\]:`, "m").test(opts.md);
    const isUsed = (label: string) => new RegExp(`\\[${esc(label)}\\](?!\\()`).test(opts.md);

    let add = "";
    for (const [label, href] of Object.entries(map)) {
        if (isUsed(label) && !isDefined(label)) add += `\n[${label}]: ${href}`;
    }

    // FHIR element-path links like [CarePlan.status] → R4 element definition.
    // Toggle with site({ features: { fhirPathLinks: false } }); base via fhirSpecBase.
    if (ctx.fns.site.featureOn(ctx, { name: "fhirPathLinks" })) {
        const base = (ctx.state.site?.fhirSpecBase as string | undefined) ?? "http://hl7.org/fhir/R4/";
        const seen = new Set<string>();
        for (const m of opts.md.matchAll(/\[([A-Z][A-Za-z]+(?:\.[A-Za-z0-9\[\]]+)+)\](?!\()/g)) {
            const label = m[1]!;
            if (seen.has(label) || isDefined(label)) continue;
            seen.add(label);
            const type = label.split(".")[0]!.toLowerCase();
            add += `\n[${label}]: ${base}${type}-definitions.html#${label}`;
        }
    }
    return add ? `${opts.md}\n${add}\n` : opts.md;
}
