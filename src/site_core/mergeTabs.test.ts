import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };

test("mergeTabs: remove + extend over default", () => {
    const c = mk();
    const defaults = { A: [{ id: "a", label: "A", kind: "main", render: "x", suffix: "" }, { id: "b", label: "B", kind: "companion", render: "y", suffix: ".b" }] };
    const merged = c.fns.site_core.mergeTabs(c, { defaults, overrides: { A: { remove: ["b"], extend: [{ id: "c", label: "C", kind: "companion", render: "z", suffix: ".c" }] } } });
    expect(merged.A.map((t: any) => t.id)).toEqual(["a", "c"]);
});
test("mergeTabs: array override replaces the set", () => {
    const c = mk();
    const merged = c.fns.site_core.mergeTabs(c, { defaults: { A: [{ id: "a" }] }, overrides: { A: [{ id: "z", label: "Z", kind: "main", render: "r", suffix: "" }] } });
    expect(merged.A.map((t: any) => t.id)).toEqual(["z"]);
});
