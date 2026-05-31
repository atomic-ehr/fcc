import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { parseSuppressedMessages, suppressionFor, applySuppressions, stripInternal } from "./validator.ts";

const iss = (o: Partial<any> = {}): any => ({
  rid: "Observation/x", rt: "Observation", fhirId: "x", title: "X", href: "Observation-x.html",
  severity: "warning", code: "c", path: "", message: "m", validator: "test", ...o,
});

// IG-Publisher SuppressedMessageInformation parity. The four wildcard forms and
// the `== Suppressed Messages ==` / `# reason` file format mirror IGP exactly
// (vendor/fhir-ig-publisher/…/SuppressedMessageInformation.java).

const SAMPLE = `== Suppressed Messages ==
# Reviewed slice warnings
This element does not match any known slice defined in the profile http://example.org/X
# Draft terminology
Reference to draft CodeSystem http://hl7.org/fhir/%
%could not be resolved%
%not found by validator
`;

test("parse: classifies the four wildcard forms (equals/startsWith/endsWith/contains)", () => {
  const e = parseSuppressedMessages(SAMPLE);
  expect(e.length).toBe(4);
  expect(e[0]!.type).toBe(0);                                            // exact
  expect(e[1]!.type).toBe(1);                                            // startsWith  (trailing %)
  expect(e[1]!.comp).toBe("reference to draft codesystem http://hl7.org/fhir/");
  expect(e[2]!.type).toBe(3);                                            // contains    (%…%)
  expect(e[2]!.comp).toBe("could not be resolved");
  expect(e[3]!.type).toBe(2);                                            // endsWith    (leading %)
  expect(e[3]!.comp).toBe("not found by validator");
});

test("parse: '# reason' lines name the category for following patterns", () => {
  const e = parseSuppressedMessages(SAMPLE);
  expect(e[0]!.reason).toBe("Reviewed slice warnings");
  expect(e[1]!.reason).toBe("Draft terminology");
  expect(e[3]!.reason).toBe("Draft terminology");
});

test("parse: special-cases 'Rule …' Failed (…)' into 'Constraint failed: …'", () => {
  const e = parseSuppressedMessages(`== Suppressed Messages ==\n# x\nRule abc' Failed (def)\n`);
  expect(e[0]!.raw).toBe("Constraint failed: abc' (def)");
  expect(e[0]!.type).toBe(0);
});

test("parse: legacy format (no header) treats every non-blank line as a pattern", () => {
  const e = parseSuppressedMessages("foo\n\nbar%\n");
  expect(e.length).toBe(2);
  expect(e[0]!.reason).toBe("(unspecified)");
  expect(e[1]!.type).toBe(1);
});

test("parse: degenerate '%' / '%%' patterns are dropped (would match everything)", () => {
  const e = parseSuppressedMessages("== Suppressed Messages ==\n# x\n%\n%%\nreal pattern\n");
  expect(e.length).toBe(1);                                              // only the real one survives
  expect(e[0]!.comp).toBe("real pattern");
  expect(e.every(s => s.comp !== "")).toBe(true);
});

test("parse: CRLF line endings parse identically to LF", () => {
  const lf = parseSuppressedMessages(SAMPLE);
  const crlf = parseSuppressedMessages(SAMPLE.replace(/\n/g, "\r\n"));
  expect(crlf.length).toBe(lf.length);
  expect(crlf.map(s => s.comp)).toEqual(lf.map(s => s.comp));
  expect(crlf.map(s => s.reason)).toEqual(lf.map(s => s.reason));
});

test("match: 'Rule … Failed (…)' pattern rewrites and matches a 'Constraint failed:' message", () => {
  const e = parseSuppressedMessages("== Suppressed Messages ==\n# x\nRule abc' Failed (def)\n");
  expect(e[0]!.raw).toBe("Constraint failed: abc' (def)");
  expect(suppressionFor(e, "Constraint failed: abc' (def)")).toBe(e[0]!);   // round-trip
});

test("match: equals / startsWith / endsWith / contains, case-insensitive", () => {
  const e = parseSuppressedMessages(SAMPLE);
  expect(suppressionFor(e, "Reference to DRAFT CodeSystem http://hl7.org/fhir/ValueSet/x|4.0.1")).toBe(e[1]!); // startsWith, ci
  expect(suppressionFor(e, "the ValueSet x could not be resolved!!")).toBe(e[2]!);                            // contains
  expect(suppressionFor(e, "ValueSet http://x NOT FOUND BY VALIDATOR")).toBe(e[3]!);                          // endsWith, ci
  expect(suppressionFor(e, "This element does not match any known slice defined in the profile http://example.org/X")).toBe(e[0]!);
  expect(suppressionFor(e, "something entirely unrelated")).toBeNull();
});

