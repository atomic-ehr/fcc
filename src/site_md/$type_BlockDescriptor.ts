// A pluggable callout/block handler keyed by kramdown class token (without the
// leading dot). A non-empty `wrapClass` renders a styled box (optionally with a
// `title` heading); an empty `wrapClass` is "transparent" — attach the class/id
// to the block, no box (e.g. `grid`, `no_toc`). `render` optionally names a
// FnsRegistry.site fn (ctx,{innerHtml,id,classes}) for fully custom output.
export type BlockDescriptor = {
    class: string;
    render?: string;
    title?: string;
    wrapClass?: string;
};
