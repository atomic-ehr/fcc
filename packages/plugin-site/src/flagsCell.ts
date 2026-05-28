// IG-Publisher-style Flags column. Compact pills for Σ (summary), ?! (modifier),
// MS (must-support), I (invariant), TU (trial-use). Empty when no flags.
export default function flagsCell(ctx: Context, opts: { e: Record<string, unknown> }): string {
    const e = opts.e;
    const pills: string[] = [];
    if (e.mustSupport)       pills.push(`<span title="Must Support" class="rounded bg-amber-100 px-1 py-0 text-[10px] font-bold text-amber-800">MS</span>`);
    if (e.isModifier)        pills.push(`<span title="Modifier" class="rounded bg-rose-100 px-1 py-0 text-[10px] font-bold text-rose-800">?!</span>`);
    if (e.isSummary)         pills.push(`<span title="Summary" class="rounded bg-sky-100 px-1 py-0 text-[10px] font-bold text-sky-800">Σ</span>`);
    const inv = (e.constraint as Array<unknown> | undefined);
    if (Array.isArray(inv) && inv.length) pills.push(`<span title="${inv.length} invariant(s)" class="rounded bg-violet-100 px-1 py-0 text-[10px] font-bold text-violet-800">I</span>`);
    if (!pills.length) return "";
    void ctx; // unused — kept for signature uniformity
    return `<span class="flex flex-wrap gap-0.5">${pills.join("")}</span>`;
}
