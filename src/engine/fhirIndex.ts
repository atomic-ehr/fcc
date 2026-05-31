// The FHIR NPM package .index.json model (https://hl7.org/fhir/packages.html#2.1.10.4),
// shared by the npm plugin (.index.json) and the sqlite plugin (.index.db) so the
// per-resource index is computed once. Pure + ctx-free; imported as `fcc`.
import type { Resource, Bundle } from "./types.ts";

// Per-file fields beyond filename/resourceType/id, in IG Publisher's order. Each
// is copied from the resource's same-named scalar element when present.
export const INDEX_FIELDS = ["url", "version", "kind", "type", "supplements", "content", "valueSet", "derivation"] as const;

export type IndexField = (typeof INDEX_FIELDS)[number];

export type IndexEntry = {
  filename: string;
  resourceType: string;
  id: string;
} & Partial<Record<IndexField, string>>;

// A scalar resource element → its index string value. Strings pass through;
// booleans/numbers are stringified (OperationDefinition.type:true → "true",
// matching IG Publisher); objects/arrays/null are omitted.
function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return undefined;
}

/** The resource id used in package filenames (data.id, falling back to the graph-id tail). */
export function resourceId(r: Resource): string {
  return (r.data.id as string | undefined) ?? r.id.split("/").pop()!;
}

/** The .index.json entry for one resource: filename + resourceType + id + any present scalar fields. */
export function indexEntry(r: Resource): IndexEntry {
  const id = resourceId(r);
  const data = r.data as Record<string, unknown>;
  const entry: IndexEntry = { filename: `${r.resourceType}-${id}.json`, resourceType: r.resourceType, id };
  for (const k of INDEX_FIELDS) {
    const v = str(data[k]);
    if (v !== undefined) entry[k] = v;
  }
  return entry;
}

/**
 * The resources a FHIR package indexes, in one place so .index.json (npm) and
 * .index.db (sqlite) never drift: every non-Page resource, flagged example vs
 * conformance, plus the synthesized placeholder ImplementationGuide when the
 * graph only carried one (IG Publisher always ships an ImplementationGuide).
 */
export function packageEntries(bundle: Bundle): { resource: Resource; example: boolean }[] {
  const out: { resource: Resource; example: boolean }[] = [];
  for (const r of bundle.resources.values()) {
    if (r.resourceType === "Page") continue;                       // not a FHIR resource
    out.push({ resource: r, example: (r.data as { __wasExample?: boolean }).__wasExample === true });
  }
  if (bundle.ig && !bundle.resources.has(bundle.ig.id)) out.push({ resource: bundle.ig, example: false });
  return out;
}
