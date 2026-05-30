export default function tagBindingStrength(ctx: Context, opts: { s: string }): string {
    const color = ({
        required:   "bg-rose-100 text-rose-800",
        extensible: "bg-sky-100 text-sky-800",
        preferred:  "bg-emerald-100 text-emerald-800",
        example:    "bg-slate-100 text-slate-700",
    } as Record<string, string>)[opts.s] ?? "bg-slate-100 text-slate-700";
    return `<span class="rounded ${color} px-1.5 py-0.5 text-[10px] font-semibold uppercase">${ctx.fns.site_core.htmlEscape(ctx, { s: opts.s })}</span>`;
}
