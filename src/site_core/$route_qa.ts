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
            const { issues, summary } = report;
            const lines = [
                "# fcc QA report",
                `# ${summary.errors} error(s), ${summary.warnings} warning(s), ${summary.resources} resource(s) affected, ${issues.length} issue(s)`,
                "# severity\tcode\tresource\tpath\tmessage",
                ...issues.map(i => `${i.severity}\t${i.code}\t${i.rid}\t${i.path || ""}\t${(i.message ?? "").replace(/\s+/g, " ").trim()}`),
            ];
            return lines.join("\n") + "\n";
        },
    };
}
