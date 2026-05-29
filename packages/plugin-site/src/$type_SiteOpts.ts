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

    /** Drop {:.note-to-balloters} callouts (non-ballot builds). Default false. */
    dropBalloterNotes?: boolean;

    // --- resolved fields written by enable.ts (not author-facing) ---
    tabRegistry?: Record<string, types.site.TabDescriptor[]>;
    blockRegistry?: Record<string, types.site.BlockDescriptor>;
    refLinkMap?: Record<string, string>;
};
