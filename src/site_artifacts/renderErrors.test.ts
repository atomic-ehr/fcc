import { test, expect } from "bun:test";
import renderErrors from "./renderErrors.ts";

// layout() echoes the composed content so we can assert on the QA panel HTML.
function mockCtx(): any {
  return {
    fns: {
      site_core: {
        htmlEscape: (_c: any, { s }: any) => String(s),
        layout: (_c: any, o: any) => o.content,
      },
    },
  };
}

const issue = (o: Partial<any> = {}): any => ({
  rid: "Observation/x", rt: "Observation", fhirId: "x", title: "X",
  href: "Observation-x.html", severity: "warning", code: "dom-6", path: "",
  message: "a reviewed warning", ...o,
});

test("renderErrors: suppressed section groups by reason and shows the chip", () => {
  const report = {
    issues: [issue({ severity: "error", code: "fs201" })],
    summary: { errors: 1, warnings: 0, resources: 1, total: 1 },
    suppressed: {
      total: 2,
      entries: [
        { raw: "a reviewed warning", reason: "Reviewed binding", warnings: 1, hints: 0 },
        { raw: "another", reason: "Reviewed binding", warnings: 0, hints: 1 },
        { raw: "stale pattern", reason: "Old", warnings: 0, hints: 0 },
      ],
      issues: [
        issue({ reason: "Reviewed binding", severity: "warning" }),
        issue({ reason: "Reviewed binding", severity: "information", fhirId: "y", href: "Observation-y.html" }),
      ],
    },
  };
  const out = renderErrors(mockCtx(), { report } as any);
  expect(out).toContain("Suppressed messages");
  expect(out).toContain("2 suppressed");                       // summary chip
  expect(out).toContain("Reviewed binding");                   // reason group
  expect(out).toContain("2×");                                 // group count badge
  expect(out).toContain("3 pattern(s) loaded");                // total patterns
  expect(out).toContain("matched no finding this build");      // stale-pattern note (1 unused)
});

test("renderErrors: panel renders even when nothing matched (file loaded, 0 suppressed)", () => {
  const report = {
    issues: [],
    summary: { errors: 0, warnings: 0, resources: 0, total: 0 },
    suppressed: { total: 0, entries: [{ raw: "p1", reason: "r", warnings: 0, hints: 0 }], issues: [] },
  };
  const out = renderErrors(mockCtx(), { report } as any);
  expect(out).toContain("Suppressed messages");
  expect(out).toContain("0 reviewed warning(s)/hint(s) hidden");
  expect(out).toContain("1 pattern(s) loaded");
  expect(out).not.toContain("2 suppressed");                   // no chip when total is 0
});

test("renderErrors: no suppressed field → no suppressed panel (back-compat)", () => {
  const report = {
    issues: [issue({ severity: "error", code: "fs201" })],
    summary: { errors: 1, warnings: 0, resources: 1, total: 1 },
  };
  const out = renderErrors(mockCtx(), { report } as any);
  expect(out).not.toContain("Suppressed messages");
});
