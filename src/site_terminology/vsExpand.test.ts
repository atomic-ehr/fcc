import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };

test("vsExpand: explicit concepts are locally expandable", () => {
    const c = mk();
    const vs = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "http://loinc.org", concept: [{ code: "1" }, { code: "2" }] }] } } };
    const r = c.fns.site_terminology.vsExpand(c, { resource: vs });
    expect(r.concepts.map((x: any) => x.code)).toEqual(["1", "2"]);
    expect(r.concepts[0].system).toBe("http://loinc.org");
});
test("vsExpand: filters / excludes are not locally expandable", () => {
    const c = mk();
    const filtered = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "s", filter: [{ property: "p", op: "=", value: "1" }] }] } } };
    expect(c.fns.site_terminology.vsExpand(c, { resource: filtered })).toBeNull();
    const excluded = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "s", concept: [{ code: "1" }] }], exclude: [{ system: "s" }] } } };
    expect(c.fns.site_terminology.vsExpand(c, { resource: excluded })).toBeNull();
});
