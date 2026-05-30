// "Usages" section (StructureDefinition): profiles + CapabilityStatements that
// reference this profile. Null when nothing references it.
export default function $section_usages(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const usages = ctx.fns.profile.usagesOf(ctx, { profile: r });
    if (!usages.length) return null;

    const profiles = usages.filter(u => u.resourceType === "StructureDefinition");
    const caps = usages.filter(u => u.resourceType === "CapabilityStatement");
    const grid = (rs: types.fcc.Resource[]) => ctx.fns.core.linkGrid(ctx, { resources: rs });

    const html = `
        ${profiles.length ? `<p class="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Referenced by profiles (${profiles.length})</p>${grid(profiles)}` : ""}
        ${caps.length ? `<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">CapabilityStatements (${caps.length})</p>${grid(caps)}` : ""}`;
    return { title: `Usages (${usages.length})`, id: "usages", html };
}
