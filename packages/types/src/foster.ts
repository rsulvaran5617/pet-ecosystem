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
export type PetAdoptionListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "paused"
  | "closed"
  | "rejected"
  | "adopted";
export type PetAdoptionShareStatus = "disabled" | "enabled";
export type PetAdoptionMediaType = "image" | "video";
export type PetAdoptionMediaModerationStatus = "pending" | "approved" | "rejected";
export type PetAdoptionListingReviewDecision = "approved" | "rejected" | "paused";
export type PetAdoptionMediaReviewDecision = "approved" | "rejected";
export type PetAdoptionApplicationStatus =
  | "submitted"
  | "withdrawn"
  | "in_review"
  | "interview"
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
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  logoUrl: string | null;
  logoStorageBucket: string | null;
  logoStoragePath: string | null;
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
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  whatsappUrl?: string | null;
}

export interface ProtectivePublicProfileReviewInput {
  decision: "approved" | "rejected" | "suspended";
  notes?: string | null;
}

export interface ProtectivePublicProfileLogoUploadInput {
  profileId: Uuid;
  householdId: Uuid;
  fileUri?: string;
  fileBody?: Blob;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number | null;
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
  adoptionApplicationId: Uuid | null;
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
  responsibilityAcknowledgedAt: string | null;
  responsibilityAcknowledgedByUserId: Uuid | null;
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
  protectiveWebsiteUrl: string | null;
  protectiveInstagramUrl: string | null;
  protectiveFacebookUrl: string | null;
  protectiveTiktokUrl: string | null;
  protectiveWhatsappUrl: string | null;
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
  logoUrl: string | null;
  city: string;
  stateRegion: string | null;
  countryCode: string;
  contactPolicy: ProtectiveContactPolicy;
  publicContactLabel: string | null;
  publicContactValue: string | null;
  needsSummary: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
}

export interface PublicPetAdoptionProfile {
  listingStatus: PetAdoptionListingStatus;
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
  fileUri?: string;
  fileBody?: Blob;
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

export interface PetAdoptionApplicationStatusHistory {
  id: Uuid;
  applicationId: Uuid;
  fromStatus: PetAdoptionApplicationStatus | null;
  toStatus: PetAdoptionApplicationStatus;
  changedByUserId: Uuid;
  changedByEmail: string | null;
  changeNotes: string | null;
  createdAt: string;
}

export interface PetAdoptionApplicationStatusUpdateInput {
  applicationId: Uuid;
  status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">;
  notes?: string | null;
}

export type AdoptionCommitmentRequirementPolicy = "informational" | "required_before_approval" | "required_before_transfer";

export type AdoptionCommitmentDocumentStatus = "pending" | "received" | "reviewed" | "needs_correction";

export interface ProtectiveAdoptionCommitmentTemplate {
  id: Uuid;
  protectiveHouseholdId: Uuid;
  title: string;
  description: string | null;
  requirementPolicy: AdoptionCommitmentRequirementPolicy;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  isActive: boolean;
  createdByUserId: Uuid;
  createdAt: string;
  updatedAt: string;
  signedUrl?: string | null;
}

export interface ProtectiveAdoptionCommitmentTemplateUploadInput {
  householdId: Uuid;
  title: string;
  description?: string | null;
  requirementPolicy: AdoptionCommitmentRequirementPolicy;
  fileUri?: string;
  fileBody?: Blob;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number | null;
}

export interface ApplicationCommitmentDocument {
  id: Uuid;
  applicationId: Uuid;
  templateId: Uuid | null;
  status: AdoptionCommitmentDocumentStatus;
  storageBucket: string | null;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  submittedByUserId: Uuid | null;
  reviewedByUserId: Uuid | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  signedUrl?: string | null;
}

export interface ApplicationCommitmentDocumentUploadInput {
  applicationId: Uuid;
  templateId?: Uuid | null;
  fileUri?: string;
  fileBody?: Blob;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number | null;
}

export interface ApplicationCommitmentDocumentReviewInput {
  applicationId: Uuid;
  status: Exclude<AdoptionCommitmentDocumentStatus, "pending" | "received">;
  notes?: string | null;
}

export interface PetAdoptionClosureDetail {
  applicationId: Uuid;
  applicationStatus: PetAdoptionApplicationStatus;
  listingId: Uuid;
  listingStatus: PetAdoptionListingStatus;
  petId: Uuid;
  petName: string;
  protectiveHouseholdId: Uuid;
  protectiveHouseholdName: string;
  applicantUserId: Uuid;
  applicantEmail: string;
  transferId: Uuid | null;
  transferStatus: PetTransferStatus | null;
  transferCreatedAt: string | null;
  transferAcceptedAt: string | null;
  toHouseholdId: Uuid | null;
  toHouseholdName: string | null;
}
