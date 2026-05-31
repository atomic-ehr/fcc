// A markdown body section — `Page.sections` entry of `{ type: "md" }`. Renders the
// section's markdown to HTML through the shared md pipeline. (The reference
// `$section_<type>` for content pages; canonical pages use their own sections.)
export default function $section_md(
    ctx: Context,
    opts: { section: { md?: string; id?: string } },
): { id: string; html: string } {
    return {
        id: opts.section.id ?? "body",
        html: ctx.fns.site_md.mdToHtml(ctx, { md: opts.section.md ?? "" }),
    };
}
