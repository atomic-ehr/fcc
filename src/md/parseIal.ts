// Parse one kramdown Inline Attribute List token, e.g. "{:.stu-note}",
// "{:.no_toc #translations}", "{:#anchor}". Directive forms ({::options …},
// {:toc}, pipe-row {:a|b}) carry no .class/#id and are flagged for stripping.
export default function parseIal(_ctx: Context, opts: { raw: string }): types.md.Ial | null {
    const m = opts.raw.match(/^\{:(:?)\s*([\s\S]*?)\s*\}$/);
    if (!m) return null;
    const body = m[2] ?? "";
    const classes = [...body.matchAll(/\.([\w-]+)/g)].map(x => x[1]);
    const id = body.match(/#([\w-]+)/)?.[1];
    // Extra colon ({::...}), or a body with neither class nor id, is a directive.
    const directive = m[1] === ":" || (classes.length === 0 && !id);
    return { classes, id, directive };
}
