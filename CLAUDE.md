---
description: fcc — FHIR Conformance Compiler. Bun + procedural fn-per-file plugins with hot-reloadable ctx.fns. Inspired by workspaces-template.
alwaysApply: true
---

# fcc — codebase conventions

Procedural TypeScript on Bun. Code is organized as flat namespaces of single-purpose functions, hot-reloadable through a per-build `ctx`. There is a live REPL over the dev server for inspecting and driving builds.

## Architecture in one breath

Full write-up in [`docs/architecture.md`](docs/architecture.md). Four ideas, four
extension points — keep changes within this grain:

- **One graph.** Sources → resources in a `BuildState` that survives rebuilds;
  canonical refs form a dependency graph. A changed file invalidates its
  transitive closure → only that re-runs. One incrementality algorithm.
- **One renderer, two deliveries.** A single route table (`site_core/buildRoutes`)
  renders any page; `fcc build` precomputes to `dist/`, `fcc dev` renders on
  demand from memory + SSE live-reload. No dev/prod drift.
- **Plugins meet at the graph, never each other.** A plugin = lifecycle hooks;
  they communicate via the resource graph + `ctx.shared.<ns>` handoffs
  (menu→site, validator→site), never by importing one another.
- **Composition over configuration.** Many-variant concerns are a *list you
  compose*, not flags — e.g. `validator({ validators: [structural(), schema(),
  fhirpathConstraints()] })`; each validator is `(ctx) => issues`.

Extend by adding: a **Loader** (`{extensions, load, invalidate?}`, new file type),
a **Plugin** (lifecycle hooks), a **Validator** (`(ctx) => issues`, into
`validator({ validators })`), or a **renderer namespace / `$`-dispatch file**
(`src/site_*`).

## Where the code lives

Everything is **one package** (`name: "fcc"`) under a single flat `/src/`.
There is no `packages/` monorepo. Each top-level folder under `/src/` is a
namespace; `package.json` `exports` + a tsconfig `paths` alias expose them:
`fcc` → `/src/engine`, `fcc/<plugin>` → `/src/<plugin>/index.ts`.

- **`/src/engine`** — the core engine, imported everywhere as `fcc` (CLI runner,
  loader, watcher, define, authoring, state, version, repl, types).
- **`/src/bin`** — CLI entry scripts (`fcc.ts`, `repl.ts`, `gentypes.ts`),
  exposed as the `fcc` / `fcc-repl` / `fcc-gentypes` bins.
- **`/src/cdp`** — CDP browser-control helpers (REPL `cdp.*`).
- **`/src/<plugin>`** — each non-site plugin, one folder, imported as
  `fcc/<plugin>`: `json` `fsh` `ts` `snapshot` `narrative` `validate`
  `ig-resource` `npm` `menu`. Most are a single `index.ts`; `menu` is a flat
  fn-per-file namespace (`ctx.fns.menu`).
- **`/src/site` + `/src/site_*`** — the IG-site renderer (`fcc/site`). The entry
  (`site/index.ts` + `site/loadAll.ts` + `site/gentypes.sh`) assembles seven
  flat fn-per-file namespaces, each its own top-level folder with a `site_`
  prefix: `site_core` (chrome, layout, dispatch, tab/section registries, hooks,
  utils), `site_md` (markdown pipeline + pluggable blocks + Shiki),
  `site_profile` (StructureDefinition sections + element tables),
  `site_terminology` (ValueSet/CodeSystem), `site_capability`
  (CapabilityStatement/SearchParameter), `site_narrative` (generated
  narratives), `site_artifacts` (index/artifacts/landing pages). Each namespace
  has its own `loadFns.ts` + `ctx_ns.d.ts`. **A future renderer namespace = a
  new `/src/site_<name>/` folder + its `loadFns` + one line in `site/loadAll.ts`
  + one line in `site/gentypes.sh`.**

## Hard rules

- **No project imports.** Files inside a namespace MUST NOT `import` *any other
  project file*. Cross-file calls go through `ctx.fns.<ns>.<fn>(ctx, opts)` —
  including across namespaces (e.g. a `site_profile` fn calls
  `ctx.fns.site_core.htmlEscape(ctx, …)` or `ctx.fns.site_md.mdInline(ctx, …)`).
  Cross-file types go through `types.<ns>.<Name>`. The single exception is
  `loadFns.ts`, whose *only* job is to import every sibling default-export and
  assemble `ctx.fns.<ns>`. Everywhere else, `import` is only allowed for external
  libraries (`shiki`, `node:fs/promises`, `fcc`, etc.).

