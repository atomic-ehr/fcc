# fcc — FHIR Conformance Compiler

A TypeScript build system for FHIR Implementation Guides, in the spirit
of Vite. Small core, every interesting step is a plugin, dev mode does
**incremental** rebuilds, and the dev server has a live REPL for poking
at the build state from a shell or a browser.

> Status: **alpha, work in progress.** APIs will change. Useful for
> playing with the model and inspecting real IGs; not yet a drop-in
> replacement for IG Publisher.

See [`docs/architecture.md`](./docs/architecture.md) for the architecture,
[`docs/modules.md`](./docs/modules.md) for a per-module reference, and
[`docs/page.md`](./docs/page.md) for the (in-progress) unified Page model.

## Why

The current FHIR IG toolchain — IG Publisher (Java, monolithic) and
SUSHI (compiles FSH to JSON, then hands off) — doesn't compose. There's
no plugin model: you can't drop in a custom narrative renderer, a
typed-codegen pass, or an org-internal naming-policy linter without
forking.

`fcc` rebuilds that toolchain the way Vite rebuilt the JS toolchain:

- **Authoring in TypeScript** (or FSH, or JSON) — same resource graph.
- **Plugin-first** — snapshot, narrative, validation, NPM packaging,
  HTML site, codegen are all plugins of the same shape (step descriptors
  `{ hook, fn, ...config }`).
- **Flat-namespace plugins** — each plugin is a folder of single-purpose
  files; everything is reachable as `ctx.fns.<ns>.<fn>(ctx, opts)` and
  hot-swappable. Inspired by [workspaces-template]'s procedural style.
- **Multi-target** — one source produces R4 / R4B / R5 artefacts from
  one `targets:` array; `when(fhir.gte("5.0"), …)` for differences.
- **Incremental dev mode** — file watch, per-loader source map,
  reverse-deps over canonical URLs. Touching one resource rebuilds only
  what depends on it (100 ms on us-core).
- **REPL** — `fcc dev` exposes `POST /repl` over an ephemeral port;
  every build state and every plugin fn is callable live.
- **CDP helpers** — drive a real browser at the rendered site from the
  same REPL: navigate, screenshot, click, read DOM, all in one
  conversation.

## Quick start

```sh
git submodule update --init        # pulls HL7/US-Core into vendor/
bun install
```

Then either run the small example…

```sh
cd examples/basic-ig
bun ../../src/bin/fcc.ts info       # resolved config + plugin chain
bun ../../src/bin/fcc.ts build      # full build for all targets
bun ../../src/bin/fcc.ts dev        # watch mode + REPL
```

…or the realistic one against US Core (443 resources, R4):

```sh
cd examples/us-core
bun ../../src/bin/fcc.ts build      # ~300 ms full build
bun ../../src/bin/fcc.ts dev        # ~100 ms incremental
```

The us-core build produces 444 HTML pages under `dist/r4/site/` plus a
FHIR NPM `package.tgz`. Serve the site with a one-liner:

```sh
cd dist/r4/site
bun --bun -e 'Bun.serve({port: 4321, fetch: r => new Response(Bun.file("." + new URL(r.url).pathname.replace(/^\/$/, "/index.html")))})'
```

## What's in the box

Everything is one package (`fcc`) under a flat `src/`. The engine is imported as
`fcc`; each plugin namespace as `fcc/<name>`.

| Namespace          | Role                                                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| `fcc` (`src/engine`) | Core: types, runner, watcher, **REPL**, CDP helpers, `fcc` + `fcc-repl` + `fcc-gentypes` CLIs |
| `fcc/ts`           | `.ts` source loader (profile / valueSet / codeSystem / example / capability)      |
| `fcc/fsh`          | `.fsh` source loader, wraps `fsh-sushi`                                           |
| `fcc/json`         | `.json` source loader (drop-in for IG-Publisher-style `input/resources/*.json`)   |
| `fcc/pages`        | `.md` source loader → `Page` resources (`input/pagecontent`)                      |
| `fcc/snapshot`     | Snapshot generation via `@atomic-ehr/fhirschema` — merges each differential against its base-definition chain into a full `snapshot.element[]` |
| `fcc/narrative`    | Auto-fills `Resource.text.div`                                                    |
| `fcc/validator`    | Runs a composable list of validators → QA `errors.html`: `structural()` (lite lint), `schema()` (`@atomic-ehr/fhirschema`), `fhirpathConstraints()` (`@atomic-ehr/fhirpath`), or your own |
| `fcc/ig-resource`  | Synthesises the `ImplementationGuide` resource                                    |
| `fcc/npm`          | FHIR NPM `package.tgz` emitter — IG-Publisher layout (examples in `example/`, conformance-only `.index.json` + `.index.db`), byte-reproducible (pure-Bun USTAR + `Bun.gzipSync`) |
| `fcc/manifest`     | Builds the FHIR `package.json` manifest → `ctx.shared.manifest` (reused by `fcc/npm`; the build logic is the shared `packageManifest` helper) |
| `fcc/sqlite`       | Builds the IG-Publisher `.index.db` (SQLite via `bun:sqlite`) → bytes on `ctx.shared.sqlite` for `fcc/npm` to ship |
| `fcc/menu`         | Reads `sushi-config.yaml` menu → top-bar nav                                      |
| `fcc/site` (`src/site` + `src/site_*`) | Browsable HTML site, Tailwind-CDN, IG-Publisher-resembling layout — flat fn-per-file across seven `site_*` namespaces with `ctx.fns` hot-reload |

