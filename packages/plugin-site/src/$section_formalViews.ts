// "Formal Views of Profile Content" section (StructureDefinition): the inner
// Datastar hash-tabs (Key Elements / Differential / Bindings / Constraints) over
// the differential, with element names linking to the Detailed Descriptions
// page. Carries its own tabHashScript so deep links (#tabs-diff) work.
export default function $section_formalViews(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    const h = ctx.fns.site.sdHrefs(ctx, { resource: r });
    const elements = ((d.differential as { element?: Array<Record<string, unknown>> } | undefined)?.element) ?? [];
    if (!elements.length) return null;

    const isKey = (e: Record<string, unknown>) =>
        e.mustSupport === true ||
        (typeof e.min === "number" && (e.min as number) >= 1) ||
        e.isModifier === true ||
        !!e.binding ||
        (Array.isArray(e.constraint) && e.constraint.length > 0) ||
        !!e.sliceName ||
        (Array.isArray(e.type) && (e.type as Array<{ profile?: unknown }>).some(t => t.profile));
    const keyPaths = new Set<string>();
    for (const e of elements) {
        if (!isKey(e)) continue;
        const parts = String(e.path ?? "").split(".");
        for (let i = 1; i <= parts.length; i++) keyPaths.add(parts.slice(0, i).join("."));
    }
    const keyEls = elements.filter(e => keyPaths.has(String(e.path ?? "")));

    const diffPanel  = ctx.fns.site.elementTable(ctx, { elements, defnHref: h.definitions });
    const keyPanel   = keyEls.length ? ctx.fns.site.elementTable(ctx, { elements: keyEls, defnHref: h.definitions }) : "";
    const bindPanel  = ctx.fns.site.bindingsTable(ctx, { elements });
    const constPanel = ctx.fns.site.constraintsTable(ctx, { elements });

    const ANCHOR: Record<string, string> = { key: "tabs-key", differential: "tabs-diff", bindings: "tabs-bind", constraints: "tabs-inv" };
    const panels: Array<{ key: string; label: string; html: string }> = [];
    if (keyPanel)   panels.push({ key: "key", label: "Key Elements", html: keyPanel });
    panels.push({ key: "differential", label: "Differential", html: diffPanel });
    if (bindPanel)  panels.push({ key: "bindings", label: "Bindings", html: bindPanel });
    if (constPanel) panels.push({ key: "constraints", label: "Constraints", html: constPanel });

    const activeInner = panels[0]?.key ?? "differential";
    const innerTabs = ctx.fns.site.profileTabs(ctx, { tabs: panels.map(p => ({ key: p.key, label: p.label, anchor: ANCHOR[p.key] })) });
    const innerHtml = panels.map(p =>
        `<div id="${ANCHOR[p.key]}" data-show="$sdtab === '${p.key}'"${p.key === activeInner ? "" : ` style="display:none"`}>${p.html}</div>`,
    ).join("");

    const baseLink = ctx.fns.site.linkCanonical(ctx, { url: d.baseDefinition as string });
    const html = `
        <p class="mt-1 text-xs text-slate-500">This structure is derived from ${baseLink}.</p>
        <div data-signals="{sdtab: '${activeInner}'}">
            ${innerTabs}
            ${innerHtml}
            ${ctx.fns.site.flagLegend(ctx)}
        </div>
        <script>${ctx.fns.site.tabHashScript(ctx)}</script>`;
    return { title: "Formal Views of Profile Content", id: "views", html };
}
