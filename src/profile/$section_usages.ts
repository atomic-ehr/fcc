// "Usages" section (StructureDefinition): profiles + CapabilityStatements that
// reference this profile. Null when nothing references it.
export default function $section_usages(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const usages = ctx.fns.profile.usagesOf(ctx, { profile: r });
    if (!usages.length) return null;

    const profiles = usages.filter(u => u.resourceType === "StructureDefinition");
    const caps = usages.filter(u => u.resourceType === "CapabilityStatement");
    const list = (rs: types.fcc.Resource[]) => `<ul class="mt-1 grid grid-cols-1 gap-0.5 pl-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
        ${rs.map(u => `<li><a class="text-sky-700 hover:underline" href="${ctx.fns.core.pageHref(ctx, { resource: u })}">${esc(ctx.fns.core.titleOf(ctx, { resource: u }))}</a></li>`).join("")}
    </ul>`;

    const html = `
        ${profiles.length ? `<p class="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Referenced by profiles (${profiles.length})</p>${list(profiles)}` : ""}
        ${caps.length ? `<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">CapabilityStatements (${caps.length})</p>${list(caps)}` : ""}`;
    return { title: `Usages (${usages.length})`, id: "usages", html };
}
