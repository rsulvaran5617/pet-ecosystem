import type { PetDocumentType, PetSex } from "@pet/types";

export const petSexLabels: Record<PetSex, string> = {
  female: "Hembra",
  male: "Macho",
  unknown: "Sin definir"
};

export const petDocumentTypeOrder = [
  "vaccination_record",
  "medical_record",
  "identity",
  "insurance",
  "other"
] as const satisfies readonly PetDocumentType[];

export const petDocumentTypeLabels: Record<PetDocumentType, string> = {
  vaccination_record: "Carnet de vacunacion",
  medical_record: "Expediente medico",
  identity: "Identidad",
  insurance: "Seguro",
  other: "Otro"
};
