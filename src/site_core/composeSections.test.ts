import { test, expect } from "bun:test";
import composeSections from "./composeSections.ts";

test("composeSections: sort by order, dispatch $section_<type>, inline-only, skip null", async () => {
  const sectionFns: Record<string, any> = {
    $section_a: (_c: any, { section }: any) => ({ id: section.id, html: `A:${section.x}` }),
    $section_b: (_c: any, { section }: any) => ({ id: section.id, html: `B:${section.x}` }),
    $section_none: () => null,
  };
  const ctx: any = { fns: { site_core: { resolveFn: (_c: any, { key }: any) => sectionFns[key] } } };

  const html = await composeSections(ctx, {
    sections: {
      two:    { type: "b", order: 20, x: 2 },
      one:    { type: "a", order: 10, x: 1 },
      astab:  { type: "b", order: 30, x: 9, as: "tab" },   // not inline → excluded from body
      missing:{ type: "none", order: 40 },                 // null render → skipped
    },
  });

  expect(html).toBe("A:1\nB:2");                            // ordered, tab + null excluded
});
