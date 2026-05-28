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
}
details.group-block > summary::-webkit-details-marker { display: none; }
details.group-block > summary::before {
  content: "\\25B8"; /* right-pointing triangle */
  display: inline-block;
  width: 0.85rem;
  font-size: 0.65rem;
  color: #6b7280;
  transition: transform 0.1s ease;
}
details.group-block[open] > summary::before { transform: rotate(90deg); }
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
