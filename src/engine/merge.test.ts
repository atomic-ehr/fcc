import { test, expect } from "bun:test";
import { deepMerge, mergeParts, type Part } from "./merge.ts";
import { freshTargetState, upsertPart, removeFileParts, rematerialize } from "./state.ts";

const part = (id: string, path: string, data: Record<string, unknown>, extra: Partial<Part> = {}): Part =>
  ({ id, resourceType: "Page", url: undefined, version: undefined, data, source: { kind: "md", path } as any, ...extra });

test("deepMerge: objects merge key-wise; arrays/scalars last-wins", () => {
  expect(deepMerge({ a: 1, x: { p: 1 } }, { b: 2, x: { q: 2 } })).toEqual({ a: 1, b: 2, x: { p: 1, q: 2 } });
  expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  expect(deepMerge({ a: [1] }, { a: [2] })).toEqual({ a: [2] });   // arrays replace — use maps to merge
});

test("mergeParts: single part is identity", () => {
  const r = mergeParts([part("Page/x", "a.md", { slug: "x", sections: { intro: { type: "intro" } } })]);
  expect(r.id).toBe("Page/x");
  expect(r.data).toEqual({ slug: "x", sections: { intro: { type: "intro" } } });
  expect(r.deps).toEqual(new Set());
});

test("mergeParts: keyed maps merge by key; owner scalar survives; deps union; order-independent", () => {
  const owner = part("Page/x", "x.fsh", { slug: "x", kind: "canonical", sections: { content: { type: "content" } } },
    { url: "http://x" as any, deps: ["d1"] });
  const intro = part("Page/x", "x-intro.md", { sections: { intro: { type: "intro" } } }, { deps: ["d2"] });
  const notes = part("Page/x", "x-notes.md", { sections: { notes: { type: "notes" } } });

  const r = mergeParts([intro, notes, owner]);                    // unsorted on purpose
  expect((r.data as any).slug).toBe("x");
  expect((r.data as any).kind).toBe("canonical");
  expect(Object.keys((r.data as any).sections).sort()).toEqual(["content", "intro", "notes"]);
  expect(r.url).toBe("http://x");                                 // owner-wins (addons omit url)
  expect(r.deps).toEqual(new Set(["d1", "d2"]));                  // union

  // order-independent
  expect(mergeParts([owner, intro, notes]).data).toEqual(mergeParts([notes, owner, intro]).data);
});

test("parts store: merge, un-merge on file removal, drop when empty", () => {
  const ts = freshTargetState({ name: "t", fhir: "4.0.1", out: "o" } as any);
  upsertPart(ts, part("Page/x", "x.fsh", { slug: "x", sections: { body: {} } }), "x.fsh");
  upsertPart(ts, part("Page/x", "x-intro.md", { sections: { intro: {} } }), "x-intro.md");
  rematerialize(ts, "Page/x");
  expect(Object.keys((ts.resources.get("Page/x")!.data as any).sections).sort()).toEqual(["body", "intro"]);
  expect([...ts.resourceToFiles.get("Page/x")!].sort()).toEqual(["x-intro.md", "x.fsh"]);

  removeFileParts(ts, "x-intro.md");                              // delete intro file
  rematerialize(ts, "Page/x");
  expect(Object.keys((ts.resources.get("Page/x")!.data as any).sections)).toEqual(["body"]);

  removeFileParts(ts, "x.fsh");                                   // delete last file
  rematerialize(ts, "Page/x");
  expect(ts.resources.has("Page/x")).toBe(false);                // resource gone
});
