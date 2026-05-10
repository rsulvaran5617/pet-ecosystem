import { providerServiceCategoryOrder } from "@pet/config";
import type {
  Database,
  MarketplaceHomeSnapshot,
  MarketplaceProviderDetail,
  MarketplaceProviderSummary,
  MarketplaceSearchFilters,
  ProviderAvailabilitySlot,
  ProviderDayOfWeek,
  ProviderOrganization,
  ProviderPublicLocation,
  ProviderPublicProfile,
  ProviderService,
  ProviderServiceCategory,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MarketplaceSupabaseClient = SupabaseClient<Database>;
type ProviderOrganizationRow = Database["public"]["Tables"]["provider_organizations"]["Row"];
type ProviderPublicProfileRow = Database["public"]["Tables"]["provider_public_profiles"]["Row"];
type ProviderPublicLocationRow = Database["public"]["Tables"]["provider_public_locations"]["Row"];
type ProviderServiceRow = Database["public"]["Tables"]["provider_services"]["Row"];
type ProviderAvailabilityRow = Database["public"]["Tables"]["provider_availability"]["Row"];
const providerAvatarsBucketId = "provider-avatars";

type ProviderCatalogRecord = {
  organization: ProviderOrganization;
  profile: ProviderPublicProfile;
  publicLocation: ProviderPublicLocation | null;
  services: ProviderService[];
  availability: ProviderAvailabilitySlot[];
};

export interface MarketplaceApiClient {
  getMarketplaceHome(): Promise<MarketplaceHomeSnapshot>;
  listMarketplaceProviders(filters?: MarketplaceSearchFilters): Promise<MarketplaceProviderSummary[]>;
  getMarketplaceProvider(providerId: Uuid): Promise<MarketplaceProviderDetail>;
  listMarketplaceProviderLocations(): Promise<ProviderPublicLocation[]>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function isMissingProviderPublicLocationsError(error: { code?: string; message: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    error?.code === "PGRST202" ||
    ((error?.message.toLowerCase().includes("provider_public_locations") ||
      error?.message.toLowerCase().includes("list_marketplace_provider_locations")) &&
      error.message.toLowerCase().includes("schema cache"))
  );
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function mapProviderOrganization(row: ProviderOrganizationRow): ProviderOrganization {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    countryCode: row.country_code,
    approvalStatus: row.approval_status,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getProviderAvatarSignedUrl(supabase: MarketplaceSupabaseClient, row: ProviderPublicProfileRow) {
  if (row.avatar_storage_bucket === providerAvatarsBucketId && row.avatar_storage_path) {
    const { data, error } = await supabase.storage.from(providerAvatarsBucketId).createSignedUrl(row.avatar_storage_path, 60 * 30);

    if (!error) {
      return data.signedUrl;
    }
  }

  return row.avatar_url;
}

function mapProviderPublicProfile(
  row: ProviderPublicProfileRow,
  avatarUrl: string | null = row.avatar_url
): ProviderPublicProfile {
  return {
    organizationId: row.organization_id,
    headline: row.headline,
    bio: row.bio,
    avatarUrl,
    avatarStorageBucket: row.avatar_storage_bucket,
    avatarStoragePath: row.avatar_storage_path,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProviderPublicLocation(row: ProviderPublicLocationRow): ProviderPublicLocation {
  return {
    organizationId: row.organization_id,
    displayLabel: row.display_label,
    addressLinePublic: row.address_line_public,
    city: row.city,
    stateRegion: row.state_region,
    countryCode: row.country_code,
    latitude: row.latitude,
    longitude: row.longitude,
    locationPrecision: row.location_precision,
    isPublic: row.is_public,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProviderService(row: ProviderServiceRow): ProviderService {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    category: row.category,
    shortDescription: row.short_description,
    speciesServed: row.species_served ?? [],
    durationMinutes: row.duration_minutes,
    bookingMode: row.booking_mode,
    basePriceCents: row.base_price_cents,
    currencyCode: row.currency_code,
    cancellationWindowHours: row.cancellation_window_hours,
    isPublic: row.is_public,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProviderAvailability(row: ProviderAvailabilityRow): ProviderAvailabilitySlot {
  return {
    id: row.id,
    organizationId: row.organization_id,
    dayOfWeek: row.day_of_week as ProviderDayOfWeek,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

function uniqueCategories(values: ProviderServiceCategory[]) {
  return Array.from(new Set(values)).sort(
    (left, right) => providerServiceCategoryOrder.indexOf(left) - providerServiceCategoryOrder.indexOf(right)
  );
}

function uniqueDays(values: ProviderDayOfWeek[]) {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function calculateDistanceKm(originLatitude: number, originLongitude: number, targetLatitude: number, targetLongitude: number) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(targetLatitude - originLatitude);
  const deltaLongitude = toRadians(targetLongitude - originLongitude);
  const originLatitudeRadians = toRadians(originLatitude);
  const targetLatitudeRadians = toRadians(targetLatitude);
  const halfChordLength =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(originLatitudeRadians) * Math.cos(targetLatitudeRadians) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(halfChordLength), Math.sqrt(1 - halfChordLength));
}

function getProviderDistanceKm(record: ProviderCatalogRecord, filters?: MarketplaceSearchFilters) {
  if (
    typeof filters?.nearLatitude !== "number" ||
    typeof filters.nearLongitude !== "number" ||
    !record.publicLocation
  ) {
    return null;
  }

  return calculateDistanceKm(
    filters.nearLatitude,
    filters.nearLongitude,
    record.publicLocation.latitude,
    record.publicLocation.longitude
  );
}

function buildProviderSummary(record: ProviderCatalogRecord, filters?: MarketplaceSearchFilters): MarketplaceProviderSummary {
  const distanceKm = getProviderDistanceKm(record, filters);

  return {
    organizationId: record.organization.id,
    slug: record.organization.slug,
    name: record.organization.name,
    city: record.organization.city,
    countryCode: record.organization.countryCode,
    headline: record.profile.headline,
    avatarUrl: record.profile.avatarUrl,
    categories: uniqueCategories(record.services.map((service) => service.category)),
    speciesServed: uniqueStrings(record.services.flatMap((service) => service.speciesServed)),
    serviceCount: record.services.length,
    availableDays: uniqueDays(record.availability.map((slot) => slot.dayOfWeek)),
    publicLocation: record.publicLocation,
    distanceKm
  };
}

function buildProviderDetail(record: ProviderCatalogRecord, filters?: MarketplaceSearchFilters): MarketplaceProviderDetail {
  return {
    ...buildProviderSummary(record, filters),
    bio: record.profile.bio,
    services: [...record.services].sort((left, right) => left.name.localeCompare(right.name)),
    availability: [...record.availability].sort(
      (left, right) => left.dayOfWeek - right.dayOfWeek || left.startsAt.localeCompare(right.startsAt)
    )
  };
}

function compareProviderRecords(left: ProviderCatalogRecord, right: ProviderCatalogRecord) {
  return (
    right.services.length - left.services.length ||
    right.availability.length - left.availability.length ||
    left.organization.name.localeCompare(right.organization.name)
  );
}

function compareProviderRecordsByDistance(filters: MarketplaceSearchFilters) {
  return (left: ProviderCatalogRecord, right: ProviderCatalogRecord) => {
    const leftDistance = getProviderDistanceKm(left, filters);
    const rightDistance = getProviderDistanceKm(right, filters);

    if (leftDistance !== null && rightDistance !== null && leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    if (leftDistance !== null && rightDistance === null) {
      return -1;
    }

    if (leftDistance === null && rightDistance !== null) {
      return 1;
    }

    return compareProviderRecords(left, right);
  };
}

function matchesMarketplaceFilters(record: ProviderCatalogRecord, filters: MarketplaceSearchFilters) {
  const normalizedQuery = normalizeText(filters.query);
  const normalizedCity = normalizeText(filters.city);
  const normalizedSpecies = normalizeText(filters.species);

  if (filters.category && !record.services.some((service) => service.category === filters.category)) {
    return false;
  }

  if (normalizedCity && normalizeText(record.organization.city) !== normalizedCity) {
    return false;
  }

  if (
    normalizedSpecies &&
    !record.services.some((service) => service.speciesServed.some((species) => normalizeText(species) === normalizedSpecies))
  ) {
    return false;
  }

  if (typeof filters.maxDistanceKm === "number") {
    const distanceKm = getProviderDistanceKm(record, filters);

    if (distanceKm === null || distanceKm > filters.maxDistanceKm) {
      return false;
    }
  }

  if (!normalizedQuery) {
    return true;
  }

  const searchHaystack = [
    record.organization.name,
    record.organization.city,
    record.profile.headline,
    record.profile.bio,
    ...record.services.flatMap((service) => [service.name, service.shortDescription ?? "", ...service.speciesServed])
  ]
    .join(" ")
    .toLowerCase();

  return searchHaystack.includes(normalizedQuery);
}

async function loadVisibleCatalog(supabase: MarketplaceSupabaseClient): Promise<ProviderCatalogRecord[]> {
  const { data: organizationRows, error: organizationsError } = await supabase
    .from("provider_organizations")
    .select("*")
    .eq("approval_status", "approved")
    .eq("is_public", true)
    .order("name", { ascending: true });

  if (organizationsError) {
    fail(organizationsError, "Unable to load marketplace providers.");
  }

  const organizations = (organizationRows ?? []).map(mapProviderOrganization);

  if (!organizations.length) {
    return [];
  }

  const organizationIds = organizations.map((organization) => organization.id);
  const [
    { data: profileRows, error: profilesError },
    { data: locationRows, error: locationsError },
    { data: serviceRows, error: servicesError },
    { data: availabilityRows, error: availabilityError }
  ] =
    await Promise.all([
      supabase.from("provider_public_profiles").select("*").in("organization_id", organizationIds).eq("is_public", true),
      supabase.from("provider_public_locations").select("*").in("organization_id", organizationIds).eq("is_public", true),
      supabase.from("provider_services").select("*").in("organization_id", organizationIds).eq("is_public", true).eq("is_active", true),
      supabase.from("provider_availability").select("*").in("organization_id", organizationIds).eq("is_active", true)
    ]);

  if (profilesError) {
    fail(profilesError, "Unable to load marketplace provider profiles.");
  }

  if (locationsError && !isMissingProviderPublicLocationsError(locationsError)) {
    fail(locationsError, "Unable to load marketplace provider locations.");
  }

  if (servicesError) {
    fail(servicesError, "Unable to load marketplace provider services.");
  }

  if (availabilityError) {
    fail(availabilityError, "Unable to load marketplace provider availability.");
  }

  const profilesByOrganizationId = new Map(
    await Promise.all(
      (profileRows ?? []).map(async (row) => {
        const profile = mapProviderPublicProfile(row, await getProviderAvatarSignedUrl(supabase, row));
        return [profile.organizationId, profile] as const;
      })
    )
  );
  const servicesByOrganizationId = new Map<string, ProviderService[]>();
  const availabilityByOrganizationId = new Map<string, ProviderAvailabilitySlot[]>();
  const locationByOrganizationId = new Map(
    locationsError ? [] : (locationRows ?? []).map((row) => [row.organization_id, mapProviderPublicLocation(row)] as const)
  );

  for (const row of serviceRows ?? []) {
    const service = mapProviderService(row);
    const currentServices = servicesByOrganizationId.get(service.organizationId) ?? [];
    currentServices.push(service);
    servicesByOrganizationId.set(service.organizationId, currentServices);
  }

  for (const row of availabilityRows ?? []) {
    const slot = mapProviderAvailability(row);
    const currentSlots = availabilityByOrganizationId.get(slot.organizationId) ?? [];
    currentSlots.push(slot);
    availabilityByOrganizationId.set(slot.organizationId, currentSlots);
  }

  return organizations
    .map((organization) => {
      const profile = profilesByOrganizationId.get(organization.id);
      const services = servicesByOrganizationId.get(organization.id) ?? [];
      const availability = availabilityByOrganizationId.get(organization.id) ?? [];

      if (!profile || services.length === 0) {
        return null;
      }

      return {
        organization,
        profile,
        publicLocation: locationByOrganizationId.get(organization.id) ?? null,
        services,
        availability
      } satisfies ProviderCatalogRecord;
    })
    .filter((record): record is ProviderCatalogRecord => Boolean(record));
}

export function createMarketplaceApiClient(supabase: MarketplaceSupabaseClient): MarketplaceApiClient {
  return {
    async getMarketplaceHome() {
      const records = await loadVisibleCatalog(supabase);
      const categoryHighlights = providerServiceCategoryOrder
        .map((category) => {
          const matchingRecords = records.filter((record) =>
            record.services.some((service) => service.category === category)
          );
          const serviceCount = matchingRecords.reduce(
            (count, record) => count + record.services.filter((service) => service.category === category).length,
            0
          );

          return {
            category,
            providerCount: matchingRecords.length,
            serviceCount
          };
        })
        .filter((item) => item.serviceCount > 0);

      return {
        featuredProviders: [...records]
          .sort(compareProviderRecords)
          .slice(0, 6)
          .map((record) => buildProviderSummary(record)),
        categoryHighlights,
        cityHighlights: uniqueStrings(records.map((record) => record.organization.city)).slice(0, 8),
        speciesHighlights: uniqueStrings(records.flatMap((record) => record.services.flatMap((service) => service.speciesServed))).slice(0, 8)
      };
    },
    async listMarketplaceProviders(filters = {}) {
      const records = await loadVisibleCatalog(supabase);

      return records
        .filter((record) => matchesMarketplaceFilters(record, filters))
        .sort(
          typeof filters.nearLatitude === "number" && typeof filters.nearLongitude === "number"
            ? compareProviderRecordsByDistance(filters)
            : compareProviderRecords
        )
        .map((record) => buildProviderSummary(record, filters));
    },
    async getMarketplaceProvider(providerId) {
      const { data: organizationRow, error: organizationError } = await supabase
        .from("provider_organizations")
        .select("*")
        .eq("id", providerId)
        .eq("approval_status", "approved")
        .eq("is_public", true)
        .maybeSingle();

      if (organizationError) {
        fail(organizationError, "Unable to load the public provider profile.");
      }

      if (!organizationRow) {
        throw new Error("Provider not found or not publicly available.");
      }

      const [
        { data: profileRow, error: profileError },
        { data: locationRow, error: locationError },
        { data: serviceRows, error: servicesError },
        { data: availabilityRows, error: availabilityError }
      ] =
        await Promise.all([
          supabase.from("provider_public_profiles").select("*").eq("organization_id", providerId).eq("is_public", true).maybeSingle(),
          supabase.from("provider_public_locations").select("*").eq("organization_id", providerId).eq("is_public", true).maybeSingle(),
          supabase
            .from("provider_services")
            .select("*")
            .eq("organization_id", providerId)
            .eq("is_public", true)
            .eq("is_active", true)
            .order("name", { ascending: true }),
          supabase
            .from("provider_availability")
            .select("*")
            .eq("organization_id", providerId)
            .eq("is_active", true)
            .order("day_of_week", { ascending: true })
            .order("starts_at", { ascending: true })
        ]);

      if (profileError) {
        fail(profileError, "Unable to load the provider public profile.");
      }

      if (locationError && !isMissingProviderPublicLocationsError(locationError)) {
        fail(locationError, "Unable to load the provider public location.");
      }

      if (servicesError) {
        fail(servicesError, "Unable to load the provider services.");
      }

      if (availabilityError) {
        fail(availabilityError, "Unable to load the provider availability.");
      }

      if (!profileRow) {
        throw new Error("Provider profile is not published yet.");
      }

      const services = (serviceRows ?? []).map(mapProviderService);

      if (!services.length) {
        throw new Error("Provider has no published services yet.");
      }

      return buildProviderDetail({
        organization: mapProviderOrganization(organizationRow),
        profile: mapProviderPublicProfile(profileRow, await getProviderAvatarSignedUrl(supabase, profileRow)),
        publicLocation: locationError ? null : locationRow ? mapProviderPublicLocation(locationRow) : null,
        services,
        availability: (availabilityRows ?? []).map(mapProviderAvailability)
      });
    },
    async listMarketplaceProviderLocations() {
      const { data, error } = await supabase.rpc("list_marketplace_provider_locations");

      if (error) {
        if (isMissingProviderPublicLocationsError(error)) {
          return [];
        }

        fail(error, "Unable to load marketplace provider locations.");
      }

      return (data ?? []).map(mapProviderPublicLocation);
    }
  };
}
