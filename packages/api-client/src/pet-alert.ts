import type {
  CreatePetAlertLostPetInput,
  CreatePetAlertLostPetSightingInput,
  CreatePetAlertCommunitySightingInput,
  CreatePetAlertCommunityClaimInput,
  PetAlertCommunityCloseReason,
  PetAlertCommunitySighting,
  PetAlertCommunityClaim,
  PetAlertCommunityClaimStatus,
  PetAlertModerationAction,
  PetAlertModerationCase,
  PetAlertModerationCaseStatus,
  PetAlertModerationHistoryEntry,
  PetAlertModerationReason,
  PetAlertModerationTargetType,
  PetAlertExternalReportDecision,
  PetAlertExternalReportReview,
  PetAlertCloseReason,
  PetAlertLostPet,
  PetAlertLostPetSighting,
  PetAlertLocationInput,
  PetAlertPrivateLocation,
  PetAlertSightingStatus,
  PublicPetAlertLostPet,
  PublicPetAlertCommunitySighting,
  PublicPetAlertDirectoryEvent,
  PublicPetAlertDirectoryPage,
  PublicPetAlertMapFilters,
  PublicPetAlertMapPoint,
  PetAlertPublicDirectoryView,
  UpdatePetAlertLostPetInput,
  UploadPetAlertCommunityPhotoInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type PetAlertSupabaseClient = SupabaseClient;

interface LostPetAlertRow {
  id: string;
  pet_id: string | null;
  household_id: string | null;
  created_by_user_id: string | null;
  source_type?: PetAlertLostPet["sourceType"];
  external_reporter_id?: string | null;
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

interface PublicLostPetMediaRow {
  alert_slug: string;
  storage_bucket: string;
  storage_path: string;
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

interface CommunityClaimRow {
  id: string;
  community_sighting_id: string;
  report_slug: string;
  claimant_user_id: string;
  status: PetAlertCommunityClaimStatus;
  claimed_pet_id: string | null;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string | null;
  private_details: string;
  lost_at: string | null;
  lost_city: string | null;
  contact_consent: boolean;
  authorized_reporter_name: string | null;
  authorized_reporter_email: string | null;
  authorized_reporter_phone: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface CommunityMediaRow {
  id: string;
  community_sighting_id: string;
  report_slug: string;
  storage_bucket: string;
  storage_path: string;
  display_order: number;
}

interface PublicDirectoryRow {
  event_type: PublicPetAlertDirectoryEvent["eventType"];
  public_slug: string;
  public_path: string;
  status: PublicPetAlertDirectoryEvent["status"];
  status_group: PublicPetAlertDirectoryEvent["statusGroup"];
  title: string;
  species: string;
  breed: string | null;
  city: string;
  region: string | null;
  country: string;
  occurred_at: string;
  published_at: string;
  updated_at: string;
  summary: string;
  location_reference: string | null;
  total_count: number | string;
}

interface PublicMapPointRow {
  event_type: PublicPetAlertMapPoint["eventType"];
  public_slug: string;
  public_path: string;
  status: string;
  status_group: PublicPetAlertMapPoint["statusGroup"];
  title: string;
  species: string;
  city: string;
  occurred_at: string;
  public_latitude: number;
  public_longitude: number;
}

interface PrivateLocationRow {
  private_latitude: number;
  private_longitude: number;
  location_accuracy_meters: number | null;
  location_source: PetAlertPrivateLocation["source"];
  location_captured_at: string;
  public_location_visible: boolean;
}

interface ModerationCaseRow {
  case_id: string;
  target_type: PetAlertModerationTargetType;
  target_id: string;
  target_status: string;
  target_title: string;
  target_summary: string;
  reason_code: PetAlertModerationReason;
  report_details: string | null;
  case_status: PetAlertModerationCaseStatus;
  resolution_action: PetAlertModerationAction | null;
  resolution_reason: string | null;
  reported_at: string;
  reviewed_at: string | null;
}

interface ModerationHistoryRow {
  id: string;
  moderation_case_id: string;
  old_status: string | null;
  new_status: string;
  action: string;
  reason: string | null;
  changed_by_user_id: string;
  created_at: string;
}

interface ExternalReportReviewRow {
  alert_id: string;
  alert_slug: string;
  pet_name: string;
  pet_species: string;
  pet_breed: string | null;
  last_seen_at: string;
  city: string;
  region: string | null;
  country: string;
  location_reference: string | null;
  public_description: string;
  distinctive_marks: string | null;
  contact_name: string;
  contact_email: string;
  photo_storage_bucket: string | null;
  photo_storage_path: string | null;
  submitted_at: string;
}

export interface PetAlertApiClient {
  createPetAlertLostPet(input: CreatePetAlertLostPetInput): Promise<PetAlertLostPet>;
  setPetAlertLostPetLocation(alertId: Uuid, input: PetAlertLocationInput): Promise<PetAlertPrivateLocation>;
  getPetAlertLostPetBySlug(alertSlug: string): Promise<PublicPetAlertLostPet | null>;
  listPetAlertLostPetsForPet(petId: Uuid): Promise<PetAlertLostPet[]>;
  listActivePetAlertLostPetsForHousehold(householdId: Uuid): Promise<PetAlertLostPet[]>;
  publishPetAlertLostPet(alertId: Uuid): Promise<PetAlertLostPet>;
  updatePetAlertLostPet(alertId: Uuid, input: UpdatePetAlertLostPetInput): Promise<PetAlertLostPet>;
  closePetAlertLostPet(alertId: Uuid, reason: PetAlertCloseReason): Promise<PetAlertLostPet>;
  markPetAlertLostPetFound(alertId: Uuid, source: "pet_alert" | "other"): Promise<PetAlertLostPet>;
  createPetAlertLostPetSighting(input: CreatePetAlertLostPetSightingInput): Promise<Uuid>;
  setPetAlertLostPetSightingLocation(sightingId: Uuid, input: PetAlertLocationInput): Promise<PetAlertPrivateLocation>;
  listSightingsForPetAlertLostPet(alertId: Uuid): Promise<PetAlertLostPetSighting[]>;
  updatePetAlertLostPetSightingStatus(
    sightingId: Uuid,
    status: PetAlertSightingStatus
  ): Promise<PetAlertLostPetSighting>;
  createPetAlertCommunitySighting(input: CreatePetAlertCommunitySightingInput): Promise<PetAlertCommunitySighting>;
  setPetAlertCommunitySightingLocation(reportId: Uuid, input: PetAlertLocationInput): Promise<PetAlertPrivateLocation>;
  uploadPetAlertCommunityPhoto(input: UploadPetAlertCommunityPhotoInput): Promise<string>;
  getPetAlertCommunitySightingBySlug(reportSlug: string): Promise<PublicPetAlertCommunitySighting | null>;
  listPublicPetAlertCommunitySightings(filters?: { city?: string | null; country?: string | null; limit?: number }): Promise<PublicPetAlertCommunitySighting[]>;
  listPublicPetAlertDirectory(filters?: {
    view?: PetAlertPublicDirectoryView;
    query?: string | null;
    city?: string | null;
    species?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<PublicPetAlertDirectoryPage>;
  listPublicPetAlertMapPoints(filters?: PublicPetAlertMapFilters): Promise<PublicPetAlertMapPoint[]>;
  listMyPetAlertCommunitySightings(): Promise<PetAlertCommunitySighting[]>;
  closePetAlertCommunitySighting(reportId: Uuid, reason: PetAlertCommunityCloseReason): Promise<PetAlertCommunitySighting>;
  createPetAlertCommunityClaim(input: CreatePetAlertCommunityClaimInput): Promise<PetAlertCommunityClaim>;
  listMyPetAlertCommunityClaims(): Promise<PetAlertCommunityClaim[]>;
  listClaimsForMyPetAlertCommunitySightings(): Promise<PetAlertCommunityClaim[]>;
  reviewPetAlertCommunityClaim(claimId: Uuid, status: "approved" | "rejected", reason?: string | null): Promise<PetAlertCommunityClaim>;
  cancelPetAlertCommunityClaim(claimId: Uuid): Promise<PetAlertCommunityClaim>;
  reportPetAlertContent(input: { targetType: PetAlertModerationTargetType; targetId: Uuid; reason: PetAlertModerationReason; details?: string | null }): Promise<Uuid>;
  listPetAlertModerationQueue(status?: PetAlertModerationCaseStatus | "all"): Promise<PetAlertModerationCase[]>;
  moderatePetAlertContent(caseId: Uuid, action: PetAlertModerationAction, reason: string): Promise<Uuid>;
  listPetAlertModerationHistory(caseId: Uuid): Promise<PetAlertModerationHistoryEntry[]>;
  listPendingExternalPetAlertReports(): Promise<PetAlertExternalReportReview[]>;
  reviewExternalPetAlertReport(alertId: Uuid, decision: PetAlertExternalReportDecision, reason: string): Promise<PetAlertLostPet>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  throw new Error(error?.message ?? fallbackMessage);
}

function mapPrivateLocation(row: PrivateLocationRow): PetAlertPrivateLocation {
  return {
    latitude: row.private_latitude,
    longitude: row.private_longitude,
    accuracyMeters: row.location_accuracy_meters,
    source: row.location_source,
    capturedAt: row.location_captured_at,
    publicLocationVisible: row.public_location_visible
  };
}

function mapPublicMapPoint(row: PublicMapPointRow): PublicPetAlertMapPoint {
  return {
    eventType: row.event_type,
    publicSlug: row.public_slug,
    publicPath: row.public_path,
    status: row.status,
    statusGroup: row.status_group,
    title: row.title,
    species: row.species,
    city: row.city,
    occurredAt: row.occurred_at,
    publicLatitude: row.public_latitude,
    publicLongitude: row.public_longitude,
    photoUrl: null
  };
}

function mapAlert(row: LostPetAlertRow): PetAlertLostPet {
  return {
    id: row.id,
    petId: row.pet_id,
    householdId: row.household_id,
    createdByUserId: row.created_by_user_id,
    sourceType: row.source_type ?? "registered_pet",
    externalReporterId: row.external_reporter_id ?? null,
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
    photoUrls: [],
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
    expiresAt: report.expiresAt,
    photoUrls: report.photoUrls
  };
}

function mapPublicDirectoryEvent(row: PublicDirectoryRow): PublicPetAlertDirectoryEvent {
  return {
    eventType: row.event_type,
    publicSlug: row.public_slug,
    publicPath: row.public_path,
    status: row.status,
    statusGroup: row.status_group,
    title: row.title,
    species: row.species,
    breed: row.breed,
    city: row.city,
    region: row.region,
    country: row.country,
    occurredAt: row.occurred_at,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    summary: row.summary,
    locationReference: row.location_reference,
    photoUrl: null
  };
}

async function attachCommunityPhotoUrls<T extends PetAlertCommunitySighting | PublicPetAlertCommunitySighting>(
  supabase: PetAlertSupabaseClient,
  reports: T[]
): Promise<T[]> {
  const reportSlugs = reports.map((report) => report.reportSlug);
  if (!reportSlugs.length) return reports;

  const { data, error } = await supabase.rpc("list_public_pet_alert_community_media", {
    target_report_slugs: reportSlugs
  });
  if (error) fail(error, "No fue posible cargar las fotos del reporte comunitario.");

  const urlsBySlug = new Map<string, string[]>();
  const signedMedia = await Promise.all(((data ?? []) as CommunityMediaRow[]).map(async (media) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from(media.storage_bucket)
      .createSignedUrl(media.storage_path, 60 * 15);
    return signedError || !signed?.signedUrl ? null : { reportSlug: media.report_slug, url: signed.signedUrl };
  }));
  signedMedia.forEach((media) => {
    if (media) urlsBySlug.set(media.reportSlug, [...(urlsBySlug.get(media.reportSlug) ?? []), media.url]);
  });

  return reports.map((report) => ({ ...report, photoUrls: urlsBySlug.get(report.reportSlug) ?? [] }));
}

async function getPublicLostPetPhotoUrlMap(
  supabase: PetAlertSupabaseClient,
  alertSlugs: string[]
): Promise<Map<string, string>> {
  if (!alertSlugs.length) return new Map();
  const { data, error } = await supabase.rpc("list_public_pet_alert_lost_pet_media", {
    target_alert_slugs: alertSlugs
  });
  if (error) fail(error, "No fue posible cargar las fotos de las mascotas extraviadas.");

  const signedRows = await Promise.all(((data ?? []) as PublicLostPetMediaRow[]).map(async (media) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from(media.storage_bucket)
      .createSignedUrl(media.storage_path, 60 * 15);
    return signedError || !signed?.signedUrl ? null : [media.alert_slug, signed.signedUrl] as const;
  }));
  return new Map(signedRows.filter((entry): entry is readonly [string, string] => entry !== null));
}

function mapCommunityClaim(row: CommunityClaimRow): PetAlertCommunityClaim {
  return {
    id: row.id,
    communitySightingId: row.community_sighting_id,
    reportSlug: row.report_slug,
    claimantUserId: row.claimant_user_id,
    status: row.status,
    claimedPetId: row.claimed_pet_id,
    claimantName: row.claimant_name,
    claimantEmail: row.claimant_email,
    claimantPhone: row.claimant_phone,
    privateDetails: row.private_details,
    lostAt: row.lost_at,
    lostCity: row.lost_city,
    contactConsent: row.contact_consent,
    authorizedReporterName: row.authorized_reporter_name,
    authorizedReporterEmail: row.authorized_reporter_email,
    authorizedReporterPhone: row.authorized_reporter_phone,
    reviewedAt: row.reviewed_at,
    decisionReason: row.decision_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapModerationCase(row: ModerationCaseRow): PetAlertModerationCase {
  return {
    id: row.case_id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetStatus: row.target_status,
    targetTitle: row.target_title,
    targetSummary: row.target_summary,
    reasonCode: row.reason_code,
    reportDetails: row.report_details,
    status: row.case_status,
    resolutionAction: row.resolution_action,
    resolutionReason: row.resolution_reason,
    reportedAt: row.reported_at,
    reviewedAt: row.reviewed_at
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
    async setPetAlertLostPetLocation(alertId, input) {
      const { data, error } = await supabase.rpc("set_pet_alert_lost_pet_location", {
        target_alert_id: alertId,
        next_latitude: input.latitude,
        next_longitude: input.longitude,
        next_accuracy_meters: input.accuracyMeters ?? null,
        next_location_source: input.source,
        next_captured_at: input.capturedAt,
        next_public_location_visible: input.publicLocationVisible ?? true
      });
      const row = (data as PrivateLocationRow[] | null)?.[0];
      if (error || !row) fail(error, "No fue posible guardar la ubicacion de la alerta.");
      return mapPrivateLocation(row);
    },
    async getPetAlertLostPetBySlug(alertSlug) {
      const { data, error } = await supabase.rpc("get_public_pet_alert_lost_pet_by_slug", {
        target_alert_slug: alertSlug
      });
      if (error) fail(error, "No fue posible cargar la alerta PET ALERT.");
      const row = (data as PublicLostPetAlertRow[] | null)?.[0];
      if (!row) return null;
      const alert = mapPublicAlert(row);
      const photoBySlug = await getPublicLostPetPhotoUrlMap(supabase, [alert.alertSlug]);
      return { ...alert, photoUrl: photoBySlug.get(alert.alertSlug) ?? null };
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
    async setPetAlertLostPetSightingLocation(sightingId, input) {
      const { data, error } = await supabase.rpc("set_pet_alert_lost_pet_sighting_location", {
        target_sighting_id: sightingId,
        next_latitude: input.latitude,
        next_longitude: input.longitude,
        next_accuracy_meters: input.accuracyMeters ?? null,
        next_location_source: input.source,
        next_captured_at: input.capturedAt,
        next_public_location_visible: input.publicLocationVisible ?? true
      });
      const row = (data as PrivateLocationRow[] | null)?.[0];
      if (error || !row) fail(error, "No fue posible guardar la ubicacion del avistamiento.");
      return mapPrivateLocation(row);
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
    async setPetAlertCommunitySightingLocation(reportId, input) {
      const { data, error } = await supabase.rpc("set_pet_alert_community_sighting_location", {
        target_report_id: reportId,
        next_latitude: input.latitude,
        next_longitude: input.longitude,
        next_accuracy_meters: input.accuracyMeters ?? null,
        next_location_source: input.source,
        next_captured_at: input.capturedAt,
        next_public_location_visible: input.publicLocationVisible ?? true
      });
      const row = (data as PrivateLocationRow[] | null)?.[0];
      if (error || !row) fail(error, "No fue posible guardar la ubicacion del reporte comunitario.");
      return mapPrivateLocation(row);
    },
    async uploadPetAlertCommunityPhoto(input) {
      if (input.displayOrder < 0 || input.displayOrder > 2) throw new Error("Solo puedes agregar hasta 3 fotos.");
      if (!input.fileBytes.byteLength) throw new Error("La foto esta vacia.");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) fail(authError, "Debes iniciar sesion para subir una foto.");

      const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const storagePath = `${input.reportId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("pet-alert-media").upload(
        storagePath,
        new Uint8Array(input.fileBytes),
        { contentType: input.mimeType, upsert: false }
      );
      if (uploadError) fail(uploadError, "No fue posible subir la foto comunitaria.");

      const { error } = await supabase.from("pet_alert_community_sighting_media").insert({
        community_sighting_id: input.reportId,
        report_slug: input.reportSlug,
        storage_bucket: "pet-alert-media",
        storage_path: storagePath,
        file_name: input.fileName,
        mime_type: input.mimeType,
        file_size_bytes: input.fileBytes.byteLength,
        display_order: input.displayOrder,
        created_by_user_id: authData.user.id
      });
      if (error) {
        await supabase.storage.from("pet-alert-media").remove([storagePath]).catch(() => undefined);
        fail(error, "No fue posible registrar la foto comunitaria.");
      }
      const { data: signed, error: signedError } = await supabase.storage.from("pet-alert-media").createSignedUrl(storagePath, 60 * 15);
      if (signedError || !signed?.signedUrl) fail(signedError, "La foto se guardo, pero no pudo abrirse.");
      return signed.signedUrl;
    },
    async getPetAlertCommunitySightingBySlug(reportSlug) {
      const { data, error } = await supabase.rpc("get_public_pet_alert_community_sighting_by_slug", {
        target_report_slug: reportSlug
      });
      if (error) fail(error, "No fue posible cargar el reporte comunitario.");
      const row = (data as CommunitySightingRow[] | null)?.[0];
      if (!row) return null;
      const [report] = await attachCommunityPhotoUrls(supabase, [mapPublicCommunitySighting(row)]);
      return report ?? null;
    },
    async listPublicPetAlertCommunitySightings(filters = {}) {
      const { data, error } = await supabase.rpc("list_public_pet_alert_community_sightings", {
        filter_city: filters.city ?? null,
        filter_country: filters.country ?? "PA",
        result_limit: filters.limit ?? 30
      });
      if (error) fail(error, "No fue posible cargar los reportes comunitarios.");
      return attachCommunityPhotoUrls(supabase, ((data ?? []) as CommunitySightingRow[]).map(mapPublicCommunitySighting));
    },
    async listPublicPetAlertDirectory(filters = {}) {
      const limit = Math.min(Math.max(filters.limit ?? 18, 1), 50);
      const offset = Math.max(filters.offset ?? 0, 0);
      const { data, error } = await supabase.rpc("list_public_pet_alert_directory", {
        filter_view: filters.view ?? "lost",
        filter_query: filters.query ?? null,
        filter_city: filters.city ?? null,
        filter_species: filters.species ?? null,
        result_limit: limit,
        result_offset: offset
      });
      if (error) fail(error, "No fue posible cargar el centro comunitario PET ALERT.");

      const rows = (data ?? []) as PublicDirectoryRow[];
      const items = rows.map(mapPublicDirectoryEvent);
      const lostItems = items.filter((item) => item.eventType === "lost_pet");
      const communityItems = items.filter((item) => item.eventType === "community_sighting");
      if (lostItems.length) {
        const photoBySlug = await getPublicLostPetPhotoUrlMap(supabase, lostItems.map((item) => item.publicSlug));
        items.forEach((item) => {
          if (item.eventType === "lost_pet") item.photoUrl = photoBySlug.get(item.publicSlug) ?? null;
        });
      }
      if (communityItems.length) {
        const reports = await attachCommunityPhotoUrls(
          supabase,
          communityItems.map((item) => ({
            reportSlug: item.publicSlug,
            status: item.status as PetAlertCommunitySighting["status"],
            animalSpecies: item.species,
            apparentBreed: item.breed,
            apparentSize: "unknown" as const,
            apparentSex: "unknown" as const,
            primaryColor: null,
            collarDescription: null,
            distinctiveMarks: null,
            behaviorNotes: null,
            observedSituation: item.summary,
            sightedAt: item.occurredAt,
            city: item.city,
            region: item.region,
            country: item.country,
            locationReference: item.locationReference,
            publishedAt: item.publishedAt,
            expiresAt: item.updatedAt,
            photoUrls: []
          }))
        );
        const photoBySlug = new Map(reports.map((report) => [report.reportSlug, report.photoUrls[0] ?? null]));
        items.forEach((item) => {
          if (item.eventType === "community_sighting") item.photoUrl = photoBySlug.get(item.publicSlug) ?? null;
        });
      }

      return { items, total: Number(rows[0]?.total_count ?? 0), limit, offset };
    },
    async listPublicPetAlertMapPoints(filters = {}) {
      const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
      const { data, error } = await supabase.rpc("list_public_pet_alert_map_points", {
        filter_view: filters.view ?? "lost",
        filter_query: filters.query ?? null,
        filter_city: filters.city ?? null,
        filter_species: filters.species ?? null,
        bounds_min_latitude: filters.bounds?.minLatitude ?? null,
        bounds_min_longitude: filters.bounds?.minLongitude ?? null,
        bounds_max_latitude: filters.bounds?.maxLatitude ?? null,
        bounds_max_longitude: filters.bounds?.maxLongitude ?? null,
        result_limit: limit
      });
      if (error) fail(error, "No fue posible cargar las ubicaciones publicas PET ALERT.");

      const points = ((data ?? []) as PublicMapPointRow[]).map(mapPublicMapPoint);
      const lostPoints = points.filter((point) => point.eventType === "lost_pet");
      const communityPoints = points.filter((point) => point.eventType === "community_sighting");
      if (lostPoints.length) {
        const photoBySlug = await getPublicLostPetPhotoUrlMap(supabase, lostPoints.map((point) => point.publicSlug));
        points.forEach((point) => {
          if (point.eventType === "lost_pet") point.photoUrl = photoBySlug.get(point.publicSlug) ?? null;
        });
      }
      if (communityPoints.length) {
        const reports = await attachCommunityPhotoUrls(
          supabase,
          communityPoints.map((point) => ({
            reportSlug: point.publicSlug,
            status: point.status as PetAlertCommunitySighting["status"],
            animalSpecies: point.species,
            apparentBreed: null,
            apparentSize: "unknown" as const,
            apparentSex: "unknown" as const,
            primaryColor: null,
            collarDescription: null,
            distinctiveMarks: null,
            behaviorNotes: null,
            observedSituation: "",
            sightedAt: point.occurredAt,
            city: point.city,
            region: null,
            country: "PA",
            locationReference: null,
            publishedAt: point.occurredAt,
            expiresAt: point.occurredAt,
            photoUrls: []
          }))
        );
        const photoBySlug = new Map(reports.map((report) => [report.reportSlug, report.photoUrls[0] ?? null]));
        points.forEach((point) => {
          if (point.eventType === "community_sighting") point.photoUrl = photoBySlug.get(point.publicSlug) ?? null;
        });
      }
      return points;
    },
    async listMyPetAlertCommunitySightings() {
      const { data, error } = await supabase.rpc("list_my_pet_alert_community_sightings");
      if (error) fail(error, "No fue posible cargar tus reportes comunitarios.");
      return attachCommunityPhotoUrls(supabase, ((data ?? []) as CommunitySightingRow[]).map(mapCommunitySighting));
    },
    async closePetAlertCommunitySighting(reportId, reason) {
      const { data, error } = await supabase.rpc("close_pet_alert_community_sighting", {
        target_report_id: reportId,
        next_close_reason: reason
      });
      if (error || !data) fail(error, "No fue posible cerrar el reporte comunitario.");
      return mapCommunitySighting(data as CommunitySightingRow);
    },
    async createPetAlertCommunityClaim(input) {
      const { data, error } = await supabase.rpc("create_pet_alert_community_claim", {
        target_report_slug: input.reportSlug,
        target_claimed_pet_id: input.claimedPetId ?? null,
        next_private_details: input.privateDetails,
        next_lost_at: input.lostAt ?? null,
        next_lost_city: input.lostCity ?? null,
        next_contact_consent: input.contactConsent
      });
      if (error || !data) fail(error, "No fue posible enviar la solicitud de contacto.");
      return mapCommunityClaim(data as CommunityClaimRow);
    },
    async listMyPetAlertCommunityClaims() {
      const { data, error } = await supabase.rpc("list_my_pet_alert_community_claims");
      if (error) fail(error, "No fue posible cargar tus solicitudes.");
      return ((data ?? []) as CommunityClaimRow[]).map(mapCommunityClaim);
    },
    async listClaimsForMyPetAlertCommunitySightings() {
      const { data, error } = await supabase.rpc("list_claims_for_my_pet_alert_community_sightings");
      if (error) fail(error, "No fue posible cargar las solicitudes recibidas.");
      return ((data ?? []) as CommunityClaimRow[]).map(mapCommunityClaim);
    },
    async reviewPetAlertCommunityClaim(claimId, status, reason = null) {
      const { data, error } = await supabase.rpc("review_pet_alert_community_claim", {
        target_claim_id: claimId,
        next_status: status,
        next_decision_reason: reason
      });
      if (error || !data) fail(error, "No fue posible revisar la solicitud.");
      return mapCommunityClaim(data as CommunityClaimRow);
    },
    async cancelPetAlertCommunityClaim(claimId) {
      const { data, error } = await supabase.rpc("cancel_pet_alert_community_claim", { target_claim_id: claimId });
      if (error || !data) fail(error, "No fue posible cancelar la solicitud.");
      return mapCommunityClaim(data as CommunityClaimRow);
    },
    async reportPetAlertContent(input) {
      const { data, error } = await supabase.rpc("report_pet_alert_content", {
        next_target_type: input.targetType,
        next_target_id: input.targetId,
        next_reason_code: input.reason,
        next_report_details: input.details ?? null
      });
      if (error || !data) fail(error, "No fue posible reportar el contenido PET ALERT.");
      return (data as { id: string }).id;
    },
    async listPetAlertModerationQueue(status = "open") {
      const { data, error } = await supabase.rpc("list_pet_alert_moderation_queue", { filter_status: status });
      if (error) fail(error, "No fue posible cargar la cola PET ALERT.");
      return ((data ?? []) as ModerationCaseRow[]).map(mapModerationCase);
    },
    async moderatePetAlertContent(caseId, action, reason) {
      const { data, error } = await supabase.rpc("moderate_pet_alert_content", {
        target_case_id: caseId,
        next_action: action,
        next_resolution_reason: reason
      });
      if (error || !data) fail(error, "No fue posible moderar el contenido PET ALERT.");
      return (data as { id: string }).id;
    },
    async listPetAlertModerationHistory(caseId) {
      const { data, error } = await supabase.rpc("list_pet_alert_moderation_history", { target_case_id: caseId });
      if (error) fail(error, "No fue posible cargar el historial de moderacion.");
      return ((data ?? []) as ModerationHistoryRow[]).map((row) => ({
        id: row.id,
        moderationCaseId: row.moderation_case_id,
        oldStatus: row.old_status,
        newStatus: row.new_status,
        action: row.action,
        reason: row.reason,
        changedByUserId: row.changed_by_user_id,
        createdAt: row.created_at
      }));
    },
    async listPendingExternalPetAlertReports() {
      const { data, error } = await supabase.rpc("list_pending_external_pet_alert_reports");
      if (error) fail(error, "No fue posible cargar los reportes externos pendientes.");
      const rows = (data ?? []) as ExternalReportReviewRow[];
      return Promise.all(rows.map(async (row) => {
        const signed = row.photo_storage_bucket && row.photo_storage_path
          ? await supabase.storage.from(row.photo_storage_bucket).createSignedUrl(row.photo_storage_path, 60 * 10)
          : null;
        return {
        alertId: row.alert_id,
        alertSlug: row.alert_slug,
        petName: row.pet_name,
        petSpecies: row.pet_species,
        petBreed: row.pet_breed,
        lastSeenAt: row.last_seen_at,
        city: row.city,
        region: row.region,
        country: row.country,
        locationReference: row.location_reference,
        publicDescription: row.public_description,
        distinctiveMarks: row.distinctive_marks,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        photoUrl: signed?.data?.signedUrl ?? null,
        submittedAt: row.submitted_at
        };
      }));
    },
    async reviewExternalPetAlertReport(alertId, decision, reason) {
      const { data, error } = await supabase.rpc("review_external_pet_alert_report", {
        target_alert_id: alertId,
        decision,
        decision_reason: reason
      });
      if (error || !data) fail(error, "No fue posible revisar el reporte externo.");
      return mapAlert(data as LostPetAlertRow);
    }
  };
}
