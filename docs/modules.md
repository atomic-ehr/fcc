# fcc module reference

Every module in fcc, with a grounded example. fcc is procedural TypeScript on Bun: one package, a flat `src/`, every function is `fn(ctx, config, opts)`, no classes. Plugins are step descriptors `{ hook, fn, ...config }`; loaders sit on `cfg.sources[].loader`; the site renderer is seven flat-ns namespaces. See [architecture.md](architecture.md) for the model and [../CLAUDE.md](../CLAUDE.md) for conventions.

## Engine

### Engine API (`fcc`)
The core build engine: a one-shot/incremental runner over a persistent `BuildState`, a `defineConfig` helper, and the `PluginContext` (`ctx`) every plugin step and loader receives.

`build({ projectRoot, configPath, config, targetName? })` creates fresh state and runs a full build; `runBuild(state, filter?)` re-runs all targets over existing state; `runIncremental(state, changedFiles, filter?)` rebuilds only the changed resources' transitive closure. All return a `BuildResult` (`{ diagnostics, bundles, ok, state, durationMs }`). `defineConfig(c)` is an identity helper for type-checking a `Config`. A plugin is one `Step` or `Step[]` — `{ hook, fn, ...config }` — where `fn(ctx, config, opts)` runs at its `hook` stage with `config` as inline static data and `opts` as the per-call payload (`{ resource }` / `{ bundle }` / `{ hot }` / `{}`). A `Loader` (`{ name, extensions, load(ctx, {file}), invalidate? }`) lives on `cfg.sources[].loader`, not as a step.

```ts
import { defineConfig } from "fcc";
export default defineConfig({
  id: "hl7.fhir.us.core", canonical: "http://hl7.org/fhir/us/core", version: "9.0.0",
  targets: [{ name: "r4", fhir: "4.0.1", out: "dist/r4", plugins: [/* generators */] }],
  sources: [{ dir: "input/resources", loader: json() }],
  plugins: [snapshot({ packagesDir }), validator({ validators: [...] })],
});
```
- Hook stages run in this order: `buildStart` `transform` `beforeSnapshot` `afterSnapshot` `beforeValidate` `afterValidate` `generateBundle` `writeBundle` `buildEnd` `closeBundle`, plus dev-only `handleHotUpdate` and `watchPaths`.
- `ctx` surface: indexes `resources` / `byType.<RT>` / `canonicals.<RT>` / `byCanonical`, `issues`, cross-plugin `shared`, render `state`, fn registry `fns`; queries `query(type, where?)` / `byUrl` / `byId` / `sql(query, params?)`; outputs `emitResource(r)` (returns id) / `emitFile(f)`; diagnostics `warn(d)` and `error(d)` (the latter throws — `never`).
- `ctx.sql(query, params?)` — ad-hoc SQL over the graph, backed by a lazily-built in-memory SQLite index (`resources` table: `id`, `resourceType`, `rid`, `url`, `version`, `example`, and a `json` column for `json_extract`). Built on first call, cached until a resource is added/dropped; returns plain rows. Also exposed in the dev REPL as `sql(...)`:
  ```sh
  bun src/bin/repl.ts "sql(\"SELECT resourceType, count(*) n FROM resources GROUP BY resourceType ORDER BY n DESC\")"
  bun src/bin/repl.ts "sql(\"SELECT id, json_extract(json,'\$.status') s FROM resources WHERE resourceType=?\", ['Observation'])"
  ```

### Engine helpers (`zip`, `indexEntry`, `packageEntries`)
Pure, ctx-free byte/model helpers exported from `fcc` that emitter plugins (npm, sqlite) import directly — the one project import the flat-ns rule permits.

