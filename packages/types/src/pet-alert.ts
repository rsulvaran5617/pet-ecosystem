import type { TimestampedEntity, Uuid } from "./base";

export type PetAlertLostPetStatus =
  | "draft"
  | "active"
  | "sighting_received"
  | "possible_match"
  | "found"
  | "closed"
  | "expired"
  | "flagged";

export type PetAlertSightingStatus = "new" | "reviewed" | "possible_lead" | "discarded" | "flagged";
export type PetAlertLocationPrecision = "exact" | "approximate" | "city";
export type PetAlertContactMode = "internal" | "whatsapp" | "phone" | "email" | "private";
export type PetAlertCloseReason = "found_with_pet_alert" | "found_other_means" | "closed_not_found";

export interface PetAlertLostPet extends TimestampedEntity {
  id: Uuid;
  petId: Uuid;
  householdId: Uuid;
  createdByUserId: Uuid;
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
