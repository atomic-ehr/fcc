import { join, resolve } from "node:path";
import { indexEntry, packageEntries, tar } from "fcc";
import type { Plugin, PluginContext, Bundle, Resource, IndexEntry } from "fcc";

type Opts = {
  /** Also emit the unpacked package/ directory next to package.tgz, useful for debugging. */
  emitUnpacked?: boolean;
};

export default function npm(opts: Opts = { emitUnpacked: true }): Plugin {
  return [{ hook: "writeBundle", fn: npmFn, ...opts }];
}

// Emit a FHIR NPM package (package.tgz), matching the HL7 IG Publisher layout
// (verified against hl7.org/fhir/us/core/package.tgz):
//
//   package/
//     package.json            — manifest: type "IG", canonical, url, fhirVersions,
//                               dependencies, directories, jurisdiction, …
//     .index.json             — v2 index of the CONFORMANCE resources only
//     .index.db               — same, as SQLite (only when the sqlite plugin ran)
//     <ResourceType>-<id>.json — conformance resources, flat
//     example/<RT>-<id>.json   — example instances (NOT listed in .index.json)
//
// Examples are the resources the json loader flagged with __wasExample. The
// internal flag is stripped before serialization so it never ships. The
// per-resource .index.json entry comes from the shared fcc `indexEntry` helper
// (the same one the sqlite plugin uses), and .index.db is reused verbatim from
// ctx.shared.sqlite when that plugin is in the pipeline — npm owns no DB code.
async function npmFn(ctx: PluginContext, config: Record<string, unknown>, { bundle }: { bundle: Bundle }): Promise<void> {
      const outDir = resolve(ctx.config.projectRoot, ctx.target.out);
      const enc = new TextEncoder();

      // 1. package.json — FHIR NPM manifest, derived from config + the IG resource.
      const packageJsonBytes = enc.encode(JSON.stringify(buildPackageJson(ctx, bundle), null, 2) + "\n");

      // 2. resource files — conformance (flat, indexed) vs examples (example/, not indexed).
      const conformance: { path: string; bytes: Uint8Array }[] = [];
      const examples: { path: string; bytes: Uint8Array }[] = [];
      const index: { "index-version": number; files: IndexEntry[] } = { "index-version": 2, files: [] };

      const emit = (r: Resource, isExample: boolean): void => {
        const entry = indexEntry(r);                                 // filename + .index.json fields
        const clean = { ...(r.data as Record<string, unknown>) };
        delete (clean as { __wasExample?: boolean }).__wasExample;   // internal flag — never ship
        const bytes = enc.encode(JSON.stringify(clean, null, 2) + "\n");
        if (isExample) {
          examples.push({ path: `package/example/${entry.filename}`, bytes });   // examples are not indexed
        } else {
          conformance.push({ path: `package/${entry.filename}`, bytes });
          index.files.push(entry);
        }
      };

      for (const { resource, example } of packageEntries(bundle)) emit(resource, example);

      // Deterministic, reproducible output regardless of filesystem read order.
      const byPath = (a: { path: string }, b: { path: string }) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
      conformance.sort(byPath);
      examples.sort(byPath);
      index.files.sort((a, b) => (a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0));

      const indexBytes = enc.encode(JSON.stringify(index, null, 2) + "\n");

      // 3. assemble tar (package.json + .index.json first, then conformance, then examples)
      const entries = [
        { path: "package/package.json", bytes: packageJsonBytes },
        { path: "package/.index.json",  bytes: indexBytes },
      ];
      // .index.db: the bytes the sqlite plugin published (conformance only,
      // IG-Publisher schema). Absent when that plugin isn't in the pipeline.
      const sq = (ctx.shared as { sqlite?: { indexDb?: Uint8Array } }).sqlite;
      if (sq?.indexDb) entries.push({ path: "package/.index.db", bytes: sq.indexDb });
      entries.push(...conformance, ...examples);
      const tarBytes = tar(entries);
      const gz = Bun.gzipSync(tarBytes);

      const tgzPath = join(outDir, "package.tgz");
      await Bun.write(tgzPath, gz);                  // Bun.write creates parent dirs
      ctx.emitFile({ path: tgzPath, bytes: gz });

      // 4. optional unpacked debug copy
      if (config.emitUnpacked) {
        for (const e of entries) {
          const full = join(outDir, e.path);
          await Bun.write(full, e.bytes);            // creates package/, package/example/ as needed
          ctx.emitFile({ path: full, bytes: e.bytes });
        }
      }
}

// The FHIR NPM package manifest. IG Publisher derives it from the IG resource +
// build config; we pull the canonical/version/deps from config and the
// url/date/publisher/jurisdiction from the ImplementationGuide when present.
function buildPackageJson(ctx: PluginContext, bundle: Bundle): Record<string, unknown> {
  const cfg = ctx.config;
  const ig = (bundle.ig?.data ?? {}) as Record<string, unknown>;
  const pkg: Record<string, unknown> = {
    name: cfg.id,
    version: cfg.version,
    "tools-version": 3,
    type: "IG",
    canonical: cfg.canonical,
    url: (ig.url as string | undefined) ?? cfg.canonical,
    title: cfg.title ?? cfg.id,
    description: cfg.description ?? (ig.description as string | undefined),
    fhirVersions: [ctx.target.fhir],
    dependencies: cfg.deps ?? {},
    directories: { lib: "package", example: "example" },
  };
  if (ig.date) pkg.date = ig.date;
  if (ig.publisher) pkg.author = ig.publisher;
  const jur = jurisdictionUrn(ig.jurisdiction);
  if (jur) pkg.jurisdiction = jur;
  for (const k of Object.keys(pkg)) if (pkg[k] === undefined) delete pkg[k];
  return pkg;
}

// FHIR jurisdiction (CodeableConcept[]) → the "system#code" urn string IG
// Publisher writes (e.g. "urn:iso:std:iso:3166#US").
function jurisdictionUrn(j: unknown): string | undefined {
  const coding = (j as Array<{ coding?: Array<{ system?: string; code?: string }> }> | undefined)?.[0]?.coding?.[0];
  return coding?.system && coding?.code ? `${coding.system}#${coding.code}` : undefined;
}