`zip(entries, { store? })` is a hand-rolled PKZIP writer (raw `Bun.deflateSync` method 8, or `store` for method 0) using `Bun.hash.crc32` and a fixed 1980-01-01 timestamp for byte-reproducible archives. `indexEntry(resource)` builds one FHIR `.index.json` row (`filename`/`resourceType`/`id` plus any present scalar from `INDEX_FIELDS`: `url, version, kind, type, supplements, content, valueSet, derivation`). `packageEntries(bundle)` is the shared resource selection — every non-`Page` resource flagged `example` (via `__wasExample`) plus the synthesized placeholder `ImplementationGuide` — so `.index.json` and `.index.db` never drift. These are plain functions, not plugin steps; the emitter plugin that calls them runs at its own hook (e.g. `writeBundle`).

```ts
import { zip, indexEntry, packageEntries } from "fcc";

const items = packageEntries(bundle);                       // { resource, example }[]
const index = { "index-version": 2, files: items.map(i => indexEntry(i.resource)) };
const bytes = zip([{ name: ".index.json", bytes: enc.encode(JSON.stringify(index)) }]);
```
- `zip()` is single-disk / no ZIP64: it **throws** past 4 GB sizes/offsets or > 65535 entries rather than emit a corrupt archive.
- `indexEntry` filename is `${resourceType}-${id}.json` where `id` is `data.id`, falling back to the graph-id tail; non-scalar fields (objects/arrays/null) are omitted, booleans/numbers stringified.

### Dev server & REPL
`fcc dev` serves the site by lazily rendering one page on demand from the in-memory `BuildState` and pushes SSE live-reload after every rebuild; a sibling HTTP REPL lets you eval JS against the live state.

These are engine helpers (`src/engine/devServer.ts`, `src/engine/repl.ts`), not plugins — the `fcc dev` command starts both. `startDevServer` runs `Bun.serve` (port `SITE_PORT`, default 4321): for any path it calls `state.byTarget.get(target).shared.site.render(path)` (published by the site plugin each incremental build — no `dist/` writes), and injects an `EventSource("/__fcc/events")` client into HTML so `broadcastReload()` triggers `location.reload()`. `startRepl` serves `POST /repl`, writing its chosen free port to `<projectRoot>/.fcc/repl-port`; it runs your code as an `AsyncFunction` with `state`, `cfg` (`state.cfg`), `T(name?)` (target by name, default first), and `cdp` in scope, returning a JSON-safe (`safeJson`) result. The CLI client `src/bin/repl.ts` walks up for `.fcc/repl-port` and POSTs.

```ts
// from the dev server: lazy renderer the site plugin publishes
const render = state.byTarget.get(targetName)?.shared?.site?.render;
const out = render && await render(url.pathname);  // { contentType, body } | null
```
```sh
bun src/bin/repl.ts 'T().resources.size'          # expression
bun src/bin/repl.ts 'await cdp.screenshot({ session: "fcc", path: "/tmp/x.png" })'
```
- A one-liner is auto-wrapped as `return (code)`; code containing `return`/`throw` (or that fails to parse wrapped) runs as a statement body.
- Renderer returning `null` → 404; before the first build `shared.site.render` is absent → 503.

## Loaders

### `json` loader
A `Loader` for `.json` files that parses each file into a single FHIR resource.

`json()` is a config-time loader factory (not a hook plugin) — attach it to a source via `cfg.sources[].loader`. Its `load(ctx, { file })` reads and `JSON.parse`s the file, skipping it with a warning if parsing fails or `resourceType` is missing (the latter suppressed when `permissive: true`). The resource `id` is `data.id` or derived from the filename (stripping a leading `<ResourceType>-`). When `detectExamples` is on (default), it flags examples via `looksLikeExample` — any file under an `/example(s)/` dir, or any resource whose `resourceType` is NOT a conformance type (StructureDefinition, ValueSet, CodeSystem, CapabilityStatement, etc.) — and marks them by setting `data.__wasExample = true` and `meta.example = true` (so IG-resource emits `exampleBoolean=true`). File→resource is 1:1, so `invalidate` is a no-op.

