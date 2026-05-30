export type Severity = "error" | "warning" | "info";

export type Diagnostic = {
  severity: Severity;
  path?: string;
  message: string;
  source?: string;
};

/**
 * A per-resource validation result, stored in `ctx.issues`. Producers (the
 * validator plugin) attach richer fields (code, path, validator, href, …);
 * this is the minimal shape consumers can rely on.
 */
export type Issue = {
  severity: "error" | "warning" | "information";
  code: string;
  message?: string;
  path?: string;
  [k: string]: unknown;
};

export type SourceRef =
  | { kind: "ts"; path: string }
  | { kind: "fsh"; path: string; symbol: string }
  | { kind: "json"; path: string }
  | { kind: "yaml"; path: string }
  | { kind: "md"; path: string }
  | { kind: "package"; pkg: string; version: string; path: string }
  | { kind: "virtual"; producer: string };

export type Resource = {
  id: string;
  resourceType: string;
  url?: string;
  version?: string;
  data: Record<string, unknown>;
  source: SourceRef;
  deps: Set<string>;
  meta: Record<string, unknown>;
};

export type Target = {
  name: string;
  fhir: string;
  out: string;
  flags?: Record<string, boolean | string>;
  /**
   * Per-target output pipeline (generators: site, npm, …). Runs in addition to
   * the shared `cfg.plugins` (the data pipeline). Lets one source produce
   * different artifacts per target — e.g. an npm-only target + several site
   * targets for different FHIR versions.
   */
  plugins?: Plugin[];
};

export type Source = {
  dir: string;
  loader: Loader;
};

export type LoadOutput = {
  resources: Array<Omit<Resource, "deps" | "meta"> & {
    deps?: Iterable<string>;
    meta?: Record<string, unknown>;
  }>;
};

export type Loader = {
  name: string;
  extensions: string[];
  load(ctx: PluginContext, opts: { file: string }): Promise<LoadOutput | null>;
  /**
   * Optional: invalidate any per-loader caches when files change.
   * fcc calls this before re-running `load` on changed files.
   *
   * `opts.invalidate(id)` adds a resource id to the rebuild set — useful when
   * a single source file produces resources that are not in the file→resources
   * map (e.g. a batch compiler like fsh-sushi).
   */
  invalidate?(ctx: PluginContext, opts: { files: string[]; invalidate: (id: string) => void }): void | Promise<void>;
};

export type HotUpdateContext = {
  /** Path of the file that just changed on disk. */
  file: string;
  /** What kind of change. */
  kind: "create" | "update" | "delete";
  /** Default invalidation set fcc computed from the file→resources map + reverse deps. */
  defaultInvalidate: Set<string>;
  /** Add a resource id to the invalidation set. */
  invalidate(id: string): void;
  /** Plugin context for queries. */
  ctx: PluginContext;
};

export type Config = {
  id: string;
  canonical: string;
  version: string;
  title?: string;
  status?: "draft" | "active" | "retired" | "unknown";
  description?: string;
  targets: Target[];
  deps?: Record<string, string>;
  registries?: string[];
  sources: Source[];
  plugins: Plugin[];
};

export type ResolvedConfig = Config & {
  projectRoot: string;
  /** True when running under `fcc dev` (watch mode). Lets emit plugins skip
   *  precompute-to-disk and serve lazily instead. */
  dev?: boolean;
};

export type FhirPredicates = {
  eq(v: string): boolean;
  gte(v: string): boolean;
  lt(v: string): boolean;
  gt(v: string): boolean;
  lte(v: string): boolean;
};

export type EmittedFile = {
  path: string;
  bytes: Uint8Array;
};

export type Bundle = {
  resources: Map<string, Resource>;
  byCanonical: Map<string, string>;
  ig: Resource;
  packageJson: Record<string, unknown>;
  diagnostics: Diagnostic[];
  emitted: EmittedFile[];
};

export interface PluginContext {
  config: ResolvedConfig;
  target: Target;
  fhir: FhirPredicates;
  resources: Map<string, Resource>;
  byCanonical: Map<string, string>;

  /** Live typed index — `ctx.byType.Patient` → all `Patient` resources. */
  byType: Record<string, Resource[]>;
  /** Live typed canonical index — `ctx.canonicals.StructureDefinition` → `Map<url, Resource>`. */
  canonicals: Record<string, Map<string, Resource>>;

  /** Validation results, per resource — the world's `issues` (e.g. the QA page reads this). */
  issues: Map<string, Issue[]>;

  /**
   * Cross-plugin shared state, keyed by plugin namespace.
   * Use for handoffs that aren't natural fits for the resource graph
   * (e.g. precomputed HTML chunks, parsed config sections).
   */
  shared: Record<string, unknown>;

  /**
   * Render/UI scratch state, persisted across incremental rebuilds (e.g. the
   * site's loaded opts, ref-link map, notes cache). Distinct from `shared`
   * (cross-plugin handoffs) so namespaces don't collide.
   */
  state: Record<string, any>;

  /**
   * The flat-namespace function registry (`ctx.fns.<ns>.<fn>(ctx, opts)`).
   * Populated by flat-ns plugins (site, menu) attaching their `loadFns`.
   * Loosely typed here; the site's ambient `Context` narrows it to `FnsRegistry`.
   */
  fns: Record<string, any>;

  /** Per-resource intro/notes markdown (site render state), set per build. */
  notes?: Map<string, { intro?: string; notes?: string }>;

  /**
   * On incremental rebuilds, the set of resource ids that have been
   * (re)loaded or re-transformed this round. Null on a full build.
   * Emit plugins use this to optimise writes; transformers can ignore it.
   */
  changedIds: Set<string> | null;

  /** Build cycle counter — incremented on each rebuild. */
  cycle: number;

  /** True under `fcc dev` (watch mode). Emit plugins may serve lazily from
   *  memory instead of precomputing every file to disk. */
  dev: boolean;

  query(type: string, where?: Record<string, unknown>): Resource[];
  byUrl(url: string): Resource | undefined;
  byId(id: string): Resource | undefined;

  emitResource(r: Partial<Resource> & { resourceType: string; data: Record<string, unknown> }): string;
  emitFile(f: EmittedFile): void;

  warn(d: string | Diagnostic): void;
  error(d: string | Diagnostic): never;

  read(path: string): Promise<string>;
}

export type WatchPath = { path: string; recursive?: boolean };

/** The lifecycle stage a step runs at. */
export type HookName =
  | "buildStart" | "transform" | "beforeSnapshot" | "afterSnapshot"
  | "beforeValidate" | "afterValidate" | "generateBundle" | "writeBundle"
  | "buildEnd" | "closeBundle" | "handleHotUpdate" | "watchPaths";

/**
 * EVERY framework function is `fn(ctx, config, opts)`:
 *   - `ctx`    — the one world/build context (always first);
 *   - `config` — the step's static configuration (the descriptor, as data);
 *   - `opts`   — the per-call payload ({ resource } / { bundle } / { hot } / {}).
 * Always may be async; the runner awaits the result.
 */
export type StepFn = (ctx: PluginContext, config: Record<string, unknown>, opts: any) => unknown;

/**
 * A pipeline step — a descriptor: a hook stage + its fn + its config inline.
 * No setup, no factory closures — config is plain inspectable data, and the only
 * functions are `fn(ctx, config, opts)`.
 *
 *   { hook: "afterValidate", fn: snapshot, packagesDir }
 */
export type Step = { hook: HookName; fn: StepFn } & Record<string, unknown>;

/** A plugin is one step or a list of steps (a helper that binds opts → config). */
export type Plugin = Step | Step[];
