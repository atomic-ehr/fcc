// Expand the known IG-Publisher liquid generators that would otherwise be
// stripped, leaving empty pages. The "Profiles and Extensions" page uses
// `{% include sd-list-generator.md %}` for the profiles list and an inline
// liquid loop (over Extension SDs) for the extensions list — we generate both
// from the bundle. Runs before stripUnrenderedLiquid removes residual liquid.
export default function expandIncludes(ctx: Context, opts: { md: string }): string {
    let md = opts.md;

    // Profiles list include → generated profiles table.
    if (/\{%-?\s*include\s+sd-list-generator\.md\s*-?%\}/.test(md)) {
        md = md.replace(/\{%-?\s*include\s+sd-list-generator\.md\s*-?%\}/g,
            ctx.fns.site.sdListTable(ctx, { kind: "profile" }));
    }

    // Inline extensions-list liquid (starts with `assign ig_only_titles`) →
    // generated extensions table at that spot; the rest of the liquid is then
    // stripped downstream.
    md = md.replace(/\{%-?\s*assign\s+ig_only_titles[^%]*%\}/,
        ctx.fns.site.sdListTable(ctx, { kind: "extension" }));

    return md;
}