```ts
import json from "fcc/json";

// in sources:
{ dir: "../../vendor/us-core/input/resources", loader: json() },
{ dir: "../../vendor/us-core/input/examples",  loader: json() },
```
- Opts are only `detectExamples` (default `true`) and `permissive` (default `false`) — no other options exist.
- `detectExamples: false` disables both the `/examples/`-dir and non-conformance-type heuristics, so nothing gets the `__wasExample` / `meta.example` marking.

### `fsh` loader

A `Loader` that compiles `.fsh` files into FHIR resources by running fsh-sushi off-thread in a persistent worker.

Returned by the `fsh(opts)` factory and attached to a source's `loader` field (not a step/hook — loaders live on `cfg.sources[].loader`, no lifecycle hook). Sushi needs the whole FSH tank in one call so cross-references between Aliases/Profiles/Instances resolve, so `load()` compiles the entire batch once (caching one `Promise<Batch>` per target, keyed by name|canonical|version) and serves every `.fsh` from it; the heavy compile runs in `worker.ts` off the main thread to keep `fcc dev` responsive. `invalidate()` exists because fsh-sushi gives no per-file source map: any `.fsh` edit drops the whole batch cache and re-invalidates every resource whose `source.kind === "fsh"`. Errors/warnings from sushi are reported via `ctx.warn`. Opts are `{ snapshot?, quietInfo? }`.

```ts
import fsh from "fcc/fsh";

sources: [
  { dir: "input/fsh", loader: fsh({ snapshot: false, quietInfo: true }) },
],
```
- All FSH output buckets to the first `.fsh` file found, so a single edit recompiles and re-emits the entire FSH-produced set — not just the changed file.
- `worker.ts` (the only place fsh-sushi is imported) must sit beside `fsh.ts`; the worker is unref'd while idle so `fcc build` can still exit.

### `ts` loader
A source loader that turns an authored `.ts` resource file into a FHIR resource by running its default export through fcc's authoring helpers.

It's a `Loader` (`{ name, extensions: [".ts"], load }`), placed on a source via `loader: ts()` — not a lifecycle plugin/step. On `load`, it dynamic-`import`s the file (Bun runs `.ts` natively), takes the `default` export, checks `isAuthored(def)`, then calls `materializeAuthored(def, ctx.config, ctx.target)` to produce the concrete `resource` (stamping `source = { kind: "ts", path }`). The default export must be an fcc authored object — built by helpers exported from `fcc` such as `profile()`, `valueSet()`, `codeSystem()`, `capability()`, and `example()`; a missing or non-authored default export is skipped with a warning and yields no resource. On incremental rebuilds (`ctx.cycle > 1`) it cache-busts the import URL with `?t=<now>` so edits re-evaluate.

```ts
import ts from "fcc/ts";

sources: [
  { dir: "input/profiles", loader: ts() },  // authored .ts → FHIR resources
],
```
- Each file contributes exactly one resource (the materialized default export); a file with no default export or a non-authored default is dropped with a `warning`, not an error.
- The factory takes no options — all behavior comes from the file's authored object plus `ctx.config`/`ctx.target` at materialize time.

### `pages` loader
A `.md` source loader that turns each `input/pagecontent` markdown file into a `Page` resource in the build graph.

`pages()` returns a `Loader` (`name: "fcc/pages"`, `extensions: [".md"]`) you attach to a source `dir`, not a plugin step — it runs through the normal source/loader/incremental machinery, so one `.md` edit invalidates exactly one `Page`. Each file becomes `{ resourceType: "Page", id, slug, title, md, role }`: the slug is the basename without `.md`, the title is the first `# H1` (falling back to a title-cased slug), and `role` is `"landing"` for `index.md` or `"page"` otherwise. Because `Page` is a non-FHIR `resourceType`, these resources are filtered out of FHIR consumers (npm, ig-resource, validator) and only feed the site renderer.

