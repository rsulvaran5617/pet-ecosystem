import type { IsoDateString, TimestampedEntity, Uuid } from "./base";

export type SupportCaseStatus = "open" | "in_review" | "resolved";

export interface SupportCaseSummary extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  householdId: Uuid;
  petId: Uuid;
  providerOrganizationId: Uuid;
  providerServiceId: Uuid;
  createdByUserId: Uuid;
  creatorEmail: string;
  creatorDisplayName: string;
  providerName: string;
  serviceName: string;
  petName: string;
  scheduledStartAt: IsoDateString;
  scheduledEndAt: IsoDateString;
  subject: string;
  status: SupportCaseStatus;
  resolvedAt: IsoDateString | null;
}

export interface SupportCaseDetail extends SupportCaseSummary {
  descriptionText: string;
  adminNote: string | null;
  resolutionText: string | null;
}

export interface CreateSupportCaseInput {
  bookingId: Uuid;
  subject: string;
  descriptionText: string;
}

export interface UpdateSupportCaseAdminInput {
  caseId: Uuid;
  status: SupportCaseStatus;
  adminNote?: string | null;
  resolutionText?: string | null;
}
