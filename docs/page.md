# The `Page` resource

> **Status: partially implemented.**
> - ✅ **Merge-friendly resources** (the foundation): loaders emit partial
>   resources, parts that share an `id` merge — `src/engine/merge.ts` +
>   `ts.parts`/`upsertPart`/`removeFileParts`/`rematerialize` in `state.ts`
>   (`merge.test.ts`, `mergeLoad.test.ts`).
> - ✅ **`Page` body as a `sections` map**: content pages render by composing
>   `$section_<type>` from data on the Page — `composeSections` + `$section_md`
>   (`composeSections.test.ts`); golden-stable.
> - ⏳ **Design (not yet built):** canonical pages as `Page` resources +
>   `buildRoutes` single loop, `as:"tab"|"raw"` companion/side-car routes,
>   FHIR-IG numbering, intro/notes via merge. Edges (`refs`/`links`/`assets`)
>   deferred to a later separate `ctx.sql` table.
>
> Hardened against a multi-agent adversarial review (codex + kimi + an internal
> workflow). See [`architecture.md`](architecture.md) for the engine model and
> [`modules.md`](modules.md) for the module reference.

## Why

Two notions of "page" exist today, asymmetrically:

- **markdown pages** are real `Page` resources (from the `pages()` loader) — so
  they get provenance and incremental rebuilds;
- **conformance pages** (a StructureDefinition's page, a ValueSet's page, …) are
  *not* resources — `buildRoutes` iterates `pctx.resources` and renders each on
  the fly; the page exists only as a `Route { id, contentType, render }`.

Goal: **everything renderable is a `Page` resource in the graph** → one render
loop, one incremental story, and pages become first-class graph nodes with
provenance, dependencies, outgoing links and assets.

## The resource

A single `resourceType: "Page"`; `kind` discriminates. A **`CanonicalPage`** is a
`Page` with `kind: "canonical"` — a *projection* of a backing resource (via
`ref`), never a duplicate. The backing StructureDefinition/ValueSet stays a normal
resource (npm ships it, the validator validates it); the `Page` is the view.

```ts
type Page = {
  resourceType: "Page";
  id:    string;          // graph id (see § Incremental id — NOT always "Page/<slug>")
  slug:  string;          // URL key → "<slug>.html"  (see § Slugs)
  title: string;
  kind:  "content" | "landing" | "canonical" | "collection";

  // navigation tree (drives numbering)
  parent?: string;        // parent Page id/slug
  order?:  number;        // explicit order among siblings (else derived, see § Numbering)
  number?: string;        // COMPUTED: "3.1"

  // kind:"canonical"  (= CanonicalPage) — projection of a graph resource
  ref?:  string;          // backing resource graph id: "StructureDefinition/us-core-patient"
  for?:  string;          // its resourceType: "StructureDefinition" (selects default sections)

  // kind:"content" | "landing"
  md?:   string;          // raw markdown source (rendered lazily, never stored as HTML)

  // body + graph edges — all keyed MAPS (not arrays), so a merge of two parts is
  // a trivial recursive key-wise combine (no array union/dedup). Order is data
  // (`Section.order`), not array position. See § Partial resources & merge.
  sections: Record<string, Section>;     // key = section id (defaults to `type`); see § Sections
  sources:  Record<string, SourceRef>;   // key = file path — provenance / what to reload
  refs:     Record<string, ResourceRef>; // key = canonical URL — resource dependencies
  links:    Record<string, Link>;        // key = href — outgoing hyperlinks
  assets:   Record<string, Asset>;       // key = file path — embedded files
};
```

