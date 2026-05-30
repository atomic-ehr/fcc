// The shared table shell (scroll wrapper + thead + tbody) every data table uses.
// `columns` are header labels (escaped); `rows` is the prebuilt <tr>…</tr> HTML.
// `attached` = sits flush under a tab strip (rounded-b, no top border) vs the
// standalone rounded card.
export default function dataTable(ctx: Context, opts: { columns: string[]; rows: string; attached?: boolean }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const wrap = opts.attached ? "rounded-b border-t-0" : "rounded";
    return `<div class="overflow-x-auto ${wrap} border border-slate-200 bg-white">
        <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>${opts.columns.map(c => `<th class="px-3 py-2">${esc(c)}</th>`).join("")}</tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${opts.rows}</tbody>
        </table>
    </div>`;
}
