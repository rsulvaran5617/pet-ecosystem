import type {
  CreateProviderAvailabilityInput,
  CreateProviderAvailabilityRuleInput,
  CreateProviderOrganizationInput,
  CreateProviderServiceInput,
  Database,
  ProviderApprovalDocument,
  ProviderApprovalStatusSnapshot,
  ProviderAvailabilityRule,
  ProviderAvailabilitySlot,
  ProviderOrganization,
  ProviderOrganizationDetail,
  ProviderPublicLocation,
  ProviderPublicProfile,
  ProviderService,
  UpdateProviderAvailabilityInput,
  UpdateProviderAvailabilityRuleInput,
  UpdateProviderOrganizationInput,
  UpdateProviderServiceInput,
  UploadProviderApprovalDocumentInput,
  UploadProviderAvatarInput,
  UpsertProviderPublicLocationInput,
  UpsertProviderPublicProfileInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ProvidersSupabaseClient = SupabaseClient<Database>;
type ProviderOrganizationRow = Database["public"]["Tables"]["provider_organizations"]["Row"];
type ProviderPublicProfileRow = Database["public"]["Tables"]["provider_public_profiles"]["Row"];
type ProviderPublicLocationRow = Database["public"]["Tables"]["provider_public_locations"]["Row"];
type ProviderServiceRow = Database["public"]["Tables"]["provider_services"]["Row"];
type ProviderAvailabilityRow = Database["public"]["Tables"]["provider_availability"]["Row"];
type ProviderAvailabilityRuleRow = Database["public"]["Tables"]["provider_availability_rules"]["Row"];
type ProviderDocumentRow = Database["public"]["Tables"]["provider_documents"]["Row"];

const providerDocumentsBucketId = "provider-documents";
const providerAvatarsBucketId = "provider-avatars";

export interface ProvidersApiClient {
  listMyProviderOrganizations(): Promise<ProviderOrganization[]>;
  getProviderOrganizationDetail(organizationId: Uuid): Promise<ProviderOrganizationDetail>;
  createProviderOrganization(input: CreateProviderOrganizationInput): Promise<ProviderOrganization>;
  updateProviderOrganization(organizationId: Uuid, input: UpdateProviderOrganizationInput): Promise<ProviderOrganization>;
  upsertProviderPublicProfile(organizationId: Uuid, input: UpsertProviderPublicProfileInput): Promise<ProviderPublicProfile>;
  upsertProviderPublicLocation(organizationId: Uuid, input: UpsertProviderPublicLocationInput): Promise<ProviderPublicLocation>;
  createProviderService(input: CreateProviderServiceInput): Promise<ProviderService>;
  updateProviderService(serviceId: Uuid, input: UpdateProviderServiceInput): Promise<ProviderService>;
  addProviderAvailabilitySlot(input: CreateProviderAvailabilityInput): Promise<ProviderAvailabilitySlot>;
  updateProviderAvailabilitySlot(slotId: Uuid, input: UpdateProviderAvailabilityInput): Promise<ProviderAvailabilitySlot>;
  listProviderAvailabilityRules(organizationId: Uuid): Promise<ProviderAvailabilityRule[]>;
  createProviderAvailabilityRule(input: CreateProviderAvailabilityRuleInput): Promise<ProviderAvailabilityRule>;
  updateProviderAvailabilityRule(ruleId: Uuid, input: UpdateProviderAvailabilityRuleInput): Promise<ProviderAvailabilityRule>;
  setProviderAvailabilityRuleActive(ruleId: Uuid, isActive: boolean): Promise<ProviderAvailabilityRule>;
  uploadProviderAvatar(organizationId: Uuid, input: UploadProviderAvatarInput): Promise<ProviderPublicProfile>;
  listProviderApprovalDocuments(organizationId: Uuid): Promise<ProviderApprovalDocument[]>;
  uploadProviderApprovalDocument(organizationId: Uuid, input: UploadProviderApprovalDocumentInput): Promise<ProviderApprovalDocument>;
  getProviderApprovalStatus(organizationId: Uuid): Promise<ProviderApprovalStatusSnapshot>;
  listPendingProviderOrganizations(): Promise<ProviderOrganization[]>;
  getAdminProviderOrganizationDetail(organizationId: Uuid): Promise<ProviderOrganizationDetail>;
  approveProviderOrganization(organizationId: Uuid): Promise<ProviderOrganization>;
  rejectProviderOrganization(organizationId: Uuid): Promise<ProviderOrganization>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function isMissingSessionError(error: { message: string } | null) {
  return error?.message.toLowerCase().includes("auth session missing") ?? false;
}

function isMissingProviderPublicLocationsError(error: { code?: string; message: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    error?.message.toLowerCase().includes("provider_public_locations") && error.message.toLowerCase().includes("schema cache")
  );
}

async function getCurrentUser(supabase: ProvidersSupabaseClient) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    fail(error, "Unable to resolve the current auth user.");
  }

  return data.user ?? null;
}