`SourceRef` is the engine's existing type: `{ kind: "ts" | "fsh" | "json" |
"yaml" | "md" | "package" | "virtual"; path }`.

```ts
// rel edges. `url` is the CANONICAL URL so it matches the engine's reverseCanonical
// index (which keys on URLs, not graph ids); `id` is the optional graph-id hint.
type ResourceRef = { url: string; id?: string; rel: "subject" | "example" | "binding" | "imports" | "extends" | "mentions" };
type Link        = { href: string; kind: "page" | "anchor" | "external"; label?: string };
type Asset       = { path: string; kind: "image" | "download" | "file"; out?: string };
```

### `kind`

| kind        | backing            | example                                  |
| ----------- | ------------------ | ---------------------------------------- |
| `content`   | a markdown file    | `general-guidance.html`                  |
| `landing`   | `index.md`         | `index.html`                             |
| `canonical` | a graph resource   | `StructureDefinition-us-core-patient.html` |
| `collection`| a *query* (no single backing resource) | `artifacts.html`, "All Profiles" — sections pull from the graph via `ctx.sql`; route `id: null` (always re-rendered) |

## Sections

A section is a **descriptor** `{ type, as?, ...config }`. `type` both
discriminates the section *and* names its renderer — the shape used everywhere in
fcc:

| concept       | discriminator = renderer            | config        |
| ------------- | ----------------------------------- | ------------- |
| resource      | `resourceType` → its `$section_*` set | `data`        |
| plugin step   | `{ hook, fn }`                      | `...config`   |
| validator     | `{ fn }`                            | `...config`   |
| **section**   | **`type` → `$section_<type>`**      | **`...config`** |

```ts
type Section = {
  type:   string;        // = renderer key → resolveFn("$section_" + type); also the map key by default
  order:  number;        // sort position — sections are a MAP, so order is data, not array index
  as?:    "inline" | "tab" | "raw";   // placement (default "inline"); see below
  id?:    string;        // anchor / map key; defaults to `type` (deduped, see § Slugs)
  title?: string;
  avail?: string;        // $avail_<name> predicate, evaluated when the section set is built (derivePages),
                         //   so the materialized map is already filtered — numbering sees a stable set
  lazy?:  boolean;       // inline only: fetched on demand via a Datastar @get to its <slug>--<id>.html route
  contentType?: string;  // for `as:"raw"` (e.g. "application/fhir+json")
  suffix?: string;       // for `as:"raw"` — route is "<slug><suffix>" (e.g. ".profile.json")
  number?: string;       // COMPUTED: "<page.number>.<i>" → "3.1.2"
  [k: string]: unknown;  // section-specific config (data)
};
```

`as` is how the **companion tabs and raw side-cars survive** the unified model
(the review flagged that "everything is sections" would otherwise drop the
`-definitions.html`/`-mappings.html` tab strip and the `.profile.json` download):

- **`inline`** — composed into the page body (in order, with numbering). `lazy`
  inline sections also get a fragment route `<slug>--<id>.html` for Datastar
  on-demand loading.
- **`tab`** — its own companion HTML route `<slug>-<id>.html` and an entry in the
  page's tab strip (today's `tabDefaults`: Content / Detailed Descriptions /
  Mappings / Examples / JSON).
- **`raw`** — emits a non-HTML artifact at `<slug><suffix>` with `contentType`
  (the `.profile.json` / `.json` downloadable side-car). Not in the body.

### Dispatch & back-compat

```ts
const fn  = ctx.fns.site_core.resolveFn(ctx, { key: "$section_" + s.type });
const out = await fn(ctx, { page, resource, section: s });   // → { id, title, html } | null
```

> **Breaking-change note (from review).** Existing `$section_*` files take
> `(ctx, { resource })` and return `{ title, id, html }`. The new contract adds
> `{ page, section }` and `avail`/`lazy`/`as`. Migration keeps a **compat shim**:
> the registry calls old fns with just `{ resource }` (extra args ignored) so
> existing sections work unchanged; new fns opt into the wider signature.

Default section maps per resourceType come from `sectionDefaults[page.for]` (a
`Record<string, Section>`); a project overrides/extends them via `site({ sections })`,
like tabs and blocks. **Sections live in the registry, not inline on every page**:
a `Page` may carry overrides (merged key-wise over the default), but the default
body for a `for` is looked up — avoids duplicating descriptors across hundreds of
pages and keeps each page part tiny (a `-intro.md` part adds just one key).

`avail` is resolved when the section set is built, so the materialized `sections`
map already reflects availability; `compose` sorts by `order`, drops
`null`-returning renders, and numbers what remains — gap-free.

Example — a canonical (profile) page's default section map:

```ts
{
  description: { type: "description", order: 10, as: "inline" },
  formalViews: { type: "formalViews", order: 20, as: "inline" },
  elements:    { type: "elements",    order: 30, as: "tab" },                 // companion tab
  mappings:    { type: "mappings",    order: 40, as: "tab", avail: "$avail_notExample" },
  examples:    { type: "examples",    order: 50, as: "tab", lazy: true },
  json:        { type: "json",        order: 60, as: "tab" },                 // pretty JSON page
  rawJson:     { type: "rawJson",     order: 70, as: "raw", suffix: ".profile.json", contentType: "application/fhir+json" },
}
```

## Loading a page from multiple files — partial resources & merge

A page is built from several files — the backing resource's `.fsh`/`.json` +
`-intro.md` + `-notes.md`. We don't split it into sub-resources and we don't need
a special "page loader": **a loader emits *partial* resources, and parts that share
an `id` merge into one resource.** "Many files → one page" falls out of that.

```ts
// load() already returns partials (today's LoadOutput) — we just allow the same
// id to come from several files, each tagged with its source:
load(ctx, { file }) → Array<Partial<Resource> & { id: string; source: SourceRef }>
```

```
…patient.fsh       → part StructureDefinition/…patient  +  part Page/…patient { kind:canonical, ref:SD }
…patient-intro.md  → part Page/…patient { sections: { intro: { type:"intro", order:5, md } } }
…patient-notes.md  → part Page/…patient { sections: { notes: { type:"notes", order:6, md } } }
                     ───────────────── merge by id ─────────────────
                     Page/…patient { sections:{…, intro, notes}, sources:{fsh, intro, notes} }
