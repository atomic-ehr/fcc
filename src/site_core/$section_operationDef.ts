// OperationDefinition Content section: invocation summary + in/out parameters.
// IG-Publisher OperationDefinitionRenderer parity (docs/ig-publisher-parity.md #8).
export default function $section_operationDef(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const r = opts.resource;
    if (r.resourceType !== "OperationDefinition") return null;
    const d = r.data as Record<string, any>;
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });

    const levels = [d.system && "system", d.type && "type", d.instance && "instance"].filter(Boolean) as string[];
    const resources = ((d.resource ?? []) as string[]).map(esc).join(", ");
    const meta: Array<[string, string]> = [
        ["Code", `<code class="rounded bg-slate-100 px-1">${esc(d.code ?? "")}</code>`],
        ["Kind", esc(d.kind ?? "")],
        ...(d.affectsState !== undefined ? [["Affects state", d.affectsState ? "yes" : "no (idempotent)"] as [string, string]] : []),
        ["Invoke at", levels.length ? esc(levels.join(", ")) + (resources ? ` · ${resources}` : "") : "—"],
    ];
    const metaHtml = `<dl class="mt-2 grid w-fit grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">${
        meta.map(([k, v]) => `<dt class="text-slate-500">${esc(k)}</dt><dd class="text-slate-800">${v}</dd>`).join("")
    }</dl>`;

    const params = (d.parameter ?? []) as Array<Record<string, any>>;
    const paramRow = (p: Record<string, any>) => `<tr class="border-t border-slate-100">
        <td class="py-1.5 pr-4 font-medium text-slate-800">${esc(p.name ?? "")}</td>
        <td class="py-1.5 pr-4 text-slate-500">${esc(`${p.min ?? ""}..${p.max ?? ""}`)}</td>
        <td class="py-1.5 pr-4 text-slate-600">${esc((p.type as string) ?? (p.part ? "(parts)" : ""))}</td>
        <td class="py-1.5 text-xs text-slate-600">${esc((p.documentation as string) ?? "")}</td>
    </tr>`;
    const table = (use: string, label: string) => {
        const ps = params.filter(p => p.use === use);
        if (!ps.length) return "";
        return `<h3 class="mt-5 text-sm font-semibold text-slate-700">${label}</h3>
            <table class="mt-1 w-full max-w-3xl text-sm">
                <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-400"><th class="pb-1 pr-4">Name</th><th class="pb-1 pr-4">Card.</th><th class="pb-1 pr-4">Type</th><th class="pb-1">Documentation</th></tr></thead>
                <tbody>${ps.map(paramRow).join("")}</tbody>
            </table>`;
    };

    return { title: "Operation", id: "operationDef", html: `${metaHtml}${table("in", "Parameters (in)")}${table("out", "Parameters (out)")}` };
}
