import { test, expect } from "bun:test";
import numberPages from "./numberPages.ts";

const N = (slug: string, children: any[] = [], sections?: string[]): any => ({ slug, title: slug || "container", children, sections });

test("numberPages: forest roots are 1,2,3; children dotted by 1-based sibling index", () => {
  const roots = [
    N("home"),
    N("conformance", [N("general"), N("must-support")]),
    N("guidance", [N("uscdi")]),
  ];
  const m = numberPages({} as any, { roots });
  expect(m.get("home")).toBe("1");
  expect(m.get("conformance")).toBe("2");
  expect(m.get("general")).toBe("2.1");
  expect(m.get("must-support")).toBe("2.2");
  expect(m.get("guidance")).toBe("3");
  expect(m.get("uscdi")).toBe("3.1");
});

test("numberPages: deep nesting concatenates (IGP createTocPage rule)", () => {
  const roots = [N("a", [N("b", [N("c", [N("d")])])])];
  const m = numberPages({} as any, { roots });
  expect(m.get("a")).toBe("1");
  expect(m.get("b")).toBe("1.1");
  expect(m.get("c")).toBe("1.1.1");
  expect(m.get("d")).toBe("1.1.1.1");
});

test("numberPages: empty-slug container occupies a slot, emits no entry, children number under it", () => {
  const roots = [
    N(""/* dropdown header */, [N("x"), N("y")]),
    N("z"),
  ];
  const m = numberPages({} as any, { roots });
  expect([...m.keys()]).not.toContain("");          // container itself unnumbered
  expect(m.get("x")).toBe("1.1");                    // but its slot is "1" → children 1.x
  expect(m.get("y")).toBe("1.2");
  expect(m.get("z")).toBe("2");                       // sibling after the container
});

test("numberPages: sections continue the page number, keyed <slug>#<id>", () => {
  const roots = [N("home"), N("page", [], ["intro", "scope", "refs"])];
  const m = numberPages({} as any, { roots });
  expect(m.get("page")).toBe("2");
  expect(m.get("page#intro")).toBe("2.1");
  expect(m.get("page#scope")).toBe("2.2");
  expect(m.get("page#refs")).toBe("2.3");
});

test("numberPages: deterministic — stable across runs, slugs untouched", () => {
  const roots = [N("a", [N("b")])];
  const a = numberPages({} as any, { roots });
  const b = numberPages({} as any, { roots });
  expect([...a.entries()]).toEqual([...b.entries()]);
});
