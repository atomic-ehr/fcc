// Small overrides + utilities that Tailwind utilities don't cover cleanly:
// - markdown prose tweaks (already styled via @tailwindcss/typography)
// - element-tree path indent for SD differential tables
// - sticky table headers
export const css = `
.path-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
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
.prose pre {
  background: #0b1020;
  color: #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-size: 0.8rem;
}
.prose code { font-size: 0.85em; }
`;
