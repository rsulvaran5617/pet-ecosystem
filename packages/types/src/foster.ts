import type { TimestampedEntity, Uuid } from "./base";

export type ProtectiveHouseholdProfileStatus = "draft" | "pending_review" | "approved" | "rejected" | "suspended";
export type ProtectivePublicProfileModerationStatus = "draft" | "pending_review" | "approved" | "rejected" | "suspended";
export type ProtectiveContactPolicy = "platform_only" | "public_email" | "public_phone" | "external_link";

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
export type PetAdoptionShareStatus = "disabled" | "enabled";
export type PetAdoptionMediaType = "image" | "video";
export type PetAdoptionMediaModerationStatus = "pending" | "approved" | "rejected";
export type PetAdoptionListingReviewDecision = "approved" | "rejected" | "paused";
export type PetAdoptionMediaReviewDecision = "approved" | "rejected";
export type PetAdoptionApplicationStatus =
  | "submitted"
  | "withdrawn"
  | "in_review"
  | "rejected"
  | "approved"
  | "converted_to_transfer";

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

export interface ProtectivePublicProfile extends TimestampedEntity {
  id: Uuid;
  householdId: Uuid;
  publicSlug: string;
  displayName: string;
  mission: string | null;
  publicStory: string | null;
  city: string;
  stateRegion: string | null;
  countryCode: string;
  contactPolicy: ProtectiveContactPolicy;
  publicContactLabel: string | null;
  publicContactValue: string | null;
  needsSummary: string | null;
  isPublic: boolean;
  moderationStatus: ProtectivePublicProfileModerationStatus;
  reviewNotes: string | null;
  reviewedByUserId: Uuid | null;
  reviewedAt: string | null;
  createdByUserId: Uuid;
}

export interface ProtectivePublicProfileInput {
  householdId: Uuid;
  displayName: string;
  mission?: string | null;
  publicStory?: string | null;
  city: string;
  stateRegion?: string | null;
  countryCode?: string;
  contactPolicy?: ProtectiveContactPolicy;
  publicContactLabel?: string | null;
  publicContactValue?: string | null;
  needsSummary?: string | null;
}

export interface ProtectivePublicProfileReviewInput {
  decision: "approved" | "rejected" | "suspended";
  notes?: string | null;
}

export interface AdminProtectivePublicProfile extends ProtectivePublicProfile {
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
  publicSlug: string | null;
  shareStatus: PetAdoptionShareStatus;
  sharePublishedAt: string | null;
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

export interface PublicPetAdoptionMedia {
  id: Uuid;
  mediaType: PetAdoptionMediaType;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  displayOrder: number;
  isCover: boolean;
  signedUrl: string | null;
}

export interface PublicProtectiveHouseholdSummary {
  publicSlug: string;
  displayName: string;
  mission: string | null;
  publicStory: string | null;
  city: string;
  stateRegion: string | null;
  countryCode: string;
  contactPolicy: ProtectiveContactPolicy;
  publicContactLabel: string | null;
  publicContactValue: string | null;
  needsSummary: string | null;
}

export interface PublicPetAdoptionProfile {
  publicSlug: string;
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
  sharePublishedAt: string | null;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  petSex: string;
  petBirthDate: string | null;
  petIsSterilized: boolean | null;
  media: PublicPetAdoptionMedia[];
  protectiveHousehold: PublicProtectiveHouseholdSummary;
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

export interface PetAdoptionApplication {
  id: Uuid;
  listingId: Uuid;
  petId: Uuid;
  protectiveHouseholdId: Uuid;
  applicantUserId: Uuid;
  applicantHouseholdId: Uuid | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string | null;
  housingType: string;
  hasChildren: boolean | null;
  hasOtherPets: boolean | null;
  petExperience: string;
  motivation: string;
  availabilityNotes: string | null;
  commitmentAcknowledged: boolean;
  status: PetAdoptionApplicationStatus;
  submittedAt: string;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  listingTitle: string;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  protectiveHouseholdName: string;
}

export interface PetAdoptionApplicationInput {
  listingId: Uuid;
  applicantHouseholdId?: Uuid | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  housingType: string;
  hasChildren?: boolean | null;
  hasOtherPets?: boolean | null;
  petExperience: string;
  motivation: string;
  availabilityNotes?: string | null;
  commitmentAcknowledged: boolean;
}

export type AdminPetAdoptionApplication = PetAdoptionApplication;
