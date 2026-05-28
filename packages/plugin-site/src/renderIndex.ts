export default function renderIndex(ctx: Context, opts: { landingHtml: string }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const ig = ctx.bundle.ig.data as Record<string, unknown>;
    const dependencies = (ig.dependsOn as Array<{ packageId: string; version: string }> | undefined) ?? [];

    const counts: Record<string, number> = {};
    for (const r of ctx.bundle.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if ((r.data as { __wasExample?: boolean }).__wasExample) {
            counts["Examples"] = (counts["Examples"] ?? 0) + 1;
        } else {
            const k = ctx.fns.site.humanType(ctx, { t: r.resourceType });
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

    const head = `
        <h1 class="text-3xl font-semibold text-slate-900">${esc(ctx.cfg.title ?? ctx.cfg.id)}</h1>
        <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">${esc(ctx.cfg.id)}</code>
            <span>v${esc(ctx.cfg.version)}</span>
            <span class="text-slate-300">·</span>
            <span>FHIR ${esc(ctx.target.fhir)}</span>
            <span class="text-slate-300">·</span>
            <span>status <span class="font-medium text-slate-800">${esc(ctx.cfg.status ?? "draft")}</span></span>
        </div>
        ${ctx.cfg.description ? `<p class="mt-4 max-w-3xl text-slate-700">${esc(ctx.cfg.description)}</p>` : ""}
        ${depsBlock}
        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">${tiles}</div>
    `;
    const landing = opts.landingHtml ? `<article class="prose prose-slate mt-8 max-w-3xl">${opts.landingHtml}</article>` : "";
    return ctx.fns.site.layout(ctx, {
        title: "Home",
        content: head + landing,
        breadcrumb: [{ label: "Home" }],
        activeNav: "home",
    });
}
