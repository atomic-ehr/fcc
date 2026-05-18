import { example } from "fcc";
import myPatient from "../profiles/my-patient";

export default example(myPatient, {
  id: "example-1",

  identifier: [
    { system: "urn:oid:1.2.3.4.5", value: "12345" },
  ],
  name: [
    { family: "Doe", given: ["Jane"] },
  ],
  gender:    "female",
  birthDate: "1990-04-12",
  communication: [
    { language: { coding: [{
      system: "https://example.org/fhir/basic/CodeSystem/my-language",
      code:   "en",
    }]}, preferred: true },
  ],
});
