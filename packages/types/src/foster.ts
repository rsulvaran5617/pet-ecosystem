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
export type PetAdoptionListingStatus = "draft" | "pending_review" | "published" | "paused" | "closed" | "rejected";
export type PetAdoptionMediaType = "image" | "video";
export type PetAdoptionMediaModerationStatus = "pending" | "approved" | "rejected";
export type PetAdoptionListingReviewDecision = "approved" | "rejected" | "paused";
export type PetAdoptionMediaReviewDecision = "approved" | "rejected";

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

export interface PetAdoptionListingMedia {
  id: Uuid;
  listingId: Uuid;
  mediaType: PetAdoptionMediaType;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  displayOrder: number;
  isCover: boolean;
  moderationStatus: PetAdoptionMediaModerationStatus;
  signedUrl: string | null;
  createdByUserId: Uuid;
  createdAt: string;
  updatedAt: string;
}

export interface PetAdoptionListing {
  id: Uuid;
  petId: Uuid;
  householdId: Uuid;
  status: PetAdoptionListingStatus;
  title: string;
  publicStory: string | null;
  personalityNotes: string | null;
  publicHealthSummary: string | null;
  adoptionRequirements: string | null;
  city: string;
  stateRegion: string | null;
  countryCode: string;
  compatibilityChildren: string | null;
  compatibilityDogs: string | null;
  compatibilityCats: string | null;
  specialNeedsNotes: string | null;
  publishedAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
  reviewedByUserId: Uuid | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdByUserId: Uuid;
  createdAt: string;
  updatedAt: string;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  petSex: string;
  petBirthDate: string | null;
  petIsSterilized: boolean | null;
  householdName: string;
  media: PetAdoptionListingMedia[];
}

export interface PetAdoptionListingInput {
  listingId: Uuid;
  title: string;
  publicStory?: string | null;
  personalityNotes?: string | null;
  publicHealthSummary?: string | null;
  adoptionRequirements?: string | null;
  city: string;
  stateRegion?: string | null;
  countryCode?: string;
  compatibilityChildren?: string | null;
  compatibilityDogs?: string | null;
  compatibilityCats?: string | null;
  specialNeedsNotes?: string | null;
}

export interface PetAdoptionListingReviewInput {
  decision: PetAdoptionListingReviewDecision;
  notes?: string | null;
}

export interface PetAdoptionMediaReviewInput {
  decision: PetAdoptionMediaReviewDecision;
  notes?: string | null;
}

export interface PetAdoptionMediaUploadInput {
  listingId: Uuid;
  fileUri: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number | null;
  isCover?: boolean;
}
