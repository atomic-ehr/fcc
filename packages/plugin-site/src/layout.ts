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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com?plugins=typography"></script>
<script>
// Mirror the health-samurai.io design tokens: Inter / JetBrains Mono, the HS
// neutral grey ramp (mapped onto Tailwind's \`slate\`, so existing classes adopt
// it with zero template churn) and the HS brand red as \`brand\`.
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: { DEFAULT: '#ea4a35', 50: '#fef7f6', 100: '#fdedea', 500: '#ea4a35', 600: '#DA3A25', 700: '#c93629' },
        slate: {
          50: '#F8F9FA', 100: '#F4F5F6', 200: '#ebecee', 300: '#ccced3', 400: '#98a1ae',
          500: '#717684', 600: '#4a5565', 700: '#364153', 800: '#1e2938', 900: '#1d2331', 950: '#030712',
        },
      },
    },
  },
};
</script>
<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-beta.11/bundles/datastar.js"></script>
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
