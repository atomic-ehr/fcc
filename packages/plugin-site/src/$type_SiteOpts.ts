export type SiteOpts = {
    /** Directory of markdown content used to render index.html. Default: input/pagecontent */
    pagecontent?: string;
    /** Directory holding per-resource <RT>-<id>-{intro,notes}.md. Default: input/intro-notes */
    introNotes?: string;
    /** Output subdirectory relative to target.out. Default: "site" */
    out?: string;

    /** Per-resourceType tab sets, layered over built-in defaults. Value is a full
     *  TabDescriptor[] (replace) or a merge-spec. Key = resourceType | "*". */
    tabs?: Record<string, types.site.TabDescriptor[] | types.site.TabMergeSpec>;

    /** Block/callout handlers keyed by kramdown class. `false` disables a built-in. */
    blocks?: Record<string, types.site.BlockDescriptor | false>;

    /** Bare reference-link label → href, merged over the built-in IG-page map. */
    refLinks?: Record<string, string>;

    /** Base URL for FHIR-core spec links; element-path links like [CarePlan.status]
     *  resolve to <base><type>-definitions.html#<Path>. Default R4. */
    fhirSpecBase?: string;

    /** Drop {:.note-to-balloters} callouts (non-ballot builds). Default false. */
    dropBalloterNotes?: boolean;

    /** Toggle named page sections/features on/off, e.g. { usages:false, quickStart:true }.
     *  Unlisted features use their built-in default (mostly on). Extensible —
     *  any fn can gate itself with featureOn({ name }). */
    features?: Record<string, boolean>;

    /** Per-resourceType ordered Content section ids (dispatch to $section_<id>).
     *  A key replaces that type's built-in list. Key = resourceType | "*". */
    sections?: Record<string, string[]>;

    // --- resolved fields written by enable.ts (not author-facing) ---
    tabRegistry?: Record<string, types.site.TabDescriptor[]>;
    sectionRegistry?: Record<string, string[]>;
    blockRegistry?: Record<string, types.site.BlockDescriptor>;
    refLinkMap?: Record<string, string>;
};
