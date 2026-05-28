export default function $render_StructureDefinition(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const id  = (d.id as string) ?? "";
    const title = (d.title as string) ?? id;

    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });

    // Differential rows with IG-Publisher-style tree icons + Flags column.
    const elements = ((d.differential as { element?: Array<Record<string, unknown>> } | undefined)?.element) ?? [];
    const rows = elements.map((e, i) => {
        const path = String(e.path ?? "");
        const card = ctx.fns.site.formatCard(ctx, { min: e.min, max: e.max });
        const flags = ctx.fns.site.flagsCell(ctx, { e });
        const binding = e.binding as { strength?: string; valueSet?: string } | undefined;
        const bindingHtml = binding
            ? `${ctx.fns.site.tagBindingStrength(ctx, { s: binding.strength ?? "" })} ${ctx.fns.site.linkCanonical(ctx, { url: binding.valueSet })}`
            : "";
        const types = (e.type as Array<{ code: string }> | undefined)?.map(t => ctx.fns.site.pillType(ctx, { t: t.code })).join(" ") ?? "";
        const indent = ctx.fns.site.treeIndent(ctx, { path, isLast: i === elements.length - 1 });
        const lastSeg = path.split(".").pop() ?? path;
        const desc = (e.short as string | undefined) ?? (e.definition as string | undefined) ?? "";
        return `
            <tr class="hover:bg-slate-50/60 even:bg-slate-50/40">
                <td class="path-cell px-3 py-1 align-top text-sm">${indent}<span class="text-slate-900">${esc(lastSeg)}</span></td>
                <td class="px-3 py-1 align-top text-xs">${flags}</td>
                <td class="px-3 py-1 align-top text-xs text-slate-600">${esc(card)}</td>
                <td class="px-3 py-1 align-top">${types}</td>
                <td class="px-3 py-1 align-top text-xs text-slate-600">
                    ${esc(desc)}
                    ${bindingHtml ? `<div class="mt-0.5">${bindingHtml}</div>` : ""}
                </td>
            </tr>`;
    }).join("");

    const baseLink = ctx.fns.site.linkCanonical(ctx, { url: d.baseDefinition as string });
    const desc = (d.description as string) ?? "";

    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Profile", d })}
        ${ctx.fns.site.formatChips(ctx, { resource: r })}
        ${ctx.fns.site.urlVersionStrip(ctx, { d })}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.1", title: "Description", id: "description" })}
        ${desc ? `<p class="mt-2 max-w-3xl text-sm text-slate-700">${esc(desc)}</p>` : ""}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.2", title: "Formal Views of Profile Content", id: "views" })}
        <p class="mt-1 text-xs text-slate-500">This structure is derived from ${baseLink}.</p>
        ${ctx.fns.site.profileTabs(ctx, { active: "differential" })}
        <div id="differential" class="overflow-x-auto rounded-b border border-t-0 border-slate-200 bg-white">
            <table class="sd min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        <th class="px-3 py-2">Name</th>
                        <th class="px-3 py-2">Flags</th>
                        <th class="px-3 py-2">Card.</th>
                        <th class="px-3 py-2">Type</th>
                        <th class="px-3 py-2">Description &amp; Constraints</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">${rows}</tbody>
            </table>
        </div>
        <p class="mt-2 text-xs text-slate-500">Other representations of profile: <a class="text-sky-700 hover:underline" href="${ctx.fns.site.pageHref(ctx, { resource: r })}.json">JSON</a></p>

        ${(() => {
            const examples = ctx.fns.site.examplesForProfile(ctx, { profile: r });
            if (!examples.length) return "";
            const items = examples.map(ex => {
                const href = ctx.fns.site.pageHref(ctx, { resource: ex });
                const label = esc(ctx.fns.site.titleOf(ctx, { resource: ex }));
                return `<li><a class="text-sky-700 hover:underline" href="${href}">${label}</a></li>`;
            }).join("");
            return `${ctx.fns.site.sectionHeader(ctx, { num: "1.3", title: `Examples (${examples.length})`, id: "profile-examples" })}
                <ul class="mt-2 list-disc space-y-0.5 pl-6 text-sm">${items}</ul>`;
        })()}

        ${notes ? `${ctx.fns.site.sectionHeader(ctx, { num: "1.4", title: "Notes", id: "notes-section" })}
        <article class="prose prose-slate mt-2 max-w-3xl">${notes}</article>` : ""}

        ${ctx.fns.site.sectionHeader(ctx, { num: notes ? "1.5" : "1.4", title: "Source JSON", id: "json" })}
        <pre class="mt-2 max-h-[60vh] overflow-auto rounded border border-slate-200 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100"><code>${esc(JSON.stringify({ ...d, __wasExample: undefined }, null, 2))}</code></pre>
    `;
    return ctx.fns.site.layout(ctx, {
        title,
        content: body,
        breadcrumb: [
            { label: "Home", href: "index.html" },
            { label: "Profiles", href: "artifacts.html#StructureDefinition" },
            { label: title },
        ],
        activeNav: "profiles",
    });
}
