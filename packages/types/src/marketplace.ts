import type { IsoDateString, TimestampedEntity, Uuid } from "./base";
import type { BookingMode } from "./bookings";

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

export interface ProviderOrganization extends TimestampedEntity {
  id: Uuid;
  ownerUserId: Uuid;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  approvalStatus: ProviderApprovalStatus;
  isPublic: boolean;
}

export interface ProviderPublicProfile extends TimestampedEntity {
  organizationId: Uuid;
  headline: string;
  bio: string;
  avatarUrl: string | null;
  isPublic: boolean;
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
  selectedAt: IsoDateString;
}
