import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

const mk = (opts: Record<string, unknown> = {}) => { const c: any = { state: {}, fns: {}, bundle: { resources: new Map(), byCanonical: new Map() } }; loadAll(c); c.fns.site_core.enable(c, { opts }); return c; };

test("applyBlocks: trailing stu-note → callout, no leak", () => {
    const c = mk();
    const out = c.fns.site_md.applyBlocks(c, { html: "<p>A note {:.stu-note}</p>" });
    expect(out).toContain("STU Note");
    expect(out).toContain("bg-amber-50");
    expect(out).not.toContain("{:.stu-note}");
});
test("applyBlocks: standalone marker attaches to preceding block", () => {
    const c = mk();
    const out = c.fns.site_md.applyBlocks(c, { html: "<p>Body text</p>\n<p>{:.stu-note}</p>" });
    expect(out).toContain("Body text");
    expect(out).toContain("STU Note");
    expect(out).not.toContain("{:.stu-note}");
});
test("applyBlocks: REGRESSION — does not swallow a fenced code block before a marker", () => {
    const c = mk();
    const html = "<pre><code>let x = 1; // keep me</code></pre>\n<p>note here {:.stu-note}</p>";
    const out = c.fns.site_md.applyBlocks(c, { html });
    expect(out).toContain("<pre><code>let x = 1; // keep me</code></pre>");
    expect(out).toContain("note here");
    expect(out).toContain("STU Note");
});
test("applyBlocks: grid is transparent (class attached, no box)", () => {
    const c = mk();
    const out = c.fns.site_md.applyBlocks(c, { html: "<table><tr><td>x</td></tr></table>\n<p>{:.grid}</p>" });
    expect(out).toContain('class="grid"');
    expect(out).not.toContain("bg-amber-50");
});
test("applyBlocks: unknown class strips marker, keeps content", () => {
    const c = mk();
    const out = c.fns.site_md.applyBlocks(c, { html: "<p>Hello {:.totally-unknown}</p>" });
    expect(out).toContain("Hello");
    expect(out).not.toContain("{:.totally-unknown}");
});
test("applyBlocks: dropBalloterNotes removes note-to-balloters", () => {
    const c = mk({ dropBalloterNotes: true });
    const out = c.fns.site_md.applyBlocks(c, { html: "<p>ballot only {:.note-to-balloters}</p>" });
    expect(out).not.toContain("ballot only");
});
