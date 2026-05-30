import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

const mk = () => { const c: any = { state: {}, fns: {}, bundle: { resources: new Map(), byCanonical: new Map() } }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };

test("highlightBlocks: no warm highlighter → html unchanged", () => {
    const c = mk();
    const html = '<pre><code class="language-json">{"a":1}</code></pre>';
    expect(c.fns.site_md.highlightBlocks(c, { html })).toBe(html);
});
test("highlightBlocks: highlights tagged + untagged-JSON blocks when warm", async () => {
    const c = mk();
    await c.fns.site_md.warmHighlighter(c);
    expect(c.fns.site_md.highlightBlocks(c, { html: '<pre><code class="language-json">{&quot;a&quot;:1}</code></pre>' })).toContain('class="shiki');
    expect(c.fns.site_md.highlightBlocks(c, { html: "<pre><code>{&quot;a&quot;:1}</code></pre>" })).toContain('class="shiki');
});
