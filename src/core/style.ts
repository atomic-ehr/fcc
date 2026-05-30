// Small overrides + utilities that Tailwind utilities don't cover cleanly:
// - markdown prose tweaks (already styled via @tailwindcss/typography)
// - element-tree path indent for SD differential tables
// - sticky table headers
export const css = `
/* ---- One type system (health-samurai): Inter for everything, a single
   JetBrains Mono stack for ALL code/identifiers, one base size. ---------- */
:root {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
}
body {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  color: #1d2331;
}
/* Every monospace surface uses the SAME font (kills the mixed mono stacks). */
code, kbd, samp, pre, .path-cell, pre.shiki, pre.shiki code, .font-mono {
  font-family: var(--font-mono);
}
.path-cell {
  font-size: 0.8125rem;
  white-space: nowrap;
}
.path-cell .seg-sep { color: #9ca3af; }
table.sd thead th {
  position: sticky;
  top: 0;
  background: #f9fafb;
  z-index: 1;
}
details.group-block > summary {
  cursor: pointer;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
details.group-block > summary::-webkit-details-marker { display: none; }
/* Chevron sits on the RIGHT and rotates down when the group is open. */
details.group-block > summary::after {
  content: "\\25B8"; /* ▸ */
  flex: none;
  margin-left: 0.5rem;
  font-size: 0.6rem;
  color: #94a3b8;
  transition: transform 0.15s ease;
}
details.group-block[open] > summary::after { transform: rotate(90deg); }

/* Active (current page) sidebar link. */
#site-nav .nav-active {
  background: #e0f2fe;               /* sky-100 */
  color: #075985;                    /* sky-800 */
  font-weight: 600;
  box-shadow: inset 2px 0 0 #0284c7; /* sky-600 left accent */
}
#site-nav .nav-active:hover { background: #e0f2fe; }
/* Prose typography, mirroring health-samurai.io: blue links / red hover,
   JetBrains-Mono inline code on a light chip, semibold ink headings, GFM
   tables with light header. */
.prose {
  --tw-prose-body: #364153;
  color: #364153;
}
.prose a { color: #2378e1; text-decoration: none; font-weight: 500; }
.prose a:hover { color: #c93629; text-decoration: underline; }
.prose h1, .prose h2, .prose h3, .prose h4 {
  color: #1d2331;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.prose :not(pre) > code {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82em;
  font-weight: 400;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  padding: 0.05rem 0.3rem;
}
/* Tailwind typography wraps inline code in backtick quotes — remove them. */
.prose :not(pre) > code::before, .prose :not(pre) > code::after { content: ""; }
.prose pre {
  background: #0b1020;
  color: #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-size: 0.8rem;
}
/* Shiki-highlighted fenced code blocks in markdown content (light, HS-style).
   Shiki sets its own background inline; we add the frame + sizing. */
pre.shiki {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-size: 0.8125rem;
  line-height: 1.5;
}
.prose pre.shiki { color: inherit; }
.prose pre.shiki code { background: none; border: 0; padding: 0; font-size: inherit; }
.prose table { font-size: 0.9em; }
.prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.4rem 0.65rem; }
.prose thead th { background: #f8f9fa; font-weight: 600; }
.prose blockquote {
  border-left-color: #cbd5e1;
  color: #475569;
  font-style: normal;
  font-weight: 400;
}
`;
