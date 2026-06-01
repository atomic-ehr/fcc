import { test, expect } from "bun:test";
import lrefAlias from "./lrefAlias.ts";

const ctx = (over: any = {}): any => ({
    state: { fshAliases: { USCorePatient: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient", LocalThing: "http://x/Local" }, ...over.state },
    byCanonical: over.byCanonical ?? new Map(),
    resources: over.resources ?? new Map(),
    fns: { site_core: { pageHref: (_c: any, { resource }: any) => `${resource.id.split("/").pop()}.html` } },
});

test("lrefAlias: resolves an alias to a dependency canonical's published page", () => {
    const c = ctx({ state: { deps: { byCanonical: new Map([["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient", { webPath: "http://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-patient.html" }]]) } } });
    expect(lrefAlias(c, { label: "USCorePatient" })).toBe("http://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-patient.html");
});

test("lrefAlias: an alias to an in-bundle canonical resolves to its local page (local wins over dep)", () => {
    const c = ctx({
        byCanonical: new Map([["http://x/Local", "StructureDefinition/local"]]),
        resources: new Map([["StructureDefinition/local", { id: "StructureDefinition/local" }]]),
    });
    expect(lrefAlias(c, { label: "LocalThing" })).toBe("local.html");
});

test("lrefAlias: defers when the label is not an alias, or the alias target is unknown", () => {
    expect(lrefAlias(ctx(), { label: "NotAnAlias" })).toBeNull();
    expect(lrefAlias(ctx(), { label: "USCorePatient" })).toBeNull();   // no local + no deps index
});

test("lrefAlias: defers (null) when there are no FSH aliases at all", () => {
    expect(lrefAlias({ state: {} } as any, { label: "USCorePatient" })).toBeNull();
});
