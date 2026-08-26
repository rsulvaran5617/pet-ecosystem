import type { TimestampedEntity, Uuid } from "./base";

export type PetAlertLostPetStatus =
  | "draft"
  | "pending_verification"
  | "pending_review"
  | "active"
  | "sighting_received"
  | "possible_match"
  | "found"
  | "closed"
  | "paused"
  | "withdrawn"
  | "rejected"
  | "expired"
  | "flagged";

export type PetAlertSightingStatus = "new" | "reviewed" | "possible_lead" | "discarded" | "flagged";
export type PetAlertLocationPrecision = "exact" | "approximate" | "city";
export type PetAlertContactMode = "internal" | "whatsapp" | "phone" | "email" | "private";
export type PetAlertCloseReason = "found_with_pet_alert" | "found_other_means" | "closed_not_found";
export type PetAlertCommunityStatus =
  | "sighting_open"
  | "sheltered_by_reporter"
  | "possible_owner_claim"
  | "owner_verified"
  | "reunited"
  | "closed"
  | "expired"
  | "flagged";
export type PetAlertApparentSize = "small" | "medium" | "large" | "unknown";
export type PetAlertApparentSex = "female" | "male" | "unknown";
export type PetAlertCommunityCloseReason = "reunited" | "animal_left_area" | "duplicate" | "closed_other";
export type PetAlertCommunityClaimStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PetAlertModerationTargetType = "lost_pet_alert" | "community_sighting" | "community_claim";
export type PetAlertModerationCaseStatus = "open" | "resolved" | "dismissed";
export type PetAlertModerationReason =
  | "sensitive_content"
  | "false_information"
  | "fraud"
  | "harassment"
  | "animal_safety"
  | "other";
export type PetAlertModerationAction = "flag" | "restore" | "close" | "reject_claim" | "dismiss";
export type PetAlertPublicDirectoryView = "lost" | "seen" | "found";
export type PetAlertPublicEventType = "lost_pet" | "community_sighting";
export type PetAlertPublicStatusGroup = "active" | "found";
export type PetAlertLostPetSource = "registered_pet" | "external_owner";

export interface PublicPetAlertDirectoryEvent {
  eventType: PetAlertPublicEventType;
  publicSlug: string;
  publicPath: string;
  status: PetAlertLostPetStatus | PetAlertCommunityStatus;
  statusGroup: PetAlertPublicStatusGroup;
  title: string;
  species: string;
  breed: string | null;
  city: string;
  region: string | null;
  country: string;
  occurredAt: string;
  publishedAt: string;
  updatedAt: string;
  summary: string;
  locationReference: string | null;
  photoUrl: string | null;
}

