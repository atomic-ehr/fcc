**Ranking is mostly right but #4 and #7 are too high; #5 and example validation are too low.**

**Mis-prioritized:**
- **#4 OperationDefinition** should be #8 or dropped from top-10. Most IGs define zero operations; it’s a waste of early cycles.
- **#7 XML rendering** is a nice-to-have, not a basic feature. The 99% path is JSON with hyperlinked type names. Move it to #9.
- **#5 Cross-view aggregates** should be #3 or #4. Authors and ballot reviewers live in the Extensions grid and Profile-by-Base tables. This is daily-use surface, not #5.
- **#3 QA report** should probably be #2. Without suppression + message grouping, you cannot run a clean CI build, which blocks every IG author immediately.

**Wrongly included / deferred:**
- **Wrongly deferred: Example validation.** Your validator is "partial" and the architecture says `schema()` validates instances vs profiles, but IGP's heavy lifting is binding validation and invariant checking on *examples*. If examples don't validate against their declared profiles, the IG is broken. This is foundational and missing from the list entirely.
- **Wrongly deferred: Spreadsheet / data-dictionary export.** Committees and HTA reviews require it; it's not "advanced," it's a publication gate for many HL7 IGs.
- **Wrongly included: #9 History/publish-box.** Only matters for HL7.org-hosted IGs. Internal/hospital IGs don't use `package-list.json`. Defer to post-top-10.

**Missing must-have:**
- **Pagecontent integrity (intro/notes).** Architecture marks intro/notes as ⏳ deferred. A "real IG" without `-intro.md` and `-notes.md` rendering on canonical pages isn't an IG—it's just a database dump. Finish the `Page`-as-resource pipeline for pagecontent before OperationDefinition rendering.

**Risks in #1 dependency loading:**
- **Memory explosion.** Loading every `dependsOn` package + base spec into `ctx` can easily hit 500MB+ for a US Core-dependent IG. You need streaming or lazy package segments, not full materialization.
- **Version conversion trap.** "Convert to a common version" is where the Java IGP has 3,000+ lines of gnarly logic. Don't try to normalize versions in v1; load packages raw and isolate by version.
- **Canonical collision resolution.** When two deps bring in the same extension URL with different content, which wins? IGP has complicated precedence rules. Without this, your links will be non-deterministic.
- **Spec.internals drift.** The `spec.internals` file format changes between package versions. Hard-coding one parser will break silently on older/newer packages.
