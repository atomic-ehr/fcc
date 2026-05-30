import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

// Local harness — *.test.ts files are excluded from the build, so importing
// loadAll to assemble ctx.fns.<ns> is fine. Kept tiny + inline per the
// one-fn-per-file convention (no shared helper module to avoid gentypes noise).
const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };

test("parseIal: class marker", () => {
    const c = mk();
    expect(c.fns.site_md.parseIal(c, { raw: "{:.stu-note}" })).toEqual({ classes: ["stu-note"], id: undefined, directive: false });
});
test("parseIal: class + id", () => {
    const c = mk();
    expect(c.fns.site_md.parseIal(c, { raw: "{:.no_toc #translations}" })).toEqual({ classes: ["no_toc"], id: "translations", directive: false });
});
test("parseIal: bare id is not a directive", () => {
    const c = mk();
    expect(c.fns.site_md.parseIal(c, { raw: "{:#anchor}" })).toEqual({ classes: [], id: "anchor", directive: false });
});
test("parseIal: {::options} and {:toc} are directives", () => {
    const c = mk();
    expect(c.fns.site_md.parseIal(c, { raw: "{::options x}" }).directive).toBe(true);
    expect(c.fns.site_md.parseIal(c, { raw: "{:toc}" }).directive).toBe(true);
});
