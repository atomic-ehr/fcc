import { defineConfig } from "fcc";
import fsh   from "fcc/fsh";
import pages from "fcc/pages";
import menu  from "fcc/menu";
import deps  from "fcc/deps";
import { igSite } from "fcc/presets";

// Second IG (besides us-core), and the one that exercises cross-IG dependency
// resolution: mCODE profiles derive from us-core, so sushi needs us-core 6.1.0 +
// genomics-reporting to compile them (deps → fshToFhir), and deps() indexes the
// same packages so cross-IG [refs] link to their published pages.

export default defineConfig({
  id:        "hl7.fhir.us.mcode",
  canonical: "http://hl7.org/fhir/us/mcode",
  version:   "4.0.0",
  title:     "mCODE Implementation Guide",
  status:    "active",

  targets: [
    { name: "r4", fhir: "4.0.1", out: "dist/r4",
      plugins: igSite({ introNotes: "../../vendor/mcode/input/intro-notes" }) },
  ],

  // Mirrors vendor/mcode/sushi-config.yaml. fsh() passes these to sushi so
  // us-core-derived profiles resolve their Parent; deps() indexes them for
  // cross-IG links. Downloaded to the FHIR package cache on first build.
  deps: {
    "hl7.fhir.r4.core": "4.0.1",
    "hl7.fhir.us.core": "6.1.0",
    "hl7.fhir.uv.genomics-reporting": "2.0.0",
  },

  sources: [
    { dir: "../../vendor/mcode/input/fsh",         loader: fsh()   },
    { dir: "../../vendor/mcode/input/pagecontent", loader: pages() },
  ],

  plugins: [
    deps(),
    menu({ config: "../../vendor/mcode/sushi-config.yaml" }),
  ],
});