```ts
sources: [
  { dir: "../../vendor/us-core/input/pagecontent", loader: pages() }, // .md → Page resources
]
```
- `index.md` → `role: "landing"`; everything else → `role: "page"`.
- Skips (returns `null` for) `ImplementationGuide-*.md` and `<RT>-<id>-intro.md` / `-notes.md` files — those are handled by the site's intro/notes mechanism, not turned into `Page`s.
- `pages()` takes no options.

## Data plugins

### `snapshot` plugin
Generates StructureDefinition snapshots from differentials using `@atomic-ehr/fhirschema`'s `generateSnapshot`.

Runs at the `afterValidate` hook. For each `StructureDefinition` in the bundle lacking a `snapshot`, it merges the profile's differential against its base-definition chain into a full element set. The resolver indexes the IG's dependency packages (the FHIR install cache) plus in-bundle SDs, where current-build SDs override cached packages. The dependency base index is stable across rebuilds, so it's cached in `ctx.shared.__snapBase`. Profiles whose base can't be resolved are kept as differential-only and counted as failed.

```ts
import snapshot from "fcc/snapshot";

snapshot({ packagesDir: "../../vendor/us-core/input-cache/.fhir/packages" })
```
- Options: `packagesDir` (defaults to `input-cache/.fhir/packages`, resolved against `projectRoot`) and `quiet` (suppresses the info warning). No other options exist.
- The base index always seeds `hl7.fhir.r4.core#4.0.1` plus every entry in `config.deps`; it backfills inherited elements' missing `min`→`0` and `max`→`"1"` (a fhirschema round-trip quirk).

### `narrative` plugin
Auto-fills `Resource.text` with a generated XHTML narrative for any FHIR resource that lacks one.

Runs as a single `transform`-hook step (`narrative()` → `[{ hook: "transform", fn }]`). For each incoming resource it skips `Page` (not a FHIR resource) and any resource that already has a `text`, then synthesizes `{ status: "generated", div }` where `div` is an XHTML paragraph wrapping a display string. The display falls back through `data.title` → `data.name` → `"<resourceType> <id>"`, and the value is HTML-escaped before insertion. The mutated resource is returned (others return `null`, i.e. unchanged).

```ts
import narrative from "fcc/narrative";

// in plugins:
narrative(),
```
- Takes no options — `narrative()` ignores its argument; there is nothing to configure.
- Only fills in a narrative when `data.text` is absent; existing `text` is never overwritten.

### `validator` plugin
Composes a list of validator descriptors `{ fn, ...config }` and runs them at `afterValidate`, writing per-resource issues into `ctx.issues`.

The factory `validator({ validators })` returns a single `afterValidate` step whose `fn(ctx, config, opts)` runs each descriptor's `fn(ctx, config, {})` (defaulting to `[{ fn: structural }]`), flattens the issues into `ctx.issues` keyed by resource id, and publishes a summary to `ctx.shared.validate = { issues, summary: { errors, warnings, resources, total } }` (surfaced as `errors.html`). A descriptor that throws is caught and warned, contributing no issues. Three validators ship: `structural` (global lint — missing/duplicate id & url, unresolved refs), `schema` (`@atomic-ehr/fhirschema` against `meta.profile`, `packagesDir`-configurable), and `fhirpathConstraints` (snapshot invariants via `@atomic-ehr/fhirpath`). `schema` and `fhirpathConstraints` are per-resource and incremental: results cache in `ctx.shared` and are reused unless the resource is in `ctx.changedIds`; dropped resources are evicted.

```ts
validator({ validators: [
  { fn: structural },
  { fn: schema, packagesDir: "input-cache/.fhir/packages" },
  { fn: fhirpathConstraints },
] })
```
- Lives in the shared `plugins` (data pipeline), not per-target; place it after `snapshot()` since `fhirpathConstraints` reads generated snapshots.
- `structural` runs over the full set every build (its dup/url checks need the whole graph); only `schema`/`fhirpathConstraints` are gated by `changedIds`. Pass `quiet: true` to suppress the summary warning.

