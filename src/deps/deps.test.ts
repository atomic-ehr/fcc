import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import deps from "./deps.ts";

// Integration over the real FHIR package cache — skipped where R4 core isn't
// installed (CI without ~/.fhir/packages), so it never flakes.
const r4 = join(homedir(), ".fhir", "packages", "hl7.fhir.r4.core#4.0.1", "package", "package.json");
const maybe = existsSync(r4) ? test : test.skip;

maybe("deps: indexes R4 core from the cache and maps canonicals to published pages", async () => {
    const step = deps({ quiet: true })[0]!;
    const ctx: any = {
        config: { deps: { "hl7.fhir.r4.core": "4.0.1" }, projectRoot: "/tmp" },
        state: {}, warn: () => {},
    };
    await step.fn(ctx, step, {});
    const idx = ctx.state.deps;
    expect(idx.packages.length).toBe(1);
    expect(idx.byCanonical.size).toBeGreaterThan(1000);

    // Patient resolves to the real core page (spec.internals — patient.html, not
    // the StructureDefinition-Patient.html convention fallback).
    const patient = idx.byCanonical.get("http://hl7.org/fhir/StructureDefinition/Patient");
    expect(patient.webPath).toBe("http://hl7.org/fhir/R4/patient.html");
    expect(idx.byId.get("Patient").webPath).toBe("http://hl7.org/fhir/R4/patient.html");
});

test("deps: a missing dependency is skipped gracefully (no throw, empty index)", async () => {
    const step = deps({ quiet: true })[0]!;
    const ctx: any = {
        config: { deps: { "no.such.package": "9.9.9" }, projectRoot: "/tmp" },
        state: {}, warn: () => {},
    };
    await step.fn(ctx, step, {});
    expect(ctx.state.deps.packages.length).toBe(0);
    expect(ctx.state.deps.byCanonical.size).toBe(0);
});
