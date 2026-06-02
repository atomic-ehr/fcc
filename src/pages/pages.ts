import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Loader, LoadOutput, Resource } from "fcc";

// Markdown loader: turns a pagecontent `.md` into a `Page` resource in the graph
// — so pages get provenance (a `.md` edit invalidates exactly one Page) and flow
// through the normal source/loader/incremental machinery. `Page` is a non-FHIR
// resourceType, filtered out of FHIR consumers (npm, ig-resource, validator, …).
//
// Roles: index.md → "landing"; ImplementationGuide-*.md → skipped; else "page".
// `<RT>-<id>-(intro|notes).md` → an "intronotes" Page with a soft `for` edge to
// its target resource; the -intro & -notes files for a resource merge by shared
// id into one Page { intro, notes }. The site's notesFor reads these from the
// graph (authored notes get loader provenance + incremental rebuild like any
// other source) instead of a side-loaded map.

const INTRO_NOTES = /^([A-Z][A-Za-z]+)-(.+)-(intro|notes)\.md$/;

export default function pages(_opts: {} = {}): Loader {
  return {
    name: "fcc/pages",
    extensions: [".md"],

    async load(_ctx, { file }): Promise<LoadOutput | null> {
      const name = basename(file);
      if (name.startsWith("ImplementationGuide-")) return null;   // handled elsewhere

      const inm = name.match(INTRO_NOTES);
      if (inm) {
        const [, rt, idPart, kind] = inm;
        const md = await readFile(file, "utf8");
        const slug = `intronotes-${rt}-${idPart}`;                // shared by -intro & -notes → merge
        const r = {
          id: `Page/${slug}`,
          resourceType: "Page",
          url: undefined, version: undefined,
          data: { resourceType: "Page", id: slug, slug, role: "intronotes", for: `${rt}/${idPart}`, [kind!]: md },
          source: { kind: "md", path: file },
          meta: {},
        };
        return { resources: [r as unknown as LoadOutput["resources"][number]] };
      }

      const md = await readFile(file, "utf8");
      const slug = basename(name, ".md");
      const role = slug === "index" ? "landing" : "page";
      const h1 = md.match(/^#\s+(.+?)\s*$/m);
      const title = h1 ? h1[1]! : titleCase(slug);

      const r: Omit<Resource, "deps" | "meta"> & { meta?: Record<string, unknown> } = {
        id: `Page/${slug}`,
        resourceType: "Page",
        url: undefined,
        version: undefined,
        data: { resourceType: "Page", id: slug, slug, title, md, role, sections: { body: { type: "md", order: 0, md } } },
        source: { kind: "md", path: file },
        meta: {},
      };
      return { resources: [r as unknown as LoadOutput["resources"][number]] };
    },
  };
}

function titleCase(slug: string): string {
  return slug.split("-").map(w => (w[0]?.toUpperCase() ?? "") + w.slice(1)).join(" ");
}
