import { resolve, join } from "node:path";
import { readFile } from "node:fs/promises";
import type {
  Bundle, Config, Diagnostic, HotUpdateContext, Plugin, PluginContext,
  Resource, ResolvedConfig, Source, Target,
} from "./types.ts";
import { fhirPredicates } from "./version.ts";
import { isAuthored, type Authored, type AuthorContext } from "./authoring.ts";
import {
  type BuildState, type TargetState, createState, freshTargetState,
  dropResource, indexResource, transitiveDependents,
} from "./state.ts";

export type BuildOpts = {
  projectRoot: string;
  configPath: string;
  config: Config;
  targetName?: string;
};

export type BuildResult = {
  diagnostics: Diagnostic[];
  bundles: Map<string, Bundle>;
  ok: boolean;
  state: BuildState;
  durationMs: number;
};

// ---------------------------------------------------------------------------
// public entry: one-shot build (creates fresh state, does full build)

export async function build(opts: BuildOpts): Promise<BuildResult> {
  const resolved: ResolvedConfig = { ...opts.config, projectRoot: opts.projectRoot };
  const state = createState(resolved);
  return await runBuild(state, opts.targetName);
}

// ---------------------------------------------------------------------------
// public entry: full build over an existing state

export async function runBuild(state: BuildState, filter?: string): Promise<BuildResult> {
  const t0 = performance.now();
  const targets = filterTargets(state, filter);
  const diagnostics: Diagnostic[] = [];
  const bundles = new Map<string, Bundle>();

  if (targets.length === 0) {
    return {
      diagnostics: [{ severity: "error", message: `No targets matched filter ${filter ?? "(none)"}` }],
      bundles, ok: false, state,
      durationMs: performance.now() - t0,
    };
  }

  for (const ts of targets) {
    // reset target state on full build
    state.byTarget.set(ts.target.name, freshTargetState(ts.target));
    const fresh = state.byTarget.get(ts.target.name)!;
    await runTargetFull(state.cfg, fresh);
    bundles.set(ts.target.name, fresh.bundle!);
    diagnostics.push(...fresh.diagnostics);
  }

  const ok = !diagnostics.some(d => d.severity === "error");
  return { diagnostics, bundles, ok, state, durationMs: performance.now() - t0 };
}

// ---------------------------------------------------------------------------
// public entry: incremental rebuild for given files

export async function runIncremental(
  state: BuildState,
  changedFiles: string[],
  filter?: string,
): Promise<BuildResult> {
  const t0 = performance.now();
  const targets = filterTargets(state, filter);
  const diagnostics: Diagnostic[] = [];
  const bundles = new Map<string, Bundle>();

  for (const ts of targets) {
    await runTargetIncremental(state.cfg, ts, changedFiles);
    if (ts.bundle) bundles.set(ts.target.name, ts.bundle);
    diagnostics.push(...ts.diagnostics);
  }

  const ok = !diagnostics.some(d => d.severity === "error");
  return { diagnostics, bundles, ok, state, durationMs: performance.now() - t0 };
}

function filterTargets(state: BuildState, filter?: string): TargetState[] {
  return [...state.byTarget.values()].filter(t => !filter || t.target.name === filter);
}

// ---------------------------------------------------------------------------
// full build of one target

async function runTargetFull(cfg: ResolvedConfig, ts: TargetState) {
  ts.cycle++;
  ts.diagnostics = [];
  ts.emitted = [];

  const plugins = sortPlugins(cfg.plugins);
  const ctx = makeContext(cfg, ts, null);

  for (const p of plugins) if (p.buildStart) await p.buildStart(ctx);

  // Discover and load every file from every source
  for (const src of cfg.sources) {
    const files = await walk(resolve(cfg.projectRoot, src.dir), src.loader.extensions);
    for (const file of files) {
      await loadFile(src, file, ts, ctx);
    }
  }
  resolveExamples(ts, ctx);
  populateDeps(ts);

  // Transform on full set
  await runTransform(ts, plugins, ctx);

  // Snapshot lifecycle
  for (const phase of ["beforeSnapshot", "afterSnapshot"] as const) {
    for (const p of plugins) {
      const hook = p[phase];
      if (!hook) continue;
      for (const r of [...ts.resources.values()]) await hook.call(p, r, ctx);
    }
  }

  for (const p of plugins) if (p.beforeValidate) await p.beforeValidate(ctx);
  for (const p of plugins) if (p.afterValidate)  await p.afterValidate(ctx);

  await finalize(cfg, ts, plugins, ctx);

  for (const p of plugins) if (p.buildEnd)    await p.buildEnd();
  for (const p of plugins) if (p.closeBundle) await p.closeBundle();
}

