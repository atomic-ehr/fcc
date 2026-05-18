import { valueSet, include } from "fcc";
import langCS from "../codesystems/my-language";

export default valueSet("my-language", {
  url:    "https://example.org/fhir/basic/ValueSet/my-language",
  title:  "My Language ValueSet",
  status: "draft",

  compose: [
    include({ system: langCS }),
  ],
});
