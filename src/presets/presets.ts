import type { Plugin } from "fcc";
import site from "fcc/site";
import manifest from "fcc/manifest";
import sqlite from "fcc/sqlite";
import npm from "fcc/npm";

// Default output pipelines (à la IG Publisher), composed from plugins. Use in a
// target's `plugins` to pick what that target emits:
//
//   targets: [
//     { name: "r4",  fhir: "4.0.1", out: "dist/r4",  plugins: igSite({ introNotes }) },
//     { name: "pkg", fhir: "4.0.1", out: "dist/pkg", plugins: [npm()] },   // package only
//   ]

/** Full IG output: browsable site + FHIR npm package (with a SQLite .index.db).
 *  manifest() + sqlite() run at generateBundle and publish ctx.shared.manifest /
 *  ctx.shared.sqlite; npm() reads both at writeBundle (package.json + .index.db). */
export function igSite(siteOpts: Parameters<typeof site>[0] = {}): Plugin[] {
  return [site(siteOpts), manifest(), sqlite(), npm()];
}
