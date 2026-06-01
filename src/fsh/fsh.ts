import { readFile } from "node:fs/promises";
import type { Loader, LoadOutput, PluginContext, Resource } from "fcc";

type Opts = {
  snapshot?: boolean;
  quietInfo?: boolean;
};

type Batch = Map<string, { resources: Array<Record<string, unknown>> }>;
type WorkerOut = { fhir: Array<Record<string, unknown>>; errors: Array<{ message: string }>; warnings: Array<{ message: string }> };

// ---------------------------------------------------------------------------
// Lazy persistent compile worker. fsh-sushi compiles the whole tank in one
// (multi-second, CPU-bound) call; running it on the main thread freezes the dev
// loop. The worker runs it off-thread — `await` yields the event loop so the
// dev server keeps serving the last-good graph while a rebuild is in flight.
// The heavy fsh-sushi module is imported only in worker.ts, never on the main
// thread. Builds are sequential (per target, and the watcher is single-flight),
// so one worker with id-correlated requests is enough.

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: WorkerOut) => void; reject: (e: Error) => void }>();

type Reffable = { ref?: () => void; unref?: () => void };

// Keep the process alive only while a compile is in flight: ref on post, unref
// when the last pending reply arrives. (A persistent unref'd worker would let
// `fcc build` exit mid-compile; a persistent ref'd one would stop it exiting
// after the build.)
function idleIfDone(w: Worker) { if (pending.size === 0) (w as Reffable).unref?.(); }

function ensureWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./worker.ts", import.meta.url).href, { type: "module" });
  w.addEventListener("message", (e: MessageEvent) => {
    const m = e.data as { id: number; ok: boolean; error?: string } & WorkerOut;
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    idleIfDone(w);
    if (m.ok) p.resolve(m);
    else p.reject(new Error(m.error ?? "fsh worker error"));
  });
  w.addEventListener("error", (e: ErrorEvent) => {
    for (const p of pending.values()) p.reject(new Error(e.message || "fsh worker crashed"));
    pending.clear();
    try { w.terminate(); } catch { /* already gone */ }
    if (worker === w) worker = null;                 // next compile re-spawns
  });
  worker = w;
  (w as Reffable).unref?.();                          // start idle — don't hold the process
  return w;
}

function compileInWorker(input: string[], opts: Record<string, unknown>): Promise<WorkerOut> {
  const id = ++seq;
  const w = ensureWorker();
  (w as Reffable).ref?.();                            // busy — keep the process alive until the reply
  return new Promise<WorkerOut>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, input, opts });
  });
}

/**
 * FSH source plugin.
 *
 * Sushi expects to see all .fsh in one call so cross-references between
 * Aliases, Profiles, Instances etc. resolve. We batch the compile (off-thread,
 * see above) and keep one cached batch per target. On a watched .fsh change we
 * drop the cache so the next load re-compiles.
 */
export default function fsh(opts: Opts = {}): Loader {
  // Per-target compile cache, keyed by `${target.name}|${canonical}|${version}`.
  const batches = new Map<string, Promise<Batch>>();

  return {
    name: "fcc/fsh",
    extensions: [".fsh"],

    async load(ctx, { file }): Promise<LoadOutput | null> {
      const key = batchKey(ctx);
      let pendingBatch = batches.get(key);
      if (!pendingBatch) {
        pendingBatch = compileBatch(ctx, opts);
        batches.set(key, pendingBatch);
      }
      const compiled = await pendingBatch;
      const bucket = compiled.get(file);
      if (!bucket) return null;
      return { resources: bucket.resources.map(d => toResource(d, file)) };
    },

    invalidate(ctx, { invalidate }) {
      // Sushi can't tell us which output came from which .fsh — any .fsh
      // edit means recompile the whole batch and re-emit every FSH-produced
      // resource.
      batches.delete(batchKey(ctx));
      for (const r of ctx.resources.values()) {
        if (r.source.kind === "fsh") invalidate(r.id);
      }
    },
  };
}

function batchKey(ctx: PluginContext): string {
  return `${ctx.target.name}|${ctx.config.canonical}|${ctx.config.version}`;
}

// config.deps ({ pkgId: version }) → sushi's ImplementationGuideDependsOn[],
// minus the FHIR core package for the target version (loaded via fhirVersion).
export function depsList(ctx: PluginContext): Array<{ packageId: string; version: string }> {
  const deps = ((ctx.config as { deps?: Record<string, string> }).deps ?? {});
  return Object.entries(deps)
    .filter(([id]) => !/^hl7\.fhir\.r\d+[a-z]?\.core$/.test(id))
    .map(([packageId, version]) => ({ packageId, version }));
}

async function compileBatch(ctx: PluginContext, opts: Opts): Promise<Batch> {
  const { resolve, join } = await import("node:path");
  const { readdir } = await import("node:fs/promises");

  const fshFiles: string[] = [];
  for (const src of ctx.config.sources) {
    if (src.loader.name !== "fcc/fsh") continue;
    const absDir = resolve(ctx.config.projectRoot, src.dir);
    fshFiles.push(...await walk(absDir, ".fsh", join, readdir));
  }
  if (fshFiles.length === 0) return new Map();

  const input = await Promise.all(fshFiles.map(path => readFile(path, "utf8")));

  // The IG's dependsOn packages, so sushi can resolve `Parent:` / bindings from
  // them (IG-Publisher #1, stage C). fshToFhir loads each from the FHIR package
  // cache, downloading if absent. The base FHIR core is loaded via fhirVersion,
  // so the core package is filtered out here.
  const dependencies = depsList(ctx);

  const result = await compileInWorker(input, {
    canonical: ctx.config.canonical,
    version: ctx.config.version,
    fhirVersion: ctx.target.fhir,
    dependencies,
    snapshot: opts.snapshot ?? false,
    logLevel: opts.quietInfo ? "warn" : "info",
  });

  for (const e of result.errors)   ctx.warn({ severity: "error",   source: "fcc/fsh", message: e.message });
  for (const w of result.warnings) ctx.warn({ severity: "warning", source: "fcc/fsh", message: w.message });

  // No public per-file source map in fsh-sushi — bucket every output to the
  // first .fsh in the dir so incremental rebuilds invalidate the whole batch.
  const bucket = fshFiles[0]!;
  const map: Batch = new Map();
  map.set(bucket, { resources: result.fhir });
  return map;
}

async function walk(
  dir: string,
  ext: string,
  join: (...p: string[]) => string,
  readdir: (p: string, opts: { withFileTypes: true }) => Promise<Array<{ name: string; isDirectory(): boolean }>>,
): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(full, ext, join, readdir));
      else if (e.name.endsWith(ext)) out.push(full);
    }
  } catch { /* missing dir */ }
  return out;
}

function toResource(data: Record<string, unknown>, sourcePath: string): Resource {
  const rt = (data.resourceType as string) ?? "Resource";
  const id = (data.id as string) ?? `gen-${Math.random().toString(36).slice(2, 8)}`;
  const url = data.url as string | undefined;
  return {
    id: `${rt}/${id}`,
    resourceType: rt,
    url,
    version: data.version as string | undefined,
    data,
    source: { kind: "fsh", path: sourcePath, symbol: id },
    deps: new Set(),
    meta: {},
  };
}
