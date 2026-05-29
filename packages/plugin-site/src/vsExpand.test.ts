import { test, expect } from "bun:test";
import loadFns from "./loadFns.ts";

const mk = () => { const c: any = { state: {}, fns: {}, bundle: { resources: new Map(), byCanonical: new Map() } }; loadFns(c); c.fns.site.enable(c, { opts: {} }); return c; };

test("vsExpand: explicit concepts are locally expandable", () => {
    const c = mk();
    const vs = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "http://loinc.org", concept: [{ code: "1" }, { code: "2" }] }] } } };
    const r = c.fns.site.vsExpand(c, { resource: vs });
    expect(r.concepts.map((x: any) => x.code)).toEqual(["1", "2"]);
    expect(r.concepts[0].system).toBe("http://loinc.org");
});
test("vsExpand: filters / excludes are not locally expandable", () => {
    const c = mk();
    const filtered = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "s", filter: [{ property: "p", op: "=", value: "1" }] }] } } };
    expect(c.fns.site.vsExpand(c, { resource: filtered })).toBeNull();
    const excluded = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "s", concept: [{ code: "1" }] }], exclude: [{ system: "s" }] } } };
    expect(c.fns.site.vsExpand(c, { resource: excluded })).toBeNull();
});
