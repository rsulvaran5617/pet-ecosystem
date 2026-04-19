import type { PetConditionStatus } from "@pet/types";

export const petConditionStatusOrder = ["active", "managed", "resolved"] as const satisfies readonly PetConditionStatus[];

export const petConditionStatusLabels: Record<PetConditionStatus, string> = {
  active: "Active",
  managed: "Managed",
  resolved: "Resolved"
};
