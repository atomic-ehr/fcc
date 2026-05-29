import { test, expect } from "bun:test";
import loadFns from "./loadFns.ts";

// Local harness — *.test.ts files are excluded from the build, so importing
// loadFns to assemble ctx.fns.site is fine. Kept tiny + inline per the
// one-fn-per-file convention (no shared helper module to avoid gentypes noise).
const mk = () => { const c: any = { state: {}, fns: {}, bundle: { resources: new Map(), byCanonical: new Map() } }; loadFns(c); c.fns.site.enable(c, { opts: {} }); return c; };

test("parseIal: class marker", () => {
    const c = mk();
    expect(c.fns.site.parseIal(c, { raw: "{:.stu-note}" })).toEqual({ classes: ["stu-note"], id: undefined, directive: false });
});
test("parseIal: class + id", () => {
    const c = mk();
    expect(c.fns.site.parseIal(c, { raw: "{:.no_toc #translations}" })).toEqual({ classes: ["no_toc"], id: "translations", directive: false });
});
test("parseIal: bare id is not a directive", () => {
    const c = mk();
    expect(c.fns.site.parseIal(c, { raw: "{:#anchor}" })).toEqual({ classes: [], id: "anchor", directive: false });
});
test("parseIal: {::options} and {:toc} are directives", () => {
    const c = mk();
    expect(c.fns.site.parseIal(c, { raw: "{::options x}" }).directive).toBe(true);
    expect(c.fns.site.parseIal(c, { raw: "{:toc}" }).directive).toBe(true);
});
