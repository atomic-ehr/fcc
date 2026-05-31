# The `Page` resource

> **Status: design / target.** This describes a `Page` model we are refactoring
> *toward* — not yet implemented. Today only markdown pagecontent becomes `Page`
> resources; conformance pages (StructureDefinition, ValueSet, …) are routes
> computed directly in [`site_core/buildRoutes`](../src/site_core/buildRoutes.ts).
> See [`architecture.md`](architecture.md) for the engine model.

## Why

There are two notions of "page" today, asymmetrically:

- **markdown pages** are real `Page` resources in the graph (from the `pages()`
  loader) — so they get provenance and incremental rebuilds;
- **conformance pages** (a StructureDefinition's page, a ValueSet's page, …) are
  *not* resources — `buildRoutes` iterates `pctx.resources` and renders each one
  on the fly, with the page existing only as a `Route { id, contentType, render }`.

The goal: **everything renderable is a `Page` resource in the graph.** One model
→ one render loop (`buildRoutes` collapses to a single pass over `byType.Page`),
one uniform incremental story, and pages become first-class graph nodes with
provenance, dependencies, outgoing links and assets — queryable via `ctx.sql`.

## The resource

A single `resourceType: "Page"`; `kind` discriminates. A **`CanonicalPage`** is a
`Page` with `kind: "canonical"` — a *projection* of a backing graph resource
(referenced by `ref`), never a duplicate of it. The backing StructureDefinition /
ValueSet stays a normal resource (npm ships it, the validator validates it); the
`Page` is the view.

```ts
type Page = {
  resourceType: "Page";
  id:    string;          // "Page/<slug>"
  slug:  string;          // URL key → "<slug>.html"  (e.g. "StructureDefinition-us-core-patient")
  title: string;
  kind:  "content" | "landing" | "canonical" | "collection";

  // navigation tree (drives numbering)
  parent?: string;        // parent Page id/slug
  order?:  number;        // order among siblings
  number?: string;        // COMPUTED: "3.1" (pre-order DFS over the tree)

  // kind:"canonical"  (= CanonicalPage) — projection of a graph resource
  ref?:  string;          // backing resource graph id: "StructureDefinition/us-core-patient"
  for?:  string;          // its resourceType: "StructureDefinition" (selects the default sections)

  // kind:"content" | "landing"
  md?:   string;          // raw markdown source (rendered lazily, never stored as HTML)

  // body
  sections: Section[];    // ordered parts, each a { type, ...config } descriptor

  // graph edges (provenance in / dependencies in / links out / assets)
  sources: SourceRef[];   // input files the page was assembled from (fsh, md, …)
  refs:    ResourceRef[]; // resources the page depends on (canonical / graph id)
  links:   Link[];        // outgoing hyperlinks (to other pages / external)
  assets:  Asset[];       // embedded files (images, downloads)
};
```

