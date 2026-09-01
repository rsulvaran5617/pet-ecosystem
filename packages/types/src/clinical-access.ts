import type { Uuid } from "./base";
import type { PetConditionStatus } from "./health";

export type PetClinicalAccessDuration = "1_hour" | "1_day" | "1_week";
export type PetClinicalAccessStatus = "active" | "revoked" | "expired";
export type ClinicalProfessionalType = "veterinarian" | "veterinary_technician" | "other";
export type ClinicalProfessionalVerificationStatus = "draft" | "pending" | "verified" | "rejected" | "suspended" | "expired";

export interface ClinicalProfessionalProfile {
  id: Uuid;
  professionalName: string;
  professionalType: ClinicalProfessionalType;
  licenseReference: string;
  jurisdiction: string;
  countryCode: string;
  providerOrganizationId: Uuid | null;
  organizationName: string | null;
  verificationStatus: ClinicalProfessionalVerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
  verificationExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalProfessionalContext {
  profile: ClinicalProfessionalProfile | null;
  organizationOptions: Array<{ id: Uuid; name: string }>;
}

export interface AuthenticatedClinicalAccessContext {
  expiresAt: string;
  professional: null | Pick<ClinicalProfessionalProfile, "professionalName" | "professionalType" | "organizationName" | "verificationStatus" | "verificationExpiresAt">;
}

export interface AdminClinicalProfessionalSummary {
  id: Uuid;
  userId: Uuid;
  professionalName: string;
  professionalType: ClinicalProfessionalType;
  licenseReference: string;
  jurisdiction: string;
  countryCode: string;
  organizationName: string | null;
  verificationStatus: ClinicalProfessionalVerificationStatus;
  submittedAt: string | null;
}

export interface UpsertClinicalProfessionalProfileInput {
  professionalName: string;
  professionalType: ClinicalProfessionalType;
  licenseReference: string;
  jurisdiction: string;
  countryCode: string;
  providerOrganizationId?: Uuid | null;
}

export type ClinicalWriteScope = "create_encounter" | "record_diagnosis" | "record_vaccine" | "record_recommendation" | "record_treatment" | "upload_clinical_document";
export type ClinicalWriteRequestStatus = "requested" | "approved" | "rejected" | "revoked" | "expired" | "completed";

export interface ClinicalWriteRequest {
  id: Uuid;
  professionalName?: string;
  professionalType?: ClinicalProfessionalType;
  organizationName?: string | null;
  requestedScopes: ClinicalWriteScope[];
  requestNote: string | null;
  status: ClinicalWriteRequestStatus;
  requestedAt?: string;
  expiresAt: string;
  decisionNote: string | null;
}

export type ClinicalEncounterType = "consultation" | "vaccination" | "follow_up" | "emergency" | "other";
export type ClinicalEntryType = "diagnosis" | "vaccine" | "recommendation" | "treatment" | "finding";
export interface FinalizeClinicalEncounterInput { requestId: Uuid; idempotencyKey: Uuid; attendedAt: string; encounterType: ClinicalEncounterType; summary: string; entries: Array<{ type: ClinicalEntryType; title: string; details?: string | null }> }

export type ClinicalDocumentType = "prescription" | "lab_result" | "imaging_report" | "clinical_report" | "other";

export interface ClinicalTimelineEntry {
  id: Uuid;
  type: ClinicalEntryType;
  title: string;
  details: string | null;
  correctsEntryId: Uuid | null;
  correctionReason: string | null;
  createdAt: string;
}

export interface ClinicalTimelineDocument {
  id: Uuid;
  title: string;
  type: ClinicalDocumentType;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface ClinicalAuthorizationHistoryItem {
  requestId: Uuid;
  requestedScopes: ClinicalWriteScope[];
  approvedScopes: ClinicalWriteScope[];
  requestedAt: string;
  reviewedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  status: ClinicalWriteRequestStatus;
}

export interface ClinicalTimelineEncounter {
  id: Uuid;
  petId: Uuid;
  petName: string;
  attendedAt: string;
  encounterType: ClinicalEncounterType;
  summary: string;
  status: "finalized" | "corrected";
  finalizedAt: string;
  professionalName: string;
  organizationName: string | null;
  entries: ClinicalTimelineEntry[];
  documents: ClinicalTimelineDocument[];
  authorization: ClinicalAuthorizationHistoryItem;
}

export interface PrepareClinicalDocumentInput {
  encounterId: Uuid;
  idempotencyKey: Uuid;
  title: string;
  documentType: ClinicalDocumentType;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  fileSizeBytes: number;
  checksumSha256?: string | null;
}

export interface PreparedClinicalDocumentUpload { documentId: Uuid; bucket: string; path: string }

export interface ClinicalAuditEvent {
  id: Uuid;
  event: string;
  occurredAt: string;
  professionalName: string | null;
  organizationName: string | null;
  petReference: string | null;
  authorizationStatus: string | null;
}

export interface PetClinicalAccessGrant {
  id: Uuid;
  petId: Uuid;
  durationCode: PetClinicalAccessDuration;
  status: PetClinicalAccessStatus;
  expiresAt: string;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  createdAt: string;
}

export interface CreatedPetClinicalAccess extends PetClinicalAccessGrant {
  token: string;
}

export interface PublicPetClinicalAccess {
  grant: { scope: "read_only"; expiresAt: string };
  pet: { name: string; species: string; breed: string | null; sex: string; birthDate: string | null };
  vaccines: Array<{ name: string; administeredOn: string; nextDueOn: string | null; notes: string | null }>;
  allergies: Array<{ allergen: string; reaction: string | null; notes: string | null }>;
  conditions: Array<{
    name: string;
    status: PetConditionStatus;
    diagnosedOn: string | null;
    isCritical: boolean;
    notes: string | null;
  }>;
  documents: Array<{ title: string; documentType: string; issuedAt: string | null; expiresAt: string | null }>;
}
