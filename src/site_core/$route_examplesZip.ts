// Code-defined export route: /examples.json.zip — matches the HL7 IG Publisher
// artifact of the same name: a flat ZIP of every example resource, one
// pretty-printed <ResourceType>-<id>.json per file, no manifest/index, no
// Bundle wrapper (verified against hl7.org/fhir/us/core/examples.json.zip).
// "Examples" are resources the json loader flagged with __wasExample (anything
// under input/examples, or a non-conformance instance). Aggregate route
// (id:null) → always (re)built in prod, re-served fresh from memory in dev.
//
// This is the reference $route_ contributor: drop a sibling $route_<name>.ts
// returning a RouteDef (or RouteDef[]) and buildRoutes picks it up — no
// registration, no wiring. Bytes flow through the one renderer (dev + prod).
import { zip } from "fcc";

export default function $route_examplesZip(
    _ctx: Context,
    opts: { pluginCtx: types.fcc.PluginContext },
): types.site_core.RouteDef {
    const pctx = opts.pluginCtx;
    return {
        path: "examples.json.zip",
        id: null,
        contentType: "application/zip",
        render: () => {
            const enc = new TextEncoder();
            const examples = [...pctx.resources.values()]
                .filter(r => (r.data as { __wasExample?: boolean }).__wasExample === true)
                .sort((a, b) => a.id.localeCompare(b.id));          // stable, reproducible order

            const entries = examples.map(r => {
                const clean = { ...(r.data as Record<string, unknown>) };
                delete (clean as { __wasExample?: boolean }).__wasExample;
                const id = (clean.id as string | undefined) ?? r.id.split("/").pop()!;
                return {
                    name: `${r.resourceType}-${id}.json`,
                    bytes: enc.encode(JSON.stringify(clean, null, 2) + "\n"),
                };
            });

            return zip(entries);
        },
    };
}
