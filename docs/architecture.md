# fcc — build & incremental architecture

How fcc turns IG source artifacts (`.json` / `.fsh` / `.ts` / `.md`) into a FHIR
package + a browsable site, and how it rebuilds **incrementally** when an artifact
changes. This is the "hybrid" model: a precise dependency graph for the *data*
layer, lazy on-demand rendering for the *view* layer in dev, and full precompute
for prod.

```
                        ┌──────────────── BuildState (survives rebuilds) ───────────────┐
 sources                │  resources  byCanonical                                        │
 input/resources/*.json │  fileToResources ⇄ resourceToFiles   reverseCanonical (deps)  │
 input/examples/*.json  │  shared (cross-plugin)                                          │
 input/*.fsh   ─loaders─▶  ───────────────────────────────────────────────────────────  │
 input/**/*.ts          │  transform → snapshot → narrative → validate → generateBundle  │
 pagecontent/*.md       │                                          └ writeBundle (site)  │
                        └────────────────────────────────────────────────────────────────┘
                                       │ prod: precompute to dist/         │ dev: lazy render
                                       ▼                                   ▼
                                 dist/<target>/site/*.html        Bun.serve + SSE live-reload
```

## 0. The model in one breath

Four ideas carry the whole system — each is the *simple* answer to one concern,
and together they're the *flexible* part:

- **One graph.** Every source becomes a resource in a `BuildState` that survives
  rebuilds; canonical references form a dependency graph. A changed file →
  invalidate its transitive closure → re-run only that. One algorithm for all
  incrementality (§3).
- **One renderer, two deliveries.** A single route table renders any page; prod
  precomputes it to `dist/`, dev renders it on demand from memory + live-reloads
  (§5). No dev/prod drift.
- **Plugins are functions that register functions** (Emacs `add-hook` style). A
  plugin is `(hooks) => { hooks.afterValidate(fn); hooks.writeBundle(fn); … }` —
  no object, no methods. Every registered fn may be async (the runner awaits all).
  They never import one another — they meet at the resource graph and
  `ctx.shared.<ns>` handoffs (menu→site, validator→site). Run order = config order,
  so adding/removing/reordering a plugin is a one-line edit.
- **Composition over configuration.** Where a concern has many variants, it's a
  *list you compose*, not flags — most visibly validation: one plugin running
  `[structural(), schema(), fhirpathConstraints(), …]`, each an async validator (§7).

**The four extension points** (add capability without touching the engine):

| Want to… | Add a… | Lives in |
|----------|--------|----------|
| read a new source file type | **Loader** (`{ extensions, load, invalidate? }`) | `src/<lang>` (json/fsh/ts) |
| transform / generate / emit | **Plugin** (a `(hooks) => void` registering hook fns) | `src/<name>/<name>.ts` |
| add a validation check | **Validator** (async `(ctx) => Promise<issues>`) | `validator({ validators: […] })` |
| change the site | **renderer namespace / `$`-dispatch file** | `src/site_*` |

## 1. Data model (`src/engine/state.ts`)

A `BuildState` holds one `TargetState` per output target. It **survives between
incremental rebuilds** in watch mode (cleared only on a full build). Each
`TargetState` carries the resource graph plus the indexes that make incremental
invalidation precise:

| Index | Maps | Used for |
|-------|------|----------|
| `resources` | id → `Resource` | the graph itself |
| `byCanonical` | canonical url → id | resolve refs by URL |
| `fileToResources` | source file → ids it produced | seed invalidation from a changed file |
| `resourceToFiles` | id → source files | find files to re-load |
| `reverseCanonical` | canonical url → ids that **reference** it | the dependency graph |
| `shared` | plugin ns → arbitrary | cross-plugin handoffs (e.g. `shared.site.render`, `shared.menu`) |

`reverseCanonical` is built by `populateDeps` → `collectCanonicals`, which walks
each resource's data for canonical-bearing fields (`url`, `baseDefinition`,
`system`, `valueSet`, `profile`, `targetProfile`, `instantiatesCanonical`,
`derivedFrom`).

## 2. Build pipeline (`src/engine/runner.ts`)

At startup, `collectHooks(cfg.plugins)` runs each plugin once — they push their
functions into the hook slots (`state.hooks`). A full build (`runTargetFull`)
then runs each slot, in registration = config order, at its stage:

```
buildStart
  → load every source file via its loader      (loadFile → indexResource)
  → resolveExamples + populateDeps
  → transform        (per resource)
  → beforeSnapshot / afterSnapshot
  → beforeValidate / afterValidate              (e.g. fcc/snapshot generates snapshots here)
  → generateBundle / writeBundle                (e.g. fcc/site, fcc/npm emit output)
  → buildEnd / closeBundle
```