async function requireCurrentUser(supabase: ProvidersSupabaseClient) {
  const user = await getCurrentUser(supabase);

  if (!user) {
    throw new Error("Authenticated user required.");
  }

  return user;
}

function sanitizeFileName(fileName: string) {
  const normalizedFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");

  return normalizedFileName || "document.bin";
}

function buildDocumentStoragePath(organizationId: string, fileName: string) {
  return `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizeFileName(fileName)}`;
}

function buildAvatarStoragePath(organizationId: string, fileName: string) {
  return `${organizationId}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizeFileName(fileName)}`;
}

function mapProviderOrganization(row: ProviderOrganizationRow, avatarUrl?: string | null): ProviderOrganization {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    countryCode: row.country_code,
    approvalStatus: row.approval_status,
    isPublic: row.is_public,
    avatarUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getProviderAvatarSignedUrl(supabase: ProvidersSupabaseClient, row: ProviderPublicProfileRow) {
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
    dayOfWeek: row.day_of_week as ProviderAvailabilitySlot["dayOfWeek"],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProviderAvailabilityRule(row: ProviderAvailabilityRuleRow): ProviderAvailabilityRule {
  return {
    id: row.id,
    organizationId: row.organization_id,
    serviceId: row.service_id,
    dayOfWeek: row.day_of_week as ProviderAvailabilityRule["dayOfWeek"],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    isActive: row.is_active,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProviderDocument(row: ProviderDocumentRow): ProviderApprovalDocument {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    documentType: row.document_type,
    fileName: row.file_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getProviderOrganizationDetailById(
  supabase: ProvidersSupabaseClient,
  organizationId: Uuid,
  options?: { ownerUserId?: Uuid | null }
) {
  let organizationQuery = supabase.from("provider_organizations").select("*").eq("id", organizationId);

  if (options?.ownerUserId) {
    organizationQuery = organizationQuery.eq("owner_user_id", options.ownerUserId);
  }

  const { data: organizationRow, error: organizationError } = await organizationQuery.single();

  if (organizationError) {
    fail(organizationError, "No fue posible cargar la organizacion del proveedor.");
  }

  const [
    { data: publicProfileRow, error: publicProfileError },
    { data: publicLocationRow, error: publicLocationError },
    { data: serviceRows, error: servicesError },
    { data: availabilityRows, error: availabilityError },
    { data: availabilityRuleRows, error: availabilityRulesError },
    { data: documentRows, error: documentsError }
  ] =
    await Promise.all([
      supabase.from("provider_public_profiles").select("*").eq("organization_id", organizationId).maybeSingle(),
      supabase.from("provider_public_locations").select("*").eq("organization_id", organizationId).maybeSingle(),
      supabase.from("provider_services").select("*").eq("organization_id", organizationId).order("created_at", { ascending: true }),
      supabase
        .from("provider_availability")
        .select("*")
        .eq("organization_id", organizationId)
        .order("day_of_week", { ascending: true })
        .order("starts_at", { ascending: true }),
      supabase
        .from("provider_availability_rules")
        .select("*")
        .eq("organization_id", organizationId)
        .order("day_of_week", { ascending: true })
        .order("starts_at", { ascending: true }),
      supabase.from("provider_documents").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })
    ]);

  if (publicProfileError) {
    fail(publicProfileError, "Unable to load the provider public profile.");
  }

  if (publicLocationError && !isMissingProviderPublicLocationsError(publicLocationError)) {
    fail(publicLocationError, "Unable to load the provider public location.");
  }

  if (servicesError) {
    fail(servicesError, "Unable to load the provider services.");
  }

  if (availabilityError) {
    fail(availabilityError, "Unable to load the provider availability.");
  }

  if (availabilityRulesError) {
    fail(availabilityRulesError, "Unable to load the provider availability rules.");
  }

  if (documentsError) {
    fail(documentsError, "Unable to load the provider approval documents.");
  }

  return {
    organization: mapProviderOrganization(organizationRow),
    publicProfile: publicProfileRow ? mapProviderPublicProfile(publicProfileRow, await getProviderAvatarSignedUrl(supabase, publicProfileRow)) : null,
    publicLocation: publicLocationError ? null : publicLocationRow ? mapProviderPublicLocation(publicLocationRow) : null,
    services: (serviceRows ?? []).map(mapProviderService),
    availability: (availabilityRows ?? []).map(mapProviderAvailability),
    availabilityRules: (availabilityRuleRows ?? []).map(mapProviderAvailabilityRule),
    approvalDocuments: (documentRows ?? []).map(mapProviderDocument)
  } satisfies ProviderOrganizationDetail;
}

export function createProvidersApiClient(supabase: ProvidersSupabaseClient): ProvidersApiClient {
  return {
    async listMyProviderOrganizations() {
      const user = await requireCurrentUser(supabase);
      const { data, error } = await supabase
        .from("provider_organizations")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        fail(error, "Unable to load the provider organizations.");
      }

      const organizations = data ?? [];
      const organizationIds = organizations.map((organization) => organization.id);
      const avatarUrlByOrganizationId = new Map<string, string | null>();

      if (organizationIds.length) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("provider_public_profiles")
          .select("*")
          .in("organization_id", organizationIds);

        if (profilesError) {
          fail(profilesError, "Unable to load the provider public profiles.");
        }

        await Promise.all(
          (profileRows ?? []).map(async (profileRow) => {
            avatarUrlByOrganizationId.set(profileRow.organization_id, await getProviderAvatarSignedUrl(supabase, profileRow));
          })
        );
      }

      return organizations.map((organization) => mapProviderOrganization(organization, avatarUrlByOrganizationId.get(organization.id) ?? null));
    },
    async getProviderOrganizationDetail(organizationId) {
      const user = await requireCurrentUser(supabase);

      return getProviderOrganizationDetailById(supabase, organizationId, { ownerUserId: user.id });
    },
    async createProviderOrganization(input) {
      const { data, error } = await supabase.rpc("create_provider_organization", {
        next_name: input.name,
        next_slug: input.slug,
        next_city: input.city,
        next_country_code: input.countryCode ?? "PA",
        next_is_public: input.isPublic ?? true
      });

      if (error) {
        fail(error, "Unable to create the provider organization.");
      }

      return mapProviderOrganization(data);
    },
    async updateProviderOrganization(organizationId, input) {
      const { data, error } = await supabase.rpc("update_provider_organization", {
        target_organization_id: organizationId,
        next_name: input.name,
        next_slug: input.slug,
        next_city: input.city,
        next_country_code: input.countryCode ?? "PA",
        next_is_public: input.isPublic ?? true
      });

      if (error) {
        fail(error, "Unable to update the provider organization.");
      }

      return mapProviderOrganization(data);
    },
    async upsertProviderPublicProfile(organizationId, input) {
      const { data, error } = await supabase.rpc("upsert_provider_public_profile", {
        target_organization_id: organizationId,
        next_headline: input.headline,
        next_bio: input.bio,
        next_avatar_url: null,
        next_is_public: input.isPublic ?? true
      });

      if (error) {
        fail(error, "Unable to save the provider public profile.");
      }

      return mapProviderPublicProfile(data, await getProviderAvatarSignedUrl(supabase, data));
    },
    async uploadProviderAvatar(organizationId, input) {
      await requireCurrentUser(supabase);

      if (input.fileBytes.byteLength === 0) {
        throw new Error("Provider avatar image file is empty.");
      }

      if (!input.mimeType?.startsWith("image/")) {
        throw new Error("El avatar del proveedor debe ser una imagen.");
      }

      const storagePath = buildAvatarStoragePath(organizationId, input.fileName);
      const uploadPayload = new Uint8Array(input.fileBytes);
      const { error: uploadError } = await supabase.storage.from(providerAvatarsBucketId).upload(storagePath, uploadPayload, {
        contentType: input.mimeType,
        upsert: false
      });

      if (uploadError) {
        fail(uploadError, "Unable to upload the provider avatar.");
      }

      const { data, error } = await supabase.rpc("set_provider_public_profile_avatar", {
        target_organization_id: organizationId,
        next_avatar_storage_bucket: providerAvatarsBucketId,
        next_avatar_storage_path: storagePath
      });

      if (error) {
        await supabase.storage.from(providerAvatarsBucketId).remove([storagePath]).catch(() => undefined);
        fail(error, "Unable to save the provider avatar record.");
      }

      return mapProviderPublicProfile(data, await getProviderAvatarSignedUrl(supabase, data));
    },
    async upsertProviderPublicLocation(organizationId, input) {
      const { data, error } = await supabase.rpc("upsert_provider_public_location", {
        target_organization_id: organizationId,
        next_display_label: input.displayLabel,
        next_address_line_public: input.addressLinePublic ?? null,
        next_city: input.city,
        next_state_region: input.stateRegion ?? null,
        next_country_code: input.countryCode ?? "PA",
        next_latitude: input.latitude,
        next_longitude: input.longitude,
        next_location_precision: input.locationPrecision ?? "approximate",
        next_is_public: input.isPublic ?? false
      });

      if (error) {
        fail(error, "Unable to save the provider public location.");
      }

      return mapProviderPublicLocation(data);
    },
    async createProviderService(input) {
      const { data, error } = await supabase.rpc("create_provider_service", {
        target_organization_id: input.organizationId,
        next_name: input.name,
        next_category: input.category,
        next_short_description: input.shortDescription ?? null,
        next_species_served: input.speciesServed ?? [],
        next_duration_minutes: input.durationMinutes ?? null,
        next_is_public: input.isPublic ?? true,
        next_booking_mode: input.bookingMode ?? "instant",
        next_base_price_cents: input.basePriceCents ?? 0,
        next_currency_code: input.currencyCode ?? "USD",
        next_cancellation_window_hours: input.cancellationWindowHours ?? 24
      });

      if (error) {
        fail(error, "Unable to create the provider service.");
      }

      return mapProviderService(data);
    },
    async updateProviderService(serviceId, input) {
      const { data, error } = await supabase.rpc("update_provider_service", {
        target_service_id: serviceId,
        next_name: input.name,
        next_category: input.category,
        next_short_description: input.shortDescription ?? null,
        next_species_served: input.speciesServed ?? [],
        next_duration_minutes: input.durationMinutes ?? null,
        next_is_public: input.isPublic ?? true,
        next_is_active: input.isActive ?? true,
        next_booking_mode: input.bookingMode ?? "instant",
        next_base_price_cents: input.basePriceCents ?? 0,
        next_currency_code: input.currencyCode ?? "USD",
        next_cancellation_window_hours: input.cancellationWindowHours ?? 24
      });

      if (error) {
        fail(error, "Unable to update the provider service.");
      }

      return mapProviderService(data);
    },
    async addProviderAvailabilitySlot(input) {
      const { data, error } = await supabase.rpc("add_provider_availability_slot", {
        target_organization_id: input.organizationId,
        next_day_of_week: input.dayOfWeek,
        next_starts_at: input.startsAt,
        next_ends_at: input.endsAt,
        next_is_active: input.isActive ?? true
      });

      if (error) {
        fail(error, "Unable to add the provider availability slot.");
      }

      return mapProviderAvailability(data);
    },
    async updateProviderAvailabilitySlot(slotId, input) {
      const { data, error } = await supabase.rpc("update_provider_availability_slot", {
        target_availability_id: slotId,
        next_day_of_week: input.dayOfWeek,
        next_starts_at: input.startsAt,
        next_ends_at: input.endsAt,
        next_is_active: input.isActive ?? true
      });

      if (error) {
        fail(error, "Unable to update the provider availability slot.");
      }

      return mapProviderAvailability(data);
    },
    async listProviderAvailabilityRules(organizationId) {
      const { data, error } = await supabase
        .from("provider_availability_rules")
        .select("*")
        .eq("organization_id", organizationId)
        .order("day_of_week", { ascending: true })
        .order("starts_at", { ascending: true });

      if (error) {
        fail(error, "Unable to load provider availability rules.");
      }

      return (data ?? []).map(mapProviderAvailabilityRule);
    },
    async createProviderAvailabilityRule(input) {
      const user = await requireCurrentUser(supabase);
      const { data, error } = await supabase
        .from("provider_availability_rules")
        .insert({
          organization_id: input.organizationId,
          service_id: input.serviceId,
          day_of_week: input.dayOfWeek,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          capacity: input.capacity,
          is_active: input.isActive ?? true,
          effective_from: input.effectiveFrom ?? null,
          effective_until: input.effectiveUntil ?? null,
          created_by_user_id: user.id
        })
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to create provider availability rule.");
      }

      return mapProviderAvailabilityRule(data);
    },
    async updateProviderAvailabilityRule(ruleId, input) {
      const payload: Database["public"]["Tables"]["provider_availability_rules"]["Update"] = {};

      if (input.serviceId !== undefined) {
        payload.service_id = input.serviceId;
      }

      if (input.dayOfWeek !== undefined) {
        payload.day_of_week = input.dayOfWeek;
      }

      if (input.startsAt !== undefined) {
        payload.starts_at = input.startsAt;
      }

      if (input.endsAt !== undefined) {
        payload.ends_at = input.endsAt;
      }

      if (input.capacity !== undefined) {
        payload.capacity = input.capacity;
      }

      if (input.isActive !== undefined) {
        payload.is_active = input.isActive;
      }

      if (input.effectiveFrom !== undefined) {
        payload.effective_from = input.effectiveFrom;
      }

      if (input.effectiveUntil !== undefined) {
        payload.effective_until = input.effectiveUntil;
      }

      const { data, error } = await supabase
        .from("provider_availability_rules")
        .update(payload)
        .eq("id", ruleId)
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to update provider availability rule.");
      }

      return mapProviderAvailabilityRule(data);
    },
    async setProviderAvailabilityRuleActive(ruleId, isActive) {
      const { data, error } = await supabase
        .from("provider_availability_rules")
        .update({ is_active: isActive })
        .eq("id", ruleId)
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to update provider availability rule status.");
      }

      return mapProviderAvailabilityRule(data);
    },
    async listProviderApprovalDocuments(organizationId) {
      const { data, error } = await supabase
        .from("provider_documents")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) {
        fail(error, "Unable to load the provider approval documents.");
      }

      return (data ?? []).map(mapProviderDocument);
    },
    async uploadProviderApprovalDocument(organizationId, input) {
      const user = await requireCurrentUser(supabase);

      if (input.fileBytes.byteLength === 0) {
        throw new Error("Document file is empty.");
      }

      const storagePath = buildDocumentStoragePath(organizationId, input.fileName);
      const uploadPayload = new Uint8Array(input.fileBytes);
      const { error: uploadError } = await supabase.storage.from(providerDocumentsBucketId).upload(storagePath, uploadPayload, {
        contentType: input.mimeType ?? undefined,
        upsert: false
      });

      if (uploadError) {
        fail(uploadError, "Unable to upload the provider approval document.");
      }

      const { data, error } = await supabase
        .from("provider_documents")
        .insert({
          organization_id: organizationId,
          created_by_user_id: user.id,
          title: input.title,
          document_type: input.documentType,
          file_name: input.fileName,
          storage_bucket: providerDocumentsBucketId,
          storage_path: storagePath,
          mime_type: input.mimeType ?? null,
          file_size_bytes: input.fileBytes.byteLength
        })
        .select("*")
        .single();

      if (error) {
        await supabase.storage.from(providerDocumentsBucketId).remove([storagePath]).catch(() => undefined);
        fail(error, "Unable to save the provider approval document record.");
      }

      return mapProviderDocument(data);
    },
    async getProviderApprovalStatus(organizationId) {
      const user = await requireCurrentUser(supabase);
      const { data, error } = await supabase
        .from("provider_organizations")
        .select("id, approval_status, is_public")
        .eq("id", organizationId)
        .eq("owner_user_id", user.id)
        .single();

      if (error) {
        fail(error, "Unable to load the provider approval status.");
      }

      return {
        organizationId: data.id,
        approvalStatus: data.approval_status,
        isPublic: data.is_public
      };
    },
    async listPendingProviderOrganizations() {
      const { data, error } = await supabase
        .from("provider_organizations")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        fail(error, "Unable to load pending provider organizations.");
      }

      return (data ?? []).map((row) => mapProviderOrganization(row));
    },
    async getAdminProviderOrganizationDetail(organizationId) {
      return getProviderOrganizationDetailById(supabase, organizationId);
    },
    async approveProviderOrganization(organizationId) {
      const { data, error } = await supabase.rpc("approve_provider_organization", {
        target_organization_id: organizationId
      });

      if (error) {
        fail(error, "Unable to approve the provider organization.");
      }

      return mapProviderOrganization(data);
    },
    async rejectProviderOrganization(organizationId) {
      const { data, error } = await supabase.rpc("reject_provider_organization", {
        target_organization_id: organizationId
      });

      if (error) {
        fail(error, "Unable to reject the provider organization.");
      }

      return mapProviderOrganization(data);
    }
  };
}
