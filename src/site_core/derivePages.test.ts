import { test, expect } from "bun:test";
import derivePages from "./derivePages.ts";

test("derivePages emits one canonical Page per conformance resource (skips IG + Page)", () => {
  const resources = new Map<string, any>([
    ["StructureDefinition/p", { id: "StructureDefinition/p", resourceType: "StructureDefinition", data: { title: "P" } }],
    ["ImplementationGuide/ig", { id: "ImplementationGuide/ig", resourceType: "ImplementationGuide", data: {} }],
    ["Page/guide", { id: "Page/guide", resourceType: "Page", data: { kind: "content" } }],
  ]);
  const emitted: any[] = [];
  const ctx: any = { fns: { site_core: { pageHref: (_c: any, { resource }: any) => `${resource.resourceType}-${resource.id.split("/").pop()}.html` } } };
  const pctx: any = { resources, emitResource: (r: any) => { emitted.push(r); return r.id; } };

  derivePages(ctx, { pluginCtx: pctx });

  expect(emitted.length).toBe(1);                                   // only the SD; IG + Page skipped
  expect(emitted[0].resourceType).toBe("Page");
  expect(emitted[0].data).toMatchObject({
    kind: "canonical", ref: "StructureDefinition/p", slug: "StructureDefinition-p",
    for: "StructureDefinition", title: "P",
  });
});
