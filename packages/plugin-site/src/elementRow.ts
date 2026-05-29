// One <tr> for an ElementDefinition, IG-Publisher-style. Shared by the
// Differential and Key Elements tables so both render identically.
//
// Handles two things the old inline builder got wrong:
//   1. Sliced elements (e.g. Patient.extension:race) show "extension:race",
//      not a bare repeated "extension".
//   2. Extension slices link to their extension profile (type[].profile[0])
//      instead of an undifferentiated "Extension" pill.
export default function elementRow(ctx: Context, opts: { e: Record<string, unknown>; isLast?: boolean; defnHref?: string }): string {
    const e = opts.e;
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });

    const path = String(e.path ?? "");
    const sliceName = e.sliceName as string | undefined;
    const lastSeg = path.split(".").pop() ?? path;
    const indent = ctx.fns.site.treeIndent(ctx, { path, isLast: opts.isLast });
    // Element key for the definitions-page anchor (path, or path:slice).
    const anchorKey = sliceName ? `${path}:${sliceName}` : path;
    const nameText = sliceName
        ? `<span class="text-slate-900">${esc(lastSeg)}</span><span class="text-violet-700">:${esc(sliceName)}</span>`
        : `<span class="text-slate-900">${esc(lastSeg)}</span>`;
    // Link the name to the Detailed Descriptions page anchor, like IG Publisher.
    const name = opts.defnHref
        ? `<a class="hover:underline" href="${esc(opts.defnHref)}#${esc(anchorKey)}">${nameText}</a>`
        : nameText;

    const card = ctx.fns.site.formatCard(ctx, { min: e.min, max: e.max });
    const flags = ctx.fns.site.flagsCell(ctx, { e });

    // Type cell. Extension slices carry their target profile in type[].profile;
    // surface it as a link so the row points at the extension definition.
    const types = (e.type as Array<{ code: string; profile?: string[] }> | undefined) ?? [];
    const typeHtml = types.map(t =>
        ctx.fns.site.linkType(ctx, { code: t.code, profile: t.code === "Extension" ? t.profile?.[0] : undefined }),
    ).join(" ");

    const binding = e.binding as { strength?: string; valueSet?: string } | undefined;
    const bindingHtml = binding
        ? `${ctx.fns.site.tagBindingStrength(ctx, { s: binding.strength ?? "" })} ${ctx.fns.site.linkCanonical(ctx, { url: binding.valueSet, short: true })}`
        : "";

    const desc = (e.short as string | undefined) ?? (e.definition as string | undefined) ?? "";

    return `
        <tr class="hover:bg-slate-50/60 even:bg-slate-50/40">
            <td class="path-cell px-3 py-1 align-top text-sm whitespace-nowrap">${indent}${name}</td>
            <td class="px-3 py-1 align-top text-xs">${flags}</td>
            <td class="px-3 py-1 align-top text-xs text-slate-600">${esc(card)}</td>
            <td class="px-3 py-1 align-top">${typeHtml}</td>
            <td class="px-3 py-1 align-top text-xs text-slate-600">
                ${esc(desc)}
                ${bindingHtml ? `<div class="mt-0.5">${bindingHtml}</div>` : ""}
            </td>
        </tr>`;
}
