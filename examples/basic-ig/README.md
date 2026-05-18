# basic-ig

A minimal Implementation Guide that exercises the `fcc` API surface
described in `../../design.md`.

This is a **paper example** — `fcc` core does not exist yet. The files
here are the public API as seen by an IG author. Treat as a spec for
v0.

## What this IG contains

| Artefact                              | Form  | File                                |
| ------------------------------------- | ----- | ----------------------------------- |
| `CodeSystem/my-language`              | TS    | `input/codesystems/my-language.ts`  |
| `ValueSet/my-language`                | TS    | `input/valuesets/my-language.ts`    |
| `StructureDefinition/my-patient`      | TS    | `input/profiles/my-patient.ts`      |
| `Patient/example-1`                   | TS    | `input/examples/patient-1.ts`       |
| `StructureDefinition/my-condition`    | FSH   | `input/fsh/condition.fsh`           |
| `ValueSet/my-condition-code`          | FSH   | `input/fsh/condition.fsh`           |
| Aliases (`$LOINC`, `$SCT`, `$LANG`)   | FSH   | `input/fsh/aliases.fsh`             |
| `pagecontent/index.md`                | MD    | `input/pagecontent/index.md`        |

`my-condition` is authored in FSH on purpose — it shows that
TS-authored and FSH-authored resources share one resource graph. The
FSH profile cross-references `MyPatient` (which is a TS profile); the
resolver looks the canonical URL up across all sources.

See `../plugin-fsh-sketch/` for how `@fcc/plugin-fsh` is implemented.

## What `fcc build` would produce

```
dist/
└── r4/
    ├── package.tgz                     ← FHIR NPM package
    └── package/
        ├── package.json
        ├── .index.json
        ├── ImplementationGuide-org.example.basic.json
        ├── CodeSystem-my-language.json
        ├── ValueSet-my-language.json
        ├── ValueSet-my-condition-code.json
        ├── StructureDefinition-my-patient.json
        ├── StructureDefinition-my-condition.json
        └── Patient-example-1.json
```

With `plugin-site` added, also `dist/r4/site/...`.

## How to run (once core exists)

```sh
bunx fcc info       # show resolved config + plugin chain
bunx fcc check      # validate without emitting
bunx fcc build      # full build
bunx fcc dev        # watcher + live API on :3000
```
