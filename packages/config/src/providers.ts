import type { ProviderApprovalDocumentType, ProviderApprovalStatus } from "@pet/types";

export const providerApprovalStatusOrder = ["pending", "approved", "rejected"] as const satisfies readonly ProviderApprovalStatus[];

export const providerApprovalStatusLabels: Record<ProviderApprovalStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected"
};

export const providerApprovalDocumentTypeOrder = [
  "identity",
  "license",
  "insurance",
  "permit",
  "other"
] as const satisfies readonly ProviderApprovalDocumentType[];

export const providerApprovalDocumentTypeLabels: Record<ProviderApprovalDocumentType, string> = {
  identity: "Identity",
  license: "License",
  insurance: "Insurance",
  permit: "Permit",
  other: "Other"
};
