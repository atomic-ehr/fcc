// Detailed Descriptions view: one block per ElementDefinition with the full
// (untruncated) text the compact table elides — definition/short, comment,
// cardinality, type, binding (with description) and invariants.
export default function detailTable(ctx: Context, opts: { elements: Array<Record<string, unknown>>; anchors?: boolean }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    if (!opts.elements.length) return `<p class="px-3 py-4 text-sm text-slate-500">No elements.</p>`;

    const field = (label: string, body: string) =>
        body ? `<div class="grid grid-cols-[8rem_1fr] gap-2 py-0.5"><dt class="text-slate-500">${esc(label)}</dt><dd class="text-slate-700">${body}</dd></div>` : "";

    const blocks = opts.elements.map(e => {
        const path = String(e.path ?? "");
        const slice = e.sliceName as string | undefined;
        const anchorKey = slice ? `${path}:${slice}` : path;
        const idAttr = opts.anchors ? ` id="${esc(anchorKey)}"` : "";
        const heading = slice ? `${esc(path)}<span class="text-violet-700">:${esc(slice)}</span>` : esc(path);
        const card = ctx.fns.site_core.formatCard(ctx, { min: e.min, max: e.max });

        const types = (e.type as Array<{ code: string; profile?: string[] }> | undefined) ?? [];
        const typeHtml = types.map(t =>
            ctx.fns.site_core.linkType(ctx, { code: t.code, profile: t.code === "Extension" ? t.profile?.[0] : undefined }),
        ).join(" ");

        const binding = e.binding as { strength?: string; valueSet?: string; description?: string } | undefined;
        const bindingHtml = binding
            ? `${ctx.fns.site_core.tagBindingStrength(ctx, { s: binding.strength ?? "" })} ${ctx.fns.site_core.linkCanonical(ctx, { url: binding.valueSet, short: true })}${binding.description ? `<div class="mt-0.5 text-xs text-slate-500">${esc(binding.description)}</div>` : ""}`
            : "";

        const cons = (e.constraint as Array<{ key?: string; human?: string }> | undefined) ?? [];
        const consHtml = cons.length
            ? cons.map(c => `<div><code class="text-xs text-slate-900">${esc(c.key ?? "")}</code>: ${ctx.fns.site_md.mdInline(ctx, { md: c.human })}</div>`).join("")
            : "";

        return `<div${idAttr} class="scroll-mt-20 border-b border-slate-100 px-3 py-2">
            <div class="flex items-center gap-2 text-sm">
                ${ctx.fns.site_profile.flagsCell(ctx, { e })}
                <code class="font-semibold text-slate-900">${heading}</code>
            </div>
            <dl class="mt-1 text-xs">
                ${field("Definition", ctx.fns.site_md.mdInline(ctx, { md: (e.short as string | undefined) ?? (e.definition as string | undefined) }))}
                ${field("Comment", ctx.fns.site_md.mdInline(ctx, { md: e.comment as string | undefined }))}
                ${field("Cardinality", esc(card))}
                ${field("Type", typeHtml)}
                ${field("Binding", bindingHtml)}
                ${field("Constraints", consHtml)}
            </dl>
        </div>`;
    }).join("");

    return `<div class="rounded-b border border-t-0 border-slate-200 bg-white">${blocks}</div>`;
}