Order within a slot is **config order** (no `enforce` flag) — list `site()` last
so its `writeBundle` runs after the other emitters and after the data is fully
shaped. Every hook fn may be async; the runner awaits each.

## 3. Incremental rebuild (`runTargetIncremental`)

Given the set of changed files, fcc rebuilds the **minimum closure**:

1. **Seed** — changed files → resource ids they produced (`fileToResources`).
2. **Closure** — `transitiveDependents(seedIds)` walks `reverseCanonical`: every
   resource that (transitively) references a seed is invalidated.
3. **`handleHotUpdate` hooks** extend the set (see §4).
4. **Loader `invalidate`** extends it (FSH drops the whole tank — see §6).
5. **Drop** invalidated resources from all indexes; **re-load** their files.
6. `resolveExamples` + `populateDeps`; **re-transform** only `changedIds`.
7. snapshot / validate run (today as full passes — see §7); `writeBundle`.

The site's `writeBundle` honors `changedIds`: resource pages whose id is not in
the set are skipped; chrome/aggregate pages (index, artifacts, menu) are always
re-emitted.

## 4. Dependency graph: canonical edges + soft edges

`reverseCanonical` captures **canonical-URL** references, which already gives the
right invalidation for most cases — e.g. editing a profile invalidates every
example that conforms to it (the example's `meta.profile` → profile url → the
example is a dependent), so those examples re-validate and re-render.

Some **view-level** dependencies aren't canonical edges and are added explicitly
in `src/site_core/handleHotUpdate.ts`:

- **sample → profile.** A changed example only *references* its profile, so the
  graph would re-render the example but not the **profile page** whose "Examples"
  section lists it. The hook invalidates the example's profile(s) so that section
  stays correct on incremental prod rebuilds.
- **`*-intro.md` / `*-notes.md` → resource.** A markdown note for `Foo/bar`
  invalidates resource `Foo/bar` and clears the notes cache.

> Aggregate pages (artifacts index, landing, menu) are always re-emitted, so
> "a new resource appeared in the index" needs no explicit edge.

## 5. Dev vs prod: one renderer, two delivery modes

`ResolvedConfig.dev` / `PluginContext.dev` is `true` under `fcc dev`. The site's
render layer is a **single route table** (`src/site_core/buildRoutes.ts`) used by
both modes — there is exactly one renderer, so dev and prod output are identical.

`buildRoutes` enumerates **every** output path as a *lazy* thunk **without
rendering**: resource pages (`pageHref`), companion tabs + raw side-cars (from
`tabsFor` — cheap, no render), `index.html` / `artifacts.html` / `style.css`, and
each pagecontent page. It also does the per-build setup every render depends on
(Shiki warm-up, pagecontent + ref-links, intro/notes, menu).

`writeBundle` then:

- **always** publishes `pctx.shared.site.render(path)` — a lazy renderer that
  resolves one route and renders it from the current in-memory graph;
- **prod** (`dev:false`): walks the table and writes every route to
  `dist/<target>/site/`, honoring `changedIds` (incremental);
- **dev** (`dev:true`): writes **nothing** to disk — returns after publishing the
  renderer. The dev server serves from memory.

### Dev server (`src/engine/devServer.ts`)

`fcc dev` starts a `Bun.serve` that:

- renders each request **on demand** via `state.byTarget.get(t).shared.site.render(path)`
  — latency is "render one page" (~ms), independent of IG size, and aggregates
  are always fresh because they render from the current graph;
- exposes `GET /__fcc/events` (SSE) and injects a tiny client into every HTML
  response; after each (incremental) rebuild the watcher calls
  `dev.broadcastReload()` and the browser reloads automatically. No external
  static server, no manual refresh.

### Watching

`fcc dev` watches `cfg.sources` dirs + `fcc.config.ts` **plus every path returned
by each plugin's `watchPaths(cfg)`** — that's how non-resource markdown
(`pagecontent`, `intro-notes`) is picked up. The watcher (`src/engine/watcher.ts`)
debounces (80 ms) and is single-flight (coalesces edits during a rebuild).

## 6. FSH (`src/fsh`)

`fsh-sushi` compiles the whole FSH tank in one call (cross-references between
Aliases/Profiles/Instances must resolve together) and exposes **no per-file
source map**. So the FSH loader caches one compiled batch per target and, on any
`.fsh` change, `invalidate` drops the batch and invalidates every FSH-produced
resource. Non-FSH resources are untouched.

