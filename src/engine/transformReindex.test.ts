import { test, expect } from "bun:test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { build } from "./runner.ts";
import type { Loader, Plugin } from "./types.ts";

// A transform that returns a NEW resource with a different id must re-index, not
// bare-set: the old id is dropped (not orphaned) and the new one is present in
// every index. Regression guard for the runTransform fix.
test("transform returning a re-keyed resource re-indexes (old id dropped)", async () => {
  const root = "/tmp/fcc-rekey-test";
  await rm(root, { recursive: true, force: true });
  await mkdir(`${root}/in`, { recursive: true });
  await writeFile(`${root}/in/Patient-p.json`, JSON.stringify({ resourceType: "Patient", id: "p" }));

  const loader: Loader = {
    name: "json", extensions: [".json"],
    async load(_ctx, { file }) {
      const data = JSON.parse(await Bun.file(file).text());
      return { resources: [{ id: `${data.resourceType}/${data.id}`, resourceType: data.resourceType, data, source: { kind: "json", path: file } }] };
    },
  };
  const rekey: Plugin = [{
    hook: "transform",
    fn: (_ctx, _cfg, { resource }: any) =>
      resource.resourceType !== "Patient" ? null
        : { ...resource, id: "Patient/renamed", data: { resourceType: "Patient", id: "renamed" }, deps: new Set(), meta: {} },
  }];

  const result = await build({
    projectRoot: root, configPath: "fcc.config.ts",
    config: {
      id: "t", canonical: "http://t", version: "1",
      targets: [{ name: "r4", fhir: "4.0.1", out: "out" }],
      sources: [{ dir: "in", loader }],
      plugins: rekey,
    },
  });

  const bundle = result.bundles.get("r4")!;
  expect(bundle.resources.has("Patient/renamed")).toBe(true);   // re-keyed in
  expect(bundle.resources.has("Patient/p")).toBe(false);        // old id NOT orphaned

  await rm(root, { recursive: true, force: true });
});
