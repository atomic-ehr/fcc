// QA / validation report page (errors.html), à la IG Publisher's qa.html.
// Renders the report the fcc/validator plugin writes to pctx.shared.validate.
// Grouped by resource, severity-badged. opts.report is { issues, summary }.
export default function renderErrors(ctx: Context, opts: { report: types.site_artifacts.ValidationReport }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const { issues, summary } = opts.report;

    const badge = (sev: string) => {
        const cls = sev === "error" ? "bg-rose-100 text-rose-700"
            : sev === "warning" ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-600";
        return `<span class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}">${esc(sev)}</span>`;
    };

    // group by resource, errors-first
    const byRes = new Map<string, types.site_artifacts.ValidationIssue[]>();
    for (const i of issues) (byRes.get(i.rid) ?? byRes.set(i.rid, []).get(i.rid)!).push(i);
    const groups = [...byRes.entries()]
        .map(([rid, list]) => ({ rid, list, errs: list.filter(i => i.severity === "error").length }))
        .sort((a, b) => b.errs - a.errs || b.list.length - a.list.length);

    const rows = (list: types.site_artifacts.ValidationIssue[]) => list.map(i => `
        <tr class="align-top">
            <td class="px-3 py-1 whitespace-nowrap">${badge(i.severity)}</td>
            <td class="px-3 py-1"><code class="text-xs text-slate-500">${esc(i.code)}</code></td>
            <td class="px-3 py-1"><code class="text-xs text-violet-700">${esc(i.path || "—")}</code></td>
            <td class="px-3 py-1 text-xs text-slate-700">${esc(i.message ?? "")}${
                i.expected !== undefined || i.got !== undefined
                    ? `<span class="ml-1 text-slate-400">${i.expected !== undefined ? `expected ${esc(i.expected)}` : ""}${i.got !== undefined ? `, got ${esc(i.got)}` : ""}</span>`
                    : ""}</td>
        </tr>`).join("");

    const cards = groups.map(g => {
        const first = g.list[0]!;
        return `<section class="mt-5 rounded border border-slate-200 bg-white">
            <header class="flex items-baseline justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                <a class="text-sm font-medium text-sky-700 hover:underline" href="${esc(first.href)}">${esc(first.title)}</a>
                <span class="text-xs text-slate-400">${esc(first.rt)} · <code>${esc(first.fhirId)}</code> · ${g.list.length} issue(s)</span>
            </header>
            <table class="min-w-full text-sm"><tbody class="divide-y divide-slate-100">${rows(g.list)}</tbody></table>
        </section>`;
    }).join("");

    // Roll-up by message code (the IG-Publisher QA signal — scan systematically).
    const byCode = new Map<string, { error: number; warning: number; total: number }>();
    for (const i of issues) {
        const c = byCode.get(i.code) ?? { error: 0, warning: 0, total: 0 };
        if (i.severity === "error") c.error++; else if (i.severity === "warning") c.warning++;
        c.total++;
        byCode.set(i.code, c);
    }
    const codeRows = [...byCode.entries()]
        .sort((a, b) => b[1].error - a[1].error || b[1].total - a[1].total)
        .map(([code, c]) => `<tr class="border-t border-slate-100">
            <td class="px-3 py-1"><code class="text-xs text-slate-600">${esc(code)}</code></td>
            <td class="px-3 py-1 text-right text-rose-700">${c.error || ""}</td>
            <td class="px-3 py-1 text-right text-amber-700">${c.warning || ""}</td>
            <td class="px-3 py-1 text-right font-medium text-slate-700">${c.total}</td>
        </tr>`).join("");
    const rollup = issues.length ? `
        <h2 class="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">By message</h2>
        <table class="mt-2 w-full max-w-2xl text-sm">
            <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-400">
                <th class="px-3 pb-1">Message id</th><th class="px-3 pb-1 text-right">Err</th><th class="px-3 pb-1 text-right">Warn</th><th class="px-3 pb-1 text-right">Total</th>
            </tr></thead><tbody>${codeRows}</tbody>
        </table>
        <h2 class="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">By resource</h2>` : "";

    const clean = issues.length === 0;
    const content = `
        <h1 class="text-3xl font-semibold text-slate-900">QA Report</h1>
        <p class="mt-2 text-sm text-slate-600">Schema validation of examples (against their profiles) and canonicals, via
            <code>@atomic-ehr/fhirschema</code>. <span class="text-amber-700">Experimental</span> — FHIRPath-constraint and
            terminology/slicing checks are limited until those evaluators are wired in, so some issues may be false positives.
            Machine-readable: <a class="text-sky-700 hover:underline" href="qa.txt">qa.txt</a>.</p>
        <div class="mt-4 flex gap-3 text-sm">
            <span class="rounded bg-rose-50 px-3 py-1.5 font-medium text-rose-700">${summary.errors} error(s)</span>
            <span class="rounded bg-amber-50 px-3 py-1.5 font-medium text-amber-700">${summary.warnings} warning(s)</span>
            <span class="rounded bg-slate-50 px-3 py-1.5 font-medium text-slate-600">${summary.resources} resource(s) affected</span>
        </div>
        ${rollup}
        ${clean ? `<p class="mt-8 rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-700">No validation issues. ✓</p>` : cards}`;

    return ctx.fns.site_core.layout(ctx, {
        title: "QA Report",
        content,
        breadcrumb: [{ label: "Home", href: "index.html" }, { label: "QA Report" }],
        activeNav: "errors",
    });
}
