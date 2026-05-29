export default function $render_StructureDefinition(ctx: Context, opts: { resource: types.fcc.Resource; strip?: string }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const id  = (d.id as string) ?? "";
    const title = (d.title as string) ?? id;
    const h = ctx.fns.site.sdHrefs(ctx, { resource: r });

    const { intro, notes } = ctx.fns.site.notesFor(ctx, { resource: r });

    const elements = ((d.differential as { element?: Array<Record<string, unknown>> } | undefined)?.element) ?? [];

    // ---- Key Elements: must-support / mandatory / modifier / bound / constrained,
    // plus every ancestor path so the tree stays connected. -------------------
    const isKey = (e: Record<string, unknown>) =>
        e.mustSupport === true ||
        (typeof e.min === "number" && (e.min as number) >= 1) ||
        e.isModifier === true ||
        !!e.binding ||
        (Array.isArray(e.constraint) && e.constraint.length > 0);
    const keyPaths = new Set<string>();
    for (const e of elements) {
        if (!isKey(e)) continue;
        const p = String(e.path ?? "");
        const parts = p.split(".");
        for (let i = 1; i <= parts.length; i++) keyPaths.add(parts.slice(0, i).join("."));
    }
    const keyEls = elements.filter(e => keyPaths.has(String(e.path ?? "")));

    const baseLink = ctx.fns.site.linkCanonical(ctx, { url: d.baseDefinition as string });
    const desc = (d.description as string) ?? "";

    // ---- Inner Formal-Views tabs (signal $sdtab), deep-linkable via #tabs-*.
    // Element names link to the Detailed Descriptions page (h.definitions). ---
    const diffPanel  = ctx.fns.site.elementTable(ctx, { elements, defnHref: h.definitions });
    const keyPanel   = keyEls.length ? ctx.fns.site.elementTable(ctx, { elements: keyEls, defnHref: h.definitions }) : "";
    const bindPanel  = ctx.fns.site.bindingsTable(ctx, { elements });
    const constPanel = ctx.fns.site.constraintsTable(ctx, { elements });

    const innerPanels: Array<{ key: string; label: string; html: string }> = [];
    if (keyPanel)   innerPanels.push({ key: "key",          label: "Key Elements", html: keyPanel });
    innerPanels.push({ key: "differential", label: "Differential", html: diffPanel });
    if (bindPanel)  innerPanels.push({ key: "bindings",     label: "Bindings",     html: bindPanel });
    if (constPanel) innerPanels.push({ key: "constraints",  label: "Constraints",  html: constPanel });

    const ANCHOR: Record<string, string> = {
        key: "tabs-key", differential: "tabs-diff", bindings: "tabs-bind", constraints: "tabs-inv",
    };
    const activeInner = innerPanels[0]?.key ?? "differential";
    const innerTabs = ctx.fns.site.profileTabs(ctx, {
        tabs: innerPanels.map(p => ({ key: p.key, label: p.label, anchor: ANCHOR[p.key] })),
    });
    const innerHtml = innerPanels.map(p =>
        `<div id="${ANCHOR[p.key]}" data-show="$sdtab === '${p.key}'"${p.key === activeInner ? "" : ` style="display:none"`}>${p.html}</div>`,
    ).join("");

    // ---- Sections get sequential numbers after Formal Views. ----------------
    let n = 2;
    const sec = (t: string, sid: string) => ctx.fns.site.sectionHeader(ctx, { num: `1.${++n}`, title: t, id: sid });

    const usages = ctx.fns.site.usagesOf(ctx, { profile: r });
    const usageProfiles = usages.filter(u => u.resourceType === "StructureDefinition");
    const usageCaps     = usages.filter(u => u.resourceType === "CapabilityStatement");

    const linkList = (rs: types.fcc.Resource[]) => `<ul class="mt-1 grid grid-cols-1 gap-0.5 pl-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
        ${rs.map(u => {
            const href = ctx.fns.site.pageHref(ctx, { resource: u });
            const label = esc(ctx.fns.site.titleOf(ctx, { resource: u }));
            return `<li><a class="text-sky-700 hover:underline" href="${href}">${label}</a></li>`;
        }).join("")}
    </ul>`;

    const usagesSection = usages.length ? `${sec(`Usages (${usages.length})`, "usages")}
        ${usageProfiles.length ? `<p class="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Referenced by profiles (${usageProfiles.length})</p>${linkList(usageProfiles)}` : ""}
        ${usageCaps.length ? `<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">CapabilityStatements (${usageCaps.length})</p>${linkList(usageCaps)}` : ""}` : "";

    const quickStart = ctx.fns.site.quickStartTable(ctx, { resourceType: (d.type as string) ?? "" });
    const quickStartSection = quickStart ? `${sec("Quick Start", "quick-start")}
        <p class="mt-1 text-xs text-slate-500">Search parameters defined for the <code>${esc((d.type as string) ?? "")}</code> resource in this IG.</p>
        <div class="mt-2">${quickStart}</div>` : "";

    const notesSection = notes ? `${sec("Notes", "notes-section")}
        <article class="prose prose-slate mt-2 max-w-3xl">${notes}</article>` : "";

    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Profile", d })}
        ${opts.strip ?? ctx.fns.site.canonicalTabStrip(ctx, { resource: r, activeId: "content" })}
        ${ctx.fns.site.urlVersionStrip(ctx, { d })}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.1", title: "Description", id: "description" })}
        ${desc ? `<div class="prose prose-slate prose-sm mt-2 max-w-3xl">${ctx.fns.site.mdToHtml(ctx, { md: desc })}</div>` : ""}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.2", title: "Formal Views of Profile Content", id: "views" })}
        <p class="mt-1 text-xs text-slate-500">This structure is derived from ${baseLink}.</p>
        <div data-signals="{sdtab: '${activeInner}'}">
            ${innerTabs}
            ${innerHtml}
            ${ctx.fns.site.flagLegend(ctx)}
        </div>

        ${usagesSection}
        ${quickStartSection}
        ${notesSection}
        <script>${ctx.fns.site.tabHashScript(ctx)}</script>
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
