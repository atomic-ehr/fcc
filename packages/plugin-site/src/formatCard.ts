export default function formatCard(_ctx: Context, opts: { min: unknown; max: unknown }): string {
    if (opts.min === undefined && opts.max === undefined) return "";
    return `${opts.min ?? "0"}..${opts.max ?? "*"}`;
}
