import type { Plugin } from "fcc";

type Opts = { profiles?: "off" | "lite" | "strict" };

export default function validate(_opts: Opts = { profiles: "lite" }): Plugin {
  return {
    name: "fcc/validate",
    async afterValidate(ctx) {
      const seenIds = new Map<string, string>();   // resourceType -> set of ids
      const seenUrls = new Map<string, string>();

      for (const r of ctx.resources.values()) {
        const d = r.data as Record<string, unknown>;
        const id = d.id as string | undefined;
        const rt = r.resourceType;

        if (!rt) {
          ctx.warn({ severity: "error", path: r.id, message: "resource has no resourceType" });
          continue;
        }
        if (!id) {
          ctx.warn({ severity: "error", path: r.id, message: "resource has no id" });
        }

        // duplicate id within type
        const idKey = `${rt}/${id}`;
        if (seenIds.has(idKey)) {
          ctx.warn({
            severity: "error", path: r.id,
            message: `duplicate id: ${idKey} already declared by ${seenIds.get(idKey)}`,
          });
        } else {
          seenIds.set(idKey, r.id);
        }

        // canonical url
        const url = d.url as string | undefined;
        if (isCanonicalType(rt) && !url) {
          ctx.warn({ severity: "error", path: r.id, message: `${rt} requires a canonical url` });
        }
        if (url) {
          if (seenUrls.has(url)) {
            ctx.warn({
              severity: "error", path: r.id,
              message: `duplicate canonical url ${url} already declared by ${seenUrls.get(url)}`,
            });
          } else {
            seenUrls.set(url, r.id);
          }
        }

        // unresolved canonical refs
        for (const ref of r.deps) {
          if (!ctx.byUrl(ref) && !isExternalCanonical(ref)) {
            ctx.warn({
              severity: "warning", path: r.id,
              message: `unresolved canonical reference: ${ref}`,
            });
          }
        }
      }
    },
  };
}

const CANONICAL_TYPES = new Set([
  "StructureDefinition", "ValueSet", "CodeSystem", "CapabilityStatement",
  "ConceptMap", "NamingSystem", "SearchParameter", "OperationDefinition",
  "MessageDefinition", "ImplementationGuide", "Questionnaire",
  "PlanDefinition", "ActivityDefinition", "Library", "TestScript",
]);

function isCanonicalType(rt: string): boolean { return CANONICAL_TYPES.has(rt); }

function isExternalCanonical(url: string): boolean {
  // anything not under the IG's own canonical is external — we trust it for v0
  return /^https?:\/\//.test(url);
}
