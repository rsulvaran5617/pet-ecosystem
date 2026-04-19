import type { TimestampedEntity, Uuid } from "./base";

export type PetConditionStatus = "active" | "managed" | "resolved";

export interface PetVaccine extends TimestampedEntity {
  id: Uuid;
  petId: Uuid;
  createdByUserId: Uuid;
  name: string;
  administeredOn: string;
  nextDueOn: string | null;
  notes: string | null;
}

export interface PetAllergy extends TimestampedEntity {
  id: Uuid;
  petId: Uuid;
  createdByUserId: Uuid;
  allergen: string;
  reaction: string | null;
  notes: string | null;
}

export interface PetCondition extends TimestampedEntity {
  id: Uuid;
  petId: Uuid;
  createdByUserId: Uuid;
  name: string;
  status: PetConditionStatus;
  diagnosedOn: string | null;
  isCritical: boolean;
  notes: string | null;
}

export interface PetHealthDashboard {
  petId: Uuid;
  vaccineCount: number;
  allergyCount: number;
  conditionCount: number;
  activeConditionCount: number;
  criticalConditionCount: number;
  latestVaccineDate: string | null;
  nextVaccineDueDate: string | null;
  allergyNames: string[];
  criticalConditionNames: string[];
}

export interface PetHealthDetail {
  dashboard: PetHealthDashboard;
  vaccines: PetVaccine[];
  allergies: PetAllergy[];
  conditions: PetCondition[];
}

export interface CreatePetVaccineInput {
  name: string;
  administeredOn: string;
  nextDueOn?: string | null;
  notes?: string | null;
}

export interface UpdatePetVaccineInput {
  name: string;
  administeredOn: string;
  nextDueOn?: string | null;
  notes?: string | null;
}

export interface CreatePetAllergyInput {
  allergen: string;
  reaction?: string | null;
  notes?: string | null;
}

export interface UpdatePetAllergyInput {
  allergen: string;
  reaction?: string | null;
  notes?: string | null;
}

export interface CreatePetConditionInput {
  name: string;
  status?: PetConditionStatus;
  diagnosedOn?: string | null;
  isCritical?: boolean;
  notes?: string | null;
}

export interface UpdatePetConditionInput {
  name: string;
  status?: PetConditionStatus;
  diagnosedOn?: string | null;
  isCritical?: boolean;
  notes?: string | null;
}
