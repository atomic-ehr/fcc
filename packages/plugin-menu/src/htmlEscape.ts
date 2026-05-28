export default function htmlEscape(_ctx: Context, opts: { s: string }): string {
    return String(opts.s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]!));
}
