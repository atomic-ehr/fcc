import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };
const sd = (id: string, extra: Record<string, unknown> = {}) => ({ resourceType: "StructureDefinition", id, data: { id, ...extra } });

test("tabsFor: StructureDefinition default set + hrefs", () => {
    const c = mk();
    const tabs = c.fns.site_core.tabsFor(c, { resource: sd("us-core-patient") });
    expect(tabs.map((t: any) => t.d.id)).toEqual(["content", "definitions", "mappings", "examples", "json"]);
    expect(tabs.find((t: any) => t.d.id === "content").href).toBe("StructureDefinition-us-core-patient.html");
    expect(tabs.find((t: any) => t.d.id === "definitions").href).toBe("StructureDefinition-us-core-patient-definitions.html");
    expect(tabs.find((t: any) => t.d.id === "json").rawName).toBe("StructureDefinition-us-core-patient.profile.json");
});
test("tabsFor: example forces the '*' set (content + json only)", () => {
    const c = mk();
    const tabs = c.fns.site_core.tabsFor(c, { resource: sd("us-core-patient", { __wasExample: true }) });
    expect(tabs.map((t: any) => t.d.id)).toEqual(["content", "json"]);
});
