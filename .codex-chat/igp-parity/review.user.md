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

## Top 10 (draft, ranked)

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
