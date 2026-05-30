// Plugin activation. Reads author opts and resolves the runtime registries
// (tabs, blocks, reference links) over the built-in defaults, writing the whole
// thing to ctx.state.site so any fn can read config without a closure.
export default function enable(ctx: Context, opts: { opts?: types.site_core.SiteOpts } = {}): void {
    const o = opts.opts ?? {};

    const tabRegistry = ctx.fns.site_core.mergeTabs(ctx, {
        defaults: ctx.fns.site_core.tabDefaults(ctx),
        overrides: o.tabs,
    });

    // Per-resourceType Content section lists; a project key replaces the default.
    const sectionRegistry = { ...ctx.fns.site_core.sectionDefaults(ctx), ...(o.sections ?? {}) };

    // Blocks: defaults overlaid with author entries; `false` disables a built-in.
    const blockRegistry: Record<string, types.site_md.BlockDescriptor> = { ...ctx.fns.site_md.blockDefaults(ctx) };
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
        // Well-known FHIR-core spec reference link used across IGs.
        "Communications": "http://hl7.org/fhir/R4/security.html#http",
        ...(o.refLinks ?? {}),
    };

    ctx.state.site = {
        pagecontent: o.pagecontent ?? "input/pagecontent",
        introNotes:  o.introNotes  ?? "input/intro-notes",
        out:         o.out         ?? "site",
        dropBalloterNotes: o.dropBalloterNotes ?? false,
        features: o.features ?? {},
        fhirSpecBase: o.fhirSpecBase ?? "http://hl7.org/fhir/R4/",
        tabRegistry,
        sectionRegistry,
        blockRegistry,
        refLinkMap,
    } satisfies types.site_core.SiteOpts;
}
