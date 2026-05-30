import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";
const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };

test("sanitizeHtml: strips <script> with body", () => {
    const c = mk();
    expect(c.fns.site_md.sanitizeHtml(c, { html: '<p>ok</p><script>alert(1)</script>' })).toBe('<p>ok</p>');
});
test("sanitizeHtml: removes on*= handlers and js: urls", () => {
    const c = mk();
    const out = c.fns.site_md.sanitizeHtml(c, { html: '<img src=x onerror="alert(1)"><a href="javascript:alert(1)">x</a>' });
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("javascript:");
});
test("sanitizeHtml: keeps safe markup", () => {
    const c = mk();
    expect(c.fns.site_md.sanitizeHtml(c, { html: '<a href="x.html"><strong>hi</strong></a>' })).toBe('<a href="x.html"><strong>hi</strong></a>');
});
