import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };
const intronote = (forId: string, intro?: string, notes?: string) => ({
    resourceType: "Page", id: `Page/intronotes-${forId.replace("/", "-")}`,
    data: { resourceType: "Page", role: "intronotes", for: forId, intro, notes },
});

test("notesFor: reads merged intro/notes for a resource from the graph (rendered to HTML)", () => {
    const c = mk();
    c.resources.set("in", intronote("StructureDefinition/us-core-patient", "Intro **text**", "Some notes"));
    const r = c.fns.site_core.notesFor(c, { resource: { id: "StructureDefinition/us-core-patient" } });
    expect(r.intro).toContain("Intro");
    expect(r.intro).toContain("<strong>text</strong>");        // markdown rendered
    expect(r.notes).toContain("Some notes");
});

test("notesFor: drops comment-only (unfilled template) content", () => {
    const c = mk();
    c.resources.set("in", intronote("StructureDefinition/y", "<!-- TODO: write intro -->", undefined));
    expect(c.fns.site_core.notesFor(c, { resource: { id: "StructureDefinition/y" } }).intro).toBeUndefined();
});

test("notesFor: empty object when the resource has no intronotes", () => {
    expect(mk().fns.site_core.notesFor(mk(), { resource: { id: "StructureDefinition/none" } })).toEqual({});
});