```

The engine keeps the parts and folds them:

- **`ts.parts: Map<id, Part[]>`** (`Part = Partial<Resource> & { source }`) — this
  *is* the "what came from where" history.
- `resources.get(id) = merge(ts.parts.get(id))`.
- **Default merge (every resource):** a recursive **key-wise** combine — keyed maps
  (`sections`, `sources`, `refs`, `links`, `assets`, `meta`) merge by key; scalars
  are owner/last-wins. Because aux files only *add keys* (one section + one source),
  they are pure additive parts → no conflicts, order-independent. (This is exactly
  why the collections are maps, not arrays — see § The resource.)
- **Special mergers** override per type via `$merge_<resourceType>` (same
  `$`-dispatch as `$section_`/`$render_`; default `$merge_default`):
  `$merge_StructureDefinition` (snapshot over differential), `$merge_ValueSet`
  (supplements), `$merge_Page` (the plain additive default), …
- **Un-merge / incremental is one line:** a file changes → replace its parts →
  re-merge that `id`; a file is deleted → drop its parts → re-merge. The page loses
  exactly the deleted file's keys. `resourceToFiles` is built from each part's
  `source`, giving the many-to-one file map (edit any of the 3 files → re-merge the
  one page) for free.

The `Page/<backing>` stub part (`kind:"canonical"`, `ref`) is emitted by a
`derivePages` step from each conformance resource; the `-intro`/`-notes` md parts
come from a loader. They meet at the same `id` and merge — `sources` is then just
the merged `source`s of the parts (recorded, not inferred).

### Two phases

Merge makes **load** pure and order-free, so the rest is a clean second phase:

1. **Load** — parse files → partial resources; merge by `id`. No cross-refs, no
   link extraction, no validation. Additive merge is commutative, so file order
   never matters, and "a later file updates an earlier resource" is just another
   part — not a mutation mid-load.
2. **Process** — over the fully-merged graph: resolve `refs`, extract
   `links`/`assets`, number, snapshot, validate. Everything sees the complete graph.

## Provenance, dependencies & incremental rebuild

A `Page`'s keyed-map edges each plug into the engine's incremental machinery:

| field     | direction      | drives                                                          | engine index        |
| --------- | -------------- | -------------------------------------------------------------- | ------------------- |
| `sources` | ← files        | edit any contributing file → re-merge this page                | `ts.parts` source per part → `fileToResources` (many-to-one) |
| `refs`    | ← resources    | changed backing profile / new example / edited ValueSet re-renders | `reverseCanonical` + `transitiveDependents` (by **canonical URL**) |
| `links`   | → pages / URLs | link-check + reverse "what links here"                         | extracted pass (see below) |
| `assets`  | ← / → files    | copied to output + tracked                                     | watched source files |

Two orthogonal edges drive rebuilds: **`sources` (files)** via `ts.parts` →
`fileToResources`, and **`refs` (canonical URLs)** via `reverseCanonical`. `refs`
must be canonical URLs, not graph ids — `transitiveDependents` walks URL→referrers,
so `StructureDefinition/us-core-patient` (a graph id) would never match.

**Links/assets are not free.** The markdown pipeline today only *rewrites* ref
links (`injectRefLinks`); it does not *emit* edge records. Extracting `links`/
`assets` needs a real pass over the markdown/HTML AST. Until that exists, those
arrays are empty and the link-check below is inert.

## `ctx.sql` and edge queries

`ctx.sql` today exposes exactly one table — `resources(id, resourceType, rid,
url, version, example, json)` ([`graphDb.ts`](../src/engine/graphDb.ts)). There
are **no** `pages`/`links`/`refs` tables. So edge queries go through `json_each`
over the `json` blob:

```sql
-- broken internal links (no first-class `links` table — read the json array)
SELECT l.value ->> 'href' AS href
FROM resources, json_each(json, '$.links') AS l
WHERE resourceType = 'Page' AND l.value ->> 'kind' = 'page'
  AND (l.value ->> 'href') NOT IN (
    SELECT json_extract(json, '$.slug') || '.html' FROM resources WHERE resourceType = 'Page');

