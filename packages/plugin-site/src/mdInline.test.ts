import { test, expect } from "bun:test";
import loadFns from "./loadFns.ts";

const mk = () => { const c: any = { state: {}, fns: {}, bundle: { resources: new Map(), byCanonical: new Map() } }; loadFns(c); c.fns.site.enable(c, { opts: {} }); return c; };

test("mdInline: renders bold/link/code without a wrapping <p>", () => {
    const c = mk();
    const out = c.fns.site.mdInline(c, { md: "**Bold** see [x](y.html) and `code`" });
    expect(out).not.toMatch(/^<p>/);
    expect(out).toContain("<strong>Bold</strong>");
    expect(out).toContain('<a href="y.html">x</a>');
    expect(out).toContain("<code>code</code>");
});
test("mdInline: empty input → empty string", () => {
    const c = mk();
    expect(c.fns.site.mdInline(c, { md: undefined })).toBe("");
});
