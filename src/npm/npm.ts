import { join, resolve } from "node:path";
import { indexEntry, packageEntries, packageManifest, tar } from "fcc";
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

      // 1. package.json — the manifest the manifest plugin published, or built
      // here via the shared helper when that plugin isn't in the pipeline.
      const pkg = (ctx.shared as { manifest?: Record<string, unknown> }).manifest
        ?? packageManifest(ctx.config, ctx.target, bundle.ig);
      const packageJsonBytes = enc.encode(JSON.stringify(pkg, null, 2) + "\n");

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
