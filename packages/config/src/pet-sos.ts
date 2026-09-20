import type {
  PetAlertCommunityStatus,
  PetAlertLostPetStatus,
  PetSosDisplayState,
  PetSosFeatureFlags
} from "@pet/types";

const lostStates: Record<PetAlertLostPetStatus, PetSosDisplayState> = {
  draft: "unpublished",
  pending_verification: "unpublished",
  pending_review: "unpublished",
  active: "lost",
  sighting_received: "lost",
  possible_match: "possible_match",
  found: "reunited",
  closed: "closed",
  paused: "unpublished",
  withdrawn: "closed",
  rejected: "unpublished",
  expired: "closed",
  flagged: "unpublished"
};

const communityStates: Record<PetAlertCommunityStatus, PetSosDisplayState> = {
  sighting_open: "seen",
  sheltered_by_reporter: "sheltered",
  possible_owner_claim: "possible_match",
  owner_verified: "possible_match",
  reunited: "reunited",
  closed: "closed",
  expired: "closed",
  flagged: "unpublished"
};

export type PetSosStatusInput =
  | { eventType: "lost_pet"; status: PetAlertLostPetStatus }
  | { eventType: "community_sighting"; status: PetAlertCommunityStatus };

// Presentation only: this does not authorize publication or a state transition.
export function getPetSosDisplayState(event: PetSosStatusInput): PetSosDisplayState {
  return event.eventType === "lost_pet" ? lostStates[event.status] : communityStates[event.status];
}

export type PetSosFlagInput = Partial<Record<keyof PetSosFeatureFlags, string>>;

// Build-time UX gates, not access control. No implicit enablement in development.
export function resolvePetSosFeatureFlags(input: PetSosFlagInput = {}): Readonly<PetSosFeatureFlags> {
  const map = input.map === "true";
  return Object.freeze({
    map,
    sightings: map && input.sightings === "true",
    nearbyNotifications: map && input.nearbyNotifications === "true"
  });
}
