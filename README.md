# fcc — FHIR Conformance Compiler

A TypeScript build system for FHIR Implementation Guides, in the spirit
of Vite. Small core, every interesting step is a plugin, dev mode does
**incremental** rebuilds, and the dev server has a live REPL for poking
at the build state from a shell or a browser.

> Status: **alpha, work in progress.** APIs will change. Useful for
> playing with the model and inspecting real IGs; not yet a drop-in
> replacement for IG Publisher.

See [`design.md`](./design.md) for the long-form architecture.

## Why

The current FHIR IG toolchain — IG Publisher (Java, monolithic) and
SUSHI (compiles FSH to JSON, then hands off) — doesn't compose. There's
no plugin model: you can't drop in a custom narrative renderer, a
typed-codegen pass, or an org-internal naming-policy linter without
forking.

`fcc` rebuilds that toolchain the way Vite rebuilt the JS toolchain:

- **Authoring in TypeScript** (or FSH, or JSON) — same resource graph.
- **Plugin-first** — snapshot, narrative, validate, NPM packaging,
  HTML site, codegen are all plugins of the same shape.
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
bun ../../packages/fcc/bin/fcc.ts info       # resolved config + plugin chain
bun ../../packages/fcc/bin/fcc.ts build      # full build for all targets
bun ../../packages/fcc/bin/fcc.ts dev        # watch mode + REPL
```

…or the realistic one against US Core (443 resources, R4):

```sh
cd examples/us-core
bun ../../packages/fcc/bin/fcc.ts build      # ~300 ms full build
bun ../../packages/fcc/bin/fcc.ts dev        # ~100 ms incremental
```

The us-core build produces 444 HTML pages under `dist/r4/site/` plus a
FHIR NPM `package.tgz`. Serve the site with a one-liner:

```sh
cd dist/r4/site
bun --bun -e 'Bun.serve({port: 4321, fetch: r => new Response(Bun.file("." + new URL(r.url).pathname.replace(/^\/$/, "/index.html")))})'
```

## What's in the box

| Package                       | Role                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `fcc`                         | Core: types, runner, watcher, **REPL**, CDP helpers, `fcc` + `fcc-repl` + `fcc-gentypes` CLIs |
| `@fcc/plugin-ts`              | `.ts` source loader (profile / valueSet / codeSystem / example / capability)      |
| `@fcc/plugin-fsh`             | `.fsh` source loader, wraps `fsh-sushi`                                           |
| `@fcc/plugin-json`            | `.json` source loader (drop-in for IG-Publisher-style `input/resources/*.json`)   |
| `@fcc/plugin-snapshot`        | Snapshot pass (v0: no-op + diagnostic)                                            |
| `@fcc/plugin-narrative`       | Auto-fills `Resource.text.div`                                                    |
| `@fcc/plugin-validate`        | Lite validation: resourceType / id / url / dupes / unresolved refs                |
| `@fcc/plugin-ig-resource`     | Synthesises the `ImplementationGuide` resource                                    |
| `@fcc/plugin-npm`             | FHIR NPM `package.tgz` emitter (pure-Bun USTAR + gzip)                            |
| `@fcc/plugin-site`            | Browsable HTML site, Tailwind-CDN, IG-Publisher-resembling layout — **refactored to flat fn-per-file with `ctx.fns` hot-reload** |

## Examples

| Example                       | What                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `examples/basic-ig`           | Hand-rolled mini IG. Two targets (R4 + R5), TS + FSH authoring, walks every plugin |
| `examples/us-core`            | Real HL7 US Core 9.0.0 via git submodule (`vendor/us-core`), JSON sources, 443 resources, structurally similar pages to the IG Publisher build |

## REPL workflow

`fcc dev` starts an HTTP REPL on a free port and writes the port to
`<projectRoot>/.fcc/repl-port`. Connect from any shell:

```sh
bun packages/fcc/bin/repl.ts 'state.cfg.id'
bun packages/fcc/bin/repl.ts 'T().resources.size'
bun packages/fcc/bin/repl.ts '(() => {
  const out = {};
  for (const r of T().resources.values()) out[r.resourceType] = (out[r.resourceType]||0) + 1;
  return out;
})()'
```

The eval scope has `state`, `cfg`, `T(name?)` (target shortcut), and
`cdp.*` (CDP helpers — navigate / screenshot / click / pageState / …).

```sh
# drive the rendered site from the REPL
bun packages/fcc/bin/repl.ts 'await cdp.navigate({ path: "/StructureDefinition-us-core-patient.html", session: "uscore" })'
bun packages/fcc/bin/repl.ts 'await cdp.screenshot({ session: "uscore", path: "/tmp/x.png" })'
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
2. **Plugins** are objects with hooks: `buildStart`, `transform`,
   `before/afterSnapshot`, `before/afterValidate`, `generateBundle`,
   `writeBundle`, `handleHotUpdate`, `watchPaths`.
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

New plugins (and the rewrite of `@fcc/site`) follow a strict procedural
style ported from [workspaces-template]. **Each file inside a plugin is
a single function**; everything else is reached through `ctx.fns.<ns>`
and `types.<ns>.*` — no project imports across files.

```
@fcc/site/src/
  enable.ts                     ← reads opts → ctx.state.site
  loadFns.ts                    ← ONLY file that imports siblings; builds ctx.fns.site
  ctx_ns.d.ts                   ← auto-gen ambient: Context, FnsRegistry, types.site.*
  writeBundle.ts                ← Plugin hook
  handleHotUpdate.ts            ← Plugin hook
  watchPaths.ts                 ← Plugin hook
  layout.ts                     ← ctx.fns.site.layout(ctx, { title, content, … })
  $render_StructureDefinition.ts  ← per-resourceType renderer dispatch
  $render_ValueSet.ts
  $render_CodeSystem.ts
  $render_default.ts
  $type_RenderCtx.ts            ← type-only, scanner hoists to `types.site.RenderCtx`
  …
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
bun packages/fcc/bin/gentypes.ts packages/plugin-site/src \
  --ns site \
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
- [x] **fn-per-file / `ctx.fns` plugin convention** (rolled out in `@fcc/site`)
- [x] **`fcc-gentypes`** — auto-generated ambient `Context`, `FnsRegistry`, `types.*`
- [x] Per-resource intro/notes MD support (`input/intro-notes/<RT>-<id>-{intro,notes}.md`)
- [x] IG-Publisher-resembling HTML site (Tailwind CDN, numbered sections, tabs, tree-icons, Flags column)
- [x] HL7/US-Core as a submodule example, structural match with IG Publisher
- [ ] Snapshot generation (currently differential only; can shell out to `validator.jar`)
- [ ] Strict validation against core spec
- [ ] `@fcc/plugin-include` for Liquid-ish `{% include x.html foo="bar" %}` in pagecontent
- [ ] Backport remaining plugins (snapshot / narrative / validate / ig-resource / npm) to flat-ns
- [ ] Codegen plugins: TS types, OpenAPI, JSON Schema
- [ ] Cross-IG canonical resolution (smart-app-launch, sdc, …)
- [ ] Theme system for the HTML site

## License

MIT.
