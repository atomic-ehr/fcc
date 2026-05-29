// One tab in a resource page's tab strip. A tab is either the main page body
// (kind "main", suffix "") or a separately-generated companion page (kind
// "companion", with an IG-Publisher filename suffix). `render` names the
// FnsRegistry.site renderer fn by string; `avail` optionally names a predicate.
export type TabDescriptor = {
    id: string;                                   // stable key within a resourceType's set
    label: string;                                // strip label
    kind: "main" | "companion";
    render: string;                               // FnsRegistry.site key of the page renderer
    suffix: string;                               // "" for main; e.g. "-definitions.html", ".json.html"
    raw?: { suffix: string };                     // optional raw side-car download (".json", ".profile.json")
    download?: { label: string; suffix: string }; // strip-level download chip
    avail?: string;                               // FnsRegistry.site key of a (ctx,{resource})=>boolean predicate
};
