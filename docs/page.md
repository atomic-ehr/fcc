# Page

A `Page` is the resource a site HTML page renders from. Target model: every
renderable page — markdown content, a profile / ValueSet / CodeSystem view, an
index — is a `Page`, so one loop renders all of them and incremental rebuild +
provenance are uniform.

A `Page` is an ordinary resource, so it is built by the general **partial-load
merge** model — several files (a profile's `.fsh` + `-intro.md` + `-notes.md`)
merge into one `Page` by shared `id`. See
[architecture.md § 2b](architecture.md) for that mechanism, and
[modules.md](modules.md) for the module reference.

```ts
type Page = {
  resourceType: "Page";
  id:    string;            // graph id
  slug:  string;            // URL key -> "<slug>.html"
  title: string;
  kind:  "content" | "landing" | "canonical" | "collection";

  parent?: string;          // nav-tree parent (page id/slug)
  order?:  number;          // sibling order
  number?: string;          // COMPUTED "3.1"  (numberPages)

  ref?:  string;            // kind:"canonical" — backing resource graph id
  for?:  string;            // its resourceType — selects default sections

  // keyed MAPS (merge-friendly: a merge of two parts is a recursive key-wise
  // combine, no array dedup; order is data, not array position)
  sections: Record<string, Section>;     // key = section id
  sources:  Record<string, SourceRef>;   // key = file path
  refs:     Record<string, ResourceRef>; // key = canonical url   (edges deferred)
  links:    Record<string, Link>;        // key = href            (edges deferred)
  assets:   Record<string, Asset>;       // key = path            (edges deferred)
};

type Section = {
  type:   string;      // names the renderer: $section_<type> (resolveFn)
  order:  number;      // sort position (sections are a map, not an array)
  as?:    "inline" | "tab" | "raw";   // default "inline"
  id?:    string;      // anchor / map key (default = type)
  title?: string;
  avail?: string;      // $avail_<name> predicate, resolved at build time
  lazy?:  boolean;     // inline only: fetched on demand via a Datastar @get
  suffix?: string;     // as:"raw" — route "<slug><suffix>"  (".profile.json")
  contentType?: string;
  number?: string;     // COMPUTED "<page.number>.<i>"
};

// renderer for a section, dispatched by type:
$section_<type>(ctx, { page, resource, section }) -> { id, title, html } | null;
```

`kind`:

| kind | backing | route |
|---|---|---|
| `content` | a markdown file | `<slug>.html` |
| `landing` | `index.md` | `index.html` |
| `canonical` | a graph resource (`ref`) | `<resourceType>-<id>.html` |
| `collection` | a query, no single backing | aggregate; route id `null` |

A `CanonicalPage` is `kind:"canonical"` — a projection of `ref`; the backing
resource stays a normal resource (npm ships it, the validator validates it).

## Sections

- Each section names its renderer by `type`, resolved across namespaces by
  `resolveFn` (fn names are globally unique). The body is composed in `order`.
- `as`: **inline** → page body; **tab** → companion HTML route `<slug>-<id>.html`
  + an entry in the tab strip; **raw** → non-HTML side-car `<slug><suffix>` (the
  downloadable `.profile.json`). `lazy` inline sections get a `<slug>--<id>.html`
  fragment route, fetched on demand.
- Default section map per resourceType is `sectionDefaults[page.for]`; a project
  overrides via `site({ sections })`; a `Page` carries only overrides, merged
  key-wise over the default. `avail` is resolved when the map is built, so
  numbering sees a stable set.

```ts
composeSections(ctx, { sections })   // sort by order, dispatch the section renderer, drop null, join
```

## Numbering

`numberPages`, deterministic per build:

- tree from `parent` / `order`; roots ordered by the menu + IG page tree, then
  artifact groups (Profiles, Extensions, ValueSets, CodeSystems,
  CapabilityStatements, Examples). Tie-break: `order` → menu pos → group →
  `title` → `slug`.
- pre-order DFS → `page.number` ("3.1"); sections continue → "3.1.2"
  (unavailable sections unnumbered).
- a menu entry and the auto canonical page for one thing are the **same** `Page` —
  no double numbering. Renumber never changes slugs / anchors.

## Provenance & incremental

| edge | drives | index |
|---|---|---|
| `sources` (files) | edit a file → re-fold the page | `ts.parts` → `fileToResources` (many-to-one) |
| `refs` (canonical urls) | changed dependency re-renders | `reverseCanonical` *(deferred)* |

`refs` keys are canonical URLs, not graph ids — `transitiveDependents` walks
url → referrers. `ctx.sql` exposes one `resources` table; edge queries go through
`json_each` over its `json` column until dedicated `links` / `refs` tables land
*(edges deferred to a later table)*.

## Status

| piece | state |
|---|---|
| Partial-load merge (general — architecture.md § 2b) | ✅ implemented + tested |
| `Page` body as a sections map; content pages compose section renderers (`composeSections`, a markdown section renderer) | ✅ implemented, golden-stable |
| canonical pages as `Page` resources, rendered from `byType.Page` (queryable via `ctx.sql`) | ✅ implemented, golden-stable |
| per-type merge overrides | ⏳ design |
| `tab` / `raw` / `lazy` driven by `Page.sections` (today canonical tabs come from `tabsFor`) | ⏳ design |
| FHIR-IG numbering | ⏳ design |
| intro/notes via merge | ⏳ design |
| edges (`refs` / `links` / `assets`) | ⏳ deferred (separate `ctx.sql` table) |