// ---------------------------------------------------------------------------
// incremental rebuild of one target given a list of changed files

async function runTargetIncremental(cfg: ResolvedConfig, ts: TargetState, changedFiles: string[]) {
  ts.cycle++;
  ts.diagnostics = [];
  ts.emitted = [];

  const plugins = sortPlugins(cfg.plugins);

  // Step 1: figure out which resources the changed files **were** producing
  // and the transitive closure of who references them.
  const seedIds = new Set<string>();
  for (const f of changedFiles) {
    const ids = ts.fileToResources.get(f);
    if (ids) for (const id of ids) seedIds.add(id);
  }
  const invalidationSet = transitiveDependents(ts, seedIds);

  // Step 2: call handleHotUpdate hooks to extend the set
  const ctx = makeContext(cfg, ts, invalidationSet);
  for (const f of changedFiles) {
    for (const p of plugins) {
      if (!p.handleHotUpdate) continue;
      const hot: HotUpdateContext = {
        file: f,
        kind: "update",
        defaultInvalidate: invalidationSet,
        invalidate: (id) => invalidationSet.add(id),
        ctx,
      };
      await p.handleHotUpdate(hot);
    }
  }

  // Step 3: let loaders extend the invalidation set BEFORE we drop anything,
  // because their decisions depend on the current resource graph.
  for (const src of cfg.sources) {
    const rel = changedFiles.filter(f => src.loader.extensions.some(e => f.endsWith(e)));
    if (rel.length > 0 && src.loader.invalidate) {
      await src.loader.invalidate(rel, ctx, (id) => invalidationSet.add(id));
    }
  }

  // Step 4: compute the full set of files we'll need to (re)load.
  // resourceToFiles must be read **before** dropResource clears it.
  const filesToReload = new Set<string>(changedFiles);
  for (const id of invalidationSet) {
    const files = ts.resourceToFiles.get(id);
    if (files) for (const f of files) filesToReload.add(f);
  }

  // Step 5: drop invalidated resources from indexes
  for (const id of invalidationSet) dropResource(ts, id);

  // Step 6: re-load every affected file
  for (const f of filesToReload) {
    const src = findSourceForFile(cfg, f);
    if (!src) continue;
    await loadFile(src, f, ts, ctx);
  }

  resolveExamples(ts, ctx);
  populateDeps(ts);

  // Step 6: re-run transforms on invalidated set + newly loaded
  ctx.changedIds = invalidationSet;
  await runTransform(ts, plugins, ctx);

  // Snapshot / validate as full passes for now (cheap)
  for (const phase of ["beforeSnapshot", "afterSnapshot"] as const) {
    for (const p of plugins) {
      const hook = p[phase];
      if (!hook) continue;
      for (const r of [...ts.resources.values()]) await hook.call(p, r, ctx);
    }
  }
  for (const p of plugins) if (p.beforeValidate) await p.beforeValidate(ctx);
  for (const p of plugins) if (p.afterValidate)  await p.afterValidate(ctx);

  await finalize(cfg, ts, plugins, ctx);
}

// ---------------------------------------------------------------------------
// shared steps

async function loadFile(src: Source, file: string, ts: TargetState, ctx: PluginContext) {
  const out = await src.loader.load(file, ctx);
  if (!out) return;
  for (const r of out.resources) {
    const resource: Resource = {
      id: r.id,
      resourceType: r.resourceType,
      url: r.url,
      version: r.version,
      data: r.data,
      source: r.source,
      deps: new Set(r.deps ?? []),
      meta: r.meta ?? {},
    };
    indexResource(ts, resource, file);
  }
}

async function runTransform(ts: TargetState, plugins: Plugin[], ctx: PluginContext) {
  for (const p of plugins) {
    if (!p.transform) continue;
    const targetIds = ctx.changedIds
      ? [...ts.resources.values()].filter(r => ctx.changedIds!.has(r.id))
      : [...ts.resources.values()];
    for (const r of targetIds) {
      const out = await p.transform(r, ctx);
      if (out && out !== r) {
        ts.resources.set(out.id, out);
        if (out.url) ts.byCanonical.set(out.url, out.id);
      }
    }
  }
}

