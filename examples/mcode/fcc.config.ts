import { defineConfig } from "fcc";
import fsh   from "fcc/fsh";
import pages from "fcc/pages";
import menu  from "fcc/menu";
import { igSite } from "fcc/presets";

// Second IG (besides us-core) used to prove the site renderer — left-nav tree,
// FHIR-IG sequential numbering, heading anchors — has NO us-core-specific
// hardcoding. mCODE has a different menu (Content by Group / Conformance /
// FHIR Artifacts) and different resource set. Lean pipeline on purpose: FSH +
// pages + menu + site only (snapshot/validate need uncached deps — us-core
// 6.1.0, genomics-reporting — and aren't required for nav/numbering).

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

  deps: { "hl7.fhir.r4.core": "4.0.1" },

  sources: [
    { dir: "../../vendor/mcode/input/fsh",         loader: fsh()   },
    { dir: "../../vendor/mcode/input/pagecontent", loader: pages() },
  ],

  plugins: [
    menu({ config: "../../vendor/mcode/sushi-config.yaml" }),
  ],
});
