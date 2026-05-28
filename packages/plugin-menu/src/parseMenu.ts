// Parse the `menu:` section of a sushi-config.yaml. The format SUSHI accepts
// is not strict YAML — submenu items live at a deeper indent under their
// parent but as ordinary `key: value` pairs, so a YAML parser flattens them.
// We walk lines, track indent, and build a tree.
//
// Example slice from us-core/sushi-config.yaml:
//   menu:
//     Home: index.html
//     Conformance: #conformance.html
//         General Requirements: general-requirements.html
//         Must Support: must-support.html
//     Guidance: #guidance.html
//         USCDI: uscdi.html
export default function parseMenu(_ctx: Context, opts: { text: string }): types.menu.MenuNode[] {
    const lines = opts.text.split(/\r?\n/);

    // 1. locate the `menu:` line
    let i = 0;
    while (i < lines.length && !/^menu\s*:\s*$/.test(lines[i]!)) i++;
    if (i >= lines.length) return [];
    i++; // past `menu:`

    // 2. read until the next top-level key or EOF
    const block: Array<{ indent: number; key: string; href: string }> = [];
    for (; i < lines.length; i++) {
        const raw = lines[i]!;
        // empty / comment-only line: skip
        if (/^\s*(#.*)?$/.test(raw)) continue;
        const indentMatch = raw.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1]!.length : 0;
        if (indent === 0) break; // back to top level → end of menu block
        const m = raw.match(/^\s*([^#:][^:]*?):\s*(.*?)\s*$/);
        if (!m) continue;
        const key = m[1]!.trim();
        const href = m[2]!.trim();
        block.push({ indent, key, href });
    }

    // 3. build tree by indent ladder
    type Frame = { indent: number; node: types.menu.MenuNode };
    const roots: types.menu.MenuNode[] = [];
    const stack: Frame[] = [];

    for (const { indent, key, href } of block) {
        const node: types.menu.MenuNode = { label: key, href, children: [] };
        while (stack.length && stack[stack.length - 1]!.indent >= indent) stack.pop();
        if (stack.length === 0) {
            roots.push(node);
        } else {
            stack[stack.length - 1]!.node.children.push(node);
        }
        stack.push({ indent, node });
    }
    return roots;
}
