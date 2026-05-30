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

// Anything a hook returns; the runner awaits it. Almost every hook is async.
type Async<T = void> = T | Promise<T>;
export type WatchPath = { path: string; recursive?: boolean };

/**
 * The hook registry — Emacs `add-hook` style. A plugin is a function that
 * registers one or more functions into these named slots; the runner runs each
 * slot's functions (in registration = config order) at the matching lifecycle
 * point. Every registered function may be async.
 */
// Every hook fn follows the house signature: `ctx` first, a single options
// object second (uniform with the flat-ns fns). Hooks with no payload take no
// second arg.
export interface Hooks {
  buildStart(fn: (ctx: PluginContext) => Async): void;
  transform(fn: (ctx: PluginContext, opts: { resource: Resource }) => Async<Resource | null | void>): void;
  beforeSnapshot(fn: (ctx: PluginContext, opts: { resource: Resource }) => Async): void;
  afterSnapshot(fn: (ctx: PluginContext, opts: { resource: Resource }) => Async): void;
  beforeValidate(fn: (ctx: PluginContext) => Async): void;
  afterValidate(fn: (ctx: PluginContext) => Async): void;
  generateBundle(fn: (ctx: PluginContext, opts: { bundle: Bundle }) => Async): void;
  writeBundle(fn: (ctx: PluginContext, opts: { bundle: Bundle }) => Async): void;
  buildEnd(fn: (ctx: PluginContext, opts: { err?: Error }) => Async): void;
  closeBundle(fn: (ctx: PluginContext) => Async): void;
  /** Dev: extend/narrow the invalidation set for a changed file. */
  handleHotUpdate(fn: (ctx: PluginContext, opts: { hot: HotUpdateContext }) => Async): void;
  /** Dev: extra paths the watcher should observe (markdown, includes, assets). */
  watchPaths(fn: (ctx: PluginContext) => Async<WatchPath[]>): void;
}

/**
 * A plugin: a function that registers hook functions. No object, no methods —
 * `(hooks) => { hooks.afterValidate(fn); hooks.writeBundle(fn); … }`. Called
 * once at startup; the registered functions then run on every (incremental)
 * build, closing over the plugin's own state.
 */
export type Plugin = (hooks: Hooks) => void;
