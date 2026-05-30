import { readFile } from "node:fs/promises";
import type { Loader, LoadOutput, PluginContext, Resource } from "fcc";

type Opts = {
  /** If true, treat resources whose filename starts with "example-" or live under any /examples/ dir as examples (marks them so IG resource emits exampleBoolean=true). Default true. */
  detectExamples?: boolean;
  /** If true, also load .json files where resourceType is missing (skip with a warning). Default false. */
  permissive?: boolean;
};

export default function json(opts: Opts = {}): Loader {
  const detectExamples = opts.detectExamples ?? true;
  return {
    name: "fcc/json",
    extensions: [".json"],
    async load(ctx, { file }): Promise<LoadOutput | null> {
      const text = await readFile(file, "utf8");
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch (e) {
        ctx.warn({
          severity: "error",
          path: file,
          message: `JSON parse failed: ${(e as Error).message}`,
        });
        return null;
      }
      const rt = data.resourceType as string | undefined;
      if (!rt) {
        if (!opts.permissive) {
          ctx.warn({
            severity: "warning",
            path: file,
            source: "fcc/json",
            message: "skipping: missing resourceType",
          });
        }
        return null;
      }
      const id = (data.id as string | undefined) ?? deriveId(file);
      const url = data.url as string | undefined;
      const isExample = detectExamples && looksLikeExample(file, rt);

      const r: Omit<Resource, "deps" | "meta"> & { meta?: Record<string, unknown> } = {
        id: `${rt}/${id}`,
        resourceType: rt,
        url,
        version: data.version as string | undefined,
        data: isExample ? { ...data, __wasExample: true } : data,
        source: { kind: "json", path: file },
        meta: isExample ? { example: true } : {},
      };
      return { resources: [r as unknown as LoadOutput["resources"][number]] };
    },
    invalidate(_ctx, _opts) {
      // No batch state — file→resource map is 1:1 so the core handles it.
    },
  };
}

function deriveId(file: string): string {
  const base = file.split("/").pop()!.replace(/\.json$/, "");
  // Strip leading "<ResourceType>-" so e.g. StructureDefinition-foo.json -> foo
  return base.replace(/^[A-Z][A-Za-z]+-/, "");
}

function looksLikeExample(file: string, rt: string): boolean {
  if (/\/examples?\//.test(file)) return true;
  // Resources like Patient/Observation/Condition that aren't conformance types are usually examples
  const conformanceTypes = new Set([
    "StructureDefinition", "ValueSet", "CodeSystem", "CapabilityStatement",
    "ConceptMap", "NamingSystem", "SearchParameter", "OperationDefinition",
    "MessageDefinition", "ImplementationGuide", "Questionnaire",
    "PlanDefinition", "ActivityDefinition", "Library", "TestScript",
    "GraphDefinition", "Requirements",
  ]);
  return !conformanceTypes.has(rt);
}

// Re-export PluginContext type for downstream typing
export type { PluginContext };
