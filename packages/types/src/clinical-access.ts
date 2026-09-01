import type { Uuid } from "./base";
import type { PetConditionStatus } from "./health";

export type PetClinicalAccessDuration = "1_hour" | "1_day" | "1_week";
export type PetClinicalAccessStatus = "active" | "revoked" | "expired";

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
