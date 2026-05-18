export type Severity = "error" | "warning" | "info";

export type Diagnostic = {
  severity: Severity;
  path?: string;
  message: string;
  source?: string;
};

export type SourceRef =
  | { kind: "ts"; path: string }
  | { kind: "fsh"; path: string; symbol: string }
  | { kind: "json"; path: string }
  | { kind: "yaml"; path: string }
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
  load(file: string, ctx: PluginContext): Promise<LoadOutput | null>;
  /**
   * Optional: invalidate any per-loader caches when files change.
   * fcc calls this before re-running `load` on changed files.
   *
   * `invalidate(id)` adds a resource id to the rebuild set — useful when
   * a single source file produces resources that are not in the file→resources
   * map (e.g. a batch compiler like fsh-sushi).
   */
  invalidate?(files: string[], ctx: PluginContext, invalidate: (id: string) => void): void | Promise<void>;
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

  /**
   * On incremental rebuilds, the set of resource ids that have been
   * (re)loaded or re-transformed this round. Null on a full build.
   * Emit plugins use this to optimise writes; transformers can ignore it.
   */
  changedIds: Set<string> | null;

  /** Build cycle counter — incremented on each rebuild. */
  cycle: number;

  query(type: string, where?: Record<string, unknown>): Resource[];
  byUrl(url: string): Resource | undefined;
  byId(id: string): Resource | undefined;

  emitResource(r: Partial<Resource> & { resourceType: string; data: Record<string, unknown> }): string;
  emitFile(f: EmittedFile): void;

  warn(d: string | Diagnostic): void;
  error(d: string | Diagnostic): never;

  read(path: string): Promise<string>;
}

export type Plugin = {
  name: string;
  enforce?: "pre" | "post";
  apply?: "build" | "dev" | ((cfg: ResolvedConfig, env: { command: string }) => boolean);

  buildStart?(ctx: PluginContext): void | Promise<void>;
  buildEnd?(err?: Error): void | Promise<void>;
  closeBundle?(): void | Promise<void>;

  transform?(r: Resource, ctx: PluginContext): Resource | null | void | Promise<Resource | null | void>;
  beforeSnapshot?(r: Resource, ctx: PluginContext): void | Promise<void>;
  afterSnapshot?(r: Resource, ctx: PluginContext): void | Promise<void>;
  beforeValidate?(ctx: PluginContext): void | Promise<void>;
  afterValidate?(ctx: PluginContext): void | Promise<void>;

  generateBundle?(bundle: Bundle, ctx: PluginContext): void | Promise<void>;
  writeBundle?(bundle: Bundle, ctx: PluginContext): void | Promise<void>;

  /**
   * Dev mode: extend or narrow the invalidation set computed from
   * the file→resources map + reverse-deps closure.
   */
  handleHotUpdate?(hot: HotUpdateContext): void | Promise<void>;
};
