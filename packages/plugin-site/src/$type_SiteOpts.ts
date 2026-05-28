export type SiteOpts = {
    /** Directory of markdown content used to render index.html. Default: input/pagecontent */
    pagecontent?: string;
    /** Directory holding per-resource <RT>-<id>-{intro,notes}.md. Default: input/intro-notes */
    introNotes?: string;
    /** Output subdirectory relative to target.out. Default: "site" */
    out?: string;
};
