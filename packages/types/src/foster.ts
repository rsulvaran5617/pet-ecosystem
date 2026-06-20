import type { TimestampedEntity, Uuid } from "./base";

export type ProtectiveHouseholdProfileStatus = "draft" | "pending_review" | "approved" | "rejected" | "suspended";

export type ProtectiveHouseholdOrganizationType =
  | "individual_rescuer"
  | "foster_home"
  | "foundation"
  | "temporary_home"
  | "other";

export type ProtectiveHouseholdReviewDecision = "approved" | "rejected" | "suspended";

export interface ProtectiveHouseholdProfile extends TimestampedEntity {
  householdId: Uuid;
  status: ProtectiveHouseholdProfileStatus;
  displayName: string;
  organizationType: ProtectiveHouseholdOrganizationType;
  city: string;
  stateRegion: string | null;
  countryCode: string;
  contactNotes: string | null;
  publicNotes: string | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedByUserId: Uuid | null;
  reviewedAt: string | null;
  createdByUserId: Uuid;
}

export interface ProtectiveHouseholdProfileInput {
  householdId: Uuid;
  displayName: string;
  organizationType: ProtectiveHouseholdOrganizationType;
  city: string;
  stateRegion?: string | null;
  countryCode?: string;
  contactNotes?: string | null;
  publicNotes?: string | null;
}

export interface ProtectiveHouseholdProfileReviewInput {
  decision: ProtectiveHouseholdReviewDecision;
  notes?: string | null;
}

export interface AdminProtectiveHouseholdProfile extends ProtectiveHouseholdProfile {
  householdName: string | null;
  createdByEmail: string | null;
}
