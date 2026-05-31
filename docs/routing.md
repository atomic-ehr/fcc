# Routes, pages & handlers

How fcc binds URLs, and what each delivery mode can serve. Companion to
[architecture.md § 5](architecture.md) (delivery) and [page.md](page.md) (the Page
resource). **Status: pages + static exports are implemented; handlers and a
`serve` mode are design.**

## Page vs Route

- **Page** — a *content node of the graph* (a resource). Deterministic from the
  build state, **reproducible to a file**, part of the published IG, works offline.
- **Route** — a *URL → handler* binding. Some routes are pages (static); some are
  **dynamic** and only mean anything with a live server — a request plus the
  in-memory build state: a `ctx.sql` browser, search, a live error filter, a
  resource API, SSE.

`build`'s "one renderer, two deliveries" assumed every route is static (can become
a file). A live DB browser breaks that — it can't be a file.

## The spectrum

| kind | example | `build` → `dist/` | `serve` |
|---|---|---|---|
| **static page** | a profile / content page | file | from memory |
| **static export** | `examples.json.zip` | bytes file | from memory |
| **dynamic handler** | `/db?sql=...`, `/search?q=...`, `/api/Patient/123` | — | a request handler |
| **hybrid** | `errors.html` static report + live filter | static fallback | + Datastar live fragments |

## Model — two surfaces (chosen)

```ts
// STATIC surface — pages + exports. Reproducible; -> dist/ AND served from memory.
//   Page resources (buildRoutes)   ->  "<slug>.html"
//   $route_<name>.ts -> RouteDef   ->  static bytes ("examples.json.zip")

// DYNAMIC surface — handlers. Server-only; never written to dist/.
//   $handler_<path>.ts  ->  (ctx, req: Request) => Response | Promise<Response>
```

- `fcc build` emits the **static** surface only — the published IG, fully offline.
- `fcc serve` (= `dev` without watch) mounts the static surface **from memory**
  plus the **dynamic** handlers over the live build state. `dev = serve + watch +
  SSE reload`.
- **Datastar bridges hybrid**: a static page enhances itself when served, pulling
  live fragments via `@get('/qa?...')` / `@get('/db?...')`; offline those features
  are simply hidden (progressive enhancement). `errors.html` stays a **page** (the
  static QA report); a `/qa` handler adds live filtering on top.

A page is a **static IG artifact**; a handler is a **live app feature** — keeping
them as two surfaces keeps that mental model clean.

Alternatives considered: one `Route` type with a `static` flag (one mechanism, but
two `render` signatures and content/endpoint conflated); a per-route
`targets: ("static" | "server")[]` list (most general, explicit hybrid, but more
config and a hybrid route needs two renders).

## Delivery modes

| mode | static pages + exports | dynamic handlers | watch + SSE |
|---|---|---|---|
| `build` | → `dist/` files | — | — |
| `serve` | from memory | live | — |
| `dev` | from memory | live | yes |

## Status

| piece | state |
|---|---|
| static pages + code-defined exports — `build` files + `dev` from memory | ✅ implemented |
| `serve` mode (a no-watch server over the build state) | ⏳ design |
| dynamic handler routes `(ctx, req) => Response` | ⏳ design |
| Datastar progressive enhancement (static page + live handler) | ⏳ design |
