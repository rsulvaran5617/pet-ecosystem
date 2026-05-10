import type { IsoDateString, TimestampedEntity, Uuid } from "./base";
import type { BookingMode, BookingSlot } from "./bookings";

export type ProviderApprovalStatus = "pending" | "approved" | "rejected";
export type ProviderServiceCategory =
  | "walking"
  | "grooming"
  | "boarding"
  | "daycare"
  | "training"
  | "veterinary"
  | "sitting"
  | "other";
export type ProviderDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ProviderLocationPrecision = "exact" | "approximate" | "city";

export interface ProviderOrganization extends TimestampedEntity {
  id: Uuid;
  ownerUserId: Uuid;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  approvalStatus: ProviderApprovalStatus;
  isPublic: boolean;
  avatarUrl?: string | null;
}

export interface ProviderPublicProfile extends TimestampedEntity {
  organizationId: Uuid;
  headline: string;
  bio: string;
  avatarUrl: string | null;
  avatarStorageBucket: string | null;
  avatarStoragePath: string | null;
  isPublic: boolean;
}

export interface ProviderPublicLocation extends TimestampedEntity {
  organizationId: Uuid;
  displayLabel: string;
  addressLinePublic: string | null;
  city: string;
  stateRegion: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
  locationPrecision: ProviderLocationPrecision;
  isPublic: boolean;
  verifiedAt: IsoDateString | null;
}

export interface ProviderService extends TimestampedEntity {
  id: Uuid;
  organizationId: Uuid;
  name: string;
  category: ProviderServiceCategory;
  shortDescription: string | null;
  speciesServed: string[];
  durationMinutes: number | null;
  bookingMode: BookingMode;
  basePriceCents: number;
  currencyCode: string;
  cancellationWindowHours: number;
  isPublic: boolean;
  isActive: boolean;
}

export interface ProviderAvailabilitySlot extends TimestampedEntity {
  id: Uuid;
  organizationId: Uuid;
  dayOfWeek: ProviderDayOfWeek;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface MarketplaceProviderSummary {
  organizationId: Uuid;
  slug: string;
  name: string;
  city: string;
  countryCode: string;
  headline: string;
  avatarUrl: string | null;
  categories: ProviderServiceCategory[];
  speciesServed: string[];
  serviceCount: number;
  availableDays: ProviderDayOfWeek[];
  publicLocation?: ProviderPublicLocation | null;
  distanceKm?: number | null;
}

export interface MarketplaceProviderDetail extends MarketplaceProviderSummary {
  bio: string;
  services: ProviderService[];
  availability: ProviderAvailabilitySlot[];
}

export interface MarketplaceCategoryHighlight {
  category: ProviderServiceCategory;
  providerCount: number;
  serviceCount: number;
}

export interface MarketplaceHomeSnapshot {
  featuredProviders: MarketplaceProviderSummary[];
  categoryHighlights: MarketplaceCategoryHighlight[];
  cityHighlights: string[];
  speciesHighlights: string[];
}

export interface MarketplaceSearchFilters {
  query?: string;
  category?: ProviderServiceCategory | null;
  city?: string | null;
  species?: string | null;
  nearLatitude?: number | null;
  nearLongitude?: number | null;
  maxDistanceKm?: number | null;
}

export interface MarketplaceServiceSelection {
  householdId: Uuid | null;
  petId: Uuid | null;
  providerId: Uuid;
  serviceId: Uuid;
  providerName?: string;
  serviceName?: string;
  serviceDurationMinutes?: number | null;
  serviceBookingMode?: BookingMode;
  serviceBasePriceCents?: number;
  serviceCurrencyCode?: string;
  serviceCancellationWindowHours?: number;
  selectedBookingSlot?: BookingSlot | null;
  selectedAt: IsoDateString;
}