async function finalize(cfg: ResolvedConfig, ts: TargetState, plugins: Plugin[], ctx: PluginContext) {
  const bundle: Bundle = {
    resources: ts.resources,
    byCanonical: ts.byCanonical,
    ig: ctx.byId(`ImplementationGuide/${cfg.id}`) ?? makePlaceholderIG(cfg),
    packageJson: makePackageJson(cfg, ts.target),
    diagnostics: ts.diagnostics,
    emitted: ts.emitted,
  };
  ts.bundle = bundle;

  for (const p of plugins) if (p.generateBundle) await p.generateBundle(bundle, ctx);
  for (const p of plugins) if (p.writeBundle)    await p.writeBundle(bundle, ctx);
}

// ---------------------------------------------------------------------------
// context

function makeContext(cfg: ResolvedConfig, ts: TargetState, changedIds: Set<string> | null): PluginContext {
  return {
    config: cfg,
    target: ts.target,
    fhir: fhirPredicates(ts.target.fhir),
    resources: ts.resources,
    byCanonical: ts.byCanonical,
    changedIds,
    cycle: ts.cycle,

    query(type, where) {
      const out: Resource[] = [];
      for (const r of ts.resources.values()) {
        if (r.resourceType !== type) continue;
        if (where) {
          let ok = true;
          for (const [k, v] of Object.entries(where)) {
            if ((r.data as Record<string, unknown>)[k] !== v) { ok = false; break; }
          }
          if (!ok) continue;
        }
        out.push(r);
      }
      return out;
    },
    byUrl(url) {
      const id = ts.byCanonical.get(url);
      return id ? ts.resources.get(id) : undefined;
    },
    byId(id) { return ts.resources.get(id); },

    emitResource(r) {
      const id = r.id ?? `${r.resourceType}/${(r.data.id as string | undefined) ?? cryptoRandomId()}`;
      const resource: Resource = {
        id,
        resourceType: r.resourceType,
        url: r.url,
        version: r.version,
        data: r.data,
        source: r.source ?? { kind: "virtual", producer: "fcc" },
        deps: r.deps ?? new Set(),
        meta: r.meta ?? {},
      };
      indexResource(ts, resource, null);
      return id;
    },
    emitFile(f) { ts.emitted.push(f); },

    warn(d) {
      const diag = typeof d === "string" ? { severity: "warning" as const, message: d } : d;
      ts.diagnostics.push(diag);
    },
    error(d) {
      const diag = typeof d === "string" ? { severity: "error" as const, message: d } : d;
      ts.diagnostics.push(diag);
      throw new Error(diag.message);
    },

    async read(path) { return await readFile(path, "utf8"); },
  };
}

// ---------------------------------------------------------------------------
// helpers

function sortPlugins(plugins: Plugin[]): Plugin[] {
  const pre = plugins.filter(p => p.enforce === "pre");
  const post = plugins.filter(p => p.enforce === "post");
  const mid = plugins.filter(p => !p.enforce);
  return [...pre, ...mid, ...post];
}

async function walk(dir: string, exts: string[]): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const out: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(full, exts));
      else if (exts.some(ext => e.name.endsWith(ext))) out.push(full);
    }
  } catch { /* missing dir is fine */ }
  return out;
}

function findSourceForFile(cfg: ResolvedConfig, file: string): Source | undefined {
  return cfg.sources.find(s => {
    if (!s.loader.extensions.some(ext => file.endsWith(ext))) return false;
    const dir = resolve(cfg.projectRoot, s.dir);
    return file.startsWith(dir + "/") || file === dir;
  });
}

function resolveExamples(ts: TargetState, ctx: PluginContext) {
  for (const r of [...ts.resources.values()]) {
    if ((r.data as Record<string, unknown>).__example !== true) continue;
    const profileUrl = ((r.data.meta as { profile?: string[] } | undefined)?.profile ?? [])[0];
    const profile = profileUrl ? ctx.byUrl(profileUrl) : undefined;
    if (!profile) {
      ctx.warn({
        severity: "warning", path: r.id,
        message: `Example ${r.id}: cannot resolve profile ${profileUrl}`,
      });
      continue;
    }
    const type = profile.data.type as string | undefined;
    if (!type) continue;
    const { __example: _omit, ...clean } = r.data as Record<string, unknown> & { __example?: true };
    void _omit;

    // re-key in the indexes
    dropResource(ts, r.id);
    r.resourceType = type;
    r.data = { resourceType: type, ...clean };
    r.id = `${type}/${(clean.id as string | undefined) ?? r.id.split("/").pop()}`;
    // need to know which file produced it — pick the first
    const fromFiles = [...(ts.resourceToFiles.get(r.id) ?? [])];
    indexResource(ts, r, fromFiles[0] ?? null);
  }
}