### `ig-resource` plugin
Synthesizes the IG's `ImplementationGuide` resource from the current resource graph at `beforeValidate`.

`igRes({ pagecontent })` registers one `beforeValidate` step (`igResourceFn`). Each run deletes any prior `ImplementationGuide/<cfg.id>`, then rebuilds it from `cfg` (`id`, `canonical`, `version`, `title`, `status`, `deps` → `dependsOn`, `target.fhir` → `fhirVersion`) and emits it as a `virtual` resource. `definition.resource[]` is filled from every resource that isn't an `ImplementationGuide` or `Page`, each entry carrying a `reference`, a `name`, and `exampleBoolean` (true when the resource was flagged `__wasExample`). It recomputes on every build so the resource list stays in sync in watch mode.

```ts
import igRes from "fcc/ig-resource";
// in the plugins list:
igRes({ pagecontent: "../../vendor/us-core/input/pagecontent" }),
```
- `pagecontent` is accepted and spread into the step descriptor, but `igResourceFn` does not actually read it — page filtering only excludes `resourceType === "Page"` from `definition.resource`.
- `name` is `pascalize(cfg.id)`; `title`/`status` fall back to `cfg.id` / `"draft"`; emitting it before validation means the synthesized IG is itself validated.

### `menu` plugin
Reads the `menu:` section of a project's `sushi-config.yaml` and hands a rendered nav tree to the site renderer via `ctx.shared.menu`.

`menu({ config })` returns a single `buildStart` step. At build start the fn resolves `config` against `pctx.config.projectRoot` (default `"sushi-config.yaml"`), reads the file, and calls `ctx.fns.menu.parseMenu` to walk the indent ladder into a `MenuNode[]` tree (SUSHI's menu format isn't strict YAML — submenu items sit at a deeper indent). It then renders the tree with `ctx.fns.menu.renderMenu` and publishes `pctx.shared.menu = { html, tree }`, which `fcc/site` picks up in its `writeBundle` pass. It is a flat-ns plugin (`ctx.fns.menu`, lazily attached via `loadFns`).

```ts
menu({ config: "../../vendor/us-core/sushi-config.yaml" }),
```
- A missing config file or an absent/empty `menu:` section is non-fatal: it emits an `info` warning and skips (no `ctx.shared.menu`), so the site falls back to no menu.
- Only `config` is an option; the menu is read once at `buildStart`, not hot-reloaded.

## Output plugins

### `site` plugin

Renders the IG website (StructureDefinitions, terminology, capabilities, narratives, markdown pages, artifact indexes) from the resource graph through one route table that serves both `fcc build` (precomputed to `dist/`) and `fcc dev` (lazy, in-memory + SSE reload).

`site(opts)` is a factory returning **three step descriptors** — `{ hook: "writeBundle", fn }`, `{ hook: "watchPaths", fn }`, `{ hook: "handleHotUpdate", fn }` — so it's a per-target output generator (placed in a target's `plugins`, not the shared `plugins`). Each step's `fn(ctx, config, opts)` calls a private `attach(ctx, config)` that idempotently `loadAll(ctx)`s the seven flat-ns `site_*` namespaces (`site_core`, `site_md`, `site_profile`, `site_terminology`, `site_capability`, `site_narrative`, `site_artifacts`) onto `ctx.fns` and runs `enable` with `opts` into `ctx.state.site`, then delegates to `ctx.fns.site_core.{writeBundle,watchPaths,handleHotUpdate}`. `buildRoutes` is the single route table; `$route_*` files (e.g. `$route_examplesZip.ts` → `examples.json.zip`) contribute extra export routes alongside the per-resource pages.

```ts
// in a target's plugins (examples/us-core uses the igSite() preset that bundles it)
import site from "fcc/site";

{ name: "r4", fhir: "4.0.1", out: "dist/r4",
  plugins: [ site({ introNotes: "input/intro-notes" }) ] }
```

