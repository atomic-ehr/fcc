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

test("injectRefLinks: resolves a named graph resource via the lrefResource chain step", () => {
    const c = mk();
    c.resources.set("StructureDefinition/my-profile", {
        resourceType: "StructureDefinition", id: "StructureDefinition/my-profile",
        data: { resourceType: "StructureDefinition", id: "my-profile", name: "MyProfile", url: "http://x/MyProfile" },
    });
    const out = c.fns.site_md.injectRefLinks(c, { md: "uses [MyProfile] here" });
    expect(out).toContain("[MyProfile]: ");
    expect(out).toContain("my-profile");                       // links to the resource's page
    expect(out).not.toContain("text-rose-700");                // resolved → not flagged
});

test("injectRefLinks: flags an unresolved reference-shaped [Name] in red", () => {
    const c = mk();
    const out = c.fns.site_md.injectRefLinks(c, { md: "see [UnknownProfile] here" });
    expect(out).toContain("text-rose-700");                    // wrapped red
    expect(out).toContain("[UnknownProfile]");                 // brackets kept as the signal
    expect(out).toContain('title="unresolved reference');
});

test("injectRefLinks: leaves non-reference-shaped brackets ([note], [1]) untouched", () => {
    const c = mk();
    expect(c.fns.site_md.injectRefLinks(c, { md: "a [note] and [1] and [TODO]" })).not.toContain("text-rose-700");
});

test("injectRefLinks: a single capitalised word in prose is NOT flagged red (no camelCase hump)", () => {
    const c = mk();
    // [Home]/[Normative]/[FHIRPath] are prose, not resource refs — must stay plain.
    expect(c.fns.site_md.injectRefLinks(c, { md: "the [Home] page is [Normative] per [FHIRPath]" })).not.toContain("text-rose-700");
    // a compound identifier still flags when unresolved.
    expect(c.fns.site_md.injectRefLinks(c, { md: "see [UnknownProfile]" })).toContain("text-rose-700");
});
