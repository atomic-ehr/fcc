// Unit tests for the canonical-resource pluggable tabs/blocks + markdown
// pipeline. We assemble a real ctx.fns.site via loadFns (allowed in tests —
// excluded from the build), then enable() to populate ctx.state.site registries.
import { test, expect } from "bun:test";
import loadFns from "./loadFns.ts";

function makeCtx(opts: Record<string, unknown> = {}): any {
    const ctx: any = {
        cfg: { version: "9.0.0" }, target: { name: "r4", fhir: "4.0.1" },
        bundle: { resources: new Map(), byCanonical: new Map() },
        state: {}, env: {}, fns: {},
    };
    loadFns(ctx);
    ctx.fns.site.enable(ctx, { opts });
    return ctx;
}
const sd = (id: string, extra: Record<string, unknown> = {}) =>
    ({ resourceType: "StructureDefinition", id, data: { id, ...extra } });

// ---- parseIal ------------------------------------------------------------
test("parseIal: class marker", () => {
    const ctx = makeCtx();
    expect(ctx.fns.site.parseIal(ctx, { raw: "{:.stu-note}" })).toEqual({ classes: ["stu-note"], id: undefined, directive: false });
});
test("parseIal: class + id", () => {
    const ctx = makeCtx();
    expect(ctx.fns.site.parseIal(ctx, { raw: "{:.no_toc #translations}" })).toEqual({ classes: ["no_toc"], id: "translations", directive: false });
});
test("parseIal: bare id is not a directive", () => {
    const ctx = makeCtx();
    expect(ctx.fns.site.parseIal(ctx, { raw: "{:#anchor}" })).toEqual({ classes: [], id: "anchor", directive: false });
});
test("parseIal: {::options} and {:toc} are directives", () => {
    const ctx = makeCtx();
    expect(ctx.fns.site.parseIal(ctx, { raw: "{::options x}" }).directive).toBe(true);
    expect(ctx.fns.site.parseIal(ctx, { raw: "{:toc}" }).directive).toBe(true);
});

// ---- applyBlocks ---------------------------------------------------------
test("applyBlocks: trailing stu-note → callout, no leak", () => {
    const ctx = makeCtx();
    const out = ctx.fns.site.applyBlocks(ctx, { html: "<p>A note {:.stu-note}</p>" });
    expect(out).toContain("STU Note");
    expect(out).toContain("bg-amber-50");
    expect(out).not.toContain("{:.stu-note}");
});
test("applyBlocks: standalone marker attaches to preceding block", () => {
    const ctx = makeCtx();
    const out = ctx.fns.site.applyBlocks(ctx, { html: "<p>Body text</p>\n<p>{:.stu-note}</p>" });
    expect(out).toContain("Body text");
    expect(out).toContain("STU Note");
    expect(out).not.toContain("{:.stu-note}");
});
test("applyBlocks: REGRESSION — does not swallow a fenced code block before a marker", () => {
    const ctx = makeCtx();
    const html = "<pre><code>let x = 1; // keep me</code></pre>\n<p>note here {:.stu-note}</p>";
    const out = ctx.fns.site.applyBlocks(ctx, { html });
    expect(out).toContain("<pre><code>let x = 1; // keep me</code></pre>");
    expect(out).toContain("note here");
    expect(out).toContain("STU Note");
});
test("applyBlocks: grid is transparent (class attached, no box)", () => {
    const ctx = makeCtx();
    const out = ctx.fns.site.applyBlocks(ctx, { html: "<table><tr><td>x</td></tr></table>\n<p>{:.grid}</p>" });
    expect(out).toContain('class="grid"');
    expect(out).not.toContain("bg-amber-50");
});
test("applyBlocks: unknown class strips marker, keeps content", () => {
    const ctx = makeCtx();
    const out = ctx.fns.site.applyBlocks(ctx, { html: "<p>Hello {:.totally-unknown}</p>" });
    expect(out).toContain("Hello");
    expect(out).not.toContain("{:.totally-unknown}");
});
test("applyBlocks: dropBalloterNotes removes note-to-balloters", () => {
    const ctx = makeCtx({ dropBalloterNotes: true });
    const out = ctx.fns.site.applyBlocks(ctx, { html: "<p>ballot only {:.note-to-balloters}</p>" });
    expect(out).not.toContain("ballot only");
});

// ---- mergeTabs -----------------------------------------------------------
test("mergeTabs: remove + extend over default", () => {
    const ctx = makeCtx();
    const defaults = { A: [{ id: "a", label: "A", kind: "main", render: "x", suffix: "" }, { id: "b", label: "B", kind: "companion", render: "y", suffix: ".b" }] };
    const merged = ctx.fns.site.mergeTabs(ctx, { defaults, overrides: { A: { remove: ["b"], extend: [{ id: "c", label: "C", kind: "companion", render: "z", suffix: ".c" }] } } });
    expect(merged.A.map((t: any) => t.id)).toEqual(["a", "c"]);
});
test("mergeTabs: array override replaces the set", () => {
    const ctx = makeCtx();
    const merged = ctx.fns.site.mergeTabs(ctx, { defaults: { A: [{ id: "a" }] }, overrides: { A: [{ id: "z", label: "Z", kind: "main", render: "r", suffix: "" }] } });
    expect(merged.A.map((t: any) => t.id)).toEqual(["z"]);
});