`SourceRef` is the engine's existing type: `{ kind: "ts" | "fsh" | "json" | "yaml"
| "md" | "package" | "virtual"; path }`.

```ts
type ResourceRef = { id: string; rel: "subject" | "example" | "binding" | "imports" | "extends" | "mentions" };
type Link        = { href: string; kind: "page" | "anchor" | "external"; label?: string };
type Asset       = { path: string; kind: "image" | "download" | "file"; out?: string };  // path = input, out = output location
```

## Sections

A section is a **descriptor** `{ type, ...config }`, where `type` both
discriminates the section *and* names its renderer — exactly the shape used
everywhere else in fcc:

| concept       | discriminator = renderer            | config        |
| ------------- | ----------------------------------- | ------------- |
| resource      | `resourceType` → its `$section_*` set | `data`        |
| plugin step   | `{ hook, fn }`                      | `...config`   |
| validator     | `{ fn }`                            | `...config`   |
| **section**   | **`type` → `$section_<type>`**      | **`...config`** |

```ts
type Section = {
  type:   string;        // = renderer name → resolveFn("$section_" + type)
  id?:    string;        // anchor / part id; defaults to `type`
  title?: string;
  avail?: string;        // $avail_<name> predicate — skipped (and unnumbered) when false
  lazy?:  boolean;       // render on demand / stream via Datastar instead of inline
  number?: string;       // COMPUTED: "<page.number>.<i>" → "3.1.2"
  [k: string]: unknown;  // section-specific config (data), spread like a plugin descriptor
};
```

Dispatch reuses the existing cross-namespace lookup — no hardcoded namespace:

```ts
const fn  = ctx.fns.site_core.resolveFn(ctx, { key: "$section_" + s.type });
const out = await fn(ctx, { page, resource, section: s });   // → { id, title, html } | null
```

Default section lists per resourceType come from `sectionDefaults[page.for]`
(now returning `Section[]` descriptors); a project overrides/extends them via
`site({ sections })`, the same way tabs and blocks are customised.

Example — a canonical (profile) page:

```ts
sections: [
  { type: "description" },
  { type: "formalViews" },
  { type: "elements", mode: "differential" },   // mode is section config (data)
  { type: "constraints" },
  { type: "examples", lazy: true },              // heavy → load on demand
  { type: "json", suffix: ".profile.json", lazy: true },
]
```

### Lazy sections

A `lazy` section gets its own route `<slug>--<type>.html`; the page shell renders
a placeholder that pulls it in on demand (Datastar):

```html
<div data-on-load="@get('/StructureDefinition-us-core-patient--examples.html')"></div>
```

So heavy parts (large element tables, expansions, example galleries) stream in
rather than blocking the first paint. The lazy section shares the parent page's
`id`/provenance, so any source change invalidates the whole page (and in dev only
its sections re-stream over SSE).

## Numbering (FHIR-IG style)

Pages and sections share one continuous hierarchical numbering, computed each
build by a deterministic `numberPages` pass — never authored by hand:

1. **Roots** = pages with no `parent`, ordered by `order`. The order comes from
   `ctx.shared.menu.tree` (sushi-config menu) + `IG.definition.page` for narrative
   pages, and a fixed artifact-group order for canonical pages
   (Profiles → Extensions → ValueSets → CodeSystems → CapabilityStatements → Examples;
   within a group, by `title`/`name`).
2. **Pre-order DFS** assigns each `Page` a dotted `number`: `"3"`, `"3.1"`, `"3.1.1"`.
3. **Sections continue the page number**: `section[i].number = page.number + "." + (i+1)`
   (sections hidden by `avail` are not numbered).
4. Recomputed every build; input is just the tree shape + section lists — cheap
   and stable.

Rendering shows `number + " " + title` in the TOC, breadcrumb and section heading
("3.1.2 Formal Views"). **Anchors / slugs do not change** — `id`/`type` stay
stable, so reordering pages renumbers without breaking links.

## Provenance, dependencies & incremental rebuild

A `Page` carries four typed edge arrays; each plugs into the engine's *existing*
incremental machinery — no new invalidation algorithm:

| field     | direction      | what it drives                                                              |
| --------- | -------------- | -------------------------------------------------------------------------- |
| `sources` | ← input files  | provenance: a `.fsh`/`.md` edit re-renders the page (via `fileToResources`) |
| `refs`    | ← resources    | dep graph: a changed backing profile / new example / edited ValueSet re-renders (via `reverseCanonical` + `transitiveDependents`) |
| `links`   | → pages / URLs | link-check + reverse "what links here" cross-reference                      |
| `assets`  | ← / → files    | copied to output + tracked (edit an image → re-copy, not a full re-render)  |

Wiring (one small engine change): when a page is emitted, register **every**
`sources[].path` and `assets[].path` in `fileToResources` (the reverse maps are
already many-to-many — only `indexResource` needs to accept a file *list* instead
of a single `fromFile`), and put `refs[].id` into the page's `deps` so
`reverseCanonical` covers resource changes. Then `runIncremental`'s existing
seed step (`fileToResources.get(changedFile)` + `transitiveDependents`) invalidates
exactly the affected pages when **any** source file, asset, or referenced resource
changes.

Edges are extracted as a side-effect of building the page: the markdown pipeline
already parses links and images; the canonical renderer knows its `refs`
(`subject` = the backing resource, `binding` = value sets bound by elements,
`example` = instances whose `meta.profile` matches).

## `ctx.sql` synergy

Because pages and their edges live in the graph, they index into `ctx.sql` — QA
checks and "related artifacts" become queries rather than bespoke code:

```sql
-- broken internal links
SELECT href FROM links
WHERE kind = 'page' AND href NOT IN (SELECT slug || '.html' FROM pages);

-- what references this profile
SELECT page FROM refs WHERE id = 'StructureDefinition/us-core-patient';
```

## Lifecycle

- **Production** — a `pages` step materialises `Page` resources:
  - `content` / `landing` from `.md` (today's `pages()` loader);
  - `canonical` — one `Page { kind:"canonical", ref, for, slug, sections: sectionDefaults[for] }`
    per conformance resource (everything except `Page` / `ImplementationGuide`).
- **Consumption** — `buildRoutes` collapses to a single loop over `byType.Page`:
  route `<slug>.html` → `render = compose(sections)`; each `lazy` section also gets
  a `<slug>--<type>.html` route. The current "for resources except Page/IG" loop
  goes away.
- **Filtering** — `resourceType === "Page"` stays filtered out of FHIR consumers
  (npm, ig-resource, validator, narrative, sqlite); the backing SD/VS remain
  normal resources.

## Open decisions

- **`Page { kind:"canonical" }` vs a distinct `resourceType: "CanonicalPage"`** —
  one type keeps filtering a single `=== "Page"` check (recommended); a separate
  type is a literal subtype but makes every filter `Page | CanonicalPage`.
- **Sections inline vs registry** — store the `Section[]` on the page, or store
  section `type`s and resolve descriptors from `sectionDefaults[for]` at render.
- **`sources`/`refs` on `Page` vs on every `Resource`** — generic provenance on
  the base `Resource` would let any resource declare multiple source files, at the
  cost of a wider engine change.
