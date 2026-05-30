import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };

test("injectRefLinks: appends def for used-but-undefined [Change Log]", () => {
    const c = mk();
    expect(c.fns.site_md.injectRefLinks(c, { md: "See the [Change Log] for details." })).toContain("[Change Log]: changes.html");
});
test("injectRefLinks: resolves [Mandatory]/[Formal Views]", () => {
    const c = mk();
    expect(c.fns.site_md.injectRefLinks(c, { md: "[Mandatory] and [Formal Views]" })).toContain("[Mandatory]: must-support.html");
    expect(c.fns.site_md.injectRefLinks(c, { md: "[Formal Views]" })).toContain("[Formal Views]: #views");
});
test("injectRefLinks: resolves FHIR element-path links to R4 definitions", () => {
    const c = mk();
    const out = c.fns.site_md.injectRefLinks(c, { md: "binds [CarePlan.status] tightly" });
    expect(out).toContain("[CarePlan.status]: http://hl7.org/fhir/R4/careplan-definitions.html#CarePlan.status");
});
test("injectRefLinks: skips inline link [x](url) and already-defined", () => {
    const c = mk();
    expect(c.fns.site_md.injectRefLinks(c, { md: "See [Change Log](other.html)." })).not.toContain("[Change Log]: changes.html");
    expect(c.fns.site_md.injectRefLinks(c, { md: "[Change Log]\n\n[Change Log]: mine.html" })).not.toContain(": changes.html");
});
