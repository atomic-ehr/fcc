// The family of companion page URLs IG Publisher generates for one
// StructureDefinition. Centralised so the Content page's tab strip, the
// companion pages themselves, and cross-page element links all agree.
export default function sdHrefs(ctx: Context, opts: { resource: types.fcc.Resource }): types.site_profile.SdHrefs {
    const base = ctx.fns.site_core.pageHref(ctx, { resource: opts.resource }).replace(/\.html$/, "");
    return {
        base,
        content:     `${base}.html`,
        definitions: `${base}-definitions.html`,
        mappings:    `${base}-mappings.html`,
        examples:    `${base}-examples.html`,
        jsonPage:    `${base}.profile.json.html`,
        jsonRaw:     `${base}.profile.json`,
    };
}
