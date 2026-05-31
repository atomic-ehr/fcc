import type { Bundle, Diagnostic, EmittedFile, HookName, Issue, Plugin, Resource, ResolvedConfig, StepFn, Target } from "./types.ts";
import type { Database } from "bun:sqlite";
import { mergeParts, type Part } from "./merge.ts";

// A hook fn bound to its config (from the descriptor). The runner calls
// `fn(ctx, config, opts)`.
export type Bound = { fn: StepFn; config: Record<string, unknown> };
export type HookSlots = Record<HookName, Bound[]>;

const HOOK_NAMES: HookName[] = [
  "buildStart", "transform", "beforeSnapshot", "afterSnapshot",
  "beforeValidate", "afterValidate", "generateBundle", "writeBundle",
  "buildEnd", "closeBundle", "handleHotUpdate", "watchPaths",
];

/** Flatten the plugin/step descriptors into per-stage slots (in config order). */
export function collectHooks(plugins: Plugin[]): HookSlots {
  const slots = Object.fromEntries(HOOK_NAMES.map(n => [n, []])) as HookSlots;
  for (const p of plugins) {
    const steps = Array.isArray(p) ? p : [p];
    for (const step of steps) slots[step.hook].push({ fn: step.fn, config: step });
  }
  return slots;
}

/**
 * Per-target build state — survives between incremental rebuilds in
 * watch mode. Cleared on full build.
 */
export type TargetState = {
  target: Target;

  // resource graph
  resources: Map<string, Resource>;
  byCanonical: Map<string, string>;
  // typed index: resourceType -> ids (backs ctx.byType.<RT> / ctx.canonicals.<RT>)
  byType: Map<string, Set<string>>;

  // source map: file path -> resource ids produced by it
  fileToResources: Map<string, Set<string>>;
  // reverse map: resource id -> set of file paths it came from
  resourceToFiles: Map<string, Set<string>>;
  // reverse deps: canonical url -> set of resource ids referencing it
  reverseCanonical: Map<string, Set<string>>;

  // validation results, per resource (the world's `issues`); survives rebuilds
  // so validators can reuse unchanged entries (incremental validation).
  issues: Map<string, Issue[]>;

  // output
  diagnostics: Diagnostic[];
  emitted: EmittedFile[];
  bundle?: Bundle;

  cycle: number;

  /**
   * Cross-plugin shared state. Plugins write to `shared.<ns>` in earlier
   * hooks, later plugins read from there. Persists across incremental
   * rebuilds; individual plugins are responsible for invalidating their
   * own keys when needed.
   */
  shared: Record<string, unknown>;

  // Render/UI scratch + the flat-ns fn registry (ctx.fns) — persist across
  // incremental rebuilds; reset on a full build (freshTargetState).
  state: Record<string, any>;
  fns: Record<string, any>;

  // Lazily-built SQLite index of the graph backing ctx.sql; null until first
  // query, dropped whenever the graph mutates (indexResource/dropResource).
  graphDb?: Database | null;

  // Merge store: the raw partial-resources keyed by id then by source file, plus
  // the inverse file→ids. resources.get(id) = mergeParts(parts.get(id).values()).
  // A file's contribution is one part; this is the "what came from where" history
  // that makes multi-file resources + un-merge (drop a file's part) trivial.
  parts: Map<string, Map<string, Part>>;
  fileToParts: Map<string, Set<string>>;
};

/** Drop the cached ctx.sql graph index (call on any graph mutation). */
export function invalidateGraphDb(ts: TargetState) {
  if (ts.graphDb) { ts.graphDb.close(); ts.graphDb = null; }
}

export type BuildState = {
  cfg: ResolvedConfig;
  byTarget: Map<string, TargetState>;
  /**
   * Per-target hook slots: each target collects the shared data pipeline
   * (`cfg.plugins`) plus its own output pipeline (`target.plugins`). Collecting
   * per target gives each its own plugin closures — so per-version caches don't
   * leak across targets.
   */
  hooks: Map<string, HookSlots>;
};

export function createState(cfg: ResolvedConfig): BuildState {
  const byTarget = new Map<string, TargetState>();
  const hooks = new Map<string, HookSlots>();
  for (const target of cfg.targets) {
    byTarget.set(target.name, freshTargetState(target));
    hooks.set(target.name, collectHooks([...cfg.plugins, ...(target.plugins ?? [])]));
  }
  return { cfg, byTarget, hooks };
}

