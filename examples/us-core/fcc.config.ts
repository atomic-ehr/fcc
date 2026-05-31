import { defineConfig } from "fcc";
import json      from "fcc/json";
import pages     from "fcc/pages";
import snapshot  from "fcc/snapshot";
import narrative from "fcc/narrative";
import validator, { structural, schema, fhirpathConstraints } from "fcc/validator";
import igRes     from "fcc/ig-resource";
import npm       from "fcc/npm";
import menu      from "fcc/menu";
import { igSite } from "fcc/presets";

// Points at the HL7/US-Core git submodule under vendor/us-core. The folder
// layout matches the IG Publisher convention (input/resources, input/examples,
// input/pagecontent), so we just declare those as fcc sources.

export default defineConfig({
  id:          "hl7.fhir.us.core",
  canonical:   "http://hl7.org/fhir/us/core",
  version:     "9.0.0",
  title:       "US Core Implementation Guide",
  status:      "active",
  description: "US Core profiles built through the fcc plugin pipeline (from the HL7/US-Core git submodule).",

  targets: [
    // Output pipeline per target → one source, many artifacts. e.g. add
    //   { name: "pkg", fhir: "4.0.1", out: "dist/pkg", plugins: [npm()] }  // package only
    { name: "r4", fhir: "4.0.1", out: "dist/r4",
      plugins: igSite({ introNotes: "../../vendor/us-core/input/intro-notes" }) },
  ],

  // Mirrors hl7.fhir.us.core sushi-config.yaml dependencies. fcc's igRes
  // plugin emits these into ImplementationGuide.dependsOn so downstream
  // tooling can resolve them.
  deps: {
    "hl7.fhir.r4.core":            "4.0.1",
    "hl7.fhir.uv.smart-app-launch": "2.2.0",
    "hl7.fhir.uv.sdc":             "4.0.0",
    "us.cdc.phinvads":             "0.12.0",
    "hl7.fhir.uv.extensions.r4":   "5.3.0",
    "hl7.fhir.uv.xver-r5.r4":      "0.1.0",
  },

  sources: [
    { dir: "../../vendor/us-core/input/resources",   loader: json() },
    { dir: "../../vendor/us-core/input/examples",    loader: json() },
    { dir: "../../vendor/us-core/input/pagecontent", loader: pages() },  // .md → Page resources
  ],

  // Shared DATA pipeline (loaders are in sources; these enrich/validate the graph).
  // Output generators (site, npm) live in each target's `plugins` (above).
  plugins: [
    menu({ config: "../../vendor/us-core/sushi-config.yaml" }),
    snapshot({ packagesDir: "../../vendor/us-core/input-cache/.fhir/packages" }),
    narrative(),
    // One validation plugin, composed of validator descriptors { fn, ...config }
    // → errors.html. Runs after snapshot (fhirpath reads generated snapshots).
    validator({
      validators: [
        { fn: structural },                                                          // lite lint
        { fn: schema, packagesDir: "../../vendor/us-core/input-cache/.fhir/packages" }, // fhirschema
        { fn: fhirpathConstraints },                                                 // fhirpath invariants
      ],
      // IG-Publisher SuppressedMessageInformation parity: hide reviewed
      // warnings/hints listed in the IG's ignoreWarnings.txt from the QA counts.
      suppress: "../../vendor/us-core/input/ignoreWarnings.txt",
    }),
    igRes({ pagecontent: "../../vendor/us-core/input/pagecontent" }),
  ],
});
