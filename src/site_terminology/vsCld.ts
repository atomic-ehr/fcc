// ValueSet "Logical Definition (CLD)" — renders compose.include / compose.exclude
// the way IG Publisher does: an intro line per rule plus the relevant detail
// (explicit concept table, system-wide note, filters, or imported value sets).
export default function vsCld(ctx: Context, opts: { compose: Record<string, unknown> | undefined }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const compose = opts.compose;
    if (!compose) return `<p class="mt-2 text-sm text-slate-500">This value set has no logical definition.</p>`;

    const block = (verb: "include" | "exclude", inc: Record<string, unknown>): string => {
        const system = inc.system as string | undefined;
        const sysLink = system ? ctx.fns.site_core.linkCanonical(ctx, { url: system, short: true }) : "";
        const concepts = (inc.concept as Array<{ code: string; display?: string }> | undefined) ?? [];
        const filters = (inc.filter as Array<{ property?: string; op?: string; value?: string }> | undefined) ?? [];
        const valueSets = (inc.valueSet as string[] | undefined) ?? [];
        const verbText = verb === "include" ? "Include" : "Exclude";

        if (valueSets.length) {
            return `<div class="mt-3 text-sm text-slate-700">Import all the codes that are contained in
                ${valueSets.map(v => ctx.fns.site_core.linkCanonical(ctx, { url: v, short: true })).join(", ")}</div>`;
        }
        if (concepts.length) {
            const enriched = concepts.map(c => ({ ...c, system, display: c.display ?? ctx.fns.site_terminology.displayFor(ctx, { system, code: c.code }) }));
            return `<div class="mt-3 text-sm text-slate-700">${verbText} these codes as defined in ${sysLink || "the system"}:</div>
                <div class="mt-1">${ctx.fns.site_terminology.conceptTable(ctx, { concepts: enriched })}</div>`;
        }
        if (filters.length) {
            const f = filters.map(x => `<code class="text-xs">${esc(`${x.property ?? ""} ${x.op ?? ""} ${x.value ?? ""}`.trim())}</code>`).join(" and ");
            return `<div class="mt-3 text-sm text-slate-700">${verbText} codes from ${sysLink || "the system"} where ${f}</div>`;
        }
        // System with no concept/filter → all codes from the system.
        return `<div class="mt-3 text-sm text-slate-700">${verbText} all codes defined in ${sysLink || "the system"}</div>`;
    };

    const includes = (compose.include as Array<Record<string, unknown>> | undefined) ?? [];
    const excludes = (compose.exclude as Array<Record<string, unknown>> | undefined) ?? [];
    const parts = [
        ...includes.map(i => block("include", i)),
        ...excludes.map(e => block("exclude", e)),
    ];
    return `<p class="mt-2 text-sm text-slate-600">This value set includes codes based on the following rules:</p>${parts.join("")}`;
}
