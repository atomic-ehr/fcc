// Cross-view aggregate: /observations.html — the Observation registry: every
// Observation profile with its effective category, code binding, and value[x]
// type(s). The code/category/value matrix authors and reviewers scan to compare
// profiles at a glance. IG-Publisher CrossViewRenderer parity (the "Observation
// grid", docs/ig-publisher-parity.md #6). A code-defined $route_ over ctx.byType
// — pure, lazy, re-derived on render so it stays correct incrementally. Returns
// null when the IG defines no Observation profiles (no page, no nav link).
export default function $route_observations(ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef | null {
    const pctx = opts.pluginCtx;
    const profiles = pctx.byType.StructureDefinition
        .filter(r => (r.data as { type?: string; derivation?: string }).type === "Observation"
                  && (r.data as { derivation?: string }).derivation === "constraint")
        .sort((a, b) => a.id.localeCompare(b.id));
    if (!profiles.length) return null;

    return {
        path: "observations.html",
        id: null,                                                   // aggregate — always re-rendered
        contentType: "text/html",
        render: () => {
            const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
            const link = (url: string | undefined) => ctx.fns.site_core.linkCanonical(ctx, { url, short: true });

            // The source files are differential-only (no FHIR snapshot), so read
            // the differential — the profile's authored constraints — and walk the
            // IG-local baseDefinition chain so a vital-signs child inherits its
            // parent's category/value (self elements first → nearest wins for code).
            const elsOf = (r: any): any[] => (r.data?.differential?.element ?? []) as any[];
            const effectiveEls = (r: any): any[] => {
                const out = [...elsOf(r)];
                let cur = r; const seen = new Set<string>([r.id]);
                for (let i = 0; i < 8; i++) {
                    const base = (cur.data as { baseDefinition?: string }).baseDefinition;
                    const parent = base ? pctx.byUrl(base.split("|", 1)[0]!) : undefined;
                    if (!parent || seen.has(parent.id)) break;
                    seen.add(parent.id);
                    out.push(...elsOf(parent));
                    cur = parent;
                }
                return out;
            };

            // Codes a profile fixes on an element — covering the shapes US Core
            // mixes: pattern/fixed CodeableConcept on the element, a pattern/fixed
            // Coding, or a fixed `code` on the `.coding.code` sub-element (how
            // us-core-vital-signs fixes its category).
            const codeishOf = (e: any): string[] => {
                const out: string[] = [];
                const cc = e?.patternCodeableConcept ?? e?.fixedCodeableConcept;
                for (const c of (cc?.coding ?? [])) if (c.code) out.push(c.code);
                const cd = e?.patternCoding ?? e?.fixedCoding;
                if (cd?.code) out.push(cd.code);
                if (e?.fixedCode) out.push(e.fixedCode);
                if (e?.patternCode) out.push(e.patternCode);
                return out;
            };
            // Codes fixed anywhere in an element subtree (`Observation.code`, its
            // `.coding`, its `.coding.code`, …).
            const subtreeCodes = (els: any[], root: string): string[] => {
                const out = new Set<string>();
                for (const e of els) if (e.path === root || (e.path ?? "").startsWith(root + ".")) for (const c of codeishOf(e)) out.add(c);
                return [...out];
            };
            const pill = (s: string) => `<span class="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">${esc(s)}</span>`;

            const rows = profiles.map(r => {
                const d = r.data as Record<string, any>;
                const els = effectiveEls(r);
                const href = ctx.fns.site_core.pageHref(ctx, { resource: r });
                const title = esc((d.title as string) ?? (d.name as string) ?? r.id.split("/").pop()!);

                const cats = new Set(subtreeCodes(els, "Observation.category"));

                const codeEl = els.find(e => e.path === "Observation.code");
                const codeBinding = codeEl?.binding?.valueSet as string | undefined;
                const codePatterns = subtreeCodes(els, "Observation.code");

                const valTypes = new Set<string>();
                let valBinding: string | undefined;
                // the value[x] element itself (or a renamed typed slice) — NOT its sub-elements
                const isValueEl = (p: string) => p === "Observation.value[x]" || /^Observation\.value[A-Z][A-Za-z]*$/.test(p);
                for (const e of els) {
                    if (!isValueEl(e.path ?? "")) continue;
                    const types = ((e.type ?? []) as Array<{ code?: string }>).map(t => t.code).filter(Boolean) as string[];
                    if (types.length > 3) continue;               // the full value[x] choice — not a real narrowing, skip the noise
                    for (const t of types) valTypes.add(t);
                    if (types.length) valBinding ??= e.binding?.valueSet;
                }

                const catCell = cats.size ? [...cats].sort().map(pill).join("") : `<span class="text-slate-300">—</span>`;
                const codeCell = codeBinding ? link(codeBinding)
                    : codePatterns.length ? codePatterns.map(pill).join("")
                    : `<span class="text-slate-300">—</span>`;
                const valCell = (valTypes.size ? [...valTypes].sort().join(" | ") : `<span class="text-slate-300">—</span>`)
                    + (valBinding ? ` <span class="text-xs text-slate-400">${link(valBinding)}</span>` : "");

                return `<tr class="border-t border-slate-100 align-top">
                    <td class="py-1.5 pr-4"><a href="${href}" class="text-sky-700 hover:underline">${title}</a></td>
                    <td class="py-1.5 pr-4">${catCell}</td>
                    <td class="py-1.5 pr-4 text-slate-600">${codeCell}</td>
                    <td class="py-1.5 text-slate-600">${valCell}</td>
                </tr>`;
            }).join("");

            const content = `
                <h1 class="text-3xl font-semibold text-slate-900">Observations</h1>
                <p class="mt-1 text-sm text-slate-500">${profiles.length} Observation profile${profiles.length === 1 ? "" : "s"} — category, code binding, and value type at a glance.</p>
                <table class="mt-6 w-full max-w-5xl text-sm">
                    <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th class="pb-2 pr-4">Profile</th><th class="pb-2 pr-4">Category</th><th class="pb-2 pr-4">Code</th><th class="pb-2">Value</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;

            return ctx.fns.site_core.layout(ctx, {
                title: "Observations",
                content,
                breadcrumb: [{ label: "Home", href: "index.html" }, { label: "Observations" }],
                activeNav: "profiles",
            });
        },
    };
}
