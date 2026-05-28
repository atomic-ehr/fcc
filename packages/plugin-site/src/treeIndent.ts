// IG-Publisher-style tree-row leading icon + indent guide. For a path with N
// dots, we emit N indent levels of vertical bar guides + a folder/leaf glyph.
export default function treeIndent(_ctx: Context, opts: { path: string; isLast?: boolean }): string {
    const depth = Math.max(0, (opts.path.match(/\./g) ?? []).length);
    const guides: string[] = [];
    for (let i = 0; i < depth - 1; i++) {
        guides.push(`<span class="inline-block w-4 text-slate-300">│</span>`);
    }
    if (depth > 0) {
        guides.push(`<span class="inline-block w-4 text-slate-300">${opts.isLast ? "└" : "├"}</span>`);
    }
    // 📂 / 📄 are too visually noisy; use a small caret + slate dot.
    const glyph = `<span class="mr-1 inline-block text-slate-400">▸</span>`;
    return `${guides.join("")}${glyph}`;
}
