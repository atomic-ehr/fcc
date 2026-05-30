import type { Plugin, PluginContext, Resource } from "fcc";

export default function igResource(opts: { pagecontent?: string } = {}): Plugin {
  return [{ hook: "beforeValidate", fn: igResourceFn, ...opts }];
}

async function igResourceFn(ctx: PluginContext, _config: Record<string, unknown>, _opts: Record<string, never>): Promise<void> {
      const cfg = ctx.config;
      const igId = cfg.id;
      // Always recompute so the IG.definition.resource list stays in sync
      // with the current resource graph (matters in watch mode).
      const existing = ctx.byId(`ImplementationGuide/${igId}`);
      if (existing) ctx.resources.delete(existing.id);

      const resources = [...ctx.resources.values()].filter(
        r => r.resourceType !== "ImplementationGuide" && r.resourceType !== "Page",
      );

      const ig: Resource["data"] = {
        resourceType: "ImplementationGuide",
        id: igId,
        url: `${cfg.canonical}/ImplementationGuide/${igId}`,
        version: cfg.version,
        name: pascalize(igId),
        title: cfg.title ?? igId,
        status: cfg.status ?? "draft",
        packageId: igId,
        fhirVersion: [ctx.target.fhir],
        ...(cfg.deps
          ? {
              dependsOn: Object.entries(cfg.deps).map(([packageId, version]) => ({
                uri: `https://packages.fhir.org/${packageId}`,
                packageId,
                version,
              })),
            }
          : {}),
        definition: {
          resource: resources.map(r => ({
            reference: { reference: `${r.resourceType}/${r.data.id ?? r.id.split("/").pop()}` },
            name: (r.data.title as string) ?? (r.data.name as string) ?? r.id,
            ...((r.data as { __wasExample?: boolean }).__wasExample
              ? { exampleBoolean: true }
              : { exampleBoolean: false }),
          })),
        },
      };

      ctx.emitResource({
        resourceType: "ImplementationGuide",
        url: ig.url as string,
        version: cfg.version,
        data: ig as Record<string, unknown>,
        source: { kind: "virtual", producer: "fcc/ig-resource" },
        meta: {},
      });
}

function pascalize(s: string): string {
  return s
    .split(/[.\-_]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
