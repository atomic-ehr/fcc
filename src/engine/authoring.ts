import type { FhirPredicates } from "./types.ts";

// Marker symbol on authoring objects so the loader can recognise them
// after dynamic import().
export const AUTHORED = Symbol.for("fcc.authored");

export type Authored = {
  [AUTHORED]: true;
  kind: "profile" | "valueSet" | "codeSystem" | "capability" | "example" | "plugin";
  // resolved into a FHIR resource against a target
  materialize(ctx: AuthorContext): Record<string, unknown>;
  // canonical url is derivable without a target
  url?: string;
  id: string;
};

export type AuthorContext = {
  canonical: string;        // IG canonical, e.g. "https://example.org/fhir/basic"
  version: string;
  fhir: FhirPredicates;
  resolveRef(r: AuthoredRef): string; // -> canonical URL string
};

/** A handle that authoring helpers return to participate in cross-refs. */
export type AuthoredRef = Authored | string | { url: string };

export function isAuthored(x: unknown): x is Authored {
  return !!x && typeof x === "object" && (x as any)[AUTHORED] === true;
}

/**
 * Conditional helper used inside profile/valueSet bodies.
 *
 *   ...when(fhir.gte("5.0"), { foo: ms() })
 *
 * Returns `a` if the condition is true, else `b` (or an empty object when
 * `b` is omitted, so `...when(false, x)` is a no-op inside an object spread).
 */
export function when<T extends Record<string, unknown>>(cond: boolean, a: T, b?: T): T {
  if (cond) return a;
  return (b ?? ({} as T));
}

// ---------------------------------------------------------------------------
// helpers

type ConceptDef = { code: string; display?: string; definition?: string };

export function concept(code: string, display?: string, opts: { definition?: string } = {}): ConceptDef {
  return { code, display, ...opts };
}

export function codeSystem(id: string, body: {
  url?: string;
  title?: string;
  description?: string;
  status?: string;
  content?: "complete" | "fragment" | "supplement" | "not-present";
  caseSensitive?: boolean;
  concepts: ConceptDef[];
}): Authored {
  return {
    [AUTHORED]: true,
    kind: "codeSystem",
    id,
    url: body.url,
    materialize(ctx) {
      const url = body.url ?? `${ctx.canonical}/CodeSystem/${id}`;
      return {
        resourceType: "CodeSystem",
        id,
        url,
        version: ctx.version,
        name: idToName(id),
        title: body.title,
        status: body.status ?? "draft",
        description: body.description,
        content: body.content ?? "complete",
        caseSensitive: body.caseSensitive ?? true,
        concept: body.concepts.map(c => ({
          code: c.code,
          ...(c.display ? { display: c.display } : {}),
          ...(c.definition ? { definition: c.definition } : {}),
        })),
      };
    },
  };
}

type IncludeSpec = {
  system?: AuthoredRef;
  valueSet?: AuthoredRef | AuthoredRef[];
  concept?: { code: string; display?: string }[];
  filter?: { property: string; op: string; value: string }[];
};

export function include(spec: IncludeSpec) {
  return { __include: spec };
}

export function valueSet(id: string, body: {
  url?: string;
  title?: string;
  description?: string;
  status?: string;
  compose: Array<{ __include: IncludeSpec }>;
}): Authored {
  return {
    [AUTHORED]: true,
    kind: "valueSet",
    id,
    url: body.url,
    materialize(ctx) {
      const url = body.url ?? `${ctx.canonical}/ValueSet/${id}`;
      const include = body.compose.map(({ __include: spec }) => {
        const out: Record<string, unknown> = {};
        if (spec.system) out.system = ctx.resolveRef(spec.system);
        if (spec.valueSet) {
          const arr = Array.isArray(spec.valueSet) ? spec.valueSet : [spec.valueSet];
          out.valueSet = arr.map(r => ctx.resolveRef(r));
        }
        if (spec.concept) out.concept = spec.concept;
        if (spec.filter) out.filter = spec.filter;
        return out;
      });
      return {
        resourceType: "ValueSet",
        id,
        url,
        version: ctx.version,
        name: idToName(id),
        title: body.title,
        status: body.status ?? "draft",
        description: body.description,
        compose: { include },
      };
    },
  };
}

type MsOpts = {
  min?: number;
  max?: number | string;
  binding?: { strength: string; valueSet: AuthoredRef };
  fixed?: unknown;
  short?: string;
};

export function ms(opts: MsOpts = {}) {
  return { __ms: opts };
}

type ExtOpts = { min?: number; max?: number | string; ms?: boolean };

export function ext(name: string, url: string, opts: ExtOpts = {}) {
  return { __ext: { name, url, ...opts } };
}

