// Top-level page tabs for a StructureDefinition, IG-Publisher-style. Unlike the
// inner Formal-Views tabs (Datastar, hash-addressable), these are real links to
// separately-generated pages — matching IG Publisher's URL model exactly
// (…-definitions.html, …-mappings.html, …-examples.html, …profile.json.html).
// `opts.active` marks the current page so it renders as a non-link chip.
export default function formatChips(
    ctx: Context,
    opts: { resource: types.fcc.Resource; active: "content" | "definitions" | "mappings" | "examples" | "json" },
): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const h = ctx.fns.site.sdHrefs(ctx, { resource: opts.resource });

    const tab = (key: string, label: string, href: string) => {
        const cls = key === opts.active
            ? "rounded-t border-x border-t border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand"
            : "px-3 py-1.5 text-sm text-sky-700 hover:text-sky-900";
        return key === opts.active
            ? `<span class="${cls}">${esc(label)}</span>`
            : `<a class="${cls}" href="${href}">${esc(label)}</a>`;
    };

    return `<div class="mt-2 flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 bg-slate-50 px-1 pt-1">
        <div class="flex flex-wrap items-end gap-1">
            ${tab("content",     "Content",              h.content)}
            ${tab("definitions", "Detailed Descriptions", h.definitions)}
            ${tab("mappings",    "Mappings",             h.mappings)}
            ${tab("examples",    "Examples",             h.examples)}
            ${tab("json",        "JSON",                 h.jsonPage)}
        </div>
        <a class="mb-1 mr-2 text-[11px] text-sky-700 hover:underline" href="${h.jsonRaw}">download .json</a>
    </div>`;
}