That compile is multi-second and CPU-bound, so it runs **off the main thread** in
a persistent `Worker` (`src/fsh/worker.ts`). `await`-ing the worker yields the
event loop, so during a recompile the dev server keeps serving the last-good
graph — verified: requests return in <1 ms while a ~2 s FSH recompile is in
flight. The heavy `fsh-sushi` module is imported **only** in the worker, never on
the main thread. The worker is `ref`'d while a compile is pending and `unref`'d
when idle, so `fcc build` exits cleanly and `fcc dev` keeps it warm. One worker
with id-correlated requests suffices because builds are sequential (per target;
the watcher is single-flight).

## 7. Validation — one plugin, composable validators

There is **one** validation plugin, `fcc/validator` (explicitly enabled). It is a
thin runner: it executes a **list of `Validator` functions**, merges their issues
into one report at `ctx.shared.validate`, and emits a summary. Every check is a
validator — you compose them, which is the whole extensibility story ("just drop
in more validators"):

```ts
type Validator = (ctx) => Promise<ValidatorIssue[]>   // always async; run in parallel

validator()                                  // default: [structural()]
validator({ validators: [
  structural(),                              // lite lint — no package cache needed
  schema({ packagesDir }),                   // @atomic-ehr/fhirschema
  fhirpathConstraints(),                     // @atomic-ehr/fhirpath
  myCustomValidator(),                       // your own (ctx) => issues
] })
```

Built-in validators:

- **`structural()`** — lite lint: resourceType / id / canonical url / duplicate
  id+url / unresolved refs. No FHIR package cache required, so it's the safe
  default.
- **`schema()`** — `@atomic-ehr/fhirschema`. Builds a FHIRSchema registry from the
  in-bundle SDs + the FHIR package cache (R4 core + declared deps, same source as
  `fcc/snapshot`); validates **instances** against their `meta.profile[]` (+ base
  type, walking the chain) and that every **StructureDefinition** `translate()`s.
- **`fhirpathConstraints()`** — `@atomic-ehr/fhirpath`. Evaluates each profile's
  element `constraint[]` invariants (read from the generated snapshot — run
  `fcc/snapshot` first) against the instance. The engine is async-only and can't
  satisfy fhirschema's *synchronous* `fhirpath` hook, so it is a **separate
  async pass** — the canonical reason validators are a list rather than one call.
  Conservative: only an explicit `[false]` is flagged; unsupported FHIRPath
  functions and non-boolean results are skipped, keeping noise low (us-core: ~20
  named `us-core-*` invariants, no generic `ele-1`/`dom-*` noise).

The report is rendered by the site as **`errors.html`** (a QA page à la IG
Publisher's `qa.html`) with a top-bar QA chip; both appear only when the plugin
is enabled. Schema validation is **experimental** — terminology and some
slicing/choice-type checks are limited until those evaluators are wired in, so
the page is labelled as such.

These run as **full passes** in `afterValidate` for now. The planned scaling model
is **tiered**:

- **structural / cheap** checks run inline on the invalidation closure (blocking,
  incremental) — they already have the `changedIds` set available;
- **heavy** validation (full FHIR validator, terminology) runs as a **background
  pass** whose results stream to the browser over the existing SSE channel, so
  editing stays snappy. Validation reuses the same dependency graph: changing a
  profile invalidates (re-validates) its conforming examples via `reverseCanonical`.

## 8. Status

| Area | State |
|------|-------|
| Dependency-graph incremental (data) | **done** (`runIncremental` + indexes) |
| sample→profile / md→resource soft edges | **done** (`handleHotUpdate`) |
| Single route table, prod/dev parity | **done** (`buildRoutes`) |
| Dev lazy render + SSE live-reload | **done** (`devServer` + `fcc dev`) |
| Plugin `watchPaths` wired into dev | **done** |
| snapshot generation (`@atomic-ehr/fhirschema`) | **done** (`src/snapshot`) |
| FSH compile in a Worker (non-blocking dev) | **done** (`src/fsh/worker.ts`) |
| Unified validator (composable validators) → `errors.html` | **done** (`src/validator`) |
| `structural()` / `schema()` (fhirschema) / `fhirpathConstraints()` (fhirpath) | **done** (experimental) |
| Terminology evaluator wired into `schema()` | planned |
| Tiered (background) validation over SSE | planned |
| Fine-grained per-page render cache (hash×cycle) | planned (lazy render makes it optional) |
