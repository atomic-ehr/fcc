// The FHIR NPM package model — the per-file `.index.json` rows
// (https://hl7.org/fhir/packages.html#2.1.10.4) and the `package.json` manifest,
// in one place so the npm plugin (.index.json + package.json), the sqlite plugin
// (.index.db), and any other consumer (e.g. a registry-publish step) compute
// them identically. Pure + ctx-free; imported as `fcc`.
import type { Resource, Bundle, ResolvedConfig, Target } from "./types.ts";

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

/**
 * The FHIR NPM `package.json` manifest (IG Publisher's `type: "IG"` shape):
 * canonical/version/deps from config, url/date/publisher/jurisdiction from the
 * ImplementationGuide when present. Undefined fields are dropped.
 */
export function packageManifest(config: ResolvedConfig, target: Target, ig: Resource | undefined): Record<string, unknown> {
  const data = (ig?.data ?? {}) as Record<string, unknown>;
  const pkg: Record<string, unknown> = {
    name: config.id,
    version: config.version,
    "tools-version": 3,
    type: "IG",
    canonical: config.canonical,
    // The IG's own url when set, else the canonical. (IG Publisher writes the
    // versioned published web location, e.g. .../STU9, which fcc has no source
    // for — there's no publish-request/package-list — so the canonical is used.)
    url: (data.url as string | undefined) ?? config.canonical,
    title: config.title ?? config.id,
    description: config.description ?? (data.description as string | undefined),
    fhirVersions: [target.fhir],
    dependencies: config.deps ?? {},
    directories: { lib: "package", example: "example" },
  };
  // `date` is intentionally omitted: IG Publisher writes a yyyyMMddHHmmss build
  // timestamp (non-reproducible), while FHIR ImplementationGuide.date is an ISO
  // date with different semantics — passing either through would mislead.
  if (data.publisher) pkg.author = data.publisher;
  const jur = jurisdictionUrn(data.jurisdiction);
  if (jur) pkg.jurisdiction = jur;
  for (const k of Object.keys(pkg)) if (pkg[k] === undefined) delete pkg[k];
  return pkg;
}

// FHIR jurisdiction (CodeableConcept[]) → the "system#code" urn string IG
// Publisher writes (e.g. "urn:iso:std:iso:3166#US").
function jurisdictionUrn(j: unknown): string | undefined {
  const coding = (j as Array<{ coding?: Array<{ system?: string; code?: string }> }> | undefined)?.[0]?.coding?.[0];
  return coding?.system && coding?.code ? `${coding.system}#${coding.code}` : undefined;
}