- It's a **target** plugin (one site per target's `out`), not a shared data-pipeline plugin — opts spread directly onto each step descriptor and are read via `enable` from `config`.
- Editing `site_*` source files is not hot-reloaded; only IG inputs and `watchPaths`-declared paths trigger dev rebuilds — restart `fcc dev` after changing renderer code.

### `npm` plugin
Emits a FHIR NPM `package.tgz` at `writeBundle`, faithful to the HL7 IG Publisher layout.

`npm({ emitUnpacked? })` returns one `writeBundle` step whose `npmFn(ctx, config, { bundle })` builds the tarball under `package/`: a `package.json` manifest (`type: "IG"`, `canonical`, `url`, `fhirVersions`, `dependencies`, `directories`, `jurisdiction`, derived from config plus the IG resource), a v2 `.index.json` listing conformance resources only, conformance resources flat (`package/<RT>-<id>.json`), and examples (those the loader flagged `__wasExample`, stripped before write) under `package/example/` and *not* indexed. It reuses `ctx.shared.sqlite.indexDb` verbatim as `package/.index.db` when the sqlite plugin ran (npm owns no DB code). Entries are sorted for reproducible output, tarred via the local USTAR writer, gzipped with `Bun.gzipSync`, and written with `Bun.write` (which creates parent dirs). With `emitUnpacked` it also writes the unpacked `package/` tree for debugging.

```ts
import npm from "fcc/npm";
// per-target plugins — package only:
{ name: "pkg", fhir: "4.0.1", out: "dist/pkg", plugins: [npm()] }
```
- Default opts are `{ emitUnpacked: true }` — pass `npm({ emitUnpacked: false })` to ship only `package.tgz`.
- `.index.db` is omitted when the sqlite plugin isn't in the pipeline; the package.json `jurisdiction` becomes a `"system#code"` urn (e.g. `urn:iso:std:iso:3166#US`) from the IG's first jurisdiction coding.

### `manifest` plugin
Builds the FHIR `package.json` manifest from config + the IG resource and publishes it (plain data) on `ctx.shared.manifest`.

