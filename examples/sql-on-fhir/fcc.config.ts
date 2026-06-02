import { defineConfig } from "fcc";
import fsh   from "fcc/fsh";
import pages from "fcc/pages";
import menu  from "fcc/menu";
import deps  from "fcc/deps";
import { igSite } from "fcc/presets";

// Third example IG and the first R5 one — a smoke test that fcc isn't R4-bound.
// SQL-on-FHIR-v2 (FHIR 5.0.0), vendored at vendor/sql-on-fhir.
const IG = "../../vendor/sql-on-fhir";

export default defineConfig({
  id:        "org.sql-on-fhir.ig",
  canonical: "https://sql-on-fhir.org/ig",
  version:   "2.1.0-pre",
  title:     "SQL on FHIR",
  status:    "draft",

  targets: [
    { name: "r5", fhir: "5.0.0", out: "dist/r5", plugins: igSite({ images: `${IG}/input/images` }) },
  ],

  deps: {
    "hl7.fhir.r5.core":          "5.0.0",
    "hl7.fhir.uv.extensions.r5": "5.2.0",
    "hl7.terminology.r5":        "6.0.2",
  },

  sources: [
    { dir: `${IG}/input/fsh`,         loader: fsh()   },
    { dir: `${IG}/input/pagecontent`, loader: pages() },
  ],

  plugins: [
    deps(),
    menu({ config: `${IG}/sushi-config.yaml` }),
  ],
});
