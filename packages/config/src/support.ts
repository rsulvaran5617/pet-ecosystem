import type { SupportCaseStatus } from "@pet/types";

export const supportCaseStatusOrder = ["open", "in_review", "resolved"] as const satisfies readonly SupportCaseStatus[];

export const supportCaseStatusLabels: Record<SupportCaseStatus, string> = {
  open: "Abierto",
  in_review: "En revision",
  resolved: "Resuelto"
};
