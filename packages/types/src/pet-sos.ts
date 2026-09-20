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
