# fcc — FHIR Conformance Compiler

A TypeScript build system for FHIR Implementation Guides, modelled on
Vite + Astro + TypeSpec. Small core, every interesting step is a plugin,
everything is configured in TypeScript.

> Status: design draft. Sections marked `OPEN:` need a decision before
> implementation.

---

## 1. Why

The current FHIR IG toolchain has two pieces and neither composes:

- **HL7 IG Publisher** (`publisher.jar`) — does everything (snapshot,
  validation, narrative, HTML site, tarball). Java, monolithic, slow,
  not extensible at the code level.
- **SUSHI** — TypeScript, compiles FSH into resource JSON, then hands
  off to IG Publisher. Stops at "produce JSON".

There is no plugin system in either. You can't drop in a custom validator,
a Mermaid diagram on profile pages, a TypeScript codegen pass, or an
org-internal naming policy without forking.

**Goal:** build the IG toolchain the way Vite builds the JS toolchain.
A tiny core, a stable plugin API, and an ecosystem of plugins for
everything else: snapshot, narrative, validate, FSH, codegen, site,
diagrams, registry push, dev preview.

---

## 2. Non-goals (v0)

- Rewriting the IG Publisher's HTML renderer. v0 ships a basic site
  plugin; for full HL7-grade output, delegate to `publisher.jar` via
  `@fcc/plugin-publisher`.
- Replacing FSH. `@fcc/plugin-fsh` wraps `fsh-sushi` in-process.
- Inventing a new authoring DSL. The first-class authoring path is
  **TypeScript**; FSH / JSON / YAML are interoperable sources.
- Full feature parity with IG Publisher on day one.

---

## 3. Inspirations

| Source        | What we borrow                                                       |
| ------------- | -------------------------------------------------------------------- |
| **Vite**      | `defineConfig`, plugin-object shape, hook ordering with `enforce`, dev server with HMR |
| **Rollup**    | `resolveId` / `load` / `transform` semantics; `this.emitFile`        |
| **Astro**     | Typed content collections with schemas; integrations API             |
| **Nuxt**      | Module-level configurability — a plugin can change config, register routes, add commands |
| **TypeSpec**  | Spec-compiler-as-toolkit; emitter plugins for multiple output formats |
| **Gatsby**    | Source / Transformer / Emit plugin roles                             |
| **Nix**       | Content-addressable derivations for cache and incrementality         |
| **Hugo / 11ty** | Layouts, partials, shortcodes, dependency-aware site rebuilds      |

What we **do not** borrow:

- Boot-style middleware composition (`(next) => (fs) => next(fs')`).
  Rejected: an IG is a graph of canonical resources, not a stream of
  files; the graph needs to be a first-class model, not something each
  task rebuilds.
- A GraphQL data layer (Gatsby). Too heavy for our case; a typed
  query API on the resource graph is enough.

---

## 4. Concepts

### 4.1 Resource

The atomic unit of work. Every FHIR artefact in the build is a `Resource`.

```ts
type Resource = {
  id: string;                  // stable internal id, usually `${resourceType}/${logicalId}`
  resourceType: string;        // "StructureDefinition" | "ValueSet" | ...
  url?: string;                // canonical URL — primary cross-ref identity
  version?: string;
  data: unknown;               // parsed FHIR JSON
  source: SourceRef;           // where it came from
  deps: Set<string>;           // canonical URLs this resource referenced
  meta: Record<string, unknown>; // open bag for plugin annotations
};

type SourceRef =
  | { kind: "ts";       path: string }
  | { kind: "fsh";      path: string; symbol: string }
  | { kind: "json";     path: string }
  | { kind: "yaml";     path: string }
  | { kind: "package";  pkg: string; version: string; path: string }
  | { kind: "virtual";  producer: string };  // synthesized by a plugin
```

