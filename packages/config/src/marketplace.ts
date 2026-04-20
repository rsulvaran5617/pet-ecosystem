import type { ProviderDayOfWeek, ProviderServiceCategory } from "@pet/types";

export const providerServiceCategoryOrder = [
  "walking",
  "grooming",
  "boarding",
  "daycare",
  "training",
  "veterinary",
  "sitting",
  "other"
] as const satisfies readonly ProviderServiceCategory[];

export const providerServiceCategoryLabels: Record<ProviderServiceCategory, string> = {
  walking: "Paseo",
  grooming: "Peluqueria",
  boarding: "Hospedaje",
  daycare: "Guarderia",
  training: "Entrenamiento",
  veterinary: "Veterinaria",
  sitting: "Cuidado en casa",
  other: "Otro"
};

export const providerDayOfWeekOrder = [0, 1, 2, 3, 4, 5, 6] as const satisfies readonly ProviderDayOfWeek[];

export const providerDayOfWeekLabels: Record<ProviderDayOfWeek, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mie",
  4: "Jue",
  5: "Vie",
  6: "Sab"
};
