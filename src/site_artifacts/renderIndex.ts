export default function renderIndex(ctx: Context, opts: { landingHtml: string }): string {
    const esc = (s: string) => ctx.fns.site_core.htmlEscape(ctx, { s });
    const ig = (ctx.byId(`ImplementationGuide/${ctx.config.id}`)?.data ?? {}) as Record<string, unknown>;
    const dependencies = (ig.dependsOn as Array<{ packageId: string; version: string }> | undefined) ?? [];

    const counts: Record<string, number> = {};
    for (const r of ctx.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if (r.resourceType === "Page" && (r.data as { kind?: string }).kind === "canonical") continue;   // projection, not a counted artifact
        if ((r.data as { __wasExample?: boolean }).__wasExample) {
            counts["Examples"] = (counts["Examples"] ?? 0) + 1;
        } else {
            const k = ctx.fns.site_core.humanType(ctx, { t: r.resourceType });
            counts[k] = (counts[k] ?? 0) + 1;
        }
    }
    const tiles = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `
        <a href="artifacts.html" class="block rounded-lg border border-slate-200 bg-white p-4 hover:border-sky-400 hover:shadow">
            <div class="text-3xl font-semibold text-slate-900">${n}</div>
            <div class="text-sm text-slate-500">${esc(k)}</div>
        </a>
    `).join("");

    const depsBlock = dependencies.length
        ? `<div class="mt-4 text-sm text-slate-600">
             <span class="font-medium text-slate-700">Depends on:</span>
             ${dependencies.map(d => `<code class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">${esc(d.packageId)}@${esc(d.version)}</code>`).join(" ")}
           </div>`
        : "";

    // IG-Publisher-style publish box (toggle: site({ features:{ publishBox:false } })).
    const boxRow = (label: string, body: string) => body ? `<div class="flex gap-2"><dt class="w-36 shrink-0 text-slate-500">${esc(label)}</dt><dd class="text-slate-800">${body}</dd></div>` : "";
    const publishBox = ctx.fns.site_core.featureOn(ctx, { name: "publishBox" }) ? `
        <dl class="mt-3 max-w-2xl space-y-0.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            ${boxRow("Official URL", ig.url ? `<code class="text-xs">${esc(ig.url as string)}</code>` : "")}
            ${boxRow("Computable Name", `<code class="text-xs">${esc((ig.name as string) ?? ctx.config.id)}</code>`)}
            ${boxRow("Version", esc(ctx.config.version))}
            ${boxRow("Status", `<span class="font-medium">${esc(ctx.config.status ?? "draft")}</span>`)}
            ${boxRow("FHIR Version", esc(ctx.target.fhir))}
            ${boxRow("Package", `<code class="text-xs">${esc(ctx.config.id)}#${esc(ctx.config.version)}</code>`)}
        </dl>` : "";

    const head = `
        <h1 class="text-3xl font-semibold text-slate-900">${esc(ctx.config.title ?? ctx.config.id)}</h1>
        ${publishBox}
        ${ctx.config.description ? `<p class="mt-4 max-w-3xl text-slate-700">${esc(ctx.config.description)}</p>` : ""}
        ${depsBlock}
        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">${tiles}</div>
    `;
    const landing = opts.landingHtml ? `<article class="prose prose-slate mt-8 max-w-3xl">${opts.landingHtml}</article>` : "";
    return ctx.fns.site_core.layout(ctx, {
        title: "Home",
        content: head + landing,
        breadcrumb: [{ label: "Home" }],
        activeNav: "home",
    });
}