`id` is for internal addressing; `url` is for cross-resource references
(FHIR's actual identity).

### 4.2 Content Collection

Resources are grouped into typed collections per `resourceType`. A
collection exposes a typed query API to plugins.

```ts
type Collection<T extends FhirResourceType> = {
  type: T;
  all(): TypeOf<T>[];
  byCanonical(url: string): TypeOf<T> | undefined;
  byId(id: string): TypeOf<T> | undefined;
  filter(pred: (r: TypeOf<T>) => boolean): TypeOf<T>[];
  references(opts: { to?: string; from?: string }): Edge[];
};
```

In practice:

```ts
ctx.collections.StructureDefinition.filter(p => p.kind === "resource")
ctx.collections.ValueSet.byCanonical("http://hl7.org/fhir/ValueSet/...")
```

Types of `data` follow the FHIR version of the active target. v0 ships
generated R4 / R4B / R5 / R6 types.

### 4.3 Resource graph

Edges that the core tracks first-class — every plugin sees them and they
drive cache invalidation:

| Edge                                         | Source                                       |
| -------------------------------------------- | -------------------------------------------- |
| `Resource → canonical URL`                   | any field of FHIR type `Reference` / `canonical` |
| `Resource → profile`                         | `Resource.meta.profile[]`                    |
| `ElementDefinition.binding → ValueSet`       | profile binding                              |
| `ValueSet.compose.include.system → CodeSystem` | terminology composition                    |
| `Package → Package`                          | `package.json.dependencies`                  |

These five give us correct dev-mode dirty-tracking without per-plugin
work.

### 4.4 Bundle

The build output model. Plugins see it during `generateBundle` /
`writeBundle`.

```ts
type Bundle = {
  collections: { [T in FhirResourceType]: Collection<T> };
  ig: Resource;                     // synthesized ImplementationGuide
  packageJson: FhirPackageJson;
  graph: ResourceGraph;             // edges from §4.3
  diagnostics: Diagnostic[];
  emitted: EmittedFile[];           // tarballs, html, codegen output, ...
};
```

### 4.5 Target

A single build can produce N artefacts from one source by parameterising
on FHIR version and arbitrary feature flags.

```ts
type Target = {
  name: string;
  fhir: string;                     // "4.0.1" | "4.3.0" | "5.0.0" | "6.0.0"
  out: string;                      // output dir relative to project
  flags?: Record<string, boolean | string>;
};
```

Conditionals on a target are written in plain TS (`when(fhir.gte("5.0"),
...)`), see §6.

### 4.6 Plugin

The single unit of extension. Shape borrowed from Vite/Rollup, extended
with FHIR-specific hooks.

```ts
type Plugin = {
  name: string;                     // namespaced: "fcc/snapshot", "you/mermaid"
  enforce?: "pre" | "post";
  apply?: "build" | "dev" | ((cfg, env) => boolean);

  // --- lifecycle ---
  configResolved?(cfg: ResolvedConfig): void | Promise<void>;
  buildStart?(ctx: BuildContext): void | Promise<void>;
  buildEnd?(err?: Error): void | Promise<void>;
  closeBundle?(): void | Promise<void>;

  // --- resolution / loading ---
  resolveCanonical?(url: string, importer?: string): string | null | Promise<string | null>;
  load?(id: string): LoadResult | null | Promise<LoadResult | null>;

  // --- transformation pipeline (phased, not free-form) ---
  preprocess?(r: Resource, ctx: PluginContext): Resource | null | Promise<Resource | null>;
  transform?(r: Resource, ctx: PluginContext): Resource | null | Promise<Resource | null>;
  beforeSnapshot?(r: Resource, ctx: PluginContext): void | Promise<void>;
  afterSnapshot?(r: Resource, ctx: PluginContext): void | Promise<void>;
  beforeValidate?(ctx: PluginContext): void | Promise<void>;
  afterValidate?(ctx: PluginContext): void | Promise<void>;
  expandValueSet?(vs: Resource, ctx: PluginContext): Expansion | null | Promise<Expansion | null>;

  // --- emit ---
  generateBundle?(bundle: Bundle, ctx: PluginContext): void | Promise<void>;
  writeBundle?(bundle: Bundle, ctx: PluginContext): void | Promise<void>;

  // --- dev ---
  configureServer?(server: DevServer): void | Promise<void>;
  handleHotUpdate?(ctx: HotUpdateContext): Resource[] | void | Promise<Resource[] | void>;

  // --- site contributions ---
  site?: SiteContribution;          // §10

  // --- CLI extension ---
  command?: { name: string; describe: string; run: (argv) => Promise<number> }[];
};
```

**Hook ordering.** For a given hook: `enforce: "pre"` → unmarked →
`enforce: "post"`; within a bucket, declaration order in the config.
For `resolveCanonical` and `load`, first non-null wins. For all `transform`-family
hooks, every plugin runs in order. Lifecycle hooks fan out to all
plugins.

### 4.7 Plugin context

Inside any hook, the second argument exposes the build API:

```ts
interface PluginContext {
  // graph / collections
  collections: TypedCollections;
  graph: ResourceGraph;
  query<T extends FhirResourceType>(type: T, where?: object): TypeOf<T>[];
  references(opts: { to?: string; from?: string }): Edge[];

  // emit
  emitResource(r: Omit<Resource, "id" | "deps"> & { id?: string }): string;
  emitFile(f: EmittedFile): void;
  patch(id: string, patcher: (r: Resource) => Resource): void;

  // resolution
  resolveCanonical(url: string): Promise<Resource | null>;
  resolvePackage(spec: string): Promise<Package>;

  // diagnostics
  warn(d: string | Diagnostic): void;
  error(d: string | Diagnostic): never;

  // cache, namespaced per plugin
  cache: PluginCache;

  // target awareness
  target: Target;
  fhir: FhirVersionPredicates;        // .eq, .gte, .lt, .range
}
```

### 4.8 Plugin roles (convention, not enforcement)

A plugin can implement any subset of hooks, but conventionally falls
into one of five roles:

| Role        | Implements                                                | Examples                                |
| ----------- | --------------------------------------------------------- | --------------------------------------- |
| **Source**  | `load`, `resolveCanonical`                                | `plugin-fsh`, `plugin-ts`, `plugin-package` |
| **Transform** | `preprocess`, `transform`, `before/afterSnapshot`        | `plugin-preprocess`, `plugin-snapshot`, `plugin-narrative` |
| **Validate** | `beforeValidate`, `afterValidate`                        | `plugin-validate`, `plugin-ms-coverage`, `plugin-tx-bind` |
| **Site**    | `site.*`                                                  | `plugin-site`, `plugin-mermaid`, `plugin-theme-hl7` |
| **Emit**    | `generateBundle`, `writeBundle`                           | `plugin-npm`, `plugin-oci`, `plugin-openapi`, `plugin-typegen` |

---

## 5. Configuration

Everything in TypeScript. No YAML for fcc itself. `sushi-config.yaml`
*is* read — but only as a compatibility format for existing IGs.

```ts
// fcc.config.ts
import { defineConfig } from "fcc";
import ts        from "@fcc/plugin-ts";
import fsh       from "@fcc/plugin-fsh";
import snapshot  from "@fcc/plugin-snapshot";
import narrative from "@fcc/plugin-narrative";
import validate  from "@fcc/plugin-validate";
import site      from "@fcc/plugin-site";
import npm       from "@fcc/plugin-npm";

export default defineConfig({
  // identity
  id:        "my.org.fhir.demo",
  canonical: "https://my.org/fhir/demo",
  version:   "0.1.0",

  // targets — one source, N artefacts
  targets: [
    { name: "r4", fhir: "4.0.1", out: "dist/r4" },
    { name: "r5", fhir: "5.0.0", out: "dist/r5" },
  ],

  // dependencies on other IGs / core
  deps: {
    "hl7.fhir.us.core":  "7.0.0",
    "hl7.terminology":   "5.5.0",
  },

  registries: ["https://packages.fhir.org"],

  // input sources
  sources: [
    { dir: "input/profiles",   loader: ts()   },
    { dir: "input/valuesets",  loader: ts()   },
    { dir: "input/examples",   loader: ts()   },
    { dir: "input/fsh",        loader: fsh()  },
    { dir: "input/resources",  loader: "json" },
    { dir: "input/resources",  loader: "yaml" },
  ],

  // terminology service
  terminology: {
    server:  "https://tx.fhir.org/r4",
    cache:   ".fcc/tx-cache",
    offline: false,
  },

  // pipeline
  plugins: [
    snapshot(),
    narrative(),
    validate({ profiles: "strict" }),
    site({ theme: "@fcc/theme-hl7" }),
    npm(),
  ],
});
```

---

## 6. Sources & preprocessing

Authoring path is TypeScript first; FSH / JSON / YAML are interoperable.

### 6.1 TypeScript

```ts
import { profile, ms, ext, when } from "fcc";

export default profile("us-core-patient", ({ Patient, fhir }) => ({
  parent: Patient,
  title:  "US Core Patient",
  diff: {
    identifier:        ms({ min: 1 }),
    "identifier.system": ms({ min: 1, max: 1 }),
    name:              ms({ min: 1 }),
    ...when(fhir.gte("5.0"), { "contact.relationship": ms() }),
    ...when(fhir.lt("5.0"),  { "contact.gender":       ms() }),
    extension: [
      ext("race",      "...us-core-race",      { ms: true }),
      ext("ethnicity", "...us-core-ethnicity", { ms: true }),
    ],
  },
  mustSupport: ["identifier", "name", "gender", "birthDate"],
}));
```

Cross-resource references are plain `import`:

```ts
import patient from "../profiles/us-core-patient";

export default capability("us-core-server", {
  rest: [{ resource: [{ type: "Patient", supportedProfile: [patient] }] }],
});
```

The graph edge is recorded automatically because `supportedProfile`
takes the imported object and fcc reads its `url` at build time. Typos
become compile errors.

### 6.2 FSH (compatibility)

`@fcc/plugin-fsh` calls `fsh-sushi` in-process. Same `.fsh` files,
same semantics. Output flows into the same resource graph as TS sources.

Conditional compilation by FHIR version uses textual pragmas:

```fsh
Profile: USCorePatient
Parent:  Patient
* identifier 1..* MS
// @fcc-if fhir >= 5.0
* contact.relationship MS
// @fcc-else
* contact.gender MS
// @fcc-end
```

### 6.3 JSON / YAML

Built into the core loader. Conditionals use a `$if` node:

```yaml
resourceType: StructureDefinition
id: us-core-patient
differential:
  element:
    - { path: Patient.identifier, min: 1, mustSupport: true }
    - $if: { fhir: ">=5.0" }
      path: Patient.contact.relationship
      mustSupport: true
```

### 6.4 Patching external resources

```ts
import { patch, ms, when } from "fcc";

patch("hl7.fhir.us.core@7/StructureDefinition/us-core-patient", (p, { fhir }) => {
  when(fhir.gte("5.0"), p.add("contact.relationship", ms()));
});
```

A patch is a synthesised resource with a `patch` edge pointing at the
target; it runs as part of the `transform` phase.

### 6.5 Preprocess pass

All conditional constructs (`when()`, `@fcc-if`, `$if`) are expanded by
`plugin-preprocess` **per target**, before snapshot. After this pass the
resource is plain FHIR JSON with no conditionals.

---

## 7. Build pipeline

```
                  configResolved
                       │
                   buildStart
                       │
        ┌──────────────┴──────────────┐
        │  Resolution                  │
        │   scan sources → ids         │
        │   resolveCanonical → load    │
        │   parse                      │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  Preprocess (per target)     │
        │   expand when/$if/@fcc-if    │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  Transform (all plugins)     │
        │   snapshot, narrative, ...   │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  Validate                    │
        │   resource conformance       │
        │   binding / tx coverage      │
        │   ms coverage                │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  generateBundle              │
        │   IG resource, indexes,      │
        │   tarball spec, site jobs    │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  writeBundle                 │
        │   actually write to disk     │
        └──────────────┬──────────────┘
                       │
                   closeBundle
```

The whole pipeline runs once per target. Targets are independent and can
be built in parallel; their cache namespaces are keyed by target name.

---

## 8. Dev mode

`fcc dev` adds:

- File watcher over `sources[]` (TS, FSH, JSON, YAML, markdown).
- For every change, fcc consults the resource graph (§4.3) and re-runs
  only the affected resources: the changed one plus its reverse
  closure across the five edges.
- `handleHotUpdate` lets plugins extend or narrow the invalidation set.
- An optional HTTP API:
  - `GET /resource/:canonical` — current parsed JSON
  - `GET /bundle.json` — full current bundle
  - `GET /diagnostics` — live validation
  - `GET /graph` — resource graph as DOT / JSON
  - WebSocket: `resource:changed`, `diagnostics:updated`
- Optional HTML preview if `plugin-site` is loaded; reloads via WebSocket
  on resource change.

---

## 9. Cache & incrementality

Inspired by Nix derivations and Bazel's content-addressable cache.

- Every transform output is keyed by a hash of: plugin name + plugin
  version + input resource hash + transitive dependency hashes + target
  identity.
- Cache stored under `.fcc/cache/<plugin-namespace>/`.
- Plugins opt in via `ctx.cache.get(key) / set(key, value)`.
- Dirty-tracking: a resource declares its `deps` (canonical URLs touched
  during transform). The reverse graph drives:
  - dev-mode rebuilds,
  - cache-eviction during `fcc build`,
  - the "what changed since last release" diff report.

Layouts, partials and shortcodes participate in cache keys for site
output — changing a layout invalidates pages even when resources didn't.

---

## 10. Site rendering

Site is a first-class subsystem, not "yet another emit plugin". Inspired
by Hugo / 11ty / Docusaurus.

```ts
type SiteContribution = {
  layouts?: Record<string, LayoutFn>;             // named templates
  partials?: Record<string, PartialFn>;
  shortcodes?: Record<string, ShortcodeFn>;       // {{< name args >}} in markdown
  page?: (ctx: SiteContext) => Page[] | void;     // contribute pages
  resourceSection?: (ctx: ResSiteCtx) => Section | null;  // contribute to per-resource pages
  assets?: string[];                              // js/css to inject
  permalinks?: (r: Resource) => string;           // map canonical → URL
};
```

Default site plugin (`@fcc/plugin-site`) provides:

- a per-resource page for every conformance resource,
- `artifacts.html`, `qa.html`, `downloads.html`, `history.html`,
- markdown rendering for `pagecontent/*.md` with shortcodes,
- search index emission,
- multi-version output: `dist/site/<version>/...` + `dist/site/latest`.

For HL7-grade output, `@fcc/plugin-publisher` delegates the site to the
official `publisher.jar` — this lets users adopt fcc incrementally.

---

## 11. Multi-version publication

Some IGs publish multiple versions on one site (US Core 3.x through 7.x).

```ts
// fcc.versions.ts
import { defineMultiVersion } from "fcc";

export default defineMultiVersion({
  base: "./fcc.config.ts",
  versions: [
    { tag: "5.0.1", ref: "git:tag/v5.0.1" },
    { tag: "6.1.0", ref: "git:tag/v6.1.0" },
    { tag: "7.0.0", ref: "git:branch/main" },
  ],
  publish: {
    latest:    "7.0.0",
    historyAt: "/history.html",
  },
});
```

`fcc build --versions` builds every entry into `dist/v<tag>/`.

---

## 12. Artefact catalogue

Everything below is producible by a plugin. The core itself emits only
the resource graph and `package.tgz`; everything else is opt-in.

### 12.1 Conformance resources (source-of-truth)

`StructureDefinition`, `ValueSet`, `CodeSystem`, `ConceptMap`,
`NamingSystem`, `SearchParameter`, `OperationDefinition`,
`CapabilityStatement`, `CompartmentDefinition`, `MessageDefinition`,
`GraphDefinition`, `ImplementationGuide`, `Questionnaire`,
`PlanDefinition` / `ActivityDefinition`, `Library` (CQL/FHIRPath),
`TestScript` / `TestPlan`.

### 12.2 Derived

- `.snapshot` from differential
- `text.div` narrative
- `ValueSet.expansion` via terminology service
- ConceptMap closures
- Spec-diff between versions
- Aggregated `Bundle` of all resources
- Site search index
- CQL → ELM compiled JSON
- Compiled FHIRPath ASTs

### 12.3 Examples & test data

- Hand-written examples
- Synthesised examples (`plugin-example-gen`)
- Negative examples (`negative(profile, errorCode, data)`)
- Test bundles for `TestScript`

### 12.4 Site / human-readable

- HTML site (`index`, per-resource pages, listings, downloads)
- `qa.html` validation report
- `comparison.html` cross-version diff
- PDF / docx export
- `sitemap.xml`, OG tags

### 12.5 Distribution

- **FHIR NPM `package.tgz`** (primary)
- `package.examples.tgz`
- Per-FHIR-version variants (`package.r4.tgz`, `package.r5.tgz`)
- `definitions.json.zip` / `xml.zip`
- OCI artefact
- Single `Bundle.json`

### 12.6 Codegen

- JSON Schema
- OpenAPI / Swagger from CapabilityStatement
- TypeScript / Java / C# types per profile
- GraphQL schema
- SQL-on-FHIR view definitions
- Postman / Insomnia collections
- AsyncAPI for Subscriptions

### 12.7 Quality

- Validation report
- Must-Support coverage
- Terminology coverage (examples vs bound VS)
- Dependency audit
- Spec-diff report
- TestScript results

### 12.8 Metadata

- `package.json` (FHIR NPM)
- Provenance resource ("built by fcc 1.2.3 from commit abc on 2026-05-18")
- SBOM
- `history.html` / Atom feed
- `manifest.ttl` / JSON-LD

### 12.9 Publishing side-effects

- Submission to `registry.fhir.org`
- Mirror to Simplifier
- CDN invalidation
- HAPI starter container image preloaded with the IG

---

## 13. Plugin ecosystem (illustrative)

| Plugin                              | Role       | What it does                                  |
| ----------------------------------- | ---------- | --------------------------------------------- |
| `@fcc/plugin-ts`                    | Source     | TS profile / VS / example loaders             |
| `@fcc/plugin-fsh`                   | Source     | Wraps `fsh-sushi`                             |
| `@fcc/plugin-package`               | Source     | Resolves external FHIR NPM deps               |
| `@fcc/plugin-preprocess`            | Transform  | `when`, `@fcc-if`, `$if`                      |
| `@fcc/plugin-snapshot`              | Transform  | Differential → snapshot                       |
| `@fcc/plugin-narrative`             | Transform  | Auto-generated `text.div`                     |
| `@fcc/plugin-narrative-llm`         | Transform  | LLM-rendered narrative                        |
| `@fcc/plugin-ig-resource`           | Transform  | Synthesises ImplementationGuide               |
| `@fcc/plugin-validate`              | Validate   | Conformance validation (lite + jar/wasm)      |
| `@fcc/plugin-ms-coverage`           | Validate   | Must-Support coverage report                  |
| `@fcc/plugin-tx-bind`               | Validate   | Binding / terminology coverage                |
| `@fcc/plugin-naming-policy`         | Validate   | Org id / canonical conventions                |
| `@fcc/plugin-breaking-changes`      | Validate   | Diff vs previous release                      |
| `@fcc/plugin-example-gen`           | Transform  | Synthesises example resources                 |
| `@fcc/plugin-site`                  | Site       | Default HTML site                             |
| `@fcc/plugin-mermaid`               | Site       | Mermaid diagrams on resource pages            |
| `@fcc/plugin-plantuml`              | Site       | UML                                           |
| `@fcc/plugin-theme-hl7`             | Site       | HL7-style theme                               |
| `@fcc/plugin-publisher`             | Site/Emit  | Delegate site to `publisher.jar`              |
| `@fcc/plugin-npm`                   | Emit       | FHIR NPM tarball                              |
| `@fcc/plugin-oci`                   | Emit       | OCI artefact                                  |
| `@fcc/plugin-bundle`                | Emit       | Single Bundle.json                            |
| `@fcc/plugin-openapi`               | Emit       | OpenAPI codegen                               |
| `@fcc/plugin-typegen-ts`            | Emit       | TS types per profile                          |
| `@fcc/plugin-sql-on-fhir`           | Emit       | View definitions                              |
| `@fcc/plugin-registry-submit`       | Emit       | Push to packages.fhir.org / Simplifier        |
| `@fcc/plugin-provenance`            | Emit       | Provenance resource                           |
| `@fcc/plugin-lsp`                   | Dev        | LSP for TS profiles and FSH                   |

Plugins are plain TypeScript modules published as npm packages. There
is no registry, no manifest, no central catalogue. A consumer just
`import` and add to `plugins: [...]`.

---

## 14. CLI

```
fcc build              # full build, all targets
fcc build -t r5        # one target
fcc build --versions   # all entries from fcc.versions.ts
fcc dev   [-t name]    # watcher + dev API + optional site preview
fcc check              # build through validate, stop before emit
fcc pack               # emit npm tarball only
fcc info               # resolved config + active plugin chain
fcc graph              # print resource graph
fcc <plugin-cmd>       # subcommands contributed by plugins
```

Exit codes: 0 on no errors; non-zero if any plugin emitted a diagnostic
of severity `error`.

---

## 15. Mapping to the existing FHIR world

| Existing                       | fcc                                                                  |
| ------------------------------ | -------------------------------------------------------------------- |
| `sushi-config.yaml`            | Read as-is for compatibility; `fcc.config.ts` is canonical           |
| `.fsh` files                   | `@fcc/plugin-fsh` (in-process `fsh-sushi`)                           |
| IG Publisher (`publisher.jar`) | `@fcc/plugin-publisher` (optional, delegates HTML site)              |
| `validator.jar`                | `@fcc/plugin-validate` strict mode shells out to it; lite mode in TS |
| `tx.fhir.org`                  | First-class via `terminology.server` config                          |
| `packages.fhir.org`            | First-class as a registry                                            |
| Forge / Trifolia / Simplifier  | Import plugins (future)                                              |

An IG that today builds with SUSHI + IG Publisher can migrate by:

1. Add `fcc.config.ts` next to `sushi-config.yaml`.
2. Add `@fcc/plugin-fsh` + `@fcc/plugin-publisher` to plugins list.
3. `fcc build` — same outputs as before.
4. Incrementally rewrite profiles to TS, swap `plugin-publisher` for
   `plugin-site` when ready.

---

## 16. Extension surface (stability contract)

The following are part of the public, semver-stable API:

- `defineConfig`, `defineMultiVersion`
- `Plugin`, `PluginContext`, `Resource`, `Collection`, `Bundle`, `Target`,
  `Diagnostic`
- All hook signatures listed in §4.6
- `profile`, `valueSet`, `codeSystem`, `capability`, `example`,
  `negative`, `patch`, `when`, `ms`, `ext`, `slice`, `include`
- `SiteContribution`

Anything else (internal scheduler, cache layout, loader internals) is
not stable and plugins must not depend on it.

---

## 17. Open questions

- **OPEN: Snapshot generation.** Reuse an existing JS implementation
  (quality?), shell out to `validator.jar -snapshot`, or implement
  natively? v0 likely shells out, but native is the long-term goal.
- **OPEN: Validation strategy.** Ship a TS lite validator for dev and
  shell out to `validator.jar` for strict — vs. vendoring a JS-native
  full validator (substantial undertaking).
- **OPEN: SUSHI integration depth.** Does `fsh-sushi` expose a stable
  compiler API, or do we have to pin internals?
- **OPEN: Terminology offline mode.** Should we ship a default seed
  set of common expansions, or require explicit configuration?
- **OPEN: Project layout.** Match SUSHI's `input/fsh/`, `input/resources/`,
  `input/pagecontent/` exactly, or define our own with a migration?
- **OPEN: Plugin versioning.** A plugin author bumps major; how do
  consumers see and pin? Lockfile + plugin compat check on `fcc info`.
- **OPEN: Cross-target sharing.** If two targets produce identical
  output for a resource (no `when` branches), do we dedupe in cache?

---

## 18. v0 milestones

1. **Core.** `defineConfig`, resource graph, content collections, plugin
   host with the hooks from §4.6, `PluginContext`, target loop.
2. **Built-in loaders.** JSON + YAML + TS authoring helpers (`profile`,
   `valueSet`, `codeSystem`, `example`, `capability`, `when`, `ms`,
   `ext`).
3. **First emit chain.** `plugin-ig-resource` + `plugin-npm` → produce a
   valid FHIR NPM `package.tgz` from a directory of TS / JSON / YAML
   resources. No FSH, no validation, no site yet.
4. **Quality.** `plugin-narrative` (stub) + `plugin-validate` (lite).
5. **Authoring compatibility.** `plugin-fsh`, `plugin-package` (external
   FHIR NPM deps).
6. **Dev loop.** `fcc dev`, watcher, HTTP API.
7. **Site.** `plugin-site` v0 (basic HTML), `plugin-publisher` (delegate
   to jar).
8. **Snapshot.** `plugin-snapshot` (shell-out, then native).
9. **Codegen pilots.** `plugin-typegen-ts`, `plugin-openapi`.
