// Plugin activation. Reads author opts and resolves the runtime registries
// (tabs, blocks, reference links) over the built-in defaults, writing the whole
// thing to ctx.state.site so any fn can read config without a closure.
export default function enable(ctx: Context, opts: { opts?: types.site.SiteOpts } = {}): void {
    const o = opts.opts ?? {};

    const tabRegistry = ctx.fns.site.mergeTabs(ctx, {
        defaults: ctx.fns.site.tabDefaults(ctx),
        overrides: o.tabs,
    });

    // Blocks: defaults overlaid with author entries; `false` disables a built-in.
    const blockRegistry: Record<string, types.site.BlockDescriptor> = { ...ctx.fns.site.blockDefaults(ctx) };
    for (const [cls, desc] of Object.entries(o.blocks ?? {})) {
        if (desc === false) delete blockRegistry[cls];
        else blockRegistry[cls] = desc;
    }

    // Reference links: built-in IG pages first, author entries win.
    // Bare reference links FHIR IGs use without a definition. Authors win.
    const refLinkMap: Record<string, string> = {
        "Change Log": "changes.html",
        "Changes Between Versions": "changes-between-versions.html",
        "Mandatory": "must-support.html",
        "Must Support": "must-support.html",
        "Formal Views": "#views",
        ...(o.refLinks ?? {}),
    };

    ctx.state.site = {
        pagecontent: o.pagecontent ?? "input/pagecontent",
        introNotes:  o.introNotes  ?? "input/intro-notes",
        out:         o.out         ?? "site",
        dropBalloterNotes: o.dropBalloterNotes ?? false,
        tabRegistry,
        blockRegistry,
        refLinkMap,
    } satisfies types.site.SiteOpts;
}
