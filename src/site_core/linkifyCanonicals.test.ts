import { test, expect } from "bun:test";
import linkifyCanonicals from "./linkifyCanonicals.ts";

const ctx = (over: any = {}): any => ({
    byUrl: over.byUrl ?? (() => undefined),
    state: { deps: over.deps },
    fns: { site_core: { pageHref: (_c: any, { resource }: any) => `${resource.id}.html` } },
});

test("linkifyCanonicals: a local canonical links to its page", () => {
    const c = ctx({ byUrl: (u: string) => (u === "http://local/X" ? { id: "StructureDefinition-X" } : undefined) });
    expect(linkifyCanonicals(c, { html: 'see "http://local/X" here' })).toContain('<a href="StructureDefinition-X.html"');
});

test("linkifyCanonicals: a dependency canonical links to its published page (#9)", () => {
    const c = ctx({ deps: { byCanonical: new Map([["http://hl7.org/fhir/StructureDefinition/Patient", { webPath: "http://hl7.org/fhir/R4/patient.html" }]]) } });
    expect(linkifyCanonicals(c, { html: '"http://hl7.org/fhir/StructureDefinition/Patient"' }))
        .toContain('<a href="http://hl7.org/fhir/R4/patient.html"');
});

test("linkifyCanonicals: a |version suffix resolves on the bare canonical", () => {
    const c = ctx({ deps: { byCanonical: new Map([["http://x/Y", { webPath: "http://x/Y.html" }]]) } });
    expect(linkifyCanonicals(c, { html: '"http://x/Y|1.0.0"' })).toContain('href="http://x/Y.html"');
});

test("linkifyCanonicals: a truly unknown URL stays plain", () => {
    const out = linkifyCanonicals(ctx(), { html: '"http://unknown.example/x"' });
    expect(out).not.toContain("<a ");
    expect(out).toContain("http://unknown.example/x");
});