type DiffField = { __ms: MsOpts } | { __ext: { name: string; url: string } & ExtOpts }[] | unknown;

type ProfileBody = {
  parent: AuthoredRef | string;
  title?: string;
  description?: string;
  status?: string;
  diff: Record<string, DiffField | unknown>;
  mustSupport?: string[];
};

export function profile(
  id: string,
  build: (ctx: { Patient: string; Observation: string; Condition: string; fhir: FhirPredicates }) => ProfileBody,
): Authored {
  return {
    [AUTHORED]: true,
    kind: "profile",
    id,
    materialize(ctx) {
      // FHIR base types are referenced by string canonicals — we expose well-known ones.
      const baseTypes = {
        Patient: "http://hl7.org/fhir/StructureDefinition/Patient",
        Observation: "http://hl7.org/fhir/StructureDefinition/Observation",
        Condition: "http://hl7.org/fhir/StructureDefinition/Condition",
        fhir: ctx.fhir,
      };
      const body = build(baseTypes as any);
      const url = `${ctx.canonical}/StructureDefinition/${id}`;
      const baseDefinition = typeof body.parent === "string"
        ? body.parent
        : ctx.resolveRef(body.parent);
      const baseShort = baseDefinition.split("/").pop()!;

      const elements: Record<string, unknown>[] = [];
      for (const [path, spec] of Object.entries(body.diff)) {
        const fullPath = `${baseShort}.${path}`;
        const el: Record<string, unknown> = { id: fullPath, path: fullPath };
        if (spec && typeof spec === "object" && "__ms" in (spec as object)) {
          const o = (spec as { __ms: MsOpts }).__ms;
          el.mustSupport = true;
          if (typeof o.min === "number") el.min = o.min;
          if (o.max !== undefined) el.max = String(o.max);
          if (o.short) el.short = o.short;
          if (o.binding) {
            el.binding = {
              strength: o.binding.strength,
              valueSet: ctx.resolveRef(o.binding.valueSet),
            };
          }
          if (o.fixed !== undefined) el.fixedValue = o.fixed;
        }
        elements.push(el);
      }
      // mustSupport list — promote to element.mustSupport
      if (body.mustSupport) {
        for (const p of body.mustSupport) {
          const fullPath = `${baseShort}.${p}`;
          const existing = elements.find(e => e.path === fullPath);
          if (existing) {
            existing.mustSupport = true;
          } else {
            elements.push({ id: fullPath, path: fullPath, mustSupport: true });
          }
        }
      }

      return {
        resourceType: "StructureDefinition",
        id,
        url,
        version: ctx.version,
        name: idToName(id),
        title: body.title,
        status: body.status ?? "draft",
        description: body.description,
        kind: "resource",
        abstract: false,
        type: baseShort,
        baseDefinition,
        derivation: "constraint",
        differential: { element: elements },
      };
    },
  };
}

export function capability(id: string, body: {
  url?: string;
  title?: string;
  status?: string;
  kind?: "instance" | "capability" | "requirements";
  rest?: unknown[];
}): Authored {
  return {
    [AUTHORED]: true,
    kind: "capability",
    id,
    url: body.url,
    materialize(ctx) {
      return {
        resourceType: "CapabilityStatement",
        id,
        url: body.url ?? `${ctx.canonical}/CapabilityStatement/${id}`,
        version: ctx.version,
        name: idToName(id),
        title: body.title,
        status: body.status ?? "draft",
        kind: body.kind ?? "requirements",
        date: new Date().toISOString().slice(0, 10),
        fhirVersion: "4.0.1",
        format: ["json"],
        rest: body.rest ?? [],
      };
    },
  };
}

export function example(profileRef: Authored | { url: string }, data: Record<string, unknown>): Authored {
  const id = (data.id as string) ?? `example-${Math.random().toString(36).slice(2, 8)}`;
  // Determine resourceType from profile parent — best-effort via Patient-typed default.
  // The loader will overwrite resourceType when materializing if needed.
  return {
    [AUTHORED]: true,
    kind: "example",
    id,
    materialize(ctx) {
      const profileUrl = isAuthored(profileRef)
        ? ctx.resolveRef(profileRef)
        : (profileRef as { url: string }).url;
      // Infer resourceType from the profile's resolved JSON — we can only do
      // that during the second pass. For v0, store profileUrl in meta and let
      // the loader stamp resourceType once profiles are materialized.
      return {
        __example: true,
        id,
        meta: { profile: [profileUrl] },
        ...data,
      } as Record<string, unknown>;
    },
  };
}

// ---------------------------------------------------------------------------

function idToName(id: string): string {
  return id
    .split(/[-_\s]/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
