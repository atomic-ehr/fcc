import type { FhirPredicates } from "./types.ts";

function parse(v: string): [number, number, number] {
  const m = v.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

function cmp(a: string, b: string): number {
  const [a0, a1, a2] = parse(a);
  const [b0, b1, b2] = parse(b);
  if (a0 !== b0) return a0 - b0;
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

export function fhirPredicates(version: string): FhirPredicates {
  return {
    eq:  (v) => cmp(version, v) === 0,
    gte: (v) => cmp(version, v) >= 0,
    gt:  (v) => cmp(version, v) >  0,
    lte: (v) => cmp(version, v) <= 0,
    lt:  (v) => cmp(version, v) <  0,
  };
}
