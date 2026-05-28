import { test, expect } from "bun:test";
import parseMenu from "./parseMenu.ts";

// Verifies parsing against the actual us-core menu shape.
const USCORE_MENU = `
id: hl7.fhir.us.core

menu:
  Home: index.html
  Conformance: #conformance.html
      General Requirements: general-requirements.html
      Must Support: must-support.html
      SMART on FHIR Obligations and Capabilities: scopes.html
      Security: security.html
      Requirements Tables: requirements.html
  Guidance: #guidance.html
      USCDI: uscdi.html
      General Guidance: general-guidance.html
      Clinical Notes: clinical-notes.html
      Medication List: medication-list.html
  Profiles & Extensions: profiles-and-extensions.html
  Examples: examples.html

parameters:
  one: two
`;

test("parseMenu builds two-level tree from us-core menu", () => {
    const tree = parseMenu({} as any, { text: USCORE_MENU });
    expect(tree).toHaveLength(5);
    expect(tree[0]).toEqual({ label: "Home", href: "index.html", children: [] });

    const conformance = tree[1]!;
    expect(conformance.label).toBe("Conformance");
    expect(conformance.href).toBe("#conformance.html");
    expect(conformance.children.map(c => c.label)).toEqual([
        "General Requirements", "Must Support",
        "SMART on FHIR Obligations and Capabilities", "Security",
        "Requirements Tables",
    ]);

    const guidance = tree[2]!;
    expect(guidance.label).toBe("Guidance");
    expect(guidance.children.map(c => c.label)).toEqual([
        "USCDI", "General Guidance", "Clinical Notes", "Medication List",
    ]);

    expect(tree[3]).toEqual({ label: "Profiles & Extensions", href: "profiles-and-extensions.html", children: [] });
    expect(tree[4]).toEqual({ label: "Examples", href: "examples.html", children: [] });
});

test("parseMenu returns [] when no menu section", () => {
    const tree = parseMenu({} as any, { text: "id: foo\nparameters:\n  x: 1\n" });
    expect(tree).toEqual([]);
});