export interface PublicPetAlertDirectoryPage {
  items: PublicPetAlertDirectoryEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface PetAlertLostPet extends TimestampedEntity {
  id: Uuid;
  petId: Uuid | null;
  householdId: Uuid | null;
  createdByUserId: Uuid | null;
  sourceType: PetAlertLostPetSource;
  externalReporterId: Uuid | null;
  status: PetAlertLostPetStatus;
  alertSlug: string;
  petName: string;
  petSpecies: string;
  lastSeenAt: string;
  lastSeenCity: string;
  lastSeenRegion: string | null;
  lastSeenCountry: string;
  lastSeenReference: string | null;
  lastSeenNotes: string | null;
  locationPrecision: PetAlertLocationPrecision;
  publicDescription: string;
  distinctiveMarks: string | null;
  behaviorNotes: string | null;
  medicalPublicNotes: string | null;
  contactMode: PetAlertContactMode;
  shareEnabled: boolean;
  publishedAt: string | null;
  foundAt: string | null;
  closedAt: string | null;
  expiresAt: string | null;
  closeReason: PetAlertCloseReason | null;
}

export interface PetAlertExternalReportReview {
  alertId: Uuid;
  alertSlug: string;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  lastSeenAt: string;
  city: string;
  region: string | null;
  country: string;
  locationReference: string | null;
  publicDescription: string;
  distinctiveMarks: string | null;
  contactName: string;
  contactEmail: string;
  photoUrl: string | null;
  submittedAt: string;
}

export type PetAlertExternalReportDecision = "approve" | "reject";

export interface PublicPetAlertLostPet {
  alertSlug: string;
  status: PetAlertLostPetStatus;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  photoUrl: string | null;
  lastSeenAt: string;
  lastSeenCity: string;
  lastSeenRegion: string | null;
  lastSeenCountry: string;
  lastSeenReference: string | null;
  publicDescription: string;
  distinctiveMarks: string | null;
  behaviorNotes: string | null;
  medicalPublicNotes: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
}

export interface PetAlertLostPetSighting extends TimestampedEntity {
  id: Uuid;
  alertId: Uuid;
  reporterUserId: Uuid | null;
  reporterName: string | null;
  reporterContact: string | null;
  reporterContactConsent: boolean;
  sightedAt: string;
  city: string;
  region: string | null;
  country: string;
  locationReference: string | null;
  locationPrecision: PetAlertLocationPrecision;
  notes: string;
  status: PetAlertSightingStatus;
}

export interface CreatePetAlertLostPetInput {
  petId: Uuid;
  lastSeenAt: string;
  lastSeenCity: string;
  lastSeenRegion?: string | null;
  lastSeenCountry: string;
  lastSeenReference?: string | null;
  lastSeenNotes?: string | null;
  locationPrecision?: PetAlertLocationPrecision;
  latitude?: number | null;
  longitude?: number | null;
  publicDescription: string;
  distinctiveMarks?: string | null;
  behaviorNotes?: string | null;
  medicalPublicNotes?: string | null;
  contactMode?: PetAlertContactMode;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactConsent?: boolean;
  shareEnabled?: boolean;
  publish?: boolean;
}

export interface UpdatePetAlertLostPetInput {
  lastSeenAt: string;
  lastSeenCity: string;
  lastSeenRegion?: string | null;
  lastSeenCountry: string;
  lastSeenReference?: string | null;
  lastSeenNotes?: string | null;
  locationPrecision?: PetAlertLocationPrecision;
  latitude?: number | null;
  longitude?: number | null;
  publicDescription: string;
  distinctiveMarks?: string | null;
  behaviorNotes?: string | null;
  medicalPublicNotes?: string | null;
  contactMode?: PetAlertContactMode;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactConsent?: boolean;
  shareEnabled?: boolean;
}

export interface CreatePetAlertLostPetSightingInput {
  alertSlug: string;
  reporterName?: string | null;
  reporterContact?: string | null;
  reporterContactConsent?: boolean;
  sightedAt: string;
  city: string;
  region?: string | null;
  country: string;
  locationReference?: string | null;
  locationPrecision?: PetAlertLocationPrecision;
  latitude?: number | null;
  longitude?: number | null;
  notes: string;
}

export interface PetAlertCommunitySighting extends TimestampedEntity {
  id: Uuid;
  reportSlug: string;
  reporterUserId: Uuid;
  status: PetAlertCommunityStatus;
  animalSpecies: string;
  apparentBreed: string | null;
  apparentSize: PetAlertApparentSize;
  apparentSex: PetAlertApparentSex;
  primaryColor: string | null;
  collarDescription: string | null;
  distinctiveMarks: string | null;
  behaviorNotes: string | null;
  observedSituation: string;
  sightedAt: string;
  city: string;
  region: string | null;
  country: string;
  locationReference: string | null;
  locationPrecision: "approximate" | "city";
  shareEnabled: boolean;
  publishedAt: string;
  closedAt: string | null;
  expiresAt: string;
  closeReason: PetAlertCommunityCloseReason | null;
  photoUrls: string[];
}

export type PublicPetAlertCommunitySighting = Omit<
  PetAlertCommunitySighting,
  "closeReason" | "closedAt" | "createdAt" | "id" | "locationPrecision" | "reporterUserId" | "shareEnabled" | "updatedAt"
>;

export interface CreatePetAlertCommunitySightingInput {
  animalSpecies: string;
  apparentBreed?: string | null;
  apparentSize?: PetAlertApparentSize;
  apparentSex?: PetAlertApparentSex;
  primaryColor?: string | null;
  collarDescription?: string | null;
  distinctiveMarks?: string | null;
  behaviorNotes?: string | null;
  observedSituation: string;
  sightedAt: string;
  city: string;
  region?: string | null;
  country: string;
  locationReference?: string | null;
  locationPrecision?: "approximate" | "city";
  shareEnabled?: boolean;
}

export interface UploadPetAlertCommunityPhotoInput {
  reportId: Uuid;
  reportSlug: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileBytes: ArrayBuffer;
  displayOrder: number;
}

export interface PetAlertCommunityClaim extends TimestampedEntity {
  id: Uuid;
  communitySightingId: Uuid;
  reportSlug: string;
  claimantUserId: Uuid;
  status: PetAlertCommunityClaimStatus;
  claimedPetId: Uuid | null;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string | null;
  privateDetails: string;
  lostAt: string | null;
  lostCity: string | null;
  contactConsent: boolean;
  authorizedReporterName: string | null;
  authorizedReporterEmail: string | null;
  authorizedReporterPhone: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
}

export interface CreatePetAlertCommunityClaimInput {
  reportSlug: string;
  claimedPetId?: Uuid | null;
  privateDetails: string;
  lostAt?: string | null;
  lostCity?: string | null;
  contactConsent: boolean;
}

export interface PetAlertModerationCase {
  id: Uuid;
  targetType: PetAlertModerationTargetType;
  targetId: Uuid;
  targetStatus: string;
  targetTitle: string;
  targetSummary: string;
  reasonCode: PetAlertModerationReason;
  reportDetails: string | null;
  status: PetAlertModerationCaseStatus;
  resolutionAction: PetAlertModerationAction | null;
  resolutionReason: string | null;
  reportedAt: string;
  reviewedAt: string | null;
}

export interface PetAlertModerationHistoryEntry {
  id: Uuid;
  moderationCaseId: Uuid;
  oldStatus: string | null;
  newStatus: string;
  action: string;
  reason: string | null;
  changedByUserId: Uuid;
  createdAt: string;
}
