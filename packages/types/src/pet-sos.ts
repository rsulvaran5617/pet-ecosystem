import type { PetAlertCommunityStatus, PetAlertLostPetStatus, PublicPetAlertMapPoint } from "./pet-alert";

// Additive SOS contract. Existing Pet Alert DTOs and RPCs remain unchanged.
export type PetSosDisplayState = "lost" | "seen" | "sheltered" | "possible_match" | "reunited" | "closed" | "unpublished";

type PublicMapContent = Omit<PublicPetAlertMapPoint, "eventType" | "status">;

export type PetSosPublicMapEvent =
  | (PublicMapContent & { eventType: "lost_pet"; status: PetAlertLostPetStatus })
  | (PublicMapContent & { eventType: "community_sighting"; status: PetAlertCommunityStatus });

export interface PetSosFeatureFlags {
  map: boolean;
  sightings: boolean;
  nearbyNotifications: boolean;
}

export interface PetSosMapCursor {
  occurredAt: string;
  eventType: "lost_pet" | "community_sighting";
  publicSlug: string;
}

export interface PetSosMapFilters {
  bounds: { minLatitude: number; minLongitude: number; maxLatitude: number; maxLongitude: number };
  view?: "all" | "lost" | "seen" | "found";
  species?: string | null;
  occurredAfter?: string | null;
  limit?: number;
  cursor?: PetSosMapCursor | null;
}

export interface PetSosMapPage {
  items: PetSosPublicMapEvent[];
  nextCursor: PetSosMapCursor | null;
  hasMore: boolean;
}
