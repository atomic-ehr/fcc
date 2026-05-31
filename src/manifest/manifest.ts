import { packageManifest } from "fcc";
import type { Plugin, PluginContext, Bundle } from "fcc";

type Opts = Record<string, never>;

export default function manifest(_opts: Opts = {}): Plugin {
  return [{ hook: "generateBundle", fn: manifestFn }];
}

// Build the FHIR NPM `package.json` manifest from config + the IG resource and
// publish it (plain data) on ctx.shared.manifest, for the npm plugin to ship and
// for any other consumer to read (a site version chip, a registry-publish step).
// Procedural + data-only; the build logic lives in the shared fcc `packageManifest`
// helper so npm can also build it standalone when this plugin isn't in the pipeline.
function manifestFn(ctx: PluginContext, _config: Record<string, unknown>, { bundle }: { bundle: Bundle }): void {
  (ctx.shared as Record<string, unknown>).manifest = packageManifest(ctx.config, ctx.target, bundle.ig);
}
