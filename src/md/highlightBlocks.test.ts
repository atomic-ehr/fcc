import { test, expect } from "bun:test";
import loadAll from "../loadAll.ts";

const mk = () => { const c: any = { state: {}, fns: {}, bundle: { resources: new Map(), byCanonical: new Map() } }; loadAll(c); c.fns.core.enable(c, { opts: {} }); return c; };

test("highlightBlocks: no warm highlighter → html unchanged", () => {
    const c = mk();
    const html = '<pre><code class="language-json">{"a":1}</code></pre>';
    expect(c.fns.md.highlightBlocks(c, { html })).toBe(html);
});
test("highlightBlocks: highlights tagged + untagged-JSON blocks when warm", async () => {
    const c = mk();
    await c.fns.md.warmHighlighter(c);
    expect(c.fns.md.highlightBlocks(c, { html: '<pre><code class="language-json">{&quot;a&quot;:1}</code></pre>' })).toContain('class="shiki');
    expect(c.fns.md.highlightBlocks(c, { html: "<pre><code>{&quot;a&quot;:1}</code></pre>" })).toContain('class="shiki');
});
