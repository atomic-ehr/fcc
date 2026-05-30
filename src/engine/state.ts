import type { Bundle, Diagnostic, EmittedFile, Hooks, Issue, Plugin, Resource, ResolvedConfig, Target } from "./types.ts";

// The collected hook slots — one function list per lifecycle stage. Plugins
// register into these once at startup (collectHooks); the runner runs them.
export type HookSlots = {
  [K in keyof Hooks]: Parameters<Hooks[K]>[0][];
};

const HOOK_NAMES: (keyof Hooks)[] = [
  "buildStart", "transform", "beforeSnapshot", "afterSnapshot",
  "beforeValidate", "afterValidate", "generateBundle", "writeBundle",
  "buildEnd", "closeBundle", "handleHotUpdate", "watchPaths",
];

/** Run each plugin's registration function, collecting hook fns into slots. */
export function collectHooks(plugins: Plugin[]): HookSlots {
  const slots = Object.fromEntries(HOOK_NAMES.map(n => [n, []])) as HookSlots;
  const reg = Object.fromEntries(
    HOOK_NAMES.map(n => [n, (fn: unknown) => { (slots[n] as unknown[]).push(fn); }]),
  ) as unknown as Hooks;
  for (const plugin of plugins) plugin(reg);
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
};

export type BuildState = {
  cfg: ResolvedConfig;
  byTarget: Map<string, TargetState>;
  hooks: HookSlots;
};

export function createState(cfg: ResolvedConfig): BuildState {
  const byTarget = new Map<string, TargetState>();
  for (const target of cfg.targets) {
    byTarget.set(target.name, freshTargetState(target));
  }
  return { cfg, byTarget, hooks: collectHooks(cfg.plugins) };
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
  };
}

/** Drop a resource from all indexes (does not run transforms or hooks). */
export function dropResource(ts: TargetState, id: string) {
  const r = ts.resources.get(id);
  if (!r) return;
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

/** Add a resource to indexes. */
export function indexResource(ts: TargetState, r: Resource, fromFile: string | null) {
  ts.resources.set(r.id, r);
  if (r.url) ts.byCanonical.set(r.url, r.id);
  (ts.byType.get(r.resourceType) ?? ts.byType.set(r.resourceType, new Set()).get(r.resourceType)!).add(r.id);
  if (fromFile) {
    (ts.fileToResources.get(fromFile) ?? ts.fileToResources.set(fromFile, new Set()).get(fromFile)!).add(r.id);
    (ts.resourceToFiles.get(r.id)  ?? ts.resourceToFiles.set(r.id, new Set()).get(r.id)!).add(fromFile);
  }
  for (const dep of r.deps) {
    (ts.reverseCanonical.get(dep) ?? ts.reverseCanonical.set(dep, new Set()).get(dep)!).add(r.id);
  }
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