Runs at the `generateBundle` hook. It calls the shared `fcc` helper `packageManifest(config, target, ig)` — `type: "IG"`, `canonical`, `url`, `fhirVersions`, `dependencies`, `directories`, `jurisdiction`, etc. — and assigns the resulting object to `ctx.shared.manifest`. The `npm` plugin reads that handoff for `package/package.json` (falling back to the same helper when this plugin isn't in the pipeline, since a package.json is mandatory), and any other consumer (a site version chip, a registry-publish step) can read the manifest object directly.

```ts
import manifest from "fcc/manifest";
// in a target's plugins (alongside npm); igSite() includes it:
manifest()
```
- Takes no options; the manifest is pure data (no methods), built once at `generateBundle`.
- Build logic lives in the shared `packageManifest` helper, so npm and any future emitter stay in sync.

### `sqlite` plugin
Builds the IG-Publisher `.index.db` (a SQLite mirror of the package's conformance resources) in memory and publishes its serialized bytes for the npm plugin to ship.

Runs at the `generateBundle` hook. It selects the same conformance-only rows as `.index.json` (via the shared `packageEntries` + `indexEntry` helpers, examples excluded, sorted by filename for reproducible bytes), creates a one-table in-memory `bun:sqlite` `Database(":memory:")`, inserts the IG-Publisher `ResourceList` columns, serializes with `db.serialize()`, and always closes the db in a `finally`. The result is published as `ctx.shared.sqlite.indexDb` (a `Uint8Array`) — data-only, no db handle leaks into the graph. The `npm` plugin reads that handoff to emit `package/.index.db`.

```ts
import sqlite from "fcc/sqlite";
// in a target's plugins (alongside npm):
sqlite()                  // table defaults to "ResourceList"
sqlite({ table: "ResourceList" })   // override the table name
```
- The only option is `table` (default `"ResourceList"`); it's interpolated into DDL, so it must match `/^[A-Za-z_][A-Za-z0-9_]*$/` or the build errors via `ctx.error`.
- Produces only the `ctx.shared.sqlite` handoff — pair it with `npm()` for the bytes to actually be written.

## Presets

### `presets` (`igSite`)
`igSite(siteOpts)` is a config-time factory returning the full IG output pipeline: `[site(siteOpts), sqlite(), npm()]`.

It's not a single plugin but a composed `Plugin[]` you drop into a target's `plugins` to emit a browsable site plus a FHIR npm package with an embedded SQLite `.index.db`. `siteOpts` is forwarded verbatim to `site()` (its type is `Parameters<typeof site>[0]`, optional, defaulting to `{}`) — `igSite` itself adds no options of its own. The ordering matters: `sqlite()` runs at `generateBundle` and publishes its index to `ctx.shared.sqlite`, which `npm()` then reads at `writeBundle` to write `package/.index.db`. Because run order equals config order, keep `sqlite()` before `npm()` so the handoff resolves.

```ts
import { igSite } from "fcc/presets";

// in a target:
{ name: "r4", fhir: "4.0.1", out: "dist/r4",
  plugins: igSite({ introNotes: "../../vendor/us-core/input/intro-notes" }) }
```
- For a package-only target, skip the preset and use `[npm()]` directly; for site-only, call `site()` on its own.
- The shared data pipeline (loaders, `snapshot`, `validator`, etc.) lives in the top-level `plugins`, not in `igSite` — the preset only covers output generators.

## Site renderer

### Site renderer namespaces & extension files
`fcc/site` is assembled from seven flat-fn namespaces (`site_core`, `site_md`, `site_profile`, `site_terminology`, `site_capability`, `site_narrative`, `site_artifacts`), each its own `/src/site_<name>/` folder; project pages extend them by dropping in `$`-prefixed files.

`site_core/loadAll` wires every namespace into `ctx.fns.<ns>`, and `buildRoutes` enumerates one lazy `render()` thunk per output path (shared by `fcc build`→disk and `fcc dev`→on-demand). Extension files are dispatched by bare name across all loaded namespaces — `$section_<id>` (a Content-page section `(ctx,{resource})→{title,id,html}|null`, ordered per resourceType), `$tab_<id>`/`$block_<class>`/`$avail_<name>` (companion-tab renderer, kramdown block, availability predicate, referenced from `tabDefaults`/`blockDefaults` by string key), `$page_<slug>` (a code-defined page), and `$route_<name>` (returns a `RouteDef`/`RouteDef[]` for arbitrary export paths, even binary). Registry keys that name a fn (a tab's `render`/`avail`, a section id, a block) are looked up by `ctx.fns.site_core.resolveFn({ key })`, which scans every namespace — fn names are globally unique, so the resolution is deterministic and you never hardcode the namespace. `$route_` files are gathered by `buildRoutes` scanning `ctx.fns` for keys starting with `$route_` and calling each with `{ pluginCtx }`; no registration is needed.

```ts
// src/site_core/$route_examplesZip.ts — emits /examples.json.zip
import { zip } from "fcc";
export default function $route_examplesZip(_ctx: Context, opts: { pluginCtx: types.fcc.PluginContext }): types.site_core.RouteDef {
    const pctx = opts.pluginCtx;
    return { path: "examples.json.zip", id: null, contentType: "application/zip",
        render: () => zip([...pctx.resources.values()].filter(r => (r.data as any).__wasExample).map(/* …→{name,bytes} */)) };
}
```
- `RouteDef.id: null` marks an aggregate route — always rebuilt in prod, re-served fresh in dev; a per-resource `id` gates incremental rewrites.
- Plugin code (anything under `src/**`, including these `$`-files) is NOT hot-reloaded — adding/renaming one requires `bash src/site/gentypes.sh` plus an `fcc dev` restart.
