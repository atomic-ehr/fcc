export default function layout(
    ctx: Context,
    opts: { title: string; content: string; breadcrumb?: types.site.Breadcrumb; activeNav?: string },
): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const breadcrumb = opts.breadcrumb ?? [{ label: "Home", href: "index.html" }, { label: opts.title }];
    const activeNav = opts.activeNav ?? "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)} — ${esc(ctx.cfg.title ?? ctx.cfg.id)}</title>
<script src="https://cdn.tailwindcss.com?plugins=typography"></script>
<link rel="stylesheet" href="style.css">
</head>
<body class="bg-slate-50 text-slate-900 antialiased">

${ctx.fns.site.topBar(ctx, { active: activeNav })}
${ctx.fns.site.buildInfoBanner(ctx)}

<div class="mx-auto flex max-w-screen-2xl">
    ${ctx.fns.site.sidebar(ctx)}
    <main class="min-w-0 flex-1 px-6 py-6 lg:px-10">
        ${ctx.fns.site.renderBreadcrumb(ctx, { crumbs: breadcrumb })}
        ${opts.content}
        <footer class="mt-16 border-t border-slate-200 pt-4 text-xs text-slate-500">
            Built by <a class="text-sky-700 hover:underline" href="https://github.com/HealthSamurai/fcc">fcc</a>
            · target <code class="rounded bg-slate-100 px-1">${esc(ctx.target.name)}</code>
            (FHIR ${esc(ctx.target.fhir)})
            · ${new Date().toISOString().slice(0, 10)}
        </footer>
    </main>
</div>

</body>
</html>`;
}
