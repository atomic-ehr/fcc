import { test, expect } from "bun:test";
import $route_observations from "./$route_observations.ts";

// Mock the site_core fns the route leans on; layout echoes the content so we can
// assert on the table HTML.
function mockCtx(): any {
  return {
    fns: {
      site_core: {
        htmlEscape: (_c: any, { s }: any) => String(s),
        pageHref: (_c: any, { resource }: any) => `${resource.id}.html`,
        linkCanonical: (_c: any, { url }: any) => `LINK(${url})`,
        layout: (_c: any, o: any) => o.content,
      },
    },
  };
}

const sd = (id: string, data: any) => ({ id: `StructureDefinition/${id}`, resourceType: "StructureDefinition", data: { resourceType: "StructureDefinition", id, type: "Observation", derivation: "constraint", url: `http://x/${id}`, ...data } });

// us-core-style fixtures: a vital-signs parent that fixes category via the
// sub-element `.coding.code` and leaves value[x] as the full choice; a child that
// inherits category and fixes only its own code; a smoking profile that uses a
// patternCodeableConcept category, a binding code, and narrowed value slices.
function mockPctx() {
  const vitals = sd("us-core-vital-signs", {
    title: "Vital Signs", baseDefinition: "http://hl7.org/fhir/StructureDefinition/vitalsigns",
    differential: { element: [
      { path: "Observation.category.coding.code", fixedCode: "vital-signs" },
      { path: "Observation.value[x]", type: ["Quantity","CodeableConcept","string","boolean","integer"].map(code => ({ code })) },
    ] },
  });
  const resp = sd("us-core-respiratory-rate", {
    title: "Respiratory Rate", baseDefinition: "http://x/us-core-vital-signs",
    differential: { element: [
      { path: "Observation.code", patternCodeableConcept: { coding: [{ system: "loinc", code: "9279-1" }] } },
    ] },
  });
  const smoking = sd("us-core-smokingstatus", {
    title: "Smoking Status",
    differential: { element: [
      { path: "Observation.category", sliceName: "SocialHistory", patternCodeableConcept: { coding: [{ code: "social-history" }] } },
      { path: "Observation.code", binding: { valueSet: "http://vs/smoking" } },
      { path: "Observation.value[x]", sliceName: "valueQuantity", type: [{ code: "Quantity" }] },
      { path: "Observation.value[x]", sliceName: "valueCodeableConcept", type: [{ code: "CodeableConcept" }] },
    ] },
  });
  const sds = [vitals, resp, smoking];
  return { byType: { StructureDefinition: sds }, byUrl: (u: string) => sds.find(s => s.data.url === u) };
}

function rowsByProfile(html: string): Record<string, string[]> {
  const body = html.split("<tbody>")[1]!.split("</tbody>")[0]!;
  const out: Record<string, string[]> = {};
  for (const r of body.split(/<tr/).slice(1)) {
    const cells = r.split(/<td/).slice(1).map(td => td.replace(/^[^>]*>/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (cells.length >= 4) out[cells[0]!] = cells;
  }
  return out;
}

test("$route_observations: null when the IG has no Observation profiles", () => {
  const pctx: any = { byType: { StructureDefinition: [] }, byUrl: () => undefined };
  expect($route_observations(mockCtx(), { pluginCtx: pctx })).toBeNull();
});

test("$route_observations: category (both fix styles + inheritance), code, narrowed value", () => {
  const route = $route_observations(mockCtx(), { pluginCtx: mockPctx() as any })!;
  expect(route).not.toBeNull();
  expect(route!.path).toBe("observations.html");
  const html = route!.render() as string;
  const rows = rowsByProfile(html);

  // parent: category from the .coding.code sub-element; value[x] is the full
  // 5-type choice → skipped (not a real narrowing) → "—".
  expect(rows["Vital Signs"]![1]).toContain("vital-signs");
  expect(rows["Vital Signs"]![3]).toBe("—");

  // child: inherits category by walking baseDefinition; fixes its own LOINC code.
  expect(rows["Respiratory Rate"]![1]).toContain("vital-signs");
  expect(rows["Respiratory Rate"]![2]).toContain("9279-1");

  // smoking: patternCodeableConcept category, a bound code valueset, two value slices.
  expect(rows["Smoking Status"]![1]).toContain("social-history");
  expect(rows["Smoking Status"]![2]).toContain("LINK(http://vs/smoking)");
  expect(rows["Smoking Status"]![3]).toContain("CodeableConcept");
  expect(rows["Smoking Status"]![3]).toContain("Quantity");
});
