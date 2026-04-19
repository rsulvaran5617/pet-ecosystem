import type { PetDocumentType, PetSex } from "@pet/types";

export const petSexLabels: Record<PetSex, string> = {
  female: "Female",
  male: "Male",
  unknown: "Unknown"
};

export const petDocumentTypeOrder = [
  "vaccination_record",
  "medical_record",
  "identity",
  "insurance",
  "other"
] as const satisfies readonly PetDocumentType[];

export const petDocumentTypeLabels: Record<PetDocumentType, string> = {
  vaccination_record: "Vaccination record",
  medical_record: "Medical record",
  identity: "Identity",
  insurance: "Insurance",
  other: "Other"
};
