# @fcc/plugin-fsh (sketch)

A paper-implementation sketch for the FSH source plugin referenced in
`../basic-ig/fcc.config.ts`.

This is **not runnable** — it shows the shape of a source plugin in the
`fcc` model (see `../../design.md`, §4.6 and §6.2):

- registered as `loader: fsh()` in `sources[]`
- runs in the **resolution / load** phase, before transforms
- calls `fsh-sushi` in-process, no shell-out
- emits one or more `Resource` objects per `.fsh` file, tagged with
  `source: { kind: "fsh", path, symbol }`
- declares text-pragma preprocessing: `// @fcc-if fhir >= 5.0`

See `index.ts` for the sketch.
