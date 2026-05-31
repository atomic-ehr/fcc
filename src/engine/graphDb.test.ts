import { test, expect } from "bun:test";
import { freshTargetState, indexResource } from "./state.ts";
import { makeContext } from "./runner.ts";
import type { Resource } from "./types.ts";

const res = (id: string, rt: string, data: Record<string, unknown>): Resource => ({
  id, resourceType: rt, data: { resourceType: rt, ...data },
  source: { kind: "virtual", producer: "test" }, deps: new Set(), meta: {},
});

test("ctx.sql queries the graph with json_extract + params, and re-indexes on mutation", () => {
  const ts = freshTargetState({ name: "t", fhir: "4.0.1", out: "out" } as any);
  indexResource(ts, res("Observation/o1", "Observation", { id: "o1", status: "final" }), null);
  indexResource(ts, res("Patient/p1", "Patient", { id: "p1" }), null);

  const ctx = makeContext(
    { id: "x", canonical: "http://x", version: "1", targets: [], sources: [], plugins: [], projectRoot: "/tmp" } as any,
    ts, null,
  );

  const rows = ctx.sql(
    "SELECT id, json_extract(json,'$.status') AS status FROM resources WHERE resourceType = ?",
    ["Observation"],
  );
  expect(rows.length).toBe(1);
  expect((rows[0] as { status: string }).status).toBe("final");

  // a graph mutation invalidates the cached index — the next query sees the new row
  indexResource(ts, res("Observation/o2", "Observation", { id: "o2", status: "preliminary" }), null);
  const rows2 = ctx.sql("SELECT count(*) AS n FROM resources WHERE resourceType = 'Observation'") as { n: number }[];
  expect(rows2[0]!.n).toBe(2);
});