function populateDeps(ts: TargetState) {
  // Walk each resource and collect canonical refs into r.deps; update reverseCanonical.
  for (const r of ts.resources.values()) {
    const refs = collectCanonicals(r.data);
    if (refs.size === 0) continue;
    for (const url of refs) {
      if (!r.deps.has(url)) {
        r.deps.add(url);
        (ts.reverseCanonical.get(url) ?? ts.reverseCanonical.set(url, new Set()).get(url)!).add(r.id);
      }
    }
  }
}

function collectCanonicals(data: unknown, out = new Set<string>()): Set<string> {
  if (!data || typeof data !== "object") return out;
  if (Array.isArray(data)) {
    for (const x of data) collectCanonicals(x, out);
    return out;
  }
  const o = data as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    // canonical-bearing FHIR fields (best-effort heuristic)
    if (typeof v === "string" && (
        k === "url" || k === "baseDefinition" || k === "system" ||
        k === "valueSet" || k === "profile" || k === "targetProfile" ||
        k === "instantiatesCanonical" || k === "derivedFrom"
    )) {
      if (/^https?:\/\//.test(v)) out.add(v);
    } else if (Array.isArray(v)) {
      for (const x of v) collectCanonicals(x, out);
    } else if (v && typeof v === "object") {
      collectCanonicals(v, out);
    }
  }
  return out;
}

function makePlaceholderIG(cfg: ResolvedConfig): Resource {
  return {
    id: `ImplementationGuide/${cfg.id}`,
    resourceType: "ImplementationGuide",
    url: `${cfg.canonical}/ImplementationGuide/${cfg.id}`,
    version: cfg.version,
    data: {
      resourceType: "ImplementationGuide",
      id: cfg.id,
      url: `${cfg.canonical}/ImplementationGuide/${cfg.id}`,
      version: cfg.version,
      name: cfg.id.split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(""),
      title: cfg.title ?? cfg.id,
      status: cfg.status ?? "draft",
    },
    source: { kind: "virtual", producer: "fcc/runner" },
    deps: new Set(),
    meta: {},
  };
}

function makePackageJson(cfg: ResolvedConfig, target: Target): Record<string, unknown> {
  return {
    name: cfg.id,
    version: cfg.version,
    canonical: cfg.canonical,
    type: "fhir.ig",
    title: cfg.title ?? cfg.id,
    description: cfg.description,
    "fhir-version-list": [target.fhir],
    fhirVersions: [target.fhir],
    dependencies: cfg.deps ?? {},
  };
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// authoring helper used by plugin-ts

export function materializeAuthored(a: Authored, cfg: ResolvedConfig, target: Target): { resource: Resource } {
  const authorCtx: AuthorContext = {
    canonical: cfg.canonical,
    version: cfg.version,
    fhir: fhirPredicates(target.fhir),
    resolveRef(r) {
      if (typeof r === "string") return r;
      if (isAuthored(r)) return r.url ?? `${cfg.canonical}/${kindToResourceType(r.kind)}/${r.id}`;
      return r.url;
    },
  };
  const data = a.materialize(authorCtx);
  const rt = (data.resourceType as string | undefined) ?? kindToResourceType(a.kind);
  const url = data.url as string | undefined;
  return {
    resource: {
      id: `${rt}/${a.id}`,
      resourceType: rt,
      url,
      version: data.version as string | undefined,
      data,
      source: { kind: "ts", path: "<authoring>" },
      deps: new Set(),
      meta: {},
    },
  };
}

function kindToResourceType(k: Authored["kind"]): string {
  switch (k) {
    case "profile":    return "StructureDefinition";
    case "valueSet":   return "ValueSet";
    case "codeSystem": return "CodeSystem";
    case "capability": return "CapabilityStatement";
    case "example":    return "Resource";
    default:           return "Resource";
  }
}
