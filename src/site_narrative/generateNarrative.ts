// Generate an IG-Publisher-style narrative table for a resource (used for
// examples, whose authored text.div is usually a stub). Lists the meaningful
// top-level elements with humanised values (fhirValue). Returns "" if there's
// nothing worth showing.
export default function generateNarrative(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    // Bundles render per-entry, not as a flat key/value table.
    if (opts.resource.resourceType === "Bundle") return ctx.fns.site_narrative.bundleNarrative(ctx, { resource: opts.resource });
    const d = opts.resource.data as Record<string, unknown>;
    const skip = new Set(["resourceType", "id", "meta", "text", "implicitRules", "language", "__wasExample"]);

    const rows = Object.entries(d)
        .filter(([k]) => !skip.has(k))
        .map(([k, val]) => {
            const rendered = ctx.fns.site_narrative.fhirValue(ctx, { value: val, depth: 1 });
            if (!rendered) return "";
            return `<tr class="border-t border-slate-100 align-top">
                <td class="px-3 py-1.5 font-mono text-xs text-slate-600 whitespace-nowrap">${esc(k)}</td>
                <td class="px-3 py-1.5 text-sm text-slate-800">${rendered}</td>
            </tr>`;
        })
        .filter(Boolean)
        .join("");
    if (!rows) return "";

    return `<table class="grid min-w-full text-sm"><tbody>${rows}</tbody></table>`;
}
