import type {
  CreatePetAlertLostPetInput,
  CreatePetAlertLostPetSightingInput,
  CreatePetAlertCommunitySightingInput,
  PetAlertCommunityCloseReason,
  PetAlertCommunitySighting,
  PetAlertCloseReason,
  PetAlertLostPet,
  PetAlertLostPetSighting,
  PetAlertSightingStatus,
  PublicPetAlertLostPet,
  PublicPetAlertCommunitySighting,
  UpdatePetAlertLostPetInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type PetAlertSupabaseClient = SupabaseClient;

interface LostPetAlertRow {
  id: string;
  pet_id: string;
  household_id: string;
  created_by_user_id: string;
  status: PetAlertLostPet["status"];
  alert_slug: string;
  pet_name: string;
  pet_species: string;
  last_seen_at: string;
  last_seen_city: string;
  last_seen_region: string | null;
  last_seen_country: string;
  last_seen_reference: string | null;
  last_seen_notes: string | null;
  location_precision: PetAlertLostPet["locationPrecision"];
  public_description: string;
  distinctive_marks: string | null;
  behavior_notes: string | null;
  medical_public_notes: string | null;
  contact_mode: PetAlertLostPet["contactMode"];
  share_enabled: boolean;
  published_at: string | null;
  found_at: string | null;
  closed_at: string | null;
  expires_at: string | null;
  close_reason: PetAlertLostPet["closeReason"];
  created_at: string;
  updated_at: string;
}

interface PublicLostPetAlertRow {
  alert_slug: string;
  status: PublicPetAlertLostPet["status"];
  pet_name: string;
  pet_species: string;
  pet_breed: string | null;
  photo_url: string | null;
  last_seen_at: string;
  last_seen_city: string;
  last_seen_region: string | null;
  last_seen_country: string;
  last_seen_reference: string | null;
  public_description: string;
  distinctive_marks: string | null;
  behavior_notes: string | null;
  medical_public_notes: string | null;
  published_at: string | null;
  expires_at: string | null;
}

interface SightingRow {
  id: string;
  alert_id: string;
  reporter_user_id: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  reporter_contact_consent: boolean;
  sighted_at: string;
  city: string;
  region: string | null;
  country: string;
  location_reference: string | null;
  location_precision: PetAlertLostPet["locationPrecision"];
  notes: string;
  status: PetAlertSightingStatus;
  created_at: string;
  updated_at: string;
}

interface CommunitySightingRow {
  id?: string;
  report_slug: string;
  reporter_user_id?: string;
  status: PetAlertCommunitySighting["status"];
  animal_species: string;
  apparent_breed: string | null;
  apparent_size: PetAlertCommunitySighting["apparentSize"];
  apparent_sex: PetAlertCommunitySighting["apparentSex"];
  primary_color: string | null;
  collar_description: string | null;
  distinctive_marks: string | null;
  behavior_notes: string | null;
  observed_situation: string;
  sighted_at: string;
  city: string;
  region: string | null;
  country: string;
  location_reference: string | null;
  location_precision?: PetAlertCommunitySighting["locationPrecision"];
  share_enabled?: boolean;
  published_at: string;
  closed_at?: string | null;
  expires_at: string;
  close_reason?: PetAlertCommunityCloseReason | null;
  created_at?: string;
  updated_at?: string;
}

export interface PetAlertApiClient {
  createPetAlertLostPet(input: CreatePetAlertLostPetInput): Promise<PetAlertLostPet>;
  getPetAlertLostPetBySlug(alertSlug: string): Promise<PublicPetAlertLostPet | null>;
  listPetAlertLostPetsForPet(petId: Uuid): Promise<PetAlertLostPet[]>;
  listActivePetAlertLostPetsForHousehold(householdId: Uuid): Promise<PetAlertLostPet[]>;
  publishPetAlertLostPet(alertId: Uuid): Promise<PetAlertLostPet>;
  updatePetAlertLostPet(alertId: Uuid, input: UpdatePetAlertLostPetInput): Promise<PetAlertLostPet>;
  closePetAlertLostPet(alertId: Uuid, reason: PetAlertCloseReason): Promise<PetAlertLostPet>;
  markPetAlertLostPetFound(alertId: Uuid, source: "pet_alert" | "other"): Promise<PetAlertLostPet>;
  createPetAlertLostPetSighting(input: CreatePetAlertLostPetSightingInput): Promise<Uuid>;
  listSightingsForPetAlertLostPet(alertId: Uuid): Promise<PetAlertLostPetSighting[]>;
  updatePetAlertLostPetSightingStatus(
    sightingId: Uuid,
    status: PetAlertSightingStatus
  ): Promise<PetAlertLostPetSighting>;
  createPetAlertCommunitySighting(input: CreatePetAlertCommunitySightingInput): Promise<PetAlertCommunitySighting>;
  getPetAlertCommunitySightingBySlug(reportSlug: string): Promise<PublicPetAlertCommunitySighting | null>;
  listPublicPetAlertCommunitySightings(filters?: { city?: string | null; country?: string | null; limit?: number }): Promise<PublicPetAlertCommunitySighting[]>;
  listMyPetAlertCommunitySightings(): Promise<PetAlertCommunitySighting[]>;
  closePetAlertCommunitySighting(reportId: Uuid, reason: PetAlertCommunityCloseReason): Promise<PetAlertCommunitySighting>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  throw new Error(error?.message ?? fallbackMessage);
}

function mapAlert(row: LostPetAlertRow): PetAlertLostPet {
  return {
    id: row.id,
    petId: row.pet_id,
    householdId: row.household_id,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    alertSlug: row.alert_slug,
    petName: row.pet_name,
    petSpecies: row.pet_species,
    lastSeenAt: row.last_seen_at,
    lastSeenCity: row.last_seen_city,
    lastSeenRegion: row.last_seen_region,
    lastSeenCountry: row.last_seen_country,
    lastSeenReference: row.last_seen_reference,
    lastSeenNotes: row.last_seen_notes,
    locationPrecision: row.location_precision,
    publicDescription: row.public_description,
    distinctiveMarks: row.distinctive_marks,
    behaviorNotes: row.behavior_notes,
    medicalPublicNotes: row.medical_public_notes,
    contactMode: row.contact_mode,
    shareEnabled: row.share_enabled,
    publishedAt: row.published_at,
    foundAt: row.found_at,
    closedAt: row.closed_at,
    expiresAt: row.expires_at,
    closeReason: row.close_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPublicAlert(row: PublicLostPetAlertRow): PublicPetAlertLostPet {
  return {
    alertSlug: row.alert_slug,
    status: row.status,
    petName: row.pet_name,
    petSpecies: row.pet_species,
    petBreed: row.pet_breed,
    photoUrl: row.photo_url,
    lastSeenAt: row.last_seen_at,
    lastSeenCity: row.last_seen_city,
    lastSeenRegion: row.last_seen_region,
    lastSeenCountry: row.last_seen_country,
    lastSeenReference: row.last_seen_reference,
    publicDescription: row.public_description,
    distinctiveMarks: row.distinctive_marks,
    behaviorNotes: row.behavior_notes,
    medicalPublicNotes: row.medical_public_notes,
    publishedAt: row.published_at,
    expiresAt: row.expires_at
  };
}

function mapSighting(row: SightingRow): PetAlertLostPetSighting {
  return {
    id: row.id,
    alertId: row.alert_id,
    reporterUserId: row.reporter_user_id,
    reporterName: row.reporter_name,
    reporterContact: row.reporter_contact,
    reporterContactConsent: row.reporter_contact_consent,
    sightedAt: row.sighted_at,
    city: row.city,
    region: row.region,
    country: row.country,
    locationReference: row.location_reference,
    locationPrecision: row.location_precision,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCommunitySighting(row: CommunitySightingRow): PetAlertCommunitySighting {
  return {
    id: row.id ?? "",
    reportSlug: row.report_slug,
    reporterUserId: row.reporter_user_id ?? "",
    status: row.status,
    animalSpecies: row.animal_species,
    apparentBreed: row.apparent_breed,
    apparentSize: row.apparent_size,
    apparentSex: row.apparent_sex,
    primaryColor: row.primary_color,
    collarDescription: row.collar_description,
    distinctiveMarks: row.distinctive_marks,
    behaviorNotes: row.behavior_notes,
    observedSituation: row.observed_situation,
    sightedAt: row.sighted_at,
    city: row.city,
    region: row.region,
    country: row.country,
    locationReference: row.location_reference,
    locationPrecision: row.location_precision ?? "approximate",
    shareEnabled: row.share_enabled ?? true,
    publishedAt: row.published_at,
    closedAt: row.closed_at ?? null,
    expiresAt: row.expires_at,
    closeReason: row.close_reason ?? null,
    createdAt: row.created_at ?? row.published_at,
    updatedAt: row.updated_at ?? row.published_at
  };
}

function mapPublicCommunitySighting(row: CommunitySightingRow): PublicPetAlertCommunitySighting {
  const report = mapCommunitySighting(row);
  return {
    reportSlug: report.reportSlug,
    status: report.status,
    animalSpecies: report.animalSpecies,
    apparentBreed: report.apparentBreed,
    apparentSize: report.apparentSize,
    apparentSex: report.apparentSex,
    primaryColor: report.primaryColor,
    collarDescription: report.collarDescription,
    distinctiveMarks: report.distinctiveMarks,
    behaviorNotes: report.behaviorNotes,
    observedSituation: report.observedSituation,
    sightedAt: report.sightedAt,
    city: report.city,
    region: report.region,
    country: report.country,
    locationReference: report.locationReference,
    publishedAt: report.publishedAt,
    expiresAt: report.expiresAt
  };
}

function alertArgs(input: CreatePetAlertLostPetInput | UpdatePetAlertLostPetInput) {
  return {
    next_last_seen_at: input.lastSeenAt,
    next_last_seen_city: input.lastSeenCity,
    next_last_seen_region: input.lastSeenRegion ?? null,
    next_last_seen_country: input.lastSeenCountry,
    next_last_seen_reference: input.lastSeenReference ?? null,
    next_last_seen_notes: input.lastSeenNotes ?? null,
    next_location_precision: input.locationPrecision ?? "approximate",
    next_latitude: input.latitude ?? null,
    next_longitude: input.longitude ?? null,
    next_public_description: input.publicDescription,
    next_distinctive_marks: input.distinctiveMarks ?? null,
    next_behavior_notes: input.behaviorNotes ?? null,
    next_medical_public_notes: input.medicalPublicNotes ?? null,
    next_contact_mode: input.contactMode ?? "internal",
    next_contact_name: input.contactName ?? null,
    next_contact_phone: input.contactPhone ?? null,
    next_contact_email: input.contactEmail ?? null,
    next_contact_consent: input.contactConsent ?? false,
    next_share_enabled: input.shareEnabled ?? true
  };
}

export function createPetAlertApiClient(supabase: PetAlertSupabaseClient): PetAlertApiClient {
  return {
    async createPetAlertLostPet(input) {
      const { data, error } = await supabase.rpc("create_pet_alert_lost_pet", {
        target_pet_id: input.petId,
        ...alertArgs(input),
        publish_now: input.publish ?? false
      });
      if (error || !data) fail(error, "No fue posible crear la alerta PET ALERT.");
      return mapAlert(data as LostPetAlertRow);
    },
    async getPetAlertLostPetBySlug(alertSlug) {
      const { data, error } = await supabase.rpc("get_public_pet_alert_lost_pet_by_slug", {
        target_alert_slug: alertSlug
      });
      if (error) fail(error, "No fue posible cargar la alerta PET ALERT.");
      const row = (data as PublicLostPetAlertRow[] | null)?.[0];
      return row ? mapPublicAlert(row) : null;
    },
    async listPetAlertLostPetsForPet(petId) {
      const { data, error } = await supabase.rpc("list_pet_alert_lost_pets_for_pet", { target_pet_id: petId });
      if (error) fail(error, "No fue posible cargar el historial PET ALERT.");
      return ((data ?? []) as LostPetAlertRow[]).map(mapAlert);
    },
    async listActivePetAlertLostPetsForHousehold(householdId) {
      const { data, error } = await supabase.rpc("list_active_pet_alert_lost_pets_for_household", {
        target_household_id: householdId
      });
      if (error) fail(error, "No fue posible cargar las alertas activas.");
      return ((data ?? []) as LostPetAlertRow[]).map(mapAlert);
    },
    async publishPetAlertLostPet(alertId) {
      const { data, error } = await supabase.rpc("publish_pet_alert_lost_pet", {
        target_alert_id: alertId
      });
      if (error || !data) fail(error, "No fue posible publicar la alerta PET ALERT.");
      return mapAlert(data as LostPetAlertRow);
    },
    async updatePetAlertLostPet(alertId, input) {
      const { data, error } = await supabase.rpc("update_pet_alert_lost_pet", {
        target_alert_id: alertId,
        ...alertArgs(input)
      });
      if (error || !data) fail(error, "No fue posible actualizar la alerta PET ALERT.");
      return mapAlert(data as LostPetAlertRow);
    },
    async closePetAlertLostPet(alertId, reason) {
      const { data, error } = await supabase.rpc("close_pet_alert_lost_pet", {
        target_alert_id: alertId,
        next_close_reason: reason
      });
      if (error || !data) fail(error, "No fue posible cerrar la alerta PET ALERT.");
      return mapAlert(data as LostPetAlertRow);
    },
    async markPetAlertLostPetFound(alertId, source) {
      const { data, error } = await supabase.rpc("mark_pet_alert_lost_pet_found", {
        target_alert_id: alertId,
        found_source: source
      });
      if (error || !data) fail(error, "No fue posible marcar la mascota como encontrada.");
      return mapAlert(data as LostPetAlertRow);
    },
    async createPetAlertLostPetSighting(input) {
      const { data, error } = await supabase.rpc("create_pet_alert_lost_pet_sighting", {
        target_alert_slug: input.alertSlug,
        next_reporter_name: input.reporterName ?? null,
        next_reporter_contact: input.reporterContact ?? null,
        next_reporter_contact_consent: input.reporterContactConsent ?? false,
        next_sighted_at: input.sightedAt,
        next_city: input.city,
        next_region: input.region ?? null,
        next_country: input.country,
        next_location_reference: input.locationReference ?? null,
        next_location_precision: input.locationPrecision ?? "approximate",
        next_latitude: input.latitude ?? null,
        next_longitude: input.longitude ?? null,
        next_notes: input.notes
      });
      if (error || !data) fail(error, "No fue posible registrar el avistamiento.");
      return data as Uuid;
    },
    async listSightingsForPetAlertLostPet(alertId) {
      const { data, error } = await supabase.rpc("list_pet_alert_lost_pet_sightings", { target_alert_id: alertId });
      if (error) fail(error, "No fue posible cargar los avistamientos.");
      return ((data ?? []) as SightingRow[]).map(mapSighting);
    },
    async updatePetAlertLostPetSightingStatus(sightingId, status) {
      const { data, error } = await supabase.rpc("update_pet_alert_lost_pet_sighting_status", {
        target_sighting_id: sightingId,
        next_status: status
      });
      if (error || !data) fail(error, "No fue posible actualizar el avistamiento.");
      return mapSighting(data as SightingRow);
    },
    async createPetAlertCommunitySighting(input) {
      const { data, error } = await supabase.rpc("create_pet_alert_community_sighting", {
        next_animal_species: input.animalSpecies,
        next_apparent_breed: input.apparentBreed ?? null,
        next_apparent_size: input.apparentSize ?? "unknown",
        next_apparent_sex: input.apparentSex ?? "unknown",
        next_primary_color: input.primaryColor ?? null,
        next_collar_description: input.collarDescription ?? null,
        next_distinctive_marks: input.distinctiveMarks ?? null,
        next_behavior_notes: input.behaviorNotes ?? null,
        next_observed_situation: input.observedSituation,
        next_sighted_at: input.sightedAt,
        next_city: input.city,
        next_region: input.region ?? null,
        next_country: input.country,
        next_location_reference: input.locationReference ?? null,
        next_location_precision: input.locationPrecision ?? "approximate",
        next_share_enabled: input.shareEnabled ?? true
      });
      if (error || !data) fail(error, "No fue posible publicar el reporte comunitario.");
      return mapCommunitySighting(data as CommunitySightingRow);
    },
    async getPetAlertCommunitySightingBySlug(reportSlug) {
      const { data, error } = await supabase.rpc("get_public_pet_alert_community_sighting_by_slug", {
        target_report_slug: reportSlug
      });
      if (error) fail(error, "No fue posible cargar el reporte comunitario.");
      const row = (data as CommunitySightingRow[] | null)?.[0];
      return row ? mapPublicCommunitySighting(row) : null;
    },
    async listPublicPetAlertCommunitySightings(filters = {}) {
      const { data, error } = await supabase.rpc("list_public_pet_alert_community_sightings", {
        filter_city: filters.city ?? null,
        filter_country: filters.country ?? "PA",
        result_limit: filters.limit ?? 30
      });
      if (error) fail(error, "No fue posible cargar los reportes comunitarios.");
      return ((data ?? []) as CommunitySightingRow[]).map(mapPublicCommunitySighting);
    },
    async listMyPetAlertCommunitySightings() {
      const { data, error } = await supabase.rpc("list_my_pet_alert_community_sightings");
      if (error) fail(error, "No fue posible cargar tus reportes comunitarios.");
      return ((data ?? []) as CommunitySightingRow[]).map(mapCommunitySighting);
    },
    async closePetAlertCommunitySighting(reportId, reason) {
      const { data, error } = await supabase.rpc("close_pet_alert_community_sighting", {
        target_report_id: reportId,
        next_close_reason: reason
      });
      if (error || !data) fail(error, "No fue posible cerrar el reporte comunitario.");
      return mapCommunitySighting(data as CommunitySightingRow);
    }
  };
}
