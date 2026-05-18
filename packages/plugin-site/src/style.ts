export const css = `
:root {
  --fg: #1a1a1a;
  --muted: #6a6a6a;
  --link: #0857c3;
  --link-hover: #003c8f;
  --border: #e5e5e5;
  --bg: #fff;
  --bg-soft: #fafafa;
  --bg-code: #f4f4f4;
  --accent: #b22a4b;
  --ms: #d97706;
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  color: var(--fg);
  background: var(--bg);
  margin: 0;
  line-height: 1.5;
}
.layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
nav.side {
  background: var(--bg-soft);
  border-right: 1px solid var(--border);
  padding: 1.5rem 1rem;
  position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto;
}
nav.side h2 { font-size: 0.75rem; text-transform: uppercase; color: var(--muted); margin: 1.5rem 0 0.4rem; letter-spacing: 0.5px; }
nav.side h2:first-child { margin-top: 0; }
nav.side a { display: block; padding: 0.2rem 0; color: var(--fg); text-decoration: none; font-size: 0.9rem; }
nav.side a:hover { color: var(--link); }
nav.side .ig-title { font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem; display: block; }
nav.side .ig-version { color: var(--muted); font-size: 0.8rem; margin-bottom: 1rem; display: block; }

main {
  padding: 2rem 3rem;
  max-width: 1100px;
}
main h1 { margin-top: 0; font-size: 2rem; }
main h2 { border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; margin-top: 2rem; }
main .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
main .meta code { background: var(--bg-code); padding: 0.05rem 0.3rem; border-radius: 3px; font-size: 0.85rem; }

a { color: var(--link); text-decoration: none; }
a:hover { color: var(--link-hover); text-decoration: underline; }
code, pre { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 0.85rem; }
pre {
  background: var(--bg-code);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
}
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
table th, table td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); font-size: 0.9rem; vertical-align: top; }
table th { background: var(--bg-soft); font-weight: 600; }
.tag { display: inline-block; padding: 0.05rem 0.4rem; font-size: 0.7rem; border-radius: 3px; background: var(--bg-code); color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }
.tag.ms { background: var(--ms); color: white; }
.tag.req { background: var(--accent); color: white; }
.path { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 0.85rem; }
.muted { color: var(--muted); }
.kv { display: grid; grid-template-columns: 8rem 1fr; gap: 0.25rem 1rem; margin: 1rem 0; }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; }
.section { margin: 2rem 0; }
.list-grid { display: grid; gap: 0.25rem; grid-template-columns: max-content 1fr; row-gap: 0.5rem; column-gap: 1rem; }
.list-grid .tag { align-self: start; }
ul.codes { padding-left: 1.25rem; }
ul.codes li { margin: 0.25rem 0; }
ul.codes code { background: var(--bg-code); padding: 0 0.3rem; border-radius: 3px; }
footer { color: var(--muted); font-size: 0.8rem; margin-top: 4rem; padding-top: 1rem; border-top: 1px solid var(--border); }
.target-pill { display: inline-block; background: var(--bg-code); color: var(--accent); padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem; }
`;
