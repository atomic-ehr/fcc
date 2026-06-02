# IG-Publisher parity — top 10 features to implement

Research note grounded in the HL7 `fhir-ig-publisher` source (vendored at
`vendor/fhir-ig-publisher/`). It maps the IG Publisher's feature surface against
fcc's current capabilities and proposes the **top 10 basic features** worth
implementing next, each expressed in fcc's grain (Loader / Transformer /
Validator / View / Generator / Renderer + `$`-dispatch files).

## What fcc already has

| IGP subsystem | fcc equivalent |
|---|---|
| `StructureDefinitionRenderer` (profiles, element tables) | `site_profile` ✅ |
| `ValueSetRenderer` / `CodeSystemRenderer` | `site_terminology` ✅ |
| CapabilityStatement / SearchParameter | `site_capability` ✅ |
| Narrative generation | `narrative` + `site_narrative` ✅ |
| Snapshot generation | `snapshot` (fhirschema) ✅ |
| Validation (structural / schema / fhirpath) | `validator` ✅ (partial) |
| FSH / sushi | `fsh` worker ✅ |
| npm package | `npm` ✅ |
| `DBBuilder` (SQLite of resources) | `sqlite` ✅ |
| ImplementationGuide resource | `ig-resource` ✅ |
| Jekyll/Liquid template engine | replaced by fcc's own route renderer (intentional) |

## The gap — IGP features fcc lacks

Grouped by IGP package: `HTMLInspector`, `ValidationPresenter`,
`SuppressedMessageInformation`, `DependencyRenderer`/`DependentIGFinder`,
`CrossViewRenderer`, `SpecMapManager`/`PublisherLoader`, `OperationDefinitionRenderer`,
`JsonXhtmlRenderer`/`XmlXHtmlRenderer`, `StatusRenderer`/`DeprecationRenderer`,
`HistoryGenerator`/`PublishBoxStatementGenerator`, `PreviousVersionComparator`,
`PublisherTranslator` (i18n), `QuestionnaireRenderer`, `StructureMapRenderer`,
`CqlSubSystem`, IP/HTA renderers, spreadsheets.

## Final top 10 (after /codex + /kimi second opinions)

Re-ranked from the draft below. Changes both reviewers drove:
- **QA report moved up** (kimi: a clean CI build is the first thing every author
  needs — suppression + grouping gate everything).