export function freshTargetState(target: Target): TargetState {
  return {
    target,
    resources: new Map(),
    byCanonical: new Map(),
    byType: new Map(),
    fileToResources: new Map(),
    resourceToFiles: new Map(),
    reverseCanonical: new Map(),
    issues: new Map(),
    diagnostics: [],
    emitted: [],
    cycle: 0,
    shared: {},
    state: {},
    fns: {},
    graphDb: null,
    parts: new Map(),
    fileToParts: new Map(),
  };
}

/** Drop a resource from all indexes (does not run transforms or hooks). */
export function dropResource(ts: TargetState, id: string) {
  const r = ts.resources.get(id);
  if (!r) return;
  invalidateGraphDb(ts);                              // ctx.sql index is now stale
  ts.resources.delete(id);
  if (r.url) {
    if (ts.byCanonical.get(r.url) === id) ts.byCanonical.delete(r.url);
  }
  // typed index cleanup
  const typeSet = ts.byType.get(r.resourceType);
  if (typeSet) { typeSet.delete(id); if (typeSet.size === 0) ts.byType.delete(r.resourceType); }
  // file→resources cleanup
  const files = ts.resourceToFiles.get(id);
  if (files) {
    for (const f of files) {
      const set = ts.fileToResources.get(f);
      if (set) {
        set.delete(id);
        if (set.size === 0) ts.fileToResources.delete(f);
      }
    }
    ts.resourceToFiles.delete(id);
  }
  // reverse canonical cleanup
  for (const dep of r.deps) {
    const set = ts.reverseCanonical.get(dep);
    if (set) {
      set.delete(id);
      if (set.size === 0) ts.reverseCanonical.delete(dep);
    }
  }
}

/** Add a resource to indexes. `fromFile` may be one file, a list (a merged
 *  resource built from several files), or null (an emitted/derived resource). */
export function indexResource(ts: TargetState, r: Resource, fromFile: string | string[] | null) {
  invalidateGraphDb(ts);                              // ctx.sql index is now stale
  ts.resources.set(r.id, r);
  if (r.url) ts.byCanonical.set(r.url, r.id);
  (ts.byType.get(r.resourceType) ?? ts.byType.set(r.resourceType, new Set()).get(r.resourceType)!).add(r.id);
  const files = fromFile == null ? [] : Array.isArray(fromFile) ? fromFile : [fromFile];
  for (const f of files) {
    (ts.fileToResources.get(f) ?? ts.fileToResources.set(f, new Set()).get(f)!).add(r.id);
    (ts.resourceToFiles.get(r.id) ?? ts.resourceToFiles.set(r.id, new Set()).get(r.id)!).add(f);
  }
  for (const dep of r.deps) {
    (ts.reverseCanonical.get(dep) ?? ts.reverseCanonical.set(dep, new Set()).get(dep)!).add(r.id);
  }
}

// --- merge store -----------------------------------------------------------
// Loaders feed parts; resources.get(id) = mergeParts(parts of id). A file's
// part is keyed by file so re-loading replaces it and deleting drops it.

/** Record/replace `file`'s part for `part.id`. */
export function upsertPart(ts: TargetState, part: Part, file: string) {
  (ts.parts.get(part.id) ?? ts.parts.set(part.id, new Map()).get(part.id)!).set(file, part);
  (ts.fileToParts.get(file) ?? ts.fileToParts.set(file, new Set()).get(file)!).add(part.id);
}

/** Remove every part contributed by `file`; returns the ids it had touched. */
export function removeFileParts(ts: TargetState, file: string): Set<string> {
  const ids = ts.fileToParts.get(file);
  if (!ids) return new Set();
  for (const id of ids) ts.parts.get(id)?.delete(file);
  ts.fileToParts.delete(file);
  return new Set(ids);
}

/** Re-fold `id` from its surviving parts and re-index it (or drop it if none). */
export function rematerialize(ts: TargetState, id: string) {
  const fm = ts.parts.get(id);
  if (!fm || fm.size === 0) {
    ts.parts.delete(id);
    if (ts.resources.has(id)) dropResource(ts, id);
    return;
  }
  const merged = mergeParts([...fm.values()]);
  if (ts.resources.has(id)) dropResource(ts, id);     // clear stale index before re-adding
  indexResource(ts, merged, [...fm.keys()]);
}

/** Walk the reverse-canonical graph: who transitively references any of `seedIds`? */
export function transitiveDependents(ts: TargetState, seedIds: Iterable<string>): Set<string> {
  const out = new Set<string>();
  const stack: string[] = [...seedIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const r = ts.resources.get(id);
    if (!r || !r.url) continue;
    const dependents = ts.reverseCanonical.get(r.url);
    if (!dependents) continue;
    for (const d of dependents) if (!out.has(d)) stack.push(d);
  }
  return out;
}
