import { defineConfig } from "fcc";
import json      from "fcc/json";
import snapshot  from "fcc/snapshot";
import narrative from "fcc/narrative";
import validator, { structural, schema, fhirpathConstraints } from "fcc/validator";
import igRes     from "fcc/ig-resource";
import npm       from "fcc/npm";
import site      from "fcc/site";
import menu      from "fcc/menu";

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
    { name: "r4", fhir: "4.0.1", out: "dist/r4" },
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
    { dir: "../../vendor/us-core/input/resources", loader: json() },
    { dir: "../../vendor/us-core/input/examples",  loader: json() },
  ],

  plugins: [
    menu({ config: "../../vendor/us-core/sushi-config.yaml" }),
    snapshot({ packagesDir: "../../vendor/us-core/input-cache/.fhir/packages" }),
    narrative(),
    // us-core has many cross-IG canonical references (smart-app-launch, sdc, ...).
    // fcc v0 doesn't resolve them across packages yet, so "strict" produces a
    // wall of unresolved-ref warnings — keep validation on "lite".
    // One validation plugin, composed of validators → errors.html. Runs after
    // snapshot (fhirpath constraints are read from generated snapshots).
    validator({ validators: [
      structural(),                                                            // lite lint
      schema({ packagesDir: "../../vendor/us-core/input-cache/.fhir/packages" }), // fhirschema
      fhirpathConstraints(),                                                   // fhirpath invariants
    ] }),
    igRes({ pagecontent: "../../vendor/us-core/input/pagecontent" }),
    npm(),
    site({
      pagecontent: "../../vendor/us-core/input/pagecontent",
      introNotes:  "../../vendor/us-core/input/intro-notes",
    }),
  ],
});
