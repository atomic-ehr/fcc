// A full IG-Publisher-style element table (thead + tbody) for a list of
// ElementDefinitions. Used for both the Differential and Key Elements panels.
export default function elementTable(ctx: Context, opts: { elements: Array<Record<string, unknown>>; defnHref?: string }): string {
    const els = opts.elements;
    if (!els.length) {
        return `<p class="px-3 py-4 text-sm text-slate-500">No elements.</p>`;
    }
    const rows = els.map((e, i) => ctx.fns.profile.elementRow(ctx, { e, isLast: i === els.length - 1, defnHref: opts.defnHref })).join("");
    return `<div class="overflow-x-auto rounded-b border border-t-0 border-slate-200 bg-white">
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
    </div>`;
}
