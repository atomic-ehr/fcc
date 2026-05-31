import { test, expect } from "bun:test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { build, runIncremental } from "./runner.ts";
import type { Loader } from "./types.ts";

// Each .md → a Page PART keyed by the filename base with -intro/-notes stripped,
// so several files merge into one Page (sections keyed map).
const pageLoader: Loader = {
  name: "test-pages", extensions: [".md"],
  async load(_ctx, { file }) {
    const base = file.split("/").pop()!.replace(/\.md$/, "");
    const slug = base.replace(/-(intro|notes)$/, "");
    const section = base.endsWith("-intro") ? "intro" : base.endsWith("-notes") ? "notes" : "body";
    const md = await Bun.file(file).text();
    return { resources: [{
      id: `Page/${slug}`, resourceType: "Page", url: undefined, version: undefined,
      data: { resourceType: "Page", id: slug, slug, sections: { [section]: { type: section, md } } },
      source: { kind: "md", path: file },
    }] };
  },
};

const cfg = {
  id: "t", canonical: "http://t", version: "1",
  targets: [{ name: "r4", fhir: "4.0.1", out: "out" }],
  sources: [{ dir: "in", loader: pageLoader }], plugins: [],
} as any;

test("multi-file → one merged Page; incremental edit re-folds keeping siblings", async () => {
  const root = "/tmp/fcc-merge-load-test";
  await rm(root, { recursive: true, force: true });
  await mkdir(`${root}/in`, { recursive: true });
  await writeFile(`${root}/in/x.md`, "BODY");
  await writeFile(`${root}/in/x-intro.md`, "INTRO");
  await writeFile(`${root}/in/x-notes.md`, "NOTES");

  const res = await build({ projectRoot: root, configPath: "x", config: cfg });
  const page = () => res.state.byTarget.get("r4")!.resources.get("Page/x")!;
  expect(Object.keys((page().data as any).sections).sort()).toEqual(["body", "intro", "notes"]);
  expect((page().data as any).sections.intro.md).toBe("INTRO");

  // edit one file → re-merge keeps body + notes, updates intro
  await writeFile(`${root}/in/x-intro.md`, "INTRO v2");
  await runIncremental(res.state, [`${root}/in/x-intro.md`], "r4");
  expect(Object.keys((page().data as any).sections).sort()).toEqual(["body", "intro", "notes"]);
  expect((page().data as any).sections.intro.md).toBe("INTRO v2");
  expect((page().data as any).sections.body.md).toBe("BODY");

  await rm(root, { recursive: true, force: true });
});
