import { test, expect } from "bun:test";
import loadFns from "./loadFns.ts";

const mk = () => { const c: any = { state: {}, fns: {}, bundle: { resources: new Map(), byCanonical: new Map() } }; loadFns(c); c.fns.site.enable(c, { opts: {} }); return c; };

test("injectRefLinks: appends def for used-but-undefined [Change Log]", () => {
    const c = mk();
    expect(c.fns.site.injectRefLinks(c, { md: "See the [Change Log] for details." })).toContain("[Change Log]: changes.html");
});
test("injectRefLinks: resolves [Mandatory]/[Formal Views]", () => {
    const c = mk();
    expect(c.fns.site.injectRefLinks(c, { md: "[Mandatory] and [Formal Views]" })).toContain("[Mandatory]: must-support.html");
    expect(c.fns.site.injectRefLinks(c, { md: "[Formal Views]" })).toContain("[Formal Views]: #views");
});
test("injectRefLinks: skips inline link [x](url) and already-defined", () => {
    const c = mk();
    expect(c.fns.site.injectRefLinks(c, { md: "See [Change Log](other.html)." })).not.toContain("[Change Log]: changes.html");
    expect(c.fns.site.injectRefLinks(c, { md: "[Change Log]\n\n[Change Log]: mine.html" })).not.toContain(": changes.html");
});
