// Humanise a FHIR data value for the generated narrative: primitives as text,
// CodeableConcept/Coding as display||code, Reference as a (linked) label,
// Quantity as "value unit", arrays joined, other complex objects as compact
// "key: value" pairs. Depth-bounded to keep deep structures readable.
export default function fhirValue(ctx: Context, opts: { value: unknown; depth?: number }): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const v = opts.value;
    const depth = opts.depth ?? 0;
    if (v === null || v === undefined) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return esc(String(v));

    if (Array.isArray(v)) {
        const parts = v.map(x => ctx.fns.narrative.fhirValue(ctx, { value: x, depth })).filter(Boolean);
        return parts.length > 1 ? `<ul class="list-disc pl-5">${parts.map(p => `<li>${p}</li>`).join("")}</ul>` : (parts[0] ?? "");
    }

    const o = v as Record<string, any>;
    // Reference → linked display.
    if (typeof o.reference === "string") {
        const label = esc(o.display ?? o.reference);
        const id = o.reference.split("/");
        const href = id.length === 2 ? `${id[0]}-${id[1]}.html` : undefined;
        return href ? `<a class="text-sky-700 hover:underline" href="${href}">${label}</a>` : label;
    }
    // CodeableConcept.
    if (Array.isArray(o.coding)) {
        const txt = o.text ?? o.coding.map((c: any) => c.display ?? c.code).filter(Boolean).join(", ");
        return esc(String(txt ?? ""));
    }
    // Coding.
    if (o.code !== undefined && (o.system !== undefined || o.display !== undefined)) {
        return esc(String(o.display ?? o.code));
    }
    // Quantity / Money / Age etc.
    if (o.value !== undefined && (o.unit !== undefined || o.code !== undefined || o.currency !== undefined)) {
        return esc(`${o.value} ${o.unit ?? o.code ?? o.currency ?? ""}`.trim());
    }
    // Period.
    if (o.start !== undefined || o.end !== undefined) return esc(`${o.start ?? "…"} → ${o.end ?? "…"}`);

    // Extension: url (last segment) → its value*.
    if (typeof o.url === "string" && depth > 0) {
        const valKey = Object.keys(o).find(k => k.startsWith("value"));
        const inner = valKey ? ctx.fns.narrative.fhirValue(ctx, { value: o[valKey], depth: depth + 1 })
            : (Array.isArray(o.extension) ? ctx.fns.narrative.fhirValue(ctx, { value: o.extension, depth: depth + 1 }) : "");
        return `<span class="text-slate-500">${esc(o.url.split("/").pop() ?? o.url)}</span>: ${inner}`;
    }

    // Generic complex object → compact key: value pairs (depth-bounded).
    if (depth >= 3) return "…";
    const pairs = Object.entries(o)
        .filter(([k]) => k !== "id" && k !== "extension")
        .map(([k, val]) => {
            const rv = ctx.fns.narrative.fhirValue(ctx, { value: val, depth: depth + 1 });
            return rv ? `<span class="text-slate-500">${esc(k)}</span> ${rv}` : "";
        })
        .filter(Boolean);
    return pairs.join("; ");
}
