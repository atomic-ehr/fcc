// How a project layers its own tabs over the built-in per-resourceType set:
// `replace` swaps the whole set, `remove` drops ids, `extend` appends. A plain
// TabDescriptor[] value in site({tabs}) is shorthand for a full replace.
export type TabMergeSpec = {
    replace?: types.site.TabDescriptor[];
    remove?: string[];
    extend?: types.site.TabDescriptor[];
};
