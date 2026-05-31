import { test, expect } from "bun:test";
import renderPage from "./renderPage.ts";

function mockCtx(): any {
  return {
    fns: {
      site_core: {
        htmlEscape: (_c: any, { s }: any) => s,
        composeSections: async (_c: any, _o: any) => "BODY",
        // layout echoes the bits we assert on
        layout: (_c: any, o: any) => `H1=${o.content}|CRUMB=${JSON.stringify(o.breadcrumb)}`,
      },
    },
  };
}

test("renderPage: number prefixes the H1 and the breadcrumb tail when provided", async () => {
  const out = await renderPage(mockCtx(), { slug: "must-support", title: "Must Support", sections: {}, number: "2.2" });
  expect(out).toContain(">2.2</span>");          // numbered span in the H1
  expect(out).toContain("Must Support");
  expect(out).toContain('"label":"2.2 Must Support"'); // numbered breadcrumb tail
});

test("renderPage: no number → plain title, no numbered span", async () => {
  const out = await renderPage(mockCtx(), { slug: "guidance", title: "Guidance", sections: {} });
  expect(out).not.toContain("tabular-nums");
  expect(out).toContain('"label":"Guidance"');
});
