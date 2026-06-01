import { test, expect } from "bun:test";
import { depsList } from "./fsh.ts";

// config.deps → sushi ImplementationGuideDependsOn[] (FHIR core dropped — it's
// loaded via fhirVersion). IG-Publisher #1, stage C.

test("depsList: maps config.deps to {packageId,version}, dropping FHIR core", () => {
    const ctx: any = { config: { deps: {
        "hl7.fhir.r4.core": "4.0.1",
        "hl7.fhir.us.core": "6.1.0",
        "hl7.fhir.uv.genomics-reporting": "2.0.0",
    } } };
    expect(depsList(ctx)).toEqual([
        { packageId: "hl7.fhir.us.core", version: "6.1.0" },
        { packageId: "hl7.fhir.uv.genomics-reporting", version: "2.0.0" },
    ]);
});

test("depsList: drops every FHIR core variant (r4 / r4b / r5)", () => {
    const ctx: any = { config: { deps: {
        "hl7.fhir.r4.core": "4.0.1", "hl7.fhir.r4b.core": "4.3.0",
        "hl7.fhir.r5.core": "5.0.0", "hl7.fhir.us.core": "6.1.0",
    } } };
    expect(depsList(ctx).map(d => d.packageId)).toEqual(["hl7.fhir.us.core"]);
});

test("depsList: empty when no deps declared", () => {
    expect(depsList({ config: {} } as any)).toEqual([]);
});
