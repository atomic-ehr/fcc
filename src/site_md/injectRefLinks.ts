// Resolve bare reference-style links — [Change Log], [RadiotherapyVolume],
// [CarePlan.status] — the way IG Publisher does: append a kramdown-style
// reference definition for each known label the markdown uses but hasn't defined
// itself. Bun.markdown's native reference-link support then turns [Label] into a
// link. Author-supplied [Label]: definitions always win (we only append absent).
//
// Resolution is a pluggable CHAIN OF RESPONSIBILITY: `ctx.state.site.linkResolvers`
// is an ordered list of resolver fn names (default in enable.ts), each
// `(ctx,{label}) -> href|null`, resolved across namespaces via resolveFn. First
// non-null wins, so chain order IS precedence (static map → graph resource names
// → FHIR element paths). Extend it with site({ linkResolvers: [...] }).
//
// A reference-shaped label ([PascalCaseName]) that resolves to NOTHING is flagged
// red — it reads as an intended local resource link that points nowhere (a typo,
// or a profile that failed to build). Cross-IG names will resolve once a
// dependency resolver lands (#1); until then they also read as unresolved.
export default function injectRefLinks(ctx: Context, opts: { md: string }): string {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isDefined = (label: string) => new RegExp(`^\\s*\\[${esc(label)}\\]:`, "m").test(opts.md);

    const resolve = (label: string) => ctx.fns.site_md.resolveLink(ctx, { label });
    // Looks like a resource reference: a single PascalCase token (has an upper-
    // case start and a lowercase letter — excludes [TODO], [1], prose, paths).
    const isRefShaped = (label: string) => /^[A-Z][A-Za-z0-9]+$/.test(label) && /[a-z]/.test(label);

    // One pass over the markdown: each candidate reference label ([x] that isn't
    // an inline [x](…) link). Resolved → append a definition (→ link); unresolved
    // & reference-shaped → wrap red in place. Scanning the text once (rather than
    // testing every map entry) keeps it cheap as the graph grows.
    let body = opts.md;
    const seen = new Set<string>();
    let add = "";
    for (const m of opts.md.matchAll(/\[([^\]\n]+)\](?!\()/g)) {
        const label = m[1]!;
        if (seen.has(label)) continue;
        seen.add(label);
        if (isDefined(label)) continue;
        const href = resolve(label);
        if (href) { add += `\n[${label}]: ${href}`; continue; }
        if (isRefShaped(label)) {
            body = body.replace(new RegExp(`\\[${esc(label)}\\](?![(:])`, "g"),
                `<span class="rounded-sm bg-rose-50 px-0.5 text-rose-700 underline decoration-rose-300 decoration-dashed" title="unresolved reference — no local resource named ${label}">[${label}]</span>`);
        }
    }
    return add ? `${body}\n${add}\n` : body;
}
