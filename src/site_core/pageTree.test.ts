import { test, expect } from "bun:test";
import pageTree from "./pageTree.ts";
import numberPages from "./numberPages.ts";

const menuNode = (label: string, href: string, children: any[] = []): any => ({ label, href, children });

test("pageTree: menu order + hierarchy drives content pages; anchor-only headers are containers", () => {
  const menu = [
    menuNode("Home", "index.html"),
    menuNode("Conformance", "#conformance.html", [
      menuNode("General", "general-requirements.html"),
      menuNode("Must Support", "must-support.html"),
    ]),
  ];
  const pages = [
    { slug: "index", title: "Home", kind: "landing" },
    { slug: "general-requirements", title: "General Requirements", kind: "content" },
    { slug: "must-support", title: "Must Support", kind: "content" },
  ];
  const roots = pageTree({} as any, { menu, pages });

  expect(roots[0]).toMatchObject({ slug: "index", title: "Home" });
  expect(roots[1]).toMatchObject({ slug: "", title: "Conformance" });          // anchor-only → container, label kept
  expect(roots[1].children.map((c: any) => c.slug)).toEqual(["general-requirements", "must-support"]);

  const n = numberPages({} as any, { roots });
  expect(n.get("index")).toBe("1");
  expect(n.get("general-requirements")).toBe("2.1");                            // under the "2" container
  expect(n.get("must-support")).toBe("2.2");
});

test("pageTree: canonical pages unplaced by the menu fall into ordered artifact groups", () => {
  const menu = [menuNode("Home", "index.html")];
  const pages = [
    { slug: "index", title: "Home", kind: "landing" },
    { slug: "CodeSystem-cs", title: "CS", kind: "canonical", for: "CodeSystem" },
    { slug: "StructureDefinition-b", title: "B Profile", kind: "canonical", for: "StructureDefinition" },
    { slug: "StructureDefinition-a", title: "A Profile", kind: "canonical", for: "StructureDefinition" },
    { slug: "ValueSet-vs", title: "VS", kind: "canonical", for: "ValueSet" },
  ];
  const roots = pageTree({} as any, { menu, pages });

  // Home, then groups in GROUP_ORDER: Profiles&Extensions, Value Sets, Code Systems.
  expect(roots.map(r => r.title)).toEqual(["Home", "Profiles & Extensions", "Value Sets", "Code Systems"]);
  // Within the SD group, sorted by title: "A Profile" before "B Profile".
  expect(roots[1].children.map((c: any) => c.slug)).toEqual(["StructureDefinition-a", "StructureDefinition-b"]);

  const n = numberPages({} as any, { roots });
  expect(n.get("StructureDefinition-a")).toBe("2.1");
  expect(n.get("StructureDefinition-b")).toBe("2.2");
  expect(n.get("ValueSet-vs")).toBe("3.1");
  expect(n.get("CodeSystem-cs")).toBe("4.1");
  expect(n.has("index")).toBe(true);                                            // landing numbered as a root (home = 1)
});

test("pageTree: per-resource groups nest UNDER a menu 'FHIR Artifacts' container (no duplicate roots)", () => {
  const menu = [
    menuNode("Home", "index.html"),
    menuNode("FHIR Artifacts", "#artifact.html", [menuNode("Profiles", "profiles.html#profiles")]),
  ];
  const pages = [
    { slug: "index", title: "Home", kind: "landing" },
    { slug: "StructureDefinition-a", title: "A Profile", kind: "canonical", for: "StructureDefinition" },
    { slug: "ValueSet-vs", title: "VS", kind: "canonical", for: "ValueSet" },
  ];
  const roots = pageTree({} as any, { menu, pages });

  expect(roots.map(r => r.title)).toEqual(["Home", "FHIR Artifacts"]);   // no top-level "Profiles & Extensions"
  const artifacts = roots[1];
  expect(artifacts.children.map((c: any) => c.title)).toEqual(["Profiles & Extensions", "Value Sets"]);  // curated links replaced by groups

  const n = numberPages({} as any, { roots });
  expect(n.get("StructureDefinition-a")).toBe("2.1.1");                  // FHIR Artifacts=2 → Profiles=2.1 → item=2.1.1
  expect(n.get("ValueSet-vs")).toBe("2.2.1");
});

test("pageTree: unknown resourceType groups under 'Other', last", () => {
  const roots = pageTree({} as any, {
    menu: [],
    pages: [{ slug: "Basic-x", title: "X", kind: "canonical", for: "Basic" }],
  });
  expect(roots.map(r => r.title)).toEqual(["Other"]);
  expect(roots[0].children[0].slug).toBe("Basic-x");
});
