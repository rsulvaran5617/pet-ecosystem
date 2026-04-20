import type { ProviderApprovalDocumentType, ProviderApprovalStatus } from "@pet/types";

export const providerApprovalStatusOrder = ["pending", "approved", "rejected"] as const satisfies readonly ProviderApprovalStatus[];

export const providerApprovalStatusLabels: Record<ProviderApprovalStatus, string> = {
  pending: "Pendiente de revision",
  approved: "Aprobado",
  rejected: "Rechazado"
};

export const providerApprovalDocumentTypeOrder = [
  "identity",
  "license",
  "insurance",
  "permit",
  "other"
] as const satisfies readonly ProviderApprovalDocumentType[];

export const providerApprovalDocumentTypeLabels: Record<ProviderApprovalDocumentType, string> = {
  identity: "Identidad",
  license: "Licencia",
  insurance: "Seguro",
  permit: "Permiso",
  other: "Otro"
};
