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
  walking: "Walking",
  grooming: "Grooming",
  boarding: "Boarding",
  daycare: "Daycare",
  training: "Training",
  veterinary: "Veterinary",
  sitting: "Pet sitting",
  other: "Other"
};

export const providerDayOfWeekOrder = [0, 1, 2, 3, 4, 5, 6] as const satisfies readonly ProviderDayOfWeek[];

export const providerDayOfWeekLabels: Record<ProviderDayOfWeek, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat"
};
