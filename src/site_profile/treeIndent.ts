// Tree indentation for an element row: plain whitespace offset by nesting
// depth (number of dots in the path). No bar/caret glyphs — the indentation
// alone conveys hierarchy, which reads cleaner than ASCII tree guides.
export default function treeIndent(_ctx: Context, opts: { path: string; isLast?: boolean }): string {
    const depth = Math.max(0, (opts.path.match(/\./g) ?? []).length);
    if (depth === 0) return "";
    return `<span class="inline-block" style="width:${(depth * 1.1).toFixed(2)}rem"></span>`;
}
