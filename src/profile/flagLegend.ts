// Small legend explaining the Flags-column pills, shown under element tables.
// Mirrors the IG-Publisher key (MS / Σ / ?! / I).
export default function flagLegend(ctx: Context, _opts?: Record<string, never>): string {
    void ctx;
    const item = (pill: string, text: string) =>
        `<span class="inline-flex items-center gap-1">${pill}<span>${text}</span></span>`;
    return `<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-slate-500">
        ${item(`<span class="rounded bg-amber-100 px-1 py-0 text-[10px] font-bold text-amber-800">MS</span>`, "Must Support")}
        ${item(`<span class="rounded bg-sky-100 px-1 py-0 text-[10px] font-bold text-sky-800">Σ</span>`, "Summary element")}
        ${item(`<span class="rounded bg-rose-100 px-1 py-0 text-[10px] font-bold text-rose-800">?!</span>`, "Modifier element")}
        ${item(`<span class="rounded bg-violet-100 px-1 py-0 text-[10px] font-bold text-violet-800">I</span>`, "Has invariant/constraint")}
    </div>`;
}
