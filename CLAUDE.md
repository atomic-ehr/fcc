---
description: fcc — FHIR Conformance Compiler. Bun + procedural fn-per-file plugins with hot-reloadable ctx.fns. Inspired by workspaces-template.
alwaysApply: true
---

# fcc — codebase conventions

Procedural TypeScript on Bun. Plugin packages are flat namespaces of single-purpose functions, hot-reloadable through a per-build `ctx`. There is a live REPL over the dev server for inspecting and driving builds.

## Hard rules

- **No project imports.** Files inside a plugin / namespace MUST NOT
  `import` *any other project file*. Cross-file calls go through
  `ctx.fns.<ns>.<fn>(ctx, opts)`. Cross-file types go through
  `types.<ns>.<Name>`. The single exception is `loadFns.ts`, whose
  *only* job is to import every sibling default-export and assemble
  `ctx.fns.<ns>`. Everywhere else, `import` is only allowed for
  external libraries (`marked`, `node:fs/promises`, `fcc`, etc.).

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
| `$render_<RT>.ts`      | `@fcc/site` per-resourceType renderer dispatch.                         |
| `$loader_<ext>.ts`     | `@fcc/loader-*` per-extension loader.                                   |
| `$rule_<name>.ts`      | `@fcc/validate` per-lint-rule (one rule = one file).                    |
| `$narrative_<RT>.ts`   | `@fcc/narrative` per-resourceType narrative generator.                  |
| `$ext_<slug>.ts`       | Handler for one specific FHIR extension URL.                            |
| `$emit_<format>.ts`    | One output-format emitter (`$emit_npm.ts`, `$emit_xml.ts`).             |
| `$page_<slug>.ts`      | `@fcc/site` code-defined site page.                                     |
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
// packages/plugin-site/src/myHelper.ts
// Cross-file types via `types.*`. Cross-file fns via `ctx.fns.site.*`.
// No `import` from sibling files.

export default async function myHelper(ctx: Context, opts: { resource: types.fcc.Resource }): Promise<string> {
    const title = ctx.fns.site.titleOf(ctx, { resource: opts.resource });
    const safe  = ctx.fns.site.htmlEscape(ctx, { s: title });
    return `<h1>${safe}</h1>`;
}
```

## Ambient registry (`ctx_ns.d.ts`)

The single ambient declaration that makes `Context`, `FnsRegistry`,
and `types.*` available everywhere without imports. **Auto-generated
by `fcc-gentypes`** — do not hand-edit. Run after adding, renaming, or
removing files:

```sh
bun packages/fcc/bin/gentypes.ts packages/plugin-site/src \
  --ns site \
  --external 'fcc:fcc:Bundle,Resource,ResolvedConfig,Target,Plugin,PluginContext,HotUpdateContext'
```

`--ns <name>` names the namespace under `ctx.fns.<name>` and
`types.<name>` (defaults to the parent dir's basename, stripped of any
`plugin-` prefix).

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

Each plugin needs exactly one `loadFns.ts` that imports every sibling
default-export and assembles `ctx.fns.<ns>`. This is the **only** file
inside the plugin where cross-file imports are allowed:

```ts
// packages/plugin-site/src/loadFns.ts
import htmlEscape from "./htmlEscape.ts";
import titleOf from "./titleOf.ts";
import layout from "./layout.ts";
// … one import per fn file …

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).site = {
        htmlEscape, titleOf, layout, /* … */
    };
}
```

The plugin's `index.ts` (the Plugin object factory) calls `loadFns(ctx)`
once at construction, then delegates every hook to `ctx.fns.<ns>.*`.

## `enable.ts` — the activation fn

Reads plugin opts and writes them to `ctx.state.<ns>` so other fns can
read defaults without a closure:

```ts
// packages/plugin-site/src/enable.ts
export default function enable(ctx: Context, opts: types.site.SiteOpts = {}): void {
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
rebuilds in ~100 ms. Edits to **plugin code itself** (`packages/plugin-site/src/*.ts`,
`packages/fcc/src/*.ts`) require a manual `fcc dev` restart, because
those modules are imported once at startup.

A common workflow loop:

1. Edit `packages/plugin-site/src/$render_StructureDefinition.ts`
2. Kill + restart `fcc dev` (Ctrl+C, then re-run)
3. `cdp.reload({ session: "uscore" })` from the REPL
4. `cdp.screenshot(...)` to verify

## REPL workflow

`fcc dev` exposes `POST /repl` on a free port, with `state`, `cfg`,
`T(name?)`, and `cdp.*` in eval scope. The port is written to
`<projectRoot>/.fcc/repl-port`. Iterate via:

```bash
bun packages/fcc/bin/repl.ts 'state.cfg.id'
bun packages/fcc/bin/repl.ts 'T().resources.size'
bun packages/fcc/bin/repl.ts 'await cdp.navigate({ path: "/StructureDefinition-us-core-patient.html", session: "uscore" })'
bun packages/fcc/bin/repl.ts 'await cdp.screenshot({ session: "uscore", path: "/tmp/x.png" })'
```

The REPL is the *first* place to test a change: navigate, screenshot,
read DOM, mutate state, re-render — all without restarting the build.

## CDP helpers

`packages/fcc/src/cdp/` — flat-ns helpers wrapping the local CDP REST
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