- **Cross-view aggregates moved up** (kimi: the Extensions grid / profile-by-base
  tables are daily author + ballot-reviewer surface, not a #5).
- **OperationDefinition moved down** (kimi: most IGs define zero operations).
- **XML moved down, JSON-with-links kept** (kimi: linkified JSON is the 99% path;
  XML is nice-to-have).
- **Two foundational items added** that the draft missed entirely (kimi):
  terminology/binding validation, and finishing the intro/notes pagecontent
  pipeline (already ⏳ in `architecture.md` §10).
- **#1 split explicitly into Loader + SpecMap** (codex), with risk mitigations.
- **History/publish-box + previous-version comparison demoted out of top-10**
  (kimi: only matter for HL7.org-hosted IGs; heaviest, depend on #1).

| # | Feature | fcc grain | Notes |
|---|---|---|---|
| 1 | **Dependency bootstrap** — load `dependsOn` packages + base spec, build canonical→web-path map | `$loader` for `.tgz`/cache → resources tagged `internal-use`; `ctx.specMaps` + `$resolve_<scheme>` | foundational; blocks 3, 6, 10 |
| 2 | **Terminology / binding validation** — codes valid in their ValueSet; expansion against external CodeSystems (tx integration or bundled expansions) | a `terminology()` Validator composed into `validator`; reuse `vsExpand` + a tx client | the real gap behind "examples don't validate" |
| 3 | **Full QA report + suppression** (`ValidationPresenter`+`SuppressedMessageInformation`) | upgrade `renderErrors` → group by msg-id + per-file stats; wildcard `suppressedMessages` config; emit `qa.txt`/OperationOutcome via `$route_*` | gates CI for every author |
| 4 | **HTML link / anchor / image checker** (`HTMLInspector`) | `validator.linkCheck()` over the route table; resolve refs vs `ctx` routes + spec maps (#1) | #1 QA signal; needs #1 |
| 5 | **Finish intro/notes pagecontent** as `Page` resources on canonical pages | complete the ⏳ from arch §10: `pages()` loader covers `-intro.md`/`-notes.md`; soft edge → target page | without it, pages are a DB dump |
| 6 | **Cross-view aggregate pages** (`CrossViewRenderer`) — Extensions-by-context, Observation grid, SearchParameter list | aggregate `$page_*` Generators over `ctx.byType.*` | daily author/reviewer surface |
| 7 | **Status / maturity surface** (`StatusRenderer`) — FMM, standards-status, WG badges + aggregate table | `statusBadge` View in `site_core` consumed by `canonicalMeta`/tab strip | pure-`ctx`, cheap, high value |
| 8 | **OperationDefinition rendering** | `site_capability`/`site_operation` `$section_*` + `sectionsFor` | common-ish, but many IGs have none |
| 9 | **JSON/XML serialization with linked tokens** (`JsonXhtmlRenderer`/`XmlXHtmlRenderer`) | linkify type/canonical tokens in JSON tab first; add XML companion tab/side-car | JSON-with-links is the win; XML optional |
| 10 | **Dependency table page** (`DependencyRenderer`) | aggregate `$page_dependencies` from IG `dependsOn` + loaded packages (#1) | realm/version/draft warnings |

## Progress (autonomous build)

- ✅ **#7** Status/maturity — per-page badges (`statusBadge`) + `status.html` aggregate.
- ✅ **#8** OperationDefinition — invocation summary + in/out parameter tables (`$section_operationDef`).
- ✅ **#3** QA — by-message roll-up in `errors.html` + `qa.txt` export + suppressed-messages filter (IGP `SuppressedMessageInformation` parity: `== Suppressed Messages ==` file, `%`-wildcards, errors never suppressed, stale-pattern detection). Also fixed a validator false-positive: internal `__`-markers (`__wasExample`) were validated as unknown elements (231 phantom errors on us-core, now stripped).
- ✅ **#6** Cross-view — `extensions.html` + `search-parameters.html` + `observations.html` registries (the Observation code/category/value matrix: differential + IG-local baseDefinition walk, both code-fixing styles) + artifacts cross-view links.
- 🟡 **#9** Linkified JSON — local canonical refs link to their page (external base-spec links need #1's spec-map).
- ✅ **#1** Dependency bootstrap — `deps` plugin indexes `dependsOn` packages from the FHIR cache (memory-safe: `.index.json` + `package.json` + `spec.internals`, lazy `load()` bodies; `PackageHacker.fixPackageUrl` ported for wrong bases). Cross-IG links resolve via the chain (`lrefDependency` for canonicals/ids, `lrefAlias` for FSH aliases). `fsh()` threads `deps` → `fshToFhir`, so us-core-derived mCODE profiles compile (0 Parent-not-found, 53 profiles). Stage D: snapshot + validator share one base-SD loader (`loadBaseStructureDefinitions` in the engine); read once per build. Adversarially reviewed (a false "must prefer versioned spec.internals key" finding was disproved — our base is the versioned `package.json.url`).
- ✅ **#4** Link checker — `qa-links.html` reports reference-shaped `[Name]` links that the resolver chain can't resolve (deterministic graph scan, with use-counts + pages). IG-Publisher `HTMLInspector` parity; the per-page red flag is the inline signal.
- ✅ **#10** Dependency table — `dependencies.html`: each `dependsOn` package with version, FHIR version, published site, and cache/index status (IGP `DependencyRenderer`).
- ⏳ **#5** intro/notes-via-merge — renderer refactor (canonical Pages now exist, so it's unblocked but golden-risky).
- ✖ **#2** Terminology — out of scope for this pass.

Beyond IGP, the engine gained: merge-friendly resources (partial-load merge), canonical pages as `Page` resources (`byType.Page` / `ctx.sql`-queryable), and FHIR-IG through numbering in the nav.

**Deferred tail (post-top-10, were #9/#10 in draft):** History + publish-box
version notice (`HistoryGenerator`/`PublishBoxStatementGenerator` — HL7.org-hosted
only), previous-version comparison + deprecation (`PreviousVersionComparator`/
`DeprecationRenderer` — heaviest, depends on #1). Plus the originally-deferred
set (i18n, CQL, Questionnaire-as-form, StructureMap, IP/HTA, spreadsheet export —
note kimi flags spreadsheet/data-dictionary as a publication gate for some HL7
committees, so promote it if targeting HL7 balloting).

### #1 dependency-bootstrap risks (kimi) — design constraints
- **Memory.** Materializing every `dependsOn` + base spec into `ctx` can exceed
  500 MB for a US-Core-dependent IG. Load lazily / by segment; don't fully
  materialize. Tag `internal-use` and keep them out of FHIR-facing iteration.
- **Version-conversion trap.** IGP has 3000+ lines normalizing R2/R3/R4→R5. Do
  **not** normalize in v1 — load packages raw, isolate by FHIR version, resolve
  within version.
- **Canonical collision precedence.** Two deps may bring the same extension URL
  with different content. Define deterministic precedence (local > nearer dep >
  base) or links become non-deterministic.
- **`spec.internals` drift.** Format varies across package versions — write a
  tolerant parser; degrade gracefully, never silently mis-map.

---

## Draft (pre-second-opinion, kept for provenance)

### 1. Dependency-package loading + canonical resolution (foundational)
**IGP:** `PublisherLoader` + `SpecMapManager` load every `IG.dependsOn` package
from the FHIR package cache, convert to a common version, and build a canonical
URL → web-path map so links to base-spec and dependency-IG resources resolve.
**Why first:** fcc resolves only *local* canonicals. Without this, every link to
`hl7.org/fhir/...` or to a dependency profile (e.g. us-core) is unresolved —
breaks profiles, bindings, and the link checker (#2). It's the substrate the rest
sit on.
**fcc grain:** a package Loader (`$loader` for `.tgz`/package cache) that folds
external resources into `ctx` tagged `internal-use` (filtered from FHIR consumers
but available to `ctx.canonicals.<RT>`), plus `$resolve_<scheme>` resolvers that
map a canonical to its external web path via the package's `spec.internals`.

### 2. HTML link / anchor / image checker (`HTMLInspector`)
**IGP:** crawls all generated HTML, validates `<a href>`/`<img src>`/anchors
against local targets + spec maps, flags broken links, duplicate anchor ids,
missing fragments. The #1 QA signal for a publishable IG.
**fcc grain:** a Validator (`linkCheck()`) run at `generateBundle`/`writeBundle`
that walks the route table's rendered HTML (we have one renderer → easy to
enumerate), resolves each ref against `ctx` routes + the spec maps from #1, and
writes issues into `ctx.issues`. Lazy in dev, full sweep in prod.

### 3. Full QA report with suppression (`ValidationPresenter` + `SuppressedMessageInformation`)
**IGP:** `qa.html` (+ `qa.min.html`, `qa.txt`, `qa.xml` OperationOutcome),
messages grouped by id, severity counts per file, a suppressed-messages file
(`%prefix%`/`%contains%` wildcards) with usage counts.
**fcc grain:** upgrade `site_artifacts/renderErrors.ts` → group by message id +
per-file summary; add a `suppressedMessages` config (composes into `validator`)
filtering `ctx.issues`; emit `qa.txt`/OperationOutcome via `$route_*`.

### 4. OperationDefinition rendering
**IGP:** `OperationDefinitionRenderer` — parameters in/out, idempotence, invocation.
A common conformance resource fcc has no page for.
**fcc grain:** `site_capability` (or new `site_operation`) `$section_*` files +
`sectionsFor` entry for `OperationDefinition`; reuse `dataTable`/`linkType`.

### 5. Cross-view aggregate pages (`CrossViewRenderer`)
**IGP:** registry-style grids: all Extensions (by context), all Observation
profiles (code/category/value matrix), all SearchParameters. Authors and reviewers
live in these.
**fcc grain:** new `$page_*` / aggregate Generators in `site_artifacts` reading
`ctx.byType.StructureDefinition` / `ctx.byType.SearchParameter`; pure, lazy,
re-derived on render so they stay correct incrementally.

### 6. Status / maturity surface (`StatusRenderer`)
**IGP:** FMM level, standards-status (draft/trial-use/normative/deprecated), WG,
rendered as colored badges on every canonical page + an aggregate status table.
**fcc grain:** a View `statusBadge(ctx,{resource})` in `site_core` consumed by
`canonicalMeta`/the tab strip; an aggregate status `$page_*`. Reads standard
extensions off the resource.

### 7. Multi-format serialization — XML (+ cross-linked JSON/XML)
**IGP:** `JsonXhtmlRenderer`/`XmlXHtmlRenderer` — pretty JSON **and** XML with
type names hyperlinked to their definitions. fcc has a JSON tab only, no links.
**fcc grain:** a `site_md`/`site_core` View producing XML; add an `xml` companion
tab + raw side-car via `companionPages`; enrich the JSON/XML renderer to link
canonical/type tokens through `linkCanonical`.

### 8. Dependency table page (`DependencyRenderer`)
**IGP:** hierarchical table of direct/transitive `IG.dependsOn` with versions,
FHIR version, realm checks, draft-dependency warnings.
**fcc grain:** an aggregate Generator/`$page_dependencies` reading the IG resource
+ the loaded packages from #1; one View per dependency row.

### 9. History + publish-box version notice (`HistoryGenerator` + `PublishBoxStatementGenerator`)
**IGP:** `package-list.json`-driven `history.html` and the "this is v.X (status)…
current version is…" banner on every page.
**fcc grain:** load `package-list.json` as a resource; a `$page_history`
Generator + a `publishBox` View injected into `layout` chrome. Mostly data-in,
chrome-out — fits the one-renderer model.

### 10. Previous-version comparison (`PreviousVersionComparator` + `DeprecationRenderer`)
**IGP:** fetches the last published package, diffs profiles/value-sets, renders
"changes since vX" + newly-deprecated tables.
**fcc grain:** heavier — a Transformer/Generator that loads the prior package
(reusing #1's loader), diffs snapshots, emits a comparison `$page_*`. Last because
it depends on #1 and is the most work.

## Sequencing rationale
1 unblocks 2 and 8 and 10 (all need external packages resolved). 3 and 6 are
pure-`ctx` upgrades to existing renderers (cheap, high value). 4/5/7 broaden
resource coverage. 9/10 are the publishing-lifecycle tail.

## Deliberately deferred (not top-10)
i18n/multi-language, CQL, Questionnaire-as-form, StructureMap rendering, IP/HTA
statements, spreadsheet/data-dictionary export, the web/ publication-process &
registry machinery (CI/release orchestration — out of fcc's scope as a builder).
