import type { FosterPetExpenseCategory } from "@pet/types";

export const fosterPetExpenseCategoryOrder = [
  "food",
  "veterinary",
  "medication",
  "vaccination",
  "deworming",
  "sterilization",
  "transport",
  "hygiene",
  "accessories",
  "documentation",
  "emergency",
  "other"
] as const satisfies readonly FosterPetExpenseCategory[];

export const fosterPetExpenseCategoryLabels: Record<FosterPetExpenseCategory, string> = {
  accessories: "Accesorios",
  deworming: "Desparasitacion",
  documentation: "Documentacion",
  emergency: "Emergencia",
  food: "Alimento",
  hygiene: "Higiene",
  medication: "Medicamentos",
  other: "Otro",
  sterilization: "Esterilizacion",
  transport: "Transporte",
  vaccination: "Vacunacion",
  veterinary: "Veterinaria"
};
