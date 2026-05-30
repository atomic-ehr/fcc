import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import type { Plugin } from "fcc";
import { tar } from "./tar.ts";

type Opts = {
  /** Also emit the unpacked package/ directory next to package.tgz, useful for debugging. */
  emitUnpacked?: boolean;
};

export default function npm(opts: Opts = { emitUnpacked: true }): Plugin {
  return (hooks) => hooks.writeBundle(async (ctx, { bundle }) => {
      const outDir = resolve(ctx.config.projectRoot, ctx.target.out);
      await mkdir(outDir, { recursive: true });

      const enc = new TextEncoder();

      // 1. package.json — produced by the runner; merge with cfg deps
      const packageJsonBytes = enc.encode(JSON.stringify(bundle.packageJson, null, 2) + "\n");

      // 2. resource files
      const resourceFiles: { path: string; bytes: Uint8Array }[] = [];
      const index: { "index-version": number; files: IndexEntry[] } = {
        "index-version": 2,
        files: [],
      };

      for (const r of bundle.resources.values()) {
        const filename = `${r.resourceType}-${(r.data.id as string) ?? r.id.split("/").pop()}.json`;
        const bytes = enc.encode(JSON.stringify(r.data, null, 2) + "\n");
        resourceFiles.push({ path: `package/${filename}`, bytes });

        index.files.push({
          filename,
          resourceType: r.resourceType,
          id: (r.data.id as string) ?? r.id.split("/").pop()!,
          url: r.url,
          version: r.version,
          kind: (r.data as Record<string, unknown>).kind as string | undefined,
          type: (r.data as Record<string, unknown>).type as string | undefined,
        });
      }

      const indexBytes = enc.encode(JSON.stringify(index, null, 2) + "\n");

      // 3. assemble tar
      const entries = [
        { path: "package/package.json", bytes: packageJsonBytes },
        { path: "package/.index.json",  bytes: indexBytes },
        ...resourceFiles,
      ];
      const tarBytes = tar(entries);
      const gz = gzipSync(tarBytes);

      const tgzPath = join(outDir, "package.tgz");
      await writeFile(tgzPath, gz);
      ctx.emitFile({ path: tgzPath, bytes: gz });

      // 4. optional unpacked debug copy
      if (opts.emitUnpacked) {
        for (const e of entries) {
          const full = join(outDir, e.path);
          await mkdir(dirname(full), { recursive: true });
          await writeFile(full, e.bytes);
          ctx.emitFile({ path: full, bytes: e.bytes });
        }
      }
  });
}

type IndexEntry = {
  filename: string;
  resourceType: string;
  id: string;
  url?: string;
  version?: string;
  kind?: string;
  type?: string;
};
