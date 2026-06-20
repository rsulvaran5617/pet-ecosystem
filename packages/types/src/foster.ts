import type { TimestampedEntity, Uuid } from "./base";

export type ProtectiveHouseholdProfileStatus = "draft" | "pending_review" | "approved" | "rejected" | "suspended";

export type ProtectiveHouseholdOrganizationType =
  | "individual_rescuer"
  | "foster_home"
  | "foundation"
  | "temporary_home"
  | "other";

export type ProtectiveHouseholdReviewDecision = "approved" | "rejected" | "suspended";
export type PetCustodyType = "owner" | "foster" | "rescue" | "temporary";
export type PetCustodyStatus = "active" | "ended" | "transferred" | "cancelled";
export type PetTransferStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

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

export interface PetTransferRecord {
  id: Uuid;
  petId: Uuid;
  petName: string;
  petSpecies: string;
  fromHouseholdId: Uuid;
  fromHouseholdName: string;
  toHouseholdId: Uuid | null;
  toHouseholdName: string | null;
  recipientEmail: string;
  recipientUserId: Uuid | null;
  status: PetTransferStatus;
  consentSnapshot: Record<string, unknown>;
  transferNotes: string | null;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
}

export interface PetCustodyContext {
  id: Uuid;
  petId: Uuid;
  householdId: Uuid;
  householdName: string;
  custodyType: PetCustodyType;
  status: PetCustodyStatus;
  startedAt: string;
  endedAt: string | null;
  createdByUserId: Uuid;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePetTransferInvitationInput {
  petId: Uuid;
  fromHouseholdId: Uuid;
  recipientEmail: string;
  transferNotes?: string | null;
}
