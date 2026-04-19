import type { TimestampedEntity, Uuid } from "./base";

export type PetSex = "female" | "male" | "unknown";
export type PetDocumentType = "vaccination_record" | "medical_record" | "identity" | "insurance" | "other";

export interface PetSummary extends TimestampedEntity {
  id: Uuid;
  householdId: Uuid;
  createdByUserId: Uuid;
  name: string;
  species: string;
  breed: string | null;
  sex: PetSex;
  birthDate: string | null;
  notes: string | null;
  documentCount: number;
}

export interface PetDocument extends TimestampedEntity {
  id: Uuid;
  petId: Uuid;
  createdByUserId: Uuid;
  title: string;
  documentType: PetDocumentType;
  fileName: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
}

export interface PetDetail {
  pet: PetSummary;
  documents: PetDocument[];
}

export interface CreatePetInput {
  householdId: Uuid;
  name: string;
  species: string;
  breed?: string | null;
  sex?: PetSex;
  birthDate?: string | null;
  notes?: string | null;
}

export interface UpdatePetInput {
  name: string;
  species: string;
  breed?: string | null;
  sex?: PetSex;
  birthDate?: string | null;
  notes?: string | null;
}

export interface UploadPetDocumentInput {
  title: string;
  documentType: PetDocumentType;
  fileName: string;
  mimeType?: string | null;
  fileBytes: ArrayBuffer;
}