// ---- injectRefLinks ------------------------------------------------------
test("injectRefLinks: appends def for used-but-undefined [Change Log]", () => {
    const ctx = makeCtx();
    const out = ctx.fns.site.injectRefLinks(ctx, { md: "See the [Change Log] for details." });
    expect(out).toContain("[Change Log]: changes.html");
});
test("injectRefLinks: skips inline link [x](url) and already-defined", () => {
    const ctx = makeCtx();
    const inline = ctx.fns.site.injectRefLinks(ctx, { md: "See [Change Log](other.html)." });
    expect(inline).not.toContain("[Change Log]: changes.html");
    const defined = ctx.fns.site.injectRefLinks(ctx, { md: "[Change Log]\n\n[Change Log]: mine.html" });
    expect(defined).not.toContain(": changes.html");
});

// ---- tabsFor -------------------------------------------------------------
test("tabsFor: StructureDefinition default set + hrefs", () => {
    const ctx = makeCtx();
    const tabs = ctx.fns.site.tabsFor(ctx, { resource: sd("us-core-patient") });
    expect(tabs.map((t: any) => t.d.id)).toEqual(["content", "definitions", "mappings", "examples", "json"]);
    expect(tabs.find((t: any) => t.d.id === "content").href).toBe("StructureDefinition-us-core-patient.html");
    expect(tabs.find((t: any) => t.d.id === "definitions").href).toBe("StructureDefinition-us-core-patient-definitions.html");
    expect(tabs.find((t: any) => t.d.id === "json").rawName).toBe("StructureDefinition-us-core-patient.profile.json");
});
test("tabsFor: example forces the '*' set (content + json only)", () => {
    const ctx = makeCtx();
    const tabs = ctx.fns.site.tabsFor(ctx, { resource: sd("us-core-patient", { __wasExample: true }) });
    expect(tabs.map((t: any) => t.d.id)).toEqual(["content", "json"]);
});

// ---- mdInline ------------------------------------------------------------
test("mdInline: renders bold/link/code without a wrapping <p>", () => {
    const ctx = makeCtx();
    const out = ctx.fns.site.mdInline(ctx, { md: "**Bold** see [x](y.html) and `code`" });
    expect(out).not.toMatch(/^<p>/);
    expect(out).toContain("<strong>Bold</strong>");
    expect(out).toContain('<a href="y.html">x</a>');
    expect(out).toContain("<code>code</code>");
});
test("mdInline: empty input → empty string", () => {
    const ctx = makeCtx();
    expect(ctx.fns.site.mdInline(ctx, { md: undefined })).toBe("");
});

// ---- highlightBlocks -----------------------------------------------------
test("highlightBlocks: no warm highlighter → html unchanged", () => {
    const ctx = makeCtx();
    const html = '<pre><code class="language-json">{"a":1}</code></pre>';
    expect(ctx.fns.site.highlightBlocks(ctx, { html })).toBe(html);
});
test("highlightBlocks: highlights tagged + untagged-JSON blocks when warm", async () => {
    const ctx = makeCtx();
    await ctx.fns.site.warmHighlighter(ctx);
    const tagged = ctx.fns.site.highlightBlocks(ctx, { html: '<pre><code class="language-json">{&quot;a&quot;:1}</code></pre>' });
    expect(tagged).toContain('class="shiki');
    const untagged = ctx.fns.site.highlightBlocks(ctx, { html: "<pre><code>{&quot;a&quot;:1}</code></pre>" });
    expect(untagged).toContain('class="shiki'); // auto-detected JSON
});

// ---- vsExpand ------------------------------------------------------------
test("vsExpand: explicit concepts are locally expandable", () => {
    const ctx = makeCtx();
    const vs = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "http://loinc.org", concept: [{ code: "1" }, { code: "2" }] }] } } };
    const r = ctx.fns.site.vsExpand(ctx, { resource: vs });
    expect(r.concepts.map((c: any) => c.code)).toEqual(["1", "2"]);
    expect(r.concepts[0].system).toBe("http://loinc.org");
});
test("vsExpand: filters / excludes are not locally expandable", () => {
    const ctx = makeCtx();
    const filtered = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "s", filter: [{ property: "p", op: "=", value: "1" }] }] } } };
    expect(ctx.fns.site.vsExpand(ctx, { resource: filtered })).toBeNull();
    const excluded = { resourceType: "ValueSet", id: "v", data: { compose: { include: [{ system: "s", concept: [{ code: "1" }] }], exclude: [{ system: "s" }] } } };
    expect(ctx.fns.site.vsExpand(ctx, { resource: excluded })).toBeNull();
});
