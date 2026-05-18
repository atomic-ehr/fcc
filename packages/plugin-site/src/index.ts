import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { marked } from "marked";
import type { Plugin } from "fcc";
import { css } from "./style.ts";
import {
  bytes, renderIndex, renderArtifacts, renderResource, pageHref,
} from "./render.ts";

type Opts = {
  /** Directory of markdown content used to render index.html. Default: input/pagecontent */
  pagecontent?: string;
  /** Output subdirectory relative to target.out. Default: "site" */
  out?: string;
};

export default function site(opts: Opts = {}): Plugin {
  const pagecontent = opts.pagecontent ?? "input/pagecontent";
  const outSub = opts.out ?? "site";

  return {
    name: "fcc/site",
    enforce: "post", // run after npm so we don't fight over the output dir
    async writeBundle(bundle, ctx) {
      const outDir = resolve(ctx.config.projectRoot, ctx.target.out, outSub);
      await mkdir(outDir, { recursive: true });

      // 1. landing — render pagecontent/index.md if present
      const landingHtml = await renderLanding(ctx.config.projectRoot, pagecontent);

      const rctx = { cfg: ctx.config, target: ctx.target, bundle };

      // Always rewrite shared chrome:
      //   - index.html / artifacts.html depend on the full set
      //   - style.css is static
      await writeOne(outDir, "index.html", renderIndex(rctx, landingHtml));
      await writeOne(outDir, "artifacts.html", renderArtifacts(rctx));
      await writeOne(outDir, "style.css", css);

      // Per-resource pages: full set on initial build, only changed on incremental
      const changed = ctx.changedIds;
      let pageCount = 0;
      for (const r of bundle.resources.values()) {
        if (r.resourceType === "ImplementationGuide") continue;
        if (changed && !changed.has(r.id)) continue;
        await writeOne(outDir, pageHref(r), renderResource(rctx, r));
        pageCount++;
      }

      ctx.emitFile({ path: join(outDir, "index.html"), bytes: bytes("") });

      ctx.warn({
        severity: "info", source: "fcc/site",
        message: changed
          ? `site: ${pageCount} page(s) re-rendered + chrome`
          : `site rendered: ${bundle.resources.size + 1} pages → ${outDir}`,
      });
    },
  };
}

async function writeOne(dir: string, name: string, content: string) {
  await writeFile(join(dir, name), content, "utf8");
}

async function renderLanding(projectRoot: string, pagecontent: string): Promise<string> {
  const dir = resolve(projectRoot, pagecontent);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const indexMd = entries.find(e => e.isFile() && e.name === "index.md");
    if (!indexMd) return "";
    const md = await readFile(join(dir, "index.md"), "utf8");
    return marked.parse(md, { async: false }) as string;
  } catch {
    return "";
  }
}