- **String-keyed dispatch crosses namespaces via `ctx.fns.site_core.resolveFn`.**
  Registries that reference a fn by bare name (tab `render`/`avail`, section ids
  → `$section_<id>`, block `render`) resolve it across all loaded namespaces
  with `resolveFn({ key })` — fn names are globally unique, so it's
  deterministic. Don't hardcode the namespace for a registry key.

- **One fn per file.** Every reusable function lives in its own file.
  File-local helpers (used inside one parent only) may stay nested,
  nothing else. Filename = exported fn name. The file always
  `export default`s the fn.

- **Fn signature.** `(ctx: Context, opts: SomeOpts) => Result`. Even
  trivial helpers (`htmlEscape({ s })`) take `(ctx, opts)`. Opts is
  always an object. Async only where there's real IO; the rest stay
  sync.

- **Types live in `$type_*.ts` files.** Each `$type_<Name>.ts` exports
  a single named type. They are hoisted into the ambient
  `types.<ns>.*` registry via `ctx_ns.d.ts`. Consumers reference
  types as `types.<ns>.<Name>` — never `import type`.

- **Bun tooling only.** `bun`, `bun run`, `bun test`, `bunx`. No npm /
  pnpm / yarn / ts-node / vite / webpack.

- **No commits unless asked.**

## Filename conventions

Inside a plugin's `src/` directory:

| Pattern                | Role                                                                    |
|------------------------|-------------------------------------------------------------------------|
| `enable.ts`            | Plugin activation. Reads opts, writes them to `ctx.state.<ns>`.         |
| `loadFns.ts`           | Only file allowed to import siblings. Assembles `ctx.fns.<ns>`.         |
| `ctx_ns.d.ts`          | Ambient registry: `Context`, `FnsRegistry`, `types.*` namespaces.       |
| `<hookName>.ts`        | Auto-registered as that fcc lifecycle hook (e.g. `writeBundle.ts`).     |
| `$type_<Name>.ts`      | Type-only file. Scanner skips. Hoisted via `ctx_ns.d.ts`.               |
| `$section_<id>.ts`     | `fcc/site` one Content-page section. `(ctx,{resource}) → {title,id,html}\|null`. Ordered per resourceType by `sectionDefaults`/`sectionsFor`; rendered by `renderCanonical`. |
| `$tab_<id>.ts`         | `fcc/site` project escape-hatch tab renderer (referenced from a `tabDefaults` override). |
| `$block_<class>.ts`    | `fcc/site` custom kramdown-block renderer (referenced from `blockDefaults`/`site({blocks})`). |
| `$avail_<name>.ts`     | `fcc/site` tab/section availability predicate `(ctx,{resource}) → boolean`. |
| `$render_<RT>.ts`      | Generic per-resourceType renderer dispatch family (other plugins). `fcc/site` uses `renderCanonical` + `$section_` instead. |
| `$loader_<ext>.ts`     | the loader plugins (`json`/`fsh`/`ts`) per-extension loader.                                   |
| `$rule_<name>.ts`      | (legacy) per-lint-rule file. `fcc/validator` now composes plain `Validator` (`(ctx) => issues`) functions — `structural()` / `schema()` / `fhirpathConstraints()` — passed via `validator({ validators: [...] })`. |
| `$narrative_<RT>.ts`   | `fcc/narrative` per-resourceType narrative generator.                  |
| `$ext_<slug>.ts`       | Handler for one specific FHIR extension URL.                            |
| `$emit_<format>.ts`    | One output-format emitter (`$emit_npm.ts`, `$emit_xml.ts`).             |
| `$page_<slug>.ts`      | `fcc/site` code-defined site page.                                     |
| `$cmd_<name>.ts`       | Contributes a `fcc <name>` CLI subcommand.                              |
| `$watch_<glob>.ts`     | Declarative watch pattern.                                              |
| `$asset_<glob>.ts`     | Static asset source declaration.                                        |
| `$resolve_<scheme>.ts` | Canonical URL resolver per scheme.                                      |
| `$codegen_<lang>.ts`   | Codegen for one language.                                               |
| `$snapshot_<strat>.ts` | Snapshot algorithm variant.                                             |
| `*_default.ts`         | Fallback for the matching `$role_*` dispatch table.                     |
| `*.test.ts`            | Test, `bun test`, skipped in build.                                     |
| bare `<name>.ts`       | Regular fn at `ctx.fns.<ns>.<name>`.                                    |

