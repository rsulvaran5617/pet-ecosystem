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
