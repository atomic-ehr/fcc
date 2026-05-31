// /qa.txt — machine-readable QA report (one tab-separated line per issue), the
// CI-friendly companion to errors.html (IG-Publisher qa.txt parity,
// docs/ig-publisher-parity.md #3). Absent when the validator plugin didn't run.
export default function $route_qa(_ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef | null {
    const report = (opts.pluginCtx.shared as { validate?: types.site_artifacts.ValidationReport }).validate;
    if (!report) return null;
    return {
        path: "qa.txt",
        id: null,                                                   // aggregate — always re-rendered
        contentType: "text/plain; charset=utf-8",
        render: () => {
            const { issues, summary, suppressed } = report;
            const sup = suppressed?.total ?? 0;
            const flat = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
            const lines = [
                "# fcc QA report",
                `# ${summary.errors} error(s), ${summary.warnings} warning(s), ${summary.resources} resource(s) affected, ${issues.length} issue(s)${sup ? `, ${sup} suppressed` : ""}`,
                "# severity\tcode\tresource\tpath\tmessage",
                ...issues.map(i => `${i.severity}\t${i.code}\t${i.rid}\t${i.path || ""}\t${flat(i.message)}`),
            ];
            if (suppressed && suppressed.total) {
                // Suppressed warnings/hints, machine-distinguishable (severity prefixed
                // "suppressed:"), with the review reason in the trailing column.
                lines.push(`# ${suppressed.total} suppressed (reviewed warnings/hints)`);
                for (const i of suppressed.issues) {
                    lines.push(`suppressed:${i.severity}\t${i.code}\t${i.rid}\t${i.path || ""}\t${flat(i.message)}\t${flat(i.reason)}`);
                }
            }
            return lines.join("\n") + "\n";
        },
    };
}
