import { test, expect } from "bun:test";
import $route_qa from "./$route_qa.ts";

const mk = (validate: any) => $route_qa({} as any, { pluginCtx: { shared: { validate } } } as any);

test("$route_qa: null when the validator plugin did not run", () => {
  expect(mk(undefined)).toBeNull();
});

test("$route_qa: header counts and active issue lines", () => {
  const route = mk({
    issues: [{ severity: "error", code: "fs201", rid: "Observation/x", path: "category", message: "bad  code" }],
    summary: { errors: 1, warnings: 0, resources: 1, total: 1 },
  })!;
  const txt = route.render() as string;
  expect(txt).toContain("# 1 error(s), 0 warning(s), 1 resource(s) affected, 1 issue(s)");
  expect(txt).toContain("error\tfs201\tObservation/x\tcategory\tbad code");   // whitespace flattened
  expect(txt).not.toContain("suppressed");
});

test("$route_qa: suppressed issues appended with prefix + reason column", () => {
  const route = mk({
    issues: [],
    summary: { errors: 0, warnings: 0, resources: 0, total: 0 },
    suppressed: {
      total: 1,
      entries: [{ raw: "p", reason: "Reviewed binding", warnings: 1, hints: 0 }],
      issues: [{ severity: "warning", code: "x", rid: "Observation/y", path: "", message: "msg", reason: "Reviewed binding" }],
    },
  })!;
  const txt = route.render() as string;
  expect(txt).toContain(", 1 suppressed");                                    // header suffix
  expect(txt).toContain("# 1 suppressed (reviewed warnings/hints)");
  expect(txt).toContain("suppressed:warning\tx\tObservation/y\t\tmsg\tReviewed binding");
});
