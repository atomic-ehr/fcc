export default async function $render_StructureDefinition(ctx: Context, opts: { resource: types.fcc.Resource }): Promise<string> {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const id  = (d.id as string) ?? "";
    const title = (d.title as string) ?? id;

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

    // ---- Inner Formal-Views tabs (signal $sdtab). Only built when populated. -
    const diffPanel  = ctx.fns.site.elementTable(ctx, { elements });
    const keyPanel   = keyEls.length ? ctx.fns.site.elementTable(ctx, { elements: keyEls }) : "";
    const bindPanel  = ctx.fns.site.bindingsTable(ctx, { elements });
    const constPanel = ctx.fns.site.constraintsTable(ctx, { elements });

    const innerPanels: Array<{ key: string; label: string; html: string }> = [];
    if (keyPanel)   innerPanels.push({ key: "key",          label: "Key Elements", html: keyPanel });
    innerPanels.push({ key: "differential", label: "Differential", html: diffPanel });
    if (bindPanel)  innerPanels.push({ key: "bindings",     label: "Bindings",     html: bindPanel });
    if (constPanel) innerPanels.push({ key: "constraints",  label: "Constraints",  html: constPanel });

    // IG-Publisher hash anchors so tabs are deep-linkable (…#tabs-diff).
    const ANCHOR: Record<string, string> = {
        key: "tabs-key", differential: "tabs-diff", bindings: "tabs-bind", constraints: "tabs-inv",
        detailed: "tabs-defn", examples: "tabs-examples", json: "tabs-json",
    };
    const activeInner = innerPanels[0]?.key ?? "differential";
    const innerTabs = ctx.fns.site.profileTabs(ctx, {
        tabs: innerPanels.map(p => ({ key: p.key, label: p.label, anchor: ANCHOR[p.key] })),
        parent: "content",
    });
    const innerHtml = innerPanels.map(p =>
        `<div id="${ANCHOR[p.key]}" data-show="$sdtab === '${p.key}'"${p.key === activeInner ? "" : ` style="display:none"`}>${p.html}</div>`,
    ).join("");

    // ---- Content-tab sections get sequential numbers. -----------------------
    let n = 2;
    const sec = (t: string, sid: string) => ctx.fns.site.sectionHeader(ctx, { num: `1.${++n}`, title: t, id: sid });

    const examples = ctx.fns.site.examplesForProfile(ctx, { profile: r });
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

    // ---- Top-level page tabs (signal $ptab), matching the original IG. -------
    const topPanel = (key: string, html: string) =>
        `<div${ANCHOR[key] ? ` id="${ANCHOR[key]}"` : ""} data-show="$ptab === '${key}'"${key === "content" ? "" : ` style="display:none"`}>${html}</div>`;

    const contentTab = `
        ${ctx.fns.site.sectionHeader(ctx, { num: "1.1", title: "Description", id: "description" })}
        ${desc ? `<p class="mt-2 max-w-3xl text-sm text-slate-700">${esc(desc)}</p>` : ""}
        ${ctx.fns.site.introBlock(ctx, { html: intro })}

        ${ctx.fns.site.sectionHeader(ctx, { num: "1.2", title: "Formal Views of Profile Content", id: "views" })}
        <p class="mt-1 text-xs text-slate-500">This structure is derived from ${baseLink}.</p>
        ${innerTabs}
        ${innerHtml}
        ${ctx.fns.site.flagLegend(ctx)}

        ${usagesSection}
        ${quickStartSection}
        ${notesSection}`;

    const detailedTab = `<h2 class="mt-6 text-lg font-semibold text-slate-900">Detailed Descriptions</h2>
        <div class="mt-2">${ctx.fns.site.detailTable(ctx, { elements })}</div>`;

    const examplesTab = examples.length ? `<h2 class="mt-6 text-lg font-semibold text-slate-900">Examples (${examples.length})</h2>
        <ul class="mt-2 list-disc space-y-0.5 pl-6 text-sm">
            ${examples.map(ex => {
                const href = ctx.fns.site.pageHref(ctx, { resource: ex });
                const label = esc(ctx.fns.site.titleOf(ctx, { resource: ex }));
                return `<li><a class="text-sky-700 hover:underline" href="${href}">${label}</a></li>`;
            }).join("")}
        </ul>` : "";

    const jsonTab = await ctx.fns.site.jsonBlock(ctx, { d, heading: false });

    // Available top tabs (Content/JSON always; Detailed/Examples when populated).
    // Content carries no anchor — it's the default, so it never writes the hash.
    const topTabs: Array<{ key: string; label: string; anchor?: string }> = [{ key: "content", label: "Content" }];
    topTabs.push({ key: "detailed", label: "Detailed Descriptions", anchor: ANCHOR.detailed });
    if (examples.length) topTabs.push({ key: "examples", label: "Examples", anchor: ANCHOR.examples });
    topTabs.push({ key: "json", label: "Source JSON", anchor: ANCHOR.json });

    const body = `
        ${ctx.fns.site.pageHeader(ctx, { title, kind: "Profile", d })}
        <div data-signals="{ptab: 'content', sdtab: '${activeInner}'}">
            ${ctx.fns.site.formatChips(ctx, { resource: r, tabs: topTabs })}
            ${ctx.fns.site.urlVersionStrip(ctx, { d })}
            ${topPanel("content", contentTab)}
            ${topPanel("detailed", detailedTab)}
            ${examples.length ? topPanel("examples", examplesTab) : ""}
            ${topPanel("json", jsonTab)}
        </div>
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
