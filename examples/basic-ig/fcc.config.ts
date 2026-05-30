import { defineConfig } from "fcc";
import ts        from "fcc/ts";
import fsh       from "fcc/fsh";
import snapshot  from "fcc/snapshot";
import narrative from "fcc/narrative";
import validator from "fcc/validator";
import igRes     from "fcc/ig-resource";
import npm       from "fcc/npm";
import site      from "fcc/site";

export default defineConfig({
  id:        "org.example.basic",
  canonical: "https://example.org/fhir/basic",
  version:   "0.1.0",
  title:     "Basic IG",
  status:    "draft",

  targets: [
    { name: "r4", fhir: "4.0.1", out: "dist/r4" },
    { name: "r5", fhir: "5.0.0", out: "dist/r5" },
  ],

  deps: {
    "hl7.fhir.r4.core": "4.0.1",
  },

  sources: [
    { dir: "input/codesystems", loader: ts()  },
    { dir: "input/valuesets",   loader: ts()  },
    { dir: "input/profiles",    loader: ts()  },
    { dir: "input/examples",    loader: ts()  },
    { dir: "input/fsh",         loader: fsh() },
  ],

  plugins: [
    snapshot(),
    narrative(),
    validator(),                               // default: [structural()] lite lint
    igRes({ pagecontent: "input/pagecontent" }),
    npm(),
    site({ pagecontent: "input/pagecontent" }),
  ],
});
