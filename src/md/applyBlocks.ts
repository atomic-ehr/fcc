// Pluggable-block post-processor over marked's HTML output. Turns kramdown IAL
// markers (`{:.stu-note}` etc.) into styled callouts via ctx.state.site
// .blockRegistry. Handles both placements: a marker standalone in its own
// paragraph after a block (kramdown attaches it to the preceding block), and a
// marker trailing inside a block's own content. Unknown classes and directive
// markers are simply stripped (never leak as literal text, unlike before).
export default function applyBlocks(ctx: Context, opts: { html: string }): string {
    const esc = (s: string) => ctx.fns.core.htmlEscape(ctx, { s });
    const reg = (ctx.state.site?.blockRegistry ?? {}) as Record<string, types.md.BlockDescriptor>;
    const drop = ctx.state.site?.dropBalloterNotes === true;
    const TAGS = "p|h[1-6]|ul|ol|blockquote|table|div";

    // The `(?=[\\s>])` lookahead pins the tag name's end so `p` can't match
    // `<pre>` (which would make `</\\1>`=`</p>` miss `</pre>` and let the lazy
    // span swallow an entire fenced code block up to the next marker).
    const OPEN = `(${TAGS})(?=[\\s>])`;

    // 1) Merge a standalone marker paragraph into the block it follows.
    let h = opts.html.replace(
        new RegExp(`</(${TAGS})>\\s*<p>(\\{:[^}]*\\})</p>`, "g"),
        (_m, tag, raw) => `${raw}</${tag}>`,
    );

    // 2) Handle a marker trailing inside a block's content.
    h = h.replace(
        new RegExp(`<${OPEN}([^>]*)>([\\s\\S]*?)\\s*(\\{:[^}]*\\})\\s*</\\1>`, "g"),
        (_m, tag, attrs, inner, raw) => {
            const ial = ctx.fns.md.parseIal(ctx, { raw });
            const idAttr = ial?.id ? ` id="${esc(ial.id)}"` : "";
            const plain = `<${tag}${attrs}${idAttr}>${inner}</${tag}>`;
            if (!ial || ial.directive) return plain;

            // Honour dropBalloterNotes even if the class was disabled in the registry.
            if (drop && ial.classes.includes("note-to-balloters")) return "";
            const cls = ial.classes.find(c => reg[c]);
            if (!cls) return plain; // unknown class → strip marker, keep block (+id)

            const d = reg[cls]!;
            if (d.render) {
                const fn = ctx.fns.core.resolveFn(ctx, { key: d.render });
                if (typeof fn === "function") return fn(ctx, { innerHtml: plain, id: ial.id, classes: ial.classes });
            }
            if (!d.wrapClass) {
                // Transparent: attach the class to the block, no callout box.
                return `<${tag}${attrs} class="${esc(cls)}"${idAttr}>${inner}</${tag}>`;
            }
            const title = d.title
                ? `<p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">${esc(d.title)}</p>`
                : "";
            return `<div${idAttr} class="${d.wrapClass}">${title}${plain}</div>`;
        },
    );

    // 3) Sweep up any marker-only paragraphs left unattached.
    h = h.replace(/<p>\s*\{:[^}]*\}\s*<\/p>/g, "");

    // 4) Strip leftover inline/span IAL tokens ({:.x} mid-text, {::download=…})
    //    so nothing leaks — but never touch markers inside fenced code (<pre>).
    h = h.split(/(<pre[\s\S]*?<\/pre>)/).map((seg, i) =>
        i % 2 === 1 ? seg : seg.replace(/\{:\s*[.#:][^}]*\}/g, ""),
    ).join("");
    return h;
}