## File template

```ts
// src/site_profile/myHelper.ts  (a fn in the `site_profile` namespace)
// Cross-file types via `types.*`. Cross-file fns via `ctx.fns.<ns>.*`.
// No `import` from sibling files.

export default async function myHelper(ctx: Context, opts: { resource: types.fcc.Resource }): Promise<string> {
    const title = ctx.fns.site_core.titleOf(ctx, { resource: opts.resource });   // cross-ns
    const safe  = ctx.fns.site_core.htmlEscape(ctx, { s: title });
    return `<h1>${safe}</h1>`;
}
```

## Ambient registry (`ctx_ns.d.ts`)

The ambient declarations that make `Context`, `FnsRegistry`, and `types.*`
available everywhere without imports. One `ctx_ns.d.ts` per namespace folder;
they merge (interface/namespace declaration merging). **Auto-generated** — do
not hand-edit. After adding, renaming, or removing files, regenerate **every**
namespace:

```sh
bash src/site/gentypes.sh   # site_core (base) + the 6 --fragment site_* namespaces
```

`src/site/gentypes.sh` runs `site_core` as the **base** (declares `Context` +
the `fcc` external types once) and the rest with **`--fragment`** (each only
augments `FnsRegistry.<ns>` + `types.<ns>`). For a single-namespace plugin (e.g.
`menu`), call the tool directly:

```sh
bun src/bin/gentypes.ts <srcDir> --ns <name> \
  --external 'fcc:fcc:Bundle,Resource,ResolvedConfig,Target,Plugin,PluginContext,HotUpdateContext'
```

