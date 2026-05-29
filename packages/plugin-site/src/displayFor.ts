// Resolve a code's display from an in-bundle CodeSystem (US Core defines
// several). Returns undefined for external systems (LOINC/SNOMED) we don't
// carry — the caller then shows the code alone. Searches nested concepts.
export default function displayFor(ctx: Context, opts: { system?: string; code: string }): string | undefined {
    if (!opts.system) return undefined;
    const rid = ctx.bundle.byCanonical.get(opts.system) ?? ctx.bundle.byCanonical.get(opts.system.split("|", 1)[0]);
    const cs = rid ? ctx.bundle.resources.get(rid) : undefined;
    if (!cs || cs.resourceType !== "CodeSystem") return undefined;

    const walk = (concepts: Array<{ code?: string; display?: string; concept?: any[] }> | undefined): string | undefined => {
        for (const c of concepts ?? []) {
            if (c.code === opts.code) return c.display;
            const nested = walk(c.concept);
            if (nested !== undefined) return nested;
        }
        return undefined;
    };
    return walk((cs.data as { concept?: any[] }).concept);
}
