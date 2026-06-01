import { test, expect } from "bun:test";
import fixPackageUrl from "./fixPackageUrl.ts";

// Mirrors PackageHacker.fixPackageUrl (vendor/fhir-core/…/npm/PackageHacker.java).

test("fixPackageUrl: null/undefined pass through as null", () => {
    expect(fixPackageUrl(null)).toBeNull();
    expect(fixPackageUrl(undefined)).toBeNull();
});

test("fixPackageUrl: exact-match workaround rewrites a baked-in build path", () => {
    expect(fixPackageUrl("file://C:\\GitHub\\hl7.fhir.us.mcode#1.0.0\\output")).toBe("http://hl7.org/fhir/us/mcode/STU1");
    expect(fixPackageUrl("http://build.fhir.org/branches/R4B//")).toBe("http://hl7.org/fhir/2021Mar");
});

test("fixPackageUrl: us-core STU4.0.0 → STU4 and v311 → STU3.1.1 (issue #295)", () => {
    expect(fixPackageUrl("http://hl7.org/fhir/us/core/STU4.0.0")).toBe("http://hl7.org/fhir/us/core/STU4");
    expect(fixPackageUrl("http://hl7.org/fhir/us/core/v311")).toBe("https://hl7.org/fhir/us/core/STU3.1.1");
});

test("fixPackageUrl: a correct url passes through unchanged", () => {
    expect(fixPackageUrl("http://hl7.org/fhir/R4")).toBe("http://hl7.org/fhir/R4");
    expect(fixPackageUrl("http://hl7.org/fhir/extensions/5.3.0")).toBe("http://hl7.org/fhir/extensions/5.3.0");
});

test("fixPackageUrl: secure mode upgrades http → https for hl7.org/build.fhir", () => {
    expect(fixPackageUrl("http://hl7.org/fhir/R4", { secure: true })).toBe("https://hl7.org/fhir/R4");
    expect(fixPackageUrl("http://hl7.org/fhir/R4")).toBe("http://hl7.org/fhir/R4");   // off by default
});
