import type { Bundle, Diagnostic, EmittedFile, Resource, ResolvedConfig, Target } from "./types.ts";

/**
 * Per-target build state — survives between incremental rebuilds in
 * watch mode. Cleared on full build.
 */
export type TargetState = {
  target: Target;

  // resource graph
  resources: Map<string, Resource>;
  byCanonical: Map<string, string>;

  // source map: file path -> resource ids produced by it
  fileToResources: Map<string, Set<string>>;
  // reverse map: resource id -> set of file paths it came from
  resourceToFiles: Map<string, Set<string>>;
  // reverse deps: canonical url -> set of resource ids referencing it
  reverseCanonical: Map<string, Set<string>>;

  // output
  diagnostics: Diagnostic[];
  emitted: EmittedFile[];
  bundle?: Bundle;

  cycle: number;
};

export type BuildState = {
  cfg: ResolvedConfig;
  byTarget: Map<string, TargetState>;
};

export function createState(cfg: ResolvedConfig): BuildState {
  const byTarget = new Map<string, TargetState>();
  for (const target of cfg.targets) {
    byTarget.set(target.name, freshTargetState(target));
  }
  return { cfg, byTarget };
}

export function freshTargetState(target: Target): TargetState {
  return {
    target,
    resources: new Map(),
    byCanonical: new Map(),
    fileToResources: new Map(),
    resourceToFiles: new Map(),
    reverseCanonical: new Map(),
    diagnostics: [],
    emitted: [],
    cycle: 0,
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
