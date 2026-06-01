import { test, expect } from "bun:test";
import lrefDependency from "./lrefDependency.ts";

const mkCtx = (deps?: any): any => ({ state: deps ? { deps } : {} });

const idx = {
    byCanonical: new Map([
        ["http://hl7.org/fhir/StructureDefinition/Patient", { webPath: "http://hl7.org/fhir/R4/patient.html" }],
    ]),
    byId: new Map([
        ["Patient", { webPath: "http://hl7.org/fhir/R4/patient.html" }],
        ["us-core-patient", { webPath: "http://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-patient.html" }],
        ["status", { webPath: "http://hl7.org/fhir/R4/valueset-status.html" }],   // a lowercase id — must NOT match prose
    ]),
};

test("lrefDependency: resolves a full canonical URL to its published page", () => {
    expect(lrefDependency(mkCtx(idx), { label: "http://hl7.org/fhir/StructureDefinition/Patient" }))
        .toBe("http://hl7.org/fhir/R4/patient.html");
});

test("lrefDependency: resolves a reference-shaped id/name (uppercase or hyphen)", () => {
    expect(lrefDependency(mkCtx(idx), { label: "Patient" })).toBe("http://hl7.org/fhir/R4/patient.html");
    expect(lrefDependency(mkCtx(idx), { label: "us-core-patient" })).toContain("us-core-patient");
});

test("lrefDependency: does NOT match a plain lowercase word against a dependency id", () => {
    expect(lrefDependency(mkCtx(idx), { label: "status" })).toBeNull();   // guard: prose [status] stays unresolved
});

test("lrefDependency: defers (null) when no dependency index is present", () => {
    expect(lrefDependency(mkCtx(), { label: "Patient" })).toBeNull();
});
