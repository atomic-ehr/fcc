# fcc — FHIR Conformance Compiler

A TypeScript build system for FHIR Implementation Guides, in the spirit
of Vite. Small core, every interesting step is a plugin, dev mode does
**incremental** rebuilds. See [`design.md`](./design.md) for the full
architecture.

> Status: **alpha, work in progress.** APIs will change. Useful for
> playing with the model; not yet a drop-in replacement for IG Publisher.

## Why

The current FHIR IG toolchain — IG Publisher (Java, monolithic) and
SUSHI (compiles FSH to JSON, then hands off) — doesn't compose. There's
no plugin model: you can't drop in a custom narrative renderer, a
typed-codegen pass, or an org-internal naming-policy linter without
forking.

`fcc` rebuilds that toolchain the way Vite rebuilt the JS toolchain:

- **Authoring in TypeScript** (or FSH, or JSON/YAML — same graph).
- **Plugin-first**: snapshot, narrative, validate, FSH, NPM packaging,
  HTML site, codegen — every step is a plugin.
- **Multi-target**: one source produces R4 / R4B / R5 artefacts from
  one `targets:` array; `when(fhir.gte("5.0"), …)` for differences.
- **Incremental dev mode**: file watch, source-map per loader,
  reverse-deps over canonical URLs — touching one file rebuilds only
  what depends on it (milliseconds, not seconds).

## Quick start

```sh
bun install
cd examples/basic-ig

bun ../../packages/fcc/bin/fcc.ts info       # resolved config + plugin chain
bun ../../packages/fcc/bin/fcc.ts build      # full build for all targets
bun ../../packages/fcc/bin/fcc.ts build -t r5
bun ../../packages/fcc/bin/fcc.ts dev        # watch mode, incremental
```

The example builds two NPM tarballs (`dist/r4/package.tgz`,
`dist/r5/package.tgz`) plus a browsable HTML site at
`dist/{r4,r5}/site/index.html`.

## What's in the box

| Package                       | Role                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| `fcc`                         | Core: types, runner, watcher, CLI, authoring helpers                 |
| `@fcc/plugin-ts`              | `.ts` source loader (profile / valueSet / codeSystem / example / capability) |
| `@fcc/plugin-fsh`             | `.fsh` source loader, wraps `fsh-sushi`                              |
| `@fcc/plugin-snapshot`        | Snapshot pass (v0: no-op + diagnostic)                               |
| `@fcc/plugin-narrative`       | Auto-fills `Resource.text.div`                                       |
| `@fcc/plugin-validate`        | Lite validation: resourceType / id / url / dupes / unresolved refs   |
| `@fcc/plugin-ig-resource`     | Synthesises the `ImplementationGuide` resource                       |
| `@fcc/plugin-npm`             | FHIR NPM `package.tgz` emitter (pure-Bun USTAR + gzip)               |
| `@fcc/plugin-site`            | Basic browsable HTML site (sidebar nav, per-resource pages, markdown landing) |

## Authoring example

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
    // FHIR-version-conditional fields:
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
   their loader (`ts()`, `fsh()`, built-in `json` / `yaml`). Each source
   produces `Resource`s.
2. **Plugins** are objects with hooks: `buildStart`, `transform`,
   `before/afterSnapshot`, `before/afterValidate`, `generateBundle`,
   `writeBundle`, `handleHotUpdate`, `configureServer`.
3. **Resource graph**: every cross-reference is by **canonical URL**.
   The core builds five edge types (canonical refs, `meta.profile`,
   binding → ValueSet, VS → CodeSystem, package deps) and uses them
   for cache invalidation and dev-mode rebuilds.
4. **Targets**: a single build can produce N artefacts from one source
   (per FHIR version, per feature-flag matrix).
5. **Incremental**: every loader records `file → resource ids`; every
   transform records `resource → canonical URLs it touched`. On file
   change, the reverse closure tells us exactly what to rebuild.

See [`design.md`](./design.md) for the full picture, the rationale, the
inspirations (Vite / Astro / Nuxt / TypeSpec / Gatsby / Nix), and the
open questions.

## Status / roadmap

- [x] Core runner with phased lifecycle
- [x] TS authoring helpers
- [x] FSH integration via `fsh-sushi`
- [x] FHIR NPM tarball emitter
- [x] Multi-target builds with `when()` preprocessing
- [x] Basic HTML site
- [x] **Watch mode with incremental rebuilds** (file→resources source map + reverse-deps closure)
- [ ] Snapshot generation (currently differential only; can shell out to `validator.jar`)
- [ ] Strict validation against core spec
- [ ] Cross-source canonical resolution between TS and FSH
- [ ] Codegen plugins: TS types, OpenAPI, JSON Schema
- [ ] Dev HTTP API + WebSocket reload
- [ ] Theme system for the HTML site

## License

MIT.
