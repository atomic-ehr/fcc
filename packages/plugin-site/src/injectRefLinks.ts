// Resolve bare reference-style links like [Change Log] / [Changes Between
// Versions] the way IG Publisher does: append a kramdown-style reference
// definition for each known label that the markdown uses but hasn't defined
// itself. marked's native reference-link support then turns [Label] into a link.
// Author-supplied definitions always win (we only append when absent).
export default function injectRefLinks(ctx: Context, opts: { md: string }): string {
    const map = (ctx.state.site?.refLinkMap ?? {}) as Record<string, string>;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let add = "";
    for (const [label, href] of Object.entries(map)) {
        const used = new RegExp(`\\[${esc(label)}\\](?!\\()`).test(opts.md); // [Label] not immediately followed by (
        const defined = new RegExp(`^\\s*\\[${esc(label)}\\]:`, "m").test(opts.md);
        if (used && !defined) add += `\n[${label}]: ${href}`;
    }
    return add ? `${opts.md}\n${add}\n` : opts.md;
}
