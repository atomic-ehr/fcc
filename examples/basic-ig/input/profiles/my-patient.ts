import { profile, ms, when } from "fcc";
import langVS from "../valuesets/my-language";

export default profile("my-patient", ({ Patient, fhir }: any) => ({
  parent:      Patient,
  title:       "My Patient",
  description: "Patient profile for our basic IG.",

  diff: {
    identifier:           ms({ min: 1 }),
    "identifier.system":  ms({ min: 1, max: 1 }),
    "identifier.value":   ms({ min: 1, max: 1 }),
    name:                 ms({ min: 1 }),
    "name.family":        ms({ min: 1, max: 1 }),
    gender:               ms({ min: 1, max: 1 }),
    birthDate:            ms({ min: 1, max: 1 }),

    "communication.language": ms({
      min: 0,
      binding: { strength: "required", valueSet: langVS },
    }),

    // R5 introduced Patient.contact.relationship (replacing R4's contact.gender).
    // Show off the preprocessor:
    ...when(fhir.gte("5.0"), { "contact.relationship": ms() }),
    ...when(fhir.lt("5.0"),  { "contact.gender":       ms() }),
  },

  mustSupport: [
    "identifier", "identifier.system", "identifier.value",
    "name", "name.family",
    "gender", "birthDate",
    "communication.language",
  ],
}));