## Architecture

Four ideas, four extension points — see [`docs/architecture.md`](./docs/architecture.md)
(and [`docs/modules.md`](./docs/modules.md) for a per-module reference):

- **One graph** — sources become resources in a `BuildState` that survives rebuilds; a changed file invalidates its dependency closure, so rebuilds are incremental.
- **One renderer, two deliveries** — prod precomputes pages to `dist/`; `fcc dev` renders them on demand from memory and live-reloads the browser over SSE.
- **Plugins are step descriptors** `{ hook, fn, ...config }`; every function is `fn(ctx, config, opts)` — async-first, decoupled via the resource graph + `ctx.shared.<ns>` handoffs.
- **Composition over configuration** — e.g. validation is one plugin running a list you compose: `validator({ validators: [structural(), schema(), fhirpathConstraints()] })`.

Extend by adding a **loader** (new file type), a **plugin** (a step descriptor `{ hook, fn, ...config }`), a **validator** (`{ fn, ...config }`), or a **renderer namespace** (`src/site_*`) — every function is `fn(ctx, config, opts)`. FSH compiles off-thread in a Worker so dev never blocks.

## Examples

| Example                       | What                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `examples/basic-ig`           | Hand-rolled mini IG. Two targets (R4 + R5), TS + FSH authoring, walks every plugin |
| `examples/us-core`            | Real HL7 US Core 9.0.0 via git submodule (`vendor/us-core`), JSON sources, 443 resources, structurally similar pages to the IG Publisher build |

## REPL workflow

`fcc dev` starts an HTTP REPL on a free port and writes the port to
`<projectRoot>/.fcc/repl-port`. Connect from any shell:

```sh
bun src/bin/repl.ts 'state.cfg.id'
bun src/bin/repl.ts 'T().resources.size'
bun src/bin/repl.ts '(() => {
  const out = {};
  for (const r of T().resources.values()) out[r.resourceType] = (out[r.resourceType]||0) + 1;
  return out;
})()'
```

The eval scope has `state`, `cfg`, `T(name?)` (target shortcut), and
`cdp.*` (CDP helpers — navigate / screenshot / click / pageState / …).

```sh
# drive the rendered site from the REPL
bun src/bin/repl.ts 'await cdp.navigate({ path: "/StructureDefinition-us-core-patient.html", session: "uscore" })'
bun src/bin/repl.ts 'await cdp.screenshot({ session: "uscore", path: "/tmp/x.png" })'
```

This requires a CDP server at `localhost:2229` (see [the `cdp` skill][cdp]
for setup). Default session = `$CDP_SESSION` or `"fcc"`; default
static-site port for `cdp.navigate({ path })` = `$SITE_PORT` or `4321`.

[cdp]: https://github.com/anthropics/claude-code/blob/main/skills/cdp/SKILL.md
[workspaces-template]: https://github.com/HealthSamurai/workspaces-template

## Authoring example (TypeScript)

```ts
// input/profiles/my-patient.ts
import { profile, ms, when } from "fcc";
import langVS from "../valuesets/my-language";

export default profile("my-patient", ({ Patient, fhir }: any) => ({
  parent: Patient,
  title:  "My Patient",
  diff: {
    identifier:        ms({ min: 1 }),
    "identifier.system": ms({ min: 1, max: 1 }),
    name:              ms({ min: 1 }),
    "communication.language": ms({
      min: 0,
      binding: { strength: "required", valueSet: langVS },
    }),
    ...when(fhir.gte("5.0"), { "contact.relationship": ms() }),
    ...when(fhir.lt("5.0"),  { "contact.gender":       ms() }),
  },
  mustSupport: ["identifier", "name", "gender", "birthDate"],
}));
```

References between resources are plain `import`s — typos are compile
errors, the dependency graph builds itself.

## Architecture in two minutes

1. **Sources** (`sources:` in `fcc.config.ts`) declare directories and
   their loader (`ts()`, `fsh()`, `json()`). Each source produces
   `Resource`s.
