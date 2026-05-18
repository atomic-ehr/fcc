import { codeSystem, concept } from "fcc";

export default codeSystem("my-language", {
  url:         "https://example.org/fhir/basic/CodeSystem/my-language",
  title:       "My Language Codes",
  description: "Languages spoken at our clinic.",
  status:      "draft",
  content:     "complete",
  caseSensitive: true,

  concepts: [
    concept("en", "English"),
    concept("nl", "Dutch"),
    concept("uk", "Ukrainian"),
    concept("ru", "Russian"),
  ],
});
