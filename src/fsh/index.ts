import { readFile } from "node:fs/promises";
import { fshToFhir } from "fsh-sushi/dist/run/FshToFhir.js";
import type { Loader, LoadOutput, PluginContext, Resource } from "fcc";

type Opts = {
  snapshot?: boolean;
  quietInfo?: boolean;
};

type Batch = Map<string, { resources: Array<Record<string, unknown>> }>;

/**
 * FSH source plugin.
 *
 * Sushi expects to see all .fsh in one call so cross-references between
 * Aliases, Profiles, Instances etc. resolve. We batch the compile and
 * keep one cached batch per target. On a watched .fsh change we drop
 * the cache so the next load re-compiles.
 */
export default function fsh(opts: Opts = {}): Loader {
  // Per-target compile cache, keyed by `${target.name}|${canonical}|${version}`.
  const batches = new Map<string, Promise<Batch>>();

  return {
    name: "fcc/fsh",
    extensions: [".fsh"],

    async load(file, ctx): Promise<LoadOutput | null> {
      const key = batchKey(ctx);
      let pending = batches.get(key);
      if (!pending) {
        pending = compileBatch(ctx, opts);
        batches.set(key, pending);
      }
      const compiled = await pending;
      const bucket = compiled.get(file);
      if (!bucket) return null;
      return { resources: bucket.resources.map(d => toResource(d, file)) };
    },

    invalidate(_files, ctx, invalidate) {
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

  const sources = await Promise.all(
    fshFiles.map(async (path) => ({ path, text: await readFile(path, "utf8") })),
  );
  const input = sources.map(s => s.text);

  const result = await fshToFhir(input, {
    canonical: ctx.config.canonical,
    version: ctx.config.version,
    fhirVersion: ctx.target.fhir,
    snapshot: opts.snapshot ?? false,
    logLevel: opts.quietInfo ? "warn" : "info",
  });

  for (const e of result.errors)   ctx.warn({ severity: "error",   source: "fcc/fsh", message: e.message });
  for (const w of result.warnings) ctx.warn({ severity: "warning", source: "fcc/fsh", message: w.message });

  // No public per-file source map in fsh-sushi — bucket every output to the
  // first .fsh in the dir so incremental rebuilds invalidate the whole batch.
  const bucket = fshFiles[0]!;
  const map: Batch = new Map();
  map.set(bucket, { resources: result.fhir as Array<Record<string, unknown>> });
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