`--ns <name>` names the namespace under `ctx.fns.<name>` and `types.<name>`
(defaults to the parent dir's basename, minus a `plugin-` prefix).
`--fragment` skips the shared `Context` + external-types blocks (multi-namespace
trees declare those once, in the base namespace).

`--external <ns>:<pkg>:Type,Type,…` declares ambient types pulled from
an external npm package — typically `fcc` core types your plugin
references in signatures.

The generator scans every `*.ts` in the src dir and classifies:

| Filename                  | Result                                           |
|---------------------------|--------------------------------------------------|
| `$type_<Name>.ts`         | `types.<ns>.<Name>` ambient type                 |
| `index.ts`, `style.ts`, `render.ts`, `loadFns.ts`, `ctx_ns.d.ts` | skipped (framework / legacy) |
| `*.test.ts`, `*.d.ts`     | skipped                                          |
| everything else `*.ts`    | entry in `FnsRegistry.<ns>` keyed by basename    |

The generated file has the canonical shape:

```ts
declare global {
    type Context = {
        cfg:     types.fcc.ResolvedConfig;
        target:  types.fcc.Target;
        bundle:  types.fcc.Bundle;
        state:   Record<string, any>;
        env:     Record<string, string | undefined>;
        fns:     FnsRegistry;
    };
    interface FnsRegistry {
        site: {
            htmlEscape: typeof import("./htmlEscape").default;
            titleOf:    typeof import("./titleOf").default;
            // …
        };
    }
    namespace types {
        namespace fcc {
            type Resource = import("fcc").Resource;
            // …
        }
        namespace site {
            type RenderCtx = import("./$type_RenderCtx").RenderCtx;
            // …
        }
    }
}
export {};
```

## `loadFns.ts` — the assembler

Each namespace folder has exactly one `loadFns.ts` that imports every sibling
default-export and assembles `ctx.fns.<ns>`. This is the **only** file in the
namespace where cross-file imports are allowed (and it's auto-generated):

```ts
// src/core/loadFns.ts
import htmlEscape from "./htmlEscape.ts";
import titleOf from "./titleOf.ts";
import layout from "./layout.ts";
// … one import per fn file …

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).core = { htmlEscape, titleOf, layout, /* … */ };
}
```

`/src/loadAll.ts` calls every namespace's `loadFns(ctx)`; the plugin's
`/src/index.ts` (the Plugin object factory) calls `loadAll(ctx)` once at
construction, then delegates every hook to `ctx.fns.core.*`.

## `enable.ts` — the activation fn

Reads plugin opts and writes them to `ctx.state.<ns>` so other fns can
read defaults without a closure:

```ts
// src/site_core/enable.ts
export default function enable(ctx: Context, opts: types.site_core.SiteOpts = {}): void {
    ctx.state.site = {
        pagecontent: opts.pagecontent ?? "input/pagecontent",
        introNotes:  opts.introNotes  ?? "input/intro-notes",
        out:         opts.out         ?? "site",
    };
}
```

## Plugin code is NOT hot-reloaded

`fcc dev` watches **source files** (the IG's `input/**`, plus any paths
declared by plugins' `watchPaths()`). Edits there trigger incremental
rebuilds in ~100 ms. Edits to **plugin code itself** (anything under `src/**`)
require a manual `fcc dev` restart, because those modules are imported once at
startup.

A common workflow loop:

1. Edit a section/fn, e.g. `src/site_profile/$section_formalViews.ts`
2. If you added/removed/renamed a file: `bash src/site/gentypes.sh`
3. Kill + restart `fcc dev` (Ctrl+C, then re-run)
4. `cdp.reload({ session: "fcc" })` + `cdp.screenshot(...)` to verify

## REPL workflow

`fcc dev` exposes `POST /repl` on a free port, with `state`, `cfg`,
`T(name?)`, and `cdp.*` in eval scope. The port is written to
`<projectRoot>/.fcc/repl-port`. Iterate via:

```bash
bun src/bin/repl.ts 'state.cfg.id'
bun src/bin/repl.ts 'T().resources.size'
bun src/bin/repl.ts 'await cdp.navigate({ path: "/StructureDefinition-us-core-patient.html", session: "uscore" })'
bun src/bin/repl.ts 'await cdp.screenshot({ session: "uscore", path: "/tmp/x.png" })'
```

The REPL is the *first* place to test a change: navigate, screenshot,
read DOM, mutate state, re-render — all without restarting the build.

## CDP helpers

`src/cdp/` — flat-ns helpers wrapping the local CDP REST
server at `localhost:2229` (see `~/.claude/skills/cdp`). Available in
REPL scope as `cdp.*`:

```ts
cdp.send({ method, params, session?, cdpUrl? })
cdp.evaluate({ expression, session?, awaitPromise? })
cdp.navigate({ path | url, session?, port?, settleMs? })
cdp.reload({ session?, timeoutMs? })
cdp.screenshot({ path?, fullPage?, session? })
cdp.click({ selector, session? })
cdp.text({ selector, session? })
cdp.attr({ selector, name, session? })
cdp.pageState({ session? })
```

Default session = `process.env.CDP_SESSION ?? "fcc"`. Default URL =
`process.env.CDP_URL ?? "http://localhost:2229"`. Default static-site
port for `navigate({ path })` = `process.env.SITE_PORT ?? 4321`.

## fcc plugin lifecycle

Hooks (any plugin may implement zero or more):

```
buildStart  transform  beforeSnapshot  afterSnapshot
beforeValidate  afterValidate  generateBundle  writeBundle
handleHotUpdate  buildEnd  closeBundle  watchPaths
```

`watchPaths(cfg)` is dev-mode only — declares extra paths (files or
directories) the watcher should observe. Returns
`{ path: string; recursive?: boolean }[]`. Used for non-loader inputs
(markdown, includes, static assets).

## Bun primitives

- `bun <file>` instead of `node` / `ts-node`
- `bun test` instead of jest / vitest
- `bun install` instead of npm / yarn / pnpm
- `bunx` instead of `npx`
- `Bun.serve()` instead of express
- `bun:sqlite` instead of better-sqlite3
- `Bun.redis` instead of ioredis
- `Bun.sql` for Postgres
- `Bun.file` instead of `node:fs`'s read/write helpers
- `Bun.$\`cmd\`` instead of execa
- `.env` is auto-loaded; no dotenv

## What to inspect first

When asked to change anything visual: open the page in the CDP
session, screenshot before, make the change, re-render via fcc dev's
incremental rebuild, reload via `cdp.reload`, screenshot after.
Don't ship a render change without the before/after pair.

When asked to change a transform or validation: write the rule in
REPL first (one-shot eval against `T()`), confirm the right set of
resources is affected, *then* extract it to a `$rule_<name>.ts` file.
