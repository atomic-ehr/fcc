// Built-in pluggable-block registry, keyed by kramdown class token. Non-empty
// wrapClass → styled callout box (with optional title); empty wrapClass →
// "transparent" (attach class to the block, no box). Matches the admonition
// classes found in FHIR IG pagecontent.
export default function blockDefaults(_ctx: Context, _opts?: Record<string, never>): Record<string, types.site.BlockDescriptor> {
    const box = (border: string, bg: string) => `border-l-4 ${border} ${bg} my-4 rounded-r p-3`;
    return {
        "stu-note":          { class: "stu-note",          title: "STU Note",          wrapClass: box("border-amber-400", "bg-amber-50") },
        "note-to-balloters": { class: "note-to-balloters", title: "Note to Balloters", wrapClass: box("border-violet-400", "bg-violet-50") },
        "draft-note":        { class: "draft-note",        title: "Draft Note",        wrapClass: box("border-rose-400", "bg-rose-50") },
        "new-content":       { class: "new-content",       title: "New in this version", wrapClass: box("border-emerald-400", "bg-emerald-50") },
        "dragon":            { class: "dragon",            title: "Here be dragons",   wrapClass: box("border-rose-400", "bg-rose-50") },
        "bg-info":           { class: "bg-info",           title: "",                  wrapClass: box("border-sky-400", "bg-sky-50") },
        "highlight-note":    { class: "highlight-note",    title: "",                  wrapClass: box("border-sky-400", "bg-sky-50") },
        // Transparent layout hints — attach class, no callout box.
        "grid":   { class: "grid",   wrapClass: "" },
        "no_toc": { class: "no_toc", wrapClass: "" },
    };
}
