// Default merge for partial resources that share an `id` (see docs/page.md).
// A recursive KEY-WISE combine: plain objects (incl. keyed maps like a Page's
// `sections`) merge by key; arrays and scalars are last-wins; `deps` union;
// `meta` deep-merges. A single part → identity (today's load behaviour), so the
// merge is invisible unless two files actually target the same id. `$merge_<RT>`
// overrides are a future extension point; this is the default (`$merge_default`).
import type { Resource } from "./types.ts";

// What a loader yields per resource (LoadOutput.resources[number]).
export type Part = Omit<Resource, "deps" | "meta"> & { deps?: Iterable<string>; meta?: Record<string, unknown> };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursive key-wise merge: objects merge by key; arrays/scalars — later wins. */
export function deepMerge(a: unknown, b: unknown): unknown {
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: Record<string, unknown> = { ...a };
    for (const k of Object.keys(b)) out[k] = deepMerge(a[k], b[k]);
    return out;
  }
  return b;
}

/** Fold parts that share an id into one Resource. */
export function mergeParts(parts: Part[]): Resource {
  if (parts.length === 1) {
    const p = parts[0]!;
    return { id: p.id, resourceType: p.resourceType, url: p.url, version: p.version, data: p.data, source: p.source, deps: new Set(p.deps ?? []), meta: p.meta ?? {} };
  }
  // Deterministic order (by source path) so scalar last-wins is stable.
  const sorted = [...parts].sort((x, y) => srcPath(x).localeCompare(srcPath(y)));
  const deps = new Set<string>();
  let data: unknown = {};
  let meta: unknown = {};
  const base: Partial<Part> = {};
  for (const p of sorted) {
    for (const d of p.deps ?? []) deps.add(d);
    data = deepMerge(data, p.data ?? {});
    meta = deepMerge(meta, p.meta ?? {});
    // owner-wins: each defined scalar overrides; addon parts that omit them don't clobber.
    for (const k of ["id", "resourceType", "url", "version", "source"] as const) {
      if (p[k] !== undefined) (base as Record<string, unknown>)[k] = p[k];
    }
  }
  return {
    id: base.id!, resourceType: base.resourceType!, url: base.url, version: base.version,
    data: (data ?? {}) as Record<string, unknown>, source: base.source!, deps, meta: (meta ?? {}) as Record<string, unknown>,
  };
}

function srcPath(p: Part): string {
  return (p.source as { path?: string } | undefined)?.path ?? "";
}
