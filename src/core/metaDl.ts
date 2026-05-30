export default function metaDl(ctx: Context, opts: { rows: Array<[string, string]> }): string {
    return `<dl class="mt-4 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1 text-sm">${
        opts.rows.map(([k, v]) => `<dt class="text-slate-500">${ctx.fns.core.htmlEscape(ctx, { s: k })}</dt><dd class="text-slate-800">${v}</dd>`).join("")
    }</dl>`;
}