-- what references this profile
SELECT id FROM resources, json_each(json, '$.refs') AS r
WHERE resourceType = 'Page' AND r.value ->> 'url' = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient';
```

Optional later optimization: have `buildGraphDb` flatten `Page.links`/`refs` into
real `links`/`refs` tables (a graphDb schema change + a per-Page expansion pass) —
**not free**, listed in engine changes.

## Numbering (FHIR-IG style)

One continuous hierarchical numbering, computed each build by a deterministic
`numberPages` pass — never authored by hand:

1. **One page per thing.** A resource that appears in the menu and also has an
   auto canonical page is the **same** `Page` (the menu entry points at it by
   `ref`/slug) — never materialized twice. No double numbering.
2. **Roots** = pages with no `parent`. Order = `ctx.shared.menu.tree` +
   `IG.definition.page` for narrative pages, then artifact groups
   (Profiles → Extensions → ValueSets → CodeSystems → CapabilityStatements →
   Examples). Pages in none of these attach under their artifact group by `for`.
3. **Strict tie-break comparator** at every level: explicit `order` →
   menu/IG position → `for` group order → `title` (locale-independent codepoint)
   → `slug`. An invalid/cyclic `parent` is dropped to a root with a diagnostic.
4. **Pre-order DFS** assigns each `Page` a dotted `number` (`"3"`, `"3.1"`).
   Sections continue: `section[i].number = page.number + "." + (i+1)`
   (`avail`-false / `null` sections are skipped and unnumbered).

Rendering shows `number + " " + title` in TOC/breadcrumb/heading. **Anchors and
slugs do not change** — reordering renumbers without breaking links.

## Slugs

- **content/landing** — `slug` = markdown basename (`general-guidance`).
- **canonical** — `slug` = `pageHref` = `<resourceType>-<id>`
  (`StructureDefinition-us-core-patient`), already namespaced by resourceType, so
  it does not collide with a same-named content page (`Patient.md` → `Patient` vs
  `StructureDefinition-patient`).
- **collision resolution** — a `slug → id` registry in `ts.state` assigns
  `<slug>`, then `<slug>-2`, … deterministically (sorted by id) and is stable
  across rebuilds. Section ids are deduped per page (`id`, `id--2`).
- **lazy/companion route names** — `<slug>--<sectionId>.html` (inline lazy),
  `<slug>-<sectionId>.html` (tab), `<slug><suffix>` (raw). The `--` separator is
  reserved; content slugs containing `--` are escaped.

## Incremental id

The **route `id` for a canonical page must equal the backing resource id**, not a
`Page/<slug>` id. The prod write-gate skips a route when `route.id ∉ changedIds`;
keying the route on the backing resource id is what makes "edit a profile →
re-render only its page" work (today's behavior — see `buildRoutes`
`{ id: r.id }`). Lazy/companion routes inherit the same id. Aggregate pages
(`kind:"collection"`, chrome) use `id: null` → always re-rendered.

## Lifecycle

- **Production** — a `pages`/`derivePages` step materialises `Page` resources:
  - `content`/`landing` from `.md` (today's `pages()` loader);
  - `Fragment` from `-intro.md`/`-notes.md` (a fragment loader);
  - `canonical` — one per conformance resource (everything except `Page` /
    `ImplementationGuide` / `Fragment`), composed from the resource + its
    fragments + examples.
  - **Hook order matters:** materialise *after* `ig-resource`/`snapshot` (so the
    IG + snapshots exist) but *before* `generateBundle`/`writeBundle` (so
    `buildRoutes` sees the pages). Emitting hundreds of pages enlarges
    `ts.resources` / `byType.Page` / the `ctx.sql` index — acceptable (metadata
    only) but real.
- **Consumption** — `buildRoutes` collapses to a single loop over `byType.Page`:
  route `<slug>.html` → `compose(sections as:"inline")`; `tab`/`raw`/`lazy`
  sections add their companion routes. The current "for resources except Page/IG"
  loop goes away.
- **Filtering** — `resourceType === "Page"` (and `Fragment`) stay filtered out of
  FHIR consumers (npm, ig-resource, validator, narrative, sqlite, `packageEntries`,
  `renderArtifacts`). The backing SD/VS remain normal resources. The materialised
  canonical pages must **not** leak into npm/`.index.json`/`.index.db` — the
  existing `=== "Page"` filters cover it, but the `derivePages` step must run
  without changing the conformance set npm sees.

## Engine changes required

The merge model is the one real foundation; the rest builds on it:

1. ✅ **Partial-resource merge (foundation) — done.** The engine keeps `ts.parts:
   Map<id, Map<file, Part>>`, materialises `resources.get(id) = mergeParts(parts)`
   with the default key-wise merge, and builds `fileToResources`/`resourceToFiles`
   from each part's `source` — the many-to-one file map. (`src/engine/merge.ts`,
   `state.ts`, `runner.ts loadFile`.) `$merge_<RT>` custom mergers are still a
   future extension point.
2. ✅ **Collections as keyed maps — done for `sections`** (`Page.sections` is a
   `Record`, composed by `composeSections`); `refs`/`links`/`assets` follow when
   edges land.
3. ⏳ **Watcher seeds for aux files.** `-intro.md`/`-notes.md` must be watched
   sources so an edit seeds the rebuild; their parts carry the page id.
4. ⏳ **Section-fn signature** — additive `(ctx,{page,resource,section})`, with a
   compat shim for today's `(ctx,{resource})` files. (`$section_md` already uses
   `{ section }`.)
5. ⏳ **`role` → `kind`** — migrate the two live `byType.Page` consumers.
6. ⏳ **(optional)** graphDb `links`/`refs` tables for edge queries.

## Open decisions

- **`Page { kind:"canonical" }` vs a distinct `resourceType: "CanonicalPage"`** —
  one type keeps filtering a single `=== "Page"` check (recommended).
- **Default merge for ALL resources (chosen)** vs opt-in (`mergeable` / presence
  of `$merge_<RT>`). Default additive unifies fsh-tank / snapshot / pages under one
  mechanism; the risk is a same-id collision that previously last-wins now merges —
  audited per resourceType.
- **Edge queries** — `json_each` over `resources.json` (works today) vs dedicated
  `links`/`refs` tables in `buildGraphDb` (faster, a schema change).
