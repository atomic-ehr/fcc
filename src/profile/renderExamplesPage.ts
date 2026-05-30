// The "Examples" companion page (…-examples.html), matching IG Publisher —
// the instances that claim this profile via meta.profile.
export default function renderExamplesPage(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const title = (d.title as string) ?? (d.id as string);
    const examples = ctx.fns.profile.examplesForProfile(ctx, { profile: r });

    const list = examples.length
        ? `<ul class="mt-2 list-disc space-y-0.5 pl-6 text-sm">
            ${examples.map(ex => `<li><a class="text-sky-700 hover:underline" href="${ctx.fns.core.pageHref(ctx, { resource: ex })}">${esc(ctx.fns.core.titleOf(ctx, { resource: ex }))}</a></li>`).join("")}
        </ul>`
        : `<p class="mt-2 text-sm text-slate-500">No examples reference this profile.</p>`;

    const body = `
        ${ctx.fns.core.pageHeader(ctx, { title, kind: "Profile", d })}
        ${opts.strip ?? ctx.fns.core.canonicalTabStrip(ctx, { resource: r, activeId: "examples" })}
        ${ctx.fns.core.urlVersionStrip(ctx, { d })}
        <h2 class="mt-6 text-lg font-semibold text-slate-900">Examples${examples.length ? ` (${examples.length})` : ""}</h2>
        ${list}
    `;
    return ctx.fns.core.layout(ctx, {
        title: `${title} - Examples`,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Profiles", href: "artifacts.html#StructureDefinition" },
            { label: title, href: ctx.fns.profile.sdHrefs(ctx, { resource: r }).content },
            { label: "Examples" },
        ],
        activeNav: "profiles",
    });
}