test("match: tolerant of IGP's trailing slice-suffix on the message", () => {
  const e = parseSuppressedMessages(SAMPLE);
  const withSuffix = "This element does not match any known slice defined in the profile http://example.org/X (this may not be a problem, but you should check that it's not intended to match a slice)";
  expect(suppressionFor(e, withSuffix)).toBe(e[0]!);
});

test("match: empty/undefined text never matches", () => {
  const e = parseSuppressedMessages(SAMPLE);
  expect(suppressionFor(e, undefined)).toBeNull();
  expect(suppressionFor(e, "")).toBeNull();
  expect(suppressionFor([], "anything")).toBeNull();
});

// stripInternal — drops fcc's internal __-markers before schema validation.

test("stripInternal: removes top-level __ markers, returns same object when none", () => {
  const clean = { resourceType: "Observation", id: "x", status: "final" };
  expect(stripInternal(clean)).toBe(clean);                              // no copy when nothing to strip
  const tagged = { ...clean, __wasExample: true, __other: 1 };
  const out = stripInternal(tagged) as any;
  expect(out).not.toBe(tagged);                                         // copied
  expect("__wasExample" in out).toBe(false);
  expect("__other" in out).toBe(false);
  expect(out.status).toBe("final");                                    // real fields preserved
  expect("__wasExample" in tagged).toBe(true);                         // original untouched
});

test("stripInternal: passes through non-objects", () => {
  expect(stripInternal(null)).toBeNull();
  expect(stripInternal("s")).toBe("s");
});

// applySuppressions — the pure partition core used by the validator plugin.

test("applySuppressions: errors stay active, matching non-errors move to suppressed", () => {
  const e = parseSuppressedMessages("== Suppressed Messages ==\n# Reviewed\nsuppress me\n");
  const r = applySuppressions(e, [
    iss({ severity: "error", message: "suppress me" }),       // error → never suppressed
    iss({ severity: "warning", message: "suppress me" }),     // matched → suppressed
    iss({ severity: "warning", message: "keep me" }),         // unmatched → active
  ]);
  expect(r.active.map(i => i.message)).toEqual(["suppress me", "keep me"]);
  expect(r.suppressed.length).toBe(1);
  expect(r.suppressed[0]!.reason).toBe("Reviewed");           // tagged with category
});

test("applySuppressions: separate warning vs hint use-counts; zero-use entries flagged", () => {
  const e = parseSuppressedMessages("== Suppressed Messages ==\n# Reviewed\nmatch%\n# Unused\nnever%\n");
  const r = applySuppressions(e, [
    iss({ severity: "warning", message: "match one" }),
    iss({ severity: "warning", message: "match two" }),
    iss({ severity: "information", message: "match three" }),
  ]);
  expect(r.suppressed.length).toBe(3);
  const used = r.entries.find(x => x.raw === "match%")!;
  expect(used.warnings).toBe(2);
  expect(used.hints).toBe(1);
  const stale = r.entries.find(x => x.raw === "never%")!;
  expect(stale.warnings + stale.hints).toBe(0);              // matched nothing → prune candidate
});

test("applySuppressions: no patterns → everything stays active", () => {
  const r = applySuppressions([], [iss({ severity: "warning" }), iss({ severity: "information" })]);
  expect(r.active.length).toBe(2);
  expect(r.suppressed.length).toBe(0);
  expect(r.entries.length).toBe(0);
});

test("applySuppressions: a pattern matching only the code (not message) suppresses", () => {
  const e = parseSuppressedMessages("== Suppressed Messages ==\n# By id\ndom-6\n");
  const r = applySuppressions(e, [iss({ severity: "warning", code: "dom-6", message: "some long human text" })]);
  expect(r.suppressed.length).toBe(1);
});

// Ground-truth: the real US Core ignoreWarnings.txt parses and matches the
// message shapes its `%`-wildcard entries target.
test("real us-core ignoreWarnings.txt parses and matches representative findings", () => {
  const raw = readFileSync(resolve(import.meta.dir, "../../vendor/us-core/input/ignoreWarnings.txt"), "utf8");
  const e = parseSuppressedMessages(raw);
  expect(e.length).toBeGreaterThan(50);
  expect(e.some(s => s.type === 1)).toBe(true);   // e.g. "Reference to draft CodeSystem http://hl7.org/fhir/%"
  // real draft-codesystem warnings the file's startsWith patterns are meant to hide
  expect(suppressionFor(e, "Reference to draft CodeSystem http://hl7.org/fhir/foo")).not.toBeNull();
  expect(suppressionFor(e, "Reference to draft CodeSystem http://terminology.hl7.org/CodeSystem/bar")).not.toBeNull();
  // every parsed entry carries a category reason (no orphan patterns)
  expect(e.every(s => s.reason.length > 0)).toBe(true);
});