2. **Plugins** are step descriptors `{ hook, fn, ...config }`; the runner calls
   `fn(ctx, config, opts)` at the `hook` stage — `buildStart`, `transform`,
   `before/afterSnapshot`, `before/afterValidate`, `generateBundle`,
   `writeBundle`, `handleHotUpdate`, `watchPaths`. Every fn may be async; run
   order = config order.
3. **Resource graph**: every cross-reference is by **canonical URL**.
   The core builds five edge types (canonical refs, `meta.profile`,
   binding → ValueSet, VS → CodeSystem, package deps) and uses them
   for cache invalidation and dev-mode rebuilds.
4. **Targets**: a single build can produce N artefacts from one source
   (per FHIR version, per feature-flag matrix).
5. **Incremental**: every loader records `file → resource ids`; every
   transform records `resource → canonical URLs it touched`. On file
   change, the reverse closure tells us exactly what to rebuild.

### Plugin convention: flat namespace, fn-per-file

New plugins (and the `fcc/site` renderer) follow a strict procedural
style ported from [workspaces-template]. **Each file inside a namespace is
a single function**; everything else is reached through `ctx.fns.<ns>`
and `types.<ns>.*` — no project imports across files.

```
src/site_core/                  ← the renderer's chrome/dispatch namespace
  enable.ts                     ← reads opts → ctx.state.site
  loadFns.ts                    ← ONLY file that imports siblings; builds ctx.fns.site_core
  ctx_ns.d.ts                   ← auto-gen ambient: Context, FnsRegistry, types.site_core.*
  writeBundle.ts                ← Plugin hook
  handleHotUpdate.ts            ← Plugin hook
  watchPaths.ts                 ← Plugin hook
  layout.ts                     ← ctx.fns.site_core.layout(ctx, { title, content, … })
  renderCanonical.ts            ← dispatches per-resourceType $section_* renderers
  $section_description.ts       ← one Content-page section
  $type_RenderCtx.ts            ← type-only, scanner hoists to `types.site_core.RenderCtx`
  …
src/site/                       ← the plugin entry: site.ts + loadAll.ts + gentypes.sh
```

| Prefix              | Role                                                            |
|---------------------|-----------------------------------------------------------------|
| `enable.ts`         | Plugin activation; writes opts to `ctx.state.<ns>`              |
| `loadFns.ts`        | Only file allowed to import siblings; builds `ctx.fns.<ns>`     |
| `$type_<Name>.ts`   | Type-only; hoisted into ambient `types.<ns>.<Name>`             |
| `$render_<RT>.ts`   | Per-resourceType renderer (site)                                |
| `$loader_<ext>.ts`  | Per-extension loader                                            |
| `$rule_<name>.ts`   | Per-lint-rule (validate)                                        |
| `$emit_<format>.ts` | Per-output-format emitter                                       |
| `*.test.ts`         | Test, `bun test`, skipped by the scanner                        |

Regenerate the ambient `ctx_ns.d.ts` after adding or removing files:

```sh
bash src/site/gentypes.sh        # regenerates all seven site_* namespaces

# …or one namespace directly (e.g. the menu plugin):
bun src/bin/gentypes.ts src/menu \
  --ns menu \
  --external 'fcc:fcc:Bundle,Resource,ResolvedConfig,Target,Plugin,PluginContext,HotUpdateContext'
```

See [`CLAUDE.md`](./CLAUDE.md) for the rules in full.

## Status / roadmap

- [x] Core runner with phased lifecycle
- [x] TS / FSH / JSON authoring loaders
- [x] FHIR NPM tarball emitter
- [x] Multi-target builds with `when()` preprocessing
- [x] Watch mode with incremental rebuilds (file→resources source map + reverse-deps closure)
- [x] **REPL over `fcc dev`** (`POST /repl`) + `cdp.*` helpers in scope
- [x] **fn-per-file / `ctx.fns` plugin convention** (rolled out in `fcc/site`)
- [x] **`fcc-gentypes`** — auto-generated ambient `Context`, `FnsRegistry`, `types.*`
- [x] Per-resource intro/notes MD support (`input/intro-notes/<RT>-<id>-{intro,notes}.md`)
- [x] IG-Publisher-resembling HTML site (Tailwind CDN, numbered sections, tabs, tree-icons, Flags column)
- [x] HL7/US-Core as a submodule example, structural match with IG Publisher
- [ ] Snapshot generation (currently differential only; can shell out to `validator.jar`)
- [ ] Strict validation against core spec
- [ ] `fcc/include` for Liquid-ish `{% include x.html foo="bar" %}` in pagecontent
- [ ] Backport remaining plugins (snapshot / narrative / validate / ig-resource / npm) to flat-ns
- [ ] Codegen plugins: TS types, OpenAPI, JSON Schema
- [ ] Cross-IG canonical resolution (smart-app-launch, sdc, …)
- [ ] Theme system for the HTML site

## License

MIT.
