# Basic IG

This is a deliberately tiny Implementation Guide used to exercise the
`fcc` API.

## Scope

- one [Patient](StructureDefinition-my-patient.html) profile
- one [Language](CodeSystem-my-language.html) code system, bound from
  the profile via [my-language](ValueSet-my-language.html)
- one [example](Patient-example-1.html)

## Authoring

Everything is written in TypeScript. The profile, value set, code system
and example are plain `.ts` files under `input/`. See `fcc.config.ts`
for the build pipeline.
