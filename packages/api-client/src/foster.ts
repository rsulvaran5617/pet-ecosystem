import type {
  AdminPetAdoptionApplication,
  AdminProtectiveHouseholdProfile,
  ApplicationCommitmentDocument,
  ApplicationCommitmentDocumentReviewInput,
  ApplicationCommitmentDocumentUploadInput,
  AdoptionInviteContext,
  AdoptionInviteCreated,
  CreateAdoptionInviteInput,
  CreateFosterPetExpenseInput,
  CreatePublicAdoptionRequestInput,
  CreatePetTransferInvitationInput,
  Database,
  FosterPetExpense,
  FosterPetExpenseCategorySummary,
  FosterPetExpenseSummary,
  PetAdoptionApplication,
  PetAdoptionApplicationInput,
  PetAdoptionClosureDetail,
  PetAdoptionApplicationStatusHistory,
  PetAdoptionApplicationStatusUpdateInput,
  PetAdoptionListing,
  PetAdoptionListingInput,
  PetAdoptionListingMedia,
  PetAdoptionListingReviewInput,
  PetAdoptionMediaReviewInput,
  PetAdoptionMediaUploadInput,
  PetCustodyContext,
  PetTransferRecord,
  PublicPetAdoptionMedia,
  PublicPetAdoptionProfile,
  PublicAdoptionRequest,
  PublicAdoptionRequestCreated,
  AdminProtectivePublicProfile,
  ProtectiveHouseholdProfile,
  ProtectiveHouseholdProfileInput,
  ProtectiveHouseholdProfileReviewInput,
  ProtectiveAdoptionCommitmentTemplate,
  ProtectiveAdoptionCommitmentTemplateUploadInput,
  ProtectivePublicProfile,
  ProtectivePublicProfileInput,
  ProtectivePublicProfileLogoUploadInput,
  ProtectivePublicProfileReviewInput,
  UpdateFosterPetExpenseInput,
  UpdatePublicAdoptionRequestStatusInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type FosterSupabaseClient = SupabaseClient<Database>;
type ProtectiveHouseholdProfileRow = Database["public"]["Tables"]["protective_household_profiles"]["Row"];
type ProtectivePublicProfileRow = Database["public"]["Tables"]["protective_household_public_profiles"]["Row"];
type AdminProtectiveHouseholdProfileRow =
  Database["public"]["Functions"]["list_pending_protective_household_profiles"]["Returns"][number];
type AdminProtectivePublicProfileRow =
  Database["public"]["Functions"]["list_pending_protective_public_profiles_for_admin"]["Returns"][number];
type PetTransferFunctionRow =
  | Database["public"]["Functions"]["list_outgoing_pet_transfer_records"]["Returns"][number]
  | Database["public"]["Functions"]["list_incoming_pet_transfer_invitations"]["Returns"][number]
  | Database["public"]["Functions"]["list_pet_transfer_records_for_admin"]["Returns"][number];
type PetCustodyHistoryRow = Database["public"]["Functions"]["list_pet_custody_history"]["Returns"][number];
type PetAdoptionListingFunctionRow =
  | Database["public"]["Functions"]["list_my_pet_adoption_listings"]["Returns"][number]
  | Database["public"]["Functions"]["list_published_pet_adoption_listings"]["Returns"][number]
  | Database["public"]["Functions"]["list_pending_pet_adoption_listings_for_admin"]["Returns"][number]
  | Database["public"]["Functions"]["get_pet_adoption_listing_detail"]["Returns"][number];
type EmbeddedPetAdoptionListingMediaRow = {
  display_order?: number | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  id?: string | null;
  is_cover?: boolean | null;
  media_type?: "image" | "video" | string | null;
  mime_type?: string | null;
  moderation_status?: PetAdoptionListingMediaRow["moderation_status"] | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
};
type PetAdoptionListingFunctionRowWithMedia = PetAdoptionListingFunctionRow & {
  media?: EmbeddedPetAdoptionListingMediaRow[] | null;
};
type PublicPetAdoptionProfileRow =
  Database["public"]["Functions"]["get_public_pet_adoption_listing_by_slug"]["Returns"][number];
type PetAdoptionListingMediaRow = Database["public"]["Tables"]["pet_adoption_listing_media"]["Row"];
type PetAdoptionApplicationFunctionRow =
  | Database["public"]["Tables"]["pet_adoption_applications"]["Row"]
  | Database["public"]["Functions"]["list_my_pet_adoption_applications"]["Returns"][number]
  | Database["public"]["Functions"]["list_received_pet_adoption_applications"]["Returns"][number]
  | Database["public"]["Functions"]["list_pet_adoption_applications_for_admin"]["Returns"][number]
  | Database["public"]["Functions"]["get_pet_adoption_application_detail"]["Returns"][number];
type PetAdoptionApplicationStatusHistoryRow =
  Database["public"]["Functions"]["list_pet_adoption_application_status_history"]["Returns"][number];
type PetAdoptionClosureDetailRow = Database["public"]["Functions"]["get_pet_adoption_closure_detail"]["Returns"][number];
type ProtectiveAdoptionCommitmentTemplateRow =
  Database["public"]["Tables"]["protective_household_adoption_commitment_templates"]["Row"];
type ApplicationCommitmentDocumentRow =
  Database["public"]["Tables"]["pet_adoption_application_commitment_documents"]["Row"];
type FosterPetExpenseRow = Database["public"]["Tables"]["foster_pet_expenses"]["Row"];
type PublicAdoptionRequestRow =
  Database["public"]["Functions"]["list_received_public_adoption_requests"]["Returns"][number];
type PublicAdoptionRequestBaseRow = Database["public"]["Tables"]["adoption_public_requests"]["Row"];

const protectiveHouseholdLogosBucketId = "protective-household-logos";
const fosterAdoptionDocumentsBucketId = "foster-adoption-documents";

export interface FosterApiClient {
  getProtectiveHouseholdProfile(householdId: Uuid): Promise<ProtectiveHouseholdProfile | null>;
  upsertProtectiveHouseholdProfile(input: ProtectiveHouseholdProfileInput): Promise<ProtectiveHouseholdProfile>;
  submitProtectiveHouseholdProfile(householdId: Uuid): Promise<ProtectiveHouseholdProfile>;
  listPendingProtectiveHouseholdProfiles(): Promise<AdminProtectiveHouseholdProfile[]>;
  reviewProtectiveHouseholdProfile(
    householdId: Uuid,
    input: ProtectiveHouseholdProfileReviewInput
  ): Promise<ProtectiveHouseholdProfile>;
  getProtectivePublicProfile(householdId: Uuid): Promise<ProtectivePublicProfile | null>;
  upsertProtectivePublicProfile(input: ProtectivePublicProfileInput): Promise<ProtectivePublicProfile>;
  submitProtectivePublicProfile(profileId: Uuid): Promise<ProtectivePublicProfile>;
  uploadProtectivePublicProfileLogo(input: ProtectivePublicProfileLogoUploadInput): Promise<ProtectivePublicProfile>;
  reviewProtectivePublicProfile(profileId: Uuid, input: ProtectivePublicProfileReviewInput): Promise<ProtectivePublicProfile>;
  getPublicProtectiveProfileBySlug(slug: string): Promise<ProtectivePublicProfile | null>;
  listPendingProtectivePublicProfilesForAdmin(): Promise<AdminProtectivePublicProfile[]>;
  createPetTransferInvitation(input: CreatePetTransferInvitationInput): Promise<PetTransferRecord>;
  startPetAdoptionTransfer(applicationId: Uuid): Promise<PetTransferRecord>;
  acceptPetTransfer(transferId: Uuid, targetHouseholdId: Uuid): Promise<PetTransferRecord>;
  rejectPetTransfer(transferId: Uuid): Promise<PetTransferRecord>;
  cancelPetTransfer(transferId: Uuid): Promise<PetTransferRecord>;
  listIncomingPetTransfers(): Promise<PetTransferRecord[]>;
  listOutgoingPetTransfers(householdId?: Uuid | null): Promise<PetTransferRecord[]>;
  listPetCustodyHistory(petId: Uuid): Promise<PetCustodyContext[]>;
  listAdminPetTransfers(): Promise<PetTransferRecord[]>;
  createPetAdoptionListing(petId: Uuid, householdId: Uuid): Promise<PetAdoptionListing>;
  updatePetAdoptionListing(input: PetAdoptionListingInput): Promise<PetAdoptionListing>;
  submitPetAdoptionListing(listingId: Uuid): Promise<PetAdoptionListing>;
  pausePetAdoptionListing(listingId: Uuid): Promise<PetAdoptionListing>;
  closePetAdoptionListing(listingId: Uuid): Promise<PetAdoptionListing>;
  reviewPetAdoptionListing(listingId: Uuid, input: PetAdoptionListingReviewInput): Promise<PetAdoptionListing>;
  listMyPetAdoptionListings(householdId?: Uuid | null): Promise<PetAdoptionListing[]>;
  listPublishedPetAdoptionListings(): Promise<PetAdoptionListing[]>;
  getPetAdoptionListingDetail(listingId: Uuid, visibility?: "owner" | "public"): Promise<PetAdoptionListing | null>;
  getPublicPetAdoptionListingBySlug(slug: string): Promise<PublicPetAdoptionProfile | null>;
  createPublicAdoptionRequest(input: CreatePublicAdoptionRequestInput): Promise<PublicAdoptionRequestCreated>;
  listReceivedPublicAdoptionRequests(householdId?: Uuid | null): Promise<PublicAdoptionRequest[]>;
  updatePublicAdoptionRequestStatus(input: UpdatePublicAdoptionRequestStatusInput): Promise<PublicAdoptionRequest>;
  createAdoptionInvite(input: CreateAdoptionInviteInput): Promise<AdoptionInviteCreated>;
  resolveAdoptionInvite(token: string): Promise<AdoptionInviteContext>;
  listPendingPetAdoptionListingsForAdmin(): Promise<PetAdoptionListing[]>;
  createPetAdoptionApplication(input: PetAdoptionApplicationInput): Promise<PetAdoptionApplication>;
  listMyPetAdoptionApplications(): Promise<PetAdoptionApplication[]>;
  listReceivedPetAdoptionApplications(householdId?: Uuid | null): Promise<PetAdoptionApplication[]>;
  withdrawPetAdoptionApplication(applicationId: Uuid): Promise<PetAdoptionApplication>;
  listAdminPetAdoptionApplications(): Promise<AdminPetAdoptionApplication[]>;
  getPetAdoptionApplicationDetail(applicationId: Uuid): Promise<PetAdoptionApplication | null>;
  updatePetAdoptionApplicationStatus(input: PetAdoptionApplicationStatusUpdateInput): Promise<PetAdoptionApplication>;
  listPetAdoptionApplicationStatusHistory(applicationId: Uuid): Promise<PetAdoptionApplicationStatusHistory[]>;
  getPetAdoptionClosureDetail(applicationId: Uuid): Promise<PetAdoptionClosureDetail | null>;
  getProtectiveAdoptionCommitmentTemplate(householdId: Uuid): Promise<ProtectiveAdoptionCommitmentTemplate | null>;
  uploadProtectiveAdoptionCommitmentTemplate(
    input: ProtectiveAdoptionCommitmentTemplateUploadInput
  ): Promise<ProtectiveAdoptionCommitmentTemplate>;
  getApplicationCommitmentDocument(applicationId: Uuid): Promise<ApplicationCommitmentDocument | null>;
  uploadApplicationCommitmentDocument(input: ApplicationCommitmentDocumentUploadInput): Promise<ApplicationCommitmentDocument>;
  reviewApplicationCommitmentDocument(input: ApplicationCommitmentDocumentReviewInput): Promise<ApplicationCommitmentDocument>;
  listFosterPetExpenses(petId: Uuid): Promise<FosterPetExpense[]>;
  createFosterPetExpense(input: CreateFosterPetExpenseInput): Promise<FosterPetExpense>;
  updateFosterPetExpense(input: UpdateFosterPetExpenseInput): Promise<FosterPetExpense>;
  deleteFosterPetExpense(expenseId: Uuid): Promise<void>;
  getFosterPetExpenseSummary(householdId: Uuid): Promise<FosterPetExpenseSummary>;
  uploadPetAdoptionMedia(input: PetAdoptionMediaUploadInput): Promise<PetAdoptionListingMedia>;
  setPetAdoptionListingCover(mediaId: Uuid): Promise<PetAdoptionListingMedia>;
  reviewPetAdoptionListingMedia(mediaId: Uuid, input: PetAdoptionMediaReviewInput): Promise<PetAdoptionListingMedia>;
  removePetAdoptionMedia(mediaId: Uuid): Promise<void>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function isMissingFosterSchemaError(error: { message: string } | null) {
  const message = error?.message.toLowerCase() ?? "";

  return (
    message.includes("protective_household_profiles") ||
    message.includes("protective_household_public_profiles") ||
    message.includes("submit_protective_household_profile") ||
    message.includes("review_protective_household_profile") ||
    message.includes("list_pending_protective_household_profiles") ||
    message.includes("upsert_protective_public_profile") ||
    message.includes("set_protective_public_profile_logo") ||
    message.includes("submit_protective_public_profile") ||
    message.includes("review_protective_public_profile") ||
    message.includes("get_public_protective_profile_by_slug") ||
    message.includes("adoption_public_requests") ||
    message.includes("adoption_invites") ||
    message.includes("create_public_adoption_request") ||
    message.includes("create_adoption_invite") ||
    message.includes("resolve_adoption_invite") ||
    message.includes("list_received_public_adoption_requests") ||
    message.includes("update_public_adoption_request_status") ||
    message.includes("list_pending_protective_public_profiles_for_admin") ||
    message.includes("pet_transfer_records") ||
    message.includes("pet_custody_contexts") ||
    message.includes("create_pet_transfer_invitation") ||
    message.includes("start_pet_adoption_transfer") ||
    message.includes("accept_pet_transfer") ||
    message.includes("reject_pet_transfer") ||
    message.includes("cancel_pet_transfer") ||
    message.includes("list_incoming_pet_transfer_invitations") ||
    message.includes("list_outgoing_pet_transfer_records") ||
    message.includes("list_pet_transfer_records_for_admin") ||
    message.includes("list_pet_custody_history") ||
    message.includes("pet_adoption_listings") ||
    message.includes("pet_adoption_listing_media") ||
    message.includes("create_pet_adoption_listing") ||
    message.includes("update_pet_adoption_listing") ||
    message.includes("submit_pet_adoption_listing") ||
    message.includes("review_pet_adoption_listing") ||
    message.includes("review_pet_adoption_listing_media") ||
    message.includes("set_pet_adoption_listing_cover") ||
    message.includes("list_published_pet_adoption_listings") ||
    message.includes("get_public_pet_adoption_listing_by_slug") ||
    message.includes("list_pending_pet_adoption_listings_for_admin") ||
    message.includes("pet_adoption_applications") ||
    message.includes("create_pet_adoption_application") ||
    message.includes("list_my_pet_adoption_applications") ||
    message.includes("list_received_pet_adoption_applications") ||
    message.includes("withdraw_pet_adoption_application") ||
    message.includes("list_pet_adoption_applications_for_admin") ||
    message.includes("pet_adoption_application_status_history") ||
    message.includes("get_pet_adoption_application_detail") ||
    message.includes("update_pet_adoption_application_status") ||
    message.includes("list_pet_adoption_application_status_history") ||
    message.includes("protective_household_adoption_commitment_templates") ||
    message.includes("pet_adoption_application_commitment_documents") ||
    message.includes("get_protective_adoption_commitment_template") ||
    message.includes("upsert_protective_adoption_commitment_template") ||
    message.includes("get_pet_adoption_application_commitment_document") ||
    message.includes("register_pet_adoption_application_commitment_document") ||
    message.includes("review_pet_adoption_application_commitment_document") ||
    message.includes("get_pet_adoption_closure_detail") ||
    message.includes("foster_pet_expenses")
  ) && (message.includes("schema cache") || message.includes("could not find") || message.includes("does not exist"));
}

function failMissingFosterSchema(error: { message: string } | null): never {
  if (isMissingFosterSchemaError(error)) {
    throw new Error("Las migraciones Foster necesarias aun no estan aplicadas en Supabase remoto.");
  }

  fail(error, "Foster-1A operation failed.");
}

async function requireCurrentUserId(supabase: FosterSupabaseClient) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    fail(error, "Unable to resolve the current auth user.");
  }

  if (!data.user) {
    throw new Error("Authenticated user required.");
  }

  return data.user.id;
}

function mapProtectiveHouseholdProfile(row: ProtectiveHouseholdProfileRow): ProtectiveHouseholdProfile {
  return {
    householdId: row.household_id,
    status: row.status,
    displayName: row.display_name,
    organizationType: row.organization_type,
    city: row.city,
    stateRegion: row.state_region,
    countryCode: row.country_code,
    contactNotes: row.contact_notes,
    publicNotes: row.public_notes,
    reviewNotes: row.review_notes,
    submittedAt: row.submitted_at,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getProtectivePublicProfileLogoSignedUrl(
  supabase: FosterSupabaseClient,
  row: ProtectivePublicProfileRow
): Promise<string | null> {
  if (row.logo_storage_bucket === protectiveHouseholdLogosBucketId && row.logo_storage_path) {
    const { data } = await supabase.storage.from(protectiveHouseholdLogosBucketId).createSignedUrl(row.logo_storage_path, 60 * 60);
    return data?.signedUrl ?? null;
  }

  return null;
}

async function mapProtectivePublicProfile(
  supabase: FosterSupabaseClient,
  row: ProtectivePublicProfileRow
): Promise<ProtectivePublicProfile> {
  return {
    id: row.id,
    householdId: row.household_id,
    publicSlug: row.public_slug,
    displayName: row.display_name,
    mission: row.mission,
    publicStory: row.public_story,
    city: row.city,
    stateRegion: row.state_region,
    countryCode: row.country_code,
    contactPolicy: row.contact_policy,
    publicContactLabel: row.public_contact_label,
    publicContactValue: row.public_contact_value,
    needsSummary: row.needs_summary,
    websiteUrl: row.website_url,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    tiktokUrl: row.tiktok_url,
    whatsappUrl: row.whatsapp_url,
    donationsEnabled: row.donations_enabled ?? false,
    donationTitle: row.donation_title,
    donationDescription: row.donation_description,
    donationAchDetails: row.donation_ach_details,
    donationYappyDetails: row.donation_yappy_details,
    donationPaypalDetails: row.donation_paypal_details,
    donationExternalUrl: row.donation_external_url,
    donationOtherDetails: row.donation_other_details,
    donationDisclaimer: row.donation_disclaimer,
    logoUrl: await getProtectivePublicProfileLogoSignedUrl(supabase, row),
    logoStorageBucket: row.logo_storage_bucket,
    logoStoragePath: row.logo_storage_path,
    isPublic: row.is_public,
    moderationStatus: row.moderation_status,
    reviewNotes: row.review_notes,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function mapPetAdoptionMedia(
  supabase: FosterSupabaseClient,
  row: PetAdoptionListingMediaRow
): Promise<PetAdoptionListingMedia> {
  const { data } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 60 * 60);

  return {
    id: row.id,
    listingId: row.listing_id,
    mediaType: row.media_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    mimeType: row.mime_type,
    displayOrder: row.display_order,
    isCover: row.is_cover,
    moderationStatus: row.moderation_status,
    signedUrl: data?.signedUrl ?? null,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function mapEmbeddedPetAdoptionMedia(
  supabase: FosterSupabaseClient,
  listingId: Uuid,
  row: EmbeddedPetAdoptionListingMediaRow
): Promise<PetAdoptionListingMedia | null> {
  if (!row.id || !row.storage_bucket || !row.storage_path) {
    return null;
  }

  const { data } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 60 * 60);

  return {
    id: row.id,
    listingId,
    mediaType: row.media_type === "video" ? "video" : "image",
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name ?? "adopcion.jpg",
    fileSizeBytes: row.file_size_bytes ?? null,
    mimeType: row.mime_type ?? null,
    displayOrder: row.display_order ?? 0,
    isCover: row.is_cover === true,
    moderationStatus: row.moderation_status ?? "pending",
    signedUrl: data?.signedUrl ?? null,
    createdByUserId: "",
    createdAt: "",
    updatedAt: ""
  };
}

function normalizePublicAdoptionMediaRows(media: unknown): Array<{
  id: string;
  media_type: "image" | "video";
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  display_order: number;
  is_cover: boolean;
}> {
  if (!Array.isArray(media)) {
    return [];
  }

  return media.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : null;
    const storageBucket = typeof row.storage_bucket === "string" ? row.storage_bucket : null;
    const storagePath = typeof row.storage_path === "string" ? row.storage_path : null;
    const fileName = typeof row.file_name === "string" ? row.file_name : "adopcion.jpg";
    const mediaType = row.media_type === "video" ? "video" : "image";

    if (!id || !storageBucket || !storagePath) {
      return [];
    }

    return [
      {
        id,
        media_type: mediaType,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
        display_order: typeof row.display_order === "number" ? row.display_order : 0,
        is_cover: row.is_cover === true
      }
    ];
  });
}

async function mapPublicPetAdoptionMedia(
  supabase: FosterSupabaseClient,
  media: unknown
): Promise<PublicPetAdoptionMedia[]> {
  const rows = normalizePublicAdoptionMediaRows(media);

  return Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 60 * 60);

      return {
        id: row.id,
        mediaType: row.media_type,
        storageBucket: row.storage_bucket,
        storagePath: row.storage_path,
        fileName: row.file_name,
        mimeType: row.mime_type,
        displayOrder: row.display_order,
        isCover: row.is_cover,
        signedUrl: data?.signedUrl ?? null
      };
    })
  );
}

async function listPetAdoptionMedia(
  supabase: FosterSupabaseClient,
  listingIds: Uuid[],
  visibility: "admin" | "owner" | "public" = "owner"
): Promise<Map<Uuid, PetAdoptionListingMedia[]>> {
  if (!listingIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("pet_adoption_listing_media")
    .select("*")
    .in("listing_id", listingIds)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingFosterSchemaError(error)) {
      return new Map();
    }

    fail(error, "Unable to load adoption media.");
  }

  const visibleRows =
    visibility === "public"
      ? (data ?? []).filter((row) => row.moderation_status === "approved")
      : (data ?? []);
  const mappedMedia = await Promise.all(visibleRows.map((row) => mapPetAdoptionMedia(supabase, row)));
  return mappedMedia.reduce((groupedMedia, media) => {
    const current = groupedMedia.get(media.listingId) ?? [];
    current.push(media);
    groupedMedia.set(media.listingId, current);
    return groupedMedia;
  }, new Map<Uuid, PetAdoptionListingMedia[]>());
}

function mapPetAdoptionListing(
  row: PetAdoptionListingFunctionRow,
  media: PetAdoptionListingMedia[] = []
): PetAdoptionListing {
  return {
    id: row.id,
    petId: row.pet_id,
    householdId: row.household_id,
    status: row.status,
    publicSlug: row.public_slug ?? null,
    shareStatus: row.share_status,
    sharePublishedAt: row.share_published_at,
    title: row.title,
    publicStory: row.public_story,
    personalityNotes: row.personality_notes,
    publicHealthSummary: row.public_health_summary,
    adoptionRequirements: row.adoption_requirements,
    city: row.city,
    stateRegion: row.state_region,
    countryCode: row.country_code,
    compatibilityChildren: row.compatibility_children,
    compatibilityDogs: row.compatibility_dogs,
    compatibilityCats: row.compatibility_cats,
    specialNeedsNotes: row.special_needs_notes,
    publishedAt: row.published_at,
    pausedAt: row.paused_at,
    closedAt: row.closed_at,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    responsibilityAcknowledgedAt: row.responsibility_acknowledged_at,
    responsibilityAcknowledgedByUserId: row.responsibility_acknowledged_by_user_id,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    petName: row.pet_name,
    petSpecies: row.pet_species,
    petBreed: row.pet_breed,
    petSex: row.pet_sex,
    petBirthDate: row.pet_birth_date,
    petIsSterilized: row.pet_is_sterilized,
    householdName: row.household_name,
    protectiveWebsiteUrl: "protective_website_url" in row ? row.protective_website_url : null,
    protectiveInstagramUrl: "protective_instagram_url" in row ? row.protective_instagram_url : null,
    protectiveFacebookUrl: "protective_facebook_url" in row ? row.protective_facebook_url : null,
    protectiveTiktokUrl: "protective_tiktok_url" in row ? row.protective_tiktok_url : null,
    protectiveWhatsappUrl: "protective_whatsapp_url" in row ? row.protective_whatsapp_url : null,
    protectiveDonationsEnabled: "protective_donations_enabled" in row ? row.protective_donations_enabled : false,
    protectiveDonationTitle: "protective_donation_title" in row ? row.protective_donation_title : null,
    protectiveDonationDescription: "protective_donation_description" in row ? row.protective_donation_description : null,
    protectiveDonationAchDetails: "protective_donation_ach_details" in row ? row.protective_donation_ach_details : null,
    protectiveDonationYappyDetails: "protective_donation_yappy_details" in row ? row.protective_donation_yappy_details : null,
    protectiveDonationPaypalDetails: "protective_donation_paypal_details" in row ? row.protective_donation_paypal_details : null,
    protectiveDonationExternalUrl: "protective_donation_external_url" in row ? row.protective_donation_external_url : null,
    protectiveDonationOtherDetails: "protective_donation_other_details" in row ? row.protective_donation_other_details : null,
    protectiveDonationDisclaimer: "protective_donation_disclaimer" in row ? row.protective_donation_disclaimer : null,
    media
  };
}

function mapPetAdoptionApplication(row: PetAdoptionApplicationFunctionRow): PetAdoptionApplication {
  return {
    id: row.id,
    listingId: row.listing_id,
    petId: row.pet_id,
    protectiveHouseholdId: row.protective_household_id,
    applicantUserId: row.applicant_user_id,
    applicantHouseholdId: row.applicant_household_id,
    applicantName: row.applicant_name,
    applicantEmail: row.applicant_email,
    applicantPhone: row.applicant_phone,
    housingType: row.housing_type,
    hasChildren: row.has_children,
    hasOtherPets: row.has_other_pets,
    petExperience: row.pet_experience,
    motivation: row.motivation,
    availabilityNotes: row.availability_notes,
    commitmentAcknowledged: row.commitment_acknowledged,
    status: row.status,
    submittedAt: row.submitted_at,
    withdrawnAt: row.withdrawn_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listingTitle: "listing_title" in row ? row.listing_title : "Publicacion de adopcion",
    petName: "pet_name" in row ? row.pet_name : "Mascota",
    petSpecies: "pet_species" in row ? row.pet_species : "Mascota",
    petBreed: "pet_breed" in row ? row.pet_breed : null,
    protectiveHouseholdName: "protective_household_name" in row ? row.protective_household_name : "Familia protectora"
  };
}

function mapPublicAdoptionRequest(row: PublicAdoptionRequestRow | PublicAdoptionRequestBaseRow): PublicAdoptionRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    protectiveHouseholdId: row.protective_household_id,
    petId: row.pet_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterPhone: row.requester_phone,
    requesterCity: row.requester_city,
    motivation: row.motivation,
    experience: row.experience,
    housingType: row.housing_type,
    hasOtherPets: row.has_other_pets,
    hasChildren: row.has_children,
    privacyAcknowledgedAt: row.privacy_acknowledged_at,
    status: row.status,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listingTitle: "listing_title" in row ? row.listing_title : "Publicacion de adopcion",
    listingSlug: "listing_slug" in row ? row.listing_slug : "",
    petName: "pet_name" in row ? row.pet_name : "Mascota"
  };
}

function mapPetAdoptionApplicationStatusHistory(
  row: PetAdoptionApplicationStatusHistoryRow
): PetAdoptionApplicationStatusHistory {
  return {
    id: row.id,
    applicationId: row.application_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedByUserId: row.changed_by_user_id,
    changedByEmail: row.changed_by_email,
    changeNotes: row.change_notes,
    createdAt: row.created_at
  };
}

function mapPetAdoptionClosureDetail(row: PetAdoptionClosureDetailRow): PetAdoptionClosureDetail {
  return {
    applicationId: row.application_id,
    applicationStatus: row.application_status,
    listingId: row.listing_id,
    listingStatus: row.listing_status,
    petId: row.pet_id,
    petName: row.pet_name,
    protectiveHouseholdId: row.protective_household_id,
    protectiveHouseholdName: row.protective_household_name,
    applicantUserId: row.applicant_user_id,
    applicantEmail: row.applicant_email,
    transferId: row.transfer_id,
    transferStatus: row.transfer_status,
    transferCreatedAt: row.transfer_created_at,
    transferAcceptedAt: row.transfer_accepted_at,
    toHouseholdId: row.to_household_id,
    toHouseholdName: row.to_household_name
  };
}

async function createFosterDocumentSignedUrl(
  supabase: FosterSupabaseClient,
  bucket: string | null,
  path: string | null
) {
  if (bucket !== fosterAdoptionDocumentsBucketId || !path) {
    return null;
  }

  const { data } = await supabase.storage.from(fosterAdoptionDocumentsBucketId).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function mapProtectiveAdoptionCommitmentTemplate(
  supabase: FosterSupabaseClient,
  row: ProtectiveAdoptionCommitmentTemplateRow
): Promise<ProtectiveAdoptionCommitmentTemplate> {
  return {
    id: row.id,
    protectiveHouseholdId: row.protective_household_id,
    title: row.title,
    description: row.description,
    requirementPolicy: row.requirement_policy,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    isActive: row.is_active,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    signedUrl: await createFosterDocumentSignedUrl(supabase, row.storage_bucket, row.storage_path)
  };
}

async function mapApplicationCommitmentDocument(
  supabase: FosterSupabaseClient,
  row: ApplicationCommitmentDocumentRow
): Promise<ApplicationCommitmentDocument> {
  return {
    id: row.id,
    applicationId: row.application_id,
    templateId: row.template_id,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    submittedByUserId: row.submitted_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewNotes: row.review_notes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    signedUrl: await createFosterDocumentSignedUrl(supabase, row.storage_bucket, row.storage_path)
  };
}

async function mapPetAdoptionListings(
  supabase: FosterSupabaseClient,
  rows: PetAdoptionListingFunctionRow[],
  visibility: "admin" | "owner" | "public" = "owner"
): Promise<PetAdoptionListing[]> {
  const rowsWithMedia = rows as PetAdoptionListingFunctionRowWithMedia[];
  const hasEmbeddedMedia = rowsWithMedia.some((row) => Array.isArray(row.media));
  const mediaByListing = hasEmbeddedMedia
    ? await Promise.all(
        rowsWithMedia.map(async (row) => {
          const embeddedMedia = Array.isArray(row.media) ? row.media : [];
          const mappedMedia = await Promise.all(embeddedMedia.map((media) => mapEmbeddedPetAdoptionMedia(supabase, row.id, media)));
          const availableMedia = mappedMedia.filter((media): media is PetAdoptionListingMedia => Boolean(media));
          const visibleMedia =
            visibility === "public"
              ? availableMedia.filter((media) => media.moderationStatus === "approved")
              : availableMedia;

          return [row.id, visibleMedia] as const;
        })
      ).then((entries) => new Map<Uuid, PetAdoptionListingMedia[]>(entries))
    : await listPetAdoptionMedia(
        supabase,
        rows.map((row) => row.id),
        visibility
      );

  return rows.map((row) => mapPetAdoptionListing(row, mediaByListing.get(row.id) ?? []));
}

async function mapPublicPetAdoptionProfile(
  supabase: FosterSupabaseClient,
  row: PublicPetAdoptionProfileRow
): Promise<PublicPetAdoptionProfile> {
  return {
    publicSlug: row.public_slug,
    title: row.title,
    publicStory: row.public_story,
    personalityNotes: row.personality_notes,
    publicHealthSummary: row.public_health_summary,
    adoptionRequirements: row.adoption_requirements,
    city: row.city,
    stateRegion: row.state_region,
    countryCode: row.country_code,
    compatibilityChildren: row.compatibility_children,
    compatibilityDogs: row.compatibility_dogs,
    compatibilityCats: row.compatibility_cats,
    specialNeedsNotes: row.special_needs_notes,
    sharePublishedAt: row.share_published_at,
    listingStatus: row.listing_status ?? "published",
    petName: row.pet_name,
    petSpecies: row.pet_species,
    petBreed: row.pet_breed,
    petSex: row.pet_sex,
    petBirthDate: row.pet_birth_date,
    petIsSterilized: row.pet_is_sterilized,
    media: await mapPublicPetAdoptionMedia(supabase, row.media),
    protectiveHousehold: {
      publicSlug: row.protective_profile_slug,
      displayName: row.protective_display_name,
      mission: row.protective_mission,
      publicStory: row.protective_public_story,
      logoUrl: null,
      city: row.protective_city,
      stateRegion: row.protective_state_region,
      countryCode: row.protective_country_code,
      contactPolicy: row.contact_policy,
      publicContactLabel: row.public_contact_label,
      publicContactValue: row.public_contact_value,
      needsSummary: row.needs_summary,
      websiteUrl: row.protective_website_url,
      instagramUrl: row.protective_instagram_url,
      facebookUrl: row.protective_facebook_url,
      tiktokUrl: row.protective_tiktok_url,
      whatsappUrl: row.protective_whatsapp_url,
      donationsEnabled: row.protective_donations_enabled,
      donationTitle: row.protective_donation_title,
      donationDescription: row.protective_donation_description,
      donationAchDetails: row.protective_donation_ach_details,
      donationYappyDetails: row.protective_donation_yappy_details,
      donationPaypalDetails: row.protective_donation_paypal_details,
      donationExternalUrl: row.protective_donation_external_url,
      donationOtherDetails: row.protective_donation_other_details,
      donationDisclaimer: row.protective_donation_disclaimer
    }
  };
}

function mapAdminProtectiveHouseholdProfile(
  row: AdminProtectiveHouseholdProfileRow
): AdminProtectiveHouseholdProfile {
  return {
    ...mapProtectiveHouseholdProfile(row),
    householdName: row.household_name,
    createdByEmail: row.created_by_email
  };
}

async function mapAdminProtectivePublicProfile(
  supabase: FosterSupabaseClient,
  row: AdminProtectivePublicProfileRow
): Promise<AdminProtectivePublicProfile> {
  return {
    ...(await mapProtectivePublicProfile(supabase, row)),
    householdName: row.household_name,
    createdByEmail: row.created_by_email
  };
}

function assertProtectiveLogoMimeType(mimeType: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new Error("El logo debe ser una imagen JPG, PNG o WebP.");
  }
}

function mapPetTransferRecord(row: PetTransferFunctionRow): PetTransferRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    petName: row.pet_name,
    petSpecies: row.pet_species,
    fromHouseholdId: row.from_household_id,
    fromHouseholdName: row.from_household_name,
    toHouseholdId: row.to_household_id,
    toHouseholdName: "to_household_name" in row ? row.to_household_name : null,
    recipientEmail: row.recipient_email,
    recipientUserId: row.recipient_user_id,
    adoptionApplicationId: "adoption_application_id" in row ? row.adoption_application_id : null,
    status: row.status,
    consentSnapshot: row.consent_snapshot,
    transferNotes: row.transfer_notes,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    cancelledAt: row.cancelled_at
  };
}

function mapPetCustodyContext(row: PetCustodyHistoryRow): PetCustodyContext {
  return {
    id: row.id,
    petId: row.pet_id,
    householdId: row.household_id,
    householdName: row.household_name,
    custodyType: row.custody_type,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFosterPetExpense(row: FosterPetExpenseRow): FosterPetExpense {
  return {
    id: row.id,
    petId: row.pet_id,
    protectiveHouseholdId: row.protective_household_id,
    expenseDate: row.expense_date,
    category: row.category,
    title: row.title,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    vendorName: row.vendor_name,
    paymentMethod: row.payment_method,
    receiptDocumentId: row.receipt_document_id,
    isReimbursed: row.is_reimbursed,
    reimbursementNote: row.reimbursement_note,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function summarizeFosterPetExpenses(expenses: FosterPetExpense[], householdId?: Uuid): FosterPetExpenseSummary {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const byCategoryMap = expenses.reduce((summary, expense) => {
    const current = summary.get(expense.category) ?? { category: expense.category, amount: 0, count: 0 };
    current.amount += expense.amount;
    current.count += 1;
    summary.set(expense.category, current);
    return summary;
  }, new Map<FosterPetExpense["category"], FosterPetExpenseCategorySummary>());

  return {
    protectiveHouseholdId: householdId,
    currency: expenses[0]?.currency ?? "USD",
    totalAmount: expenses.reduce((total, expense) => total + expense.amount, 0),
    currentMonthAmount: expenses
      .filter((expense) => expense.expenseDate.startsWith(currentMonth))
      .reduce((total, expense) => total + expense.amount, 0),
    expenseCount: expenses.length,
    byCategory: Array.from(byCategoryMap.values()).sort((first, second) => second.amount - first.amount)
  };
}

export function createFosterApiClient(supabase: FosterSupabaseClient): FosterApiClient {
  return {
    async getProtectiveHouseholdProfile(householdId) {
      const { data, error } = await supabase
        .from("protective_household_profiles")
        .select("*")
        .eq("household_id", householdId)
        .maybeSingle();

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load the protective household profile.");
      }

      return data ? mapProtectiveHouseholdProfile(data) : null;
    },
    async upsertProtectiveHouseholdProfile(input) {
      const currentUserId = await requireCurrentUserId(supabase);
      const { data, error } = await supabase
        .from("protective_household_profiles")
        .upsert(
          {
            household_id: input.householdId,
            display_name: input.displayName,
            organization_type: input.organizationType,
            city: input.city,
            state_region: input.stateRegion ?? null,
            country_code: input.countryCode ?? "PA",
            contact_notes: input.contactNotes ?? null,
            public_notes: input.publicNotes ?? null,
            created_by_user_id: currentUserId
          },
          { onConflict: "household_id" }
        )
        .select("*")
        .single();

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapProtectiveHouseholdProfile(data);
    },
    async submitProtectiveHouseholdProfile(householdId) {
      const { data, error } = await supabase.rpc("submit_protective_household_profile", {
        target_household_id: householdId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapProtectiveHouseholdProfile(data);
    },
    async listPendingProtectiveHouseholdProfiles() {
      const { data, error } = await supabase.rpc("list_pending_protective_household_profiles", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load pending protective household profiles.");
      }

      return (data ?? []).map(mapAdminProtectiveHouseholdProfile);
    },
    async reviewProtectiveHouseholdProfile(householdId, input) {
      const { data, error } = await supabase.rpc("review_protective_household_profile", {
        target_household_id: householdId,
        decision: input.decision,
        notes: input.notes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapProtectiveHouseholdProfile(data);
    },
    async getProtectivePublicProfile(householdId) {
      const { data, error } = await supabase
        .from("protective_household_public_profiles")
        .select("*")
        .eq("household_id", householdId)
        .maybeSingle();

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load the protective public profile.");
      }

      return data ? mapProtectivePublicProfile(supabase, data) : null;
    },
    async upsertProtectivePublicProfile(input) {
      const { data, error } = await supabase.rpc("upsert_protective_public_profile", {
        target_household_id: input.householdId,
        next_display_name: input.displayName,
        next_mission: input.mission ?? null,
        next_public_story: input.publicStory ?? null,
        next_city: input.city,
        next_state_region: input.stateRegion ?? null,
        next_country_code: input.countryCode ?? "PA",
        next_contact_policy: input.contactPolicy ?? "platform_only",
        next_public_contact_label: input.publicContactLabel ?? null,
        next_public_contact_value: input.publicContactValue ?? null,
        next_needs_summary: input.needsSummary ?? null,
        next_website_url: input.websiteUrl ?? null,
        next_instagram_url: input.instagramUrl ?? null,
        next_facebook_url: input.facebookUrl ?? null,
        next_tiktok_url: input.tiktokUrl ?? null,
        next_whatsapp_url: input.whatsappUrl ?? null,
        next_donations_enabled: input.donationsEnabled ?? false,
        next_donation_title: input.donationTitle ?? null,
        next_donation_description: input.donationDescription ?? null,
        next_donation_ach_details: input.donationAchDetails ?? null,
        next_donation_yappy_details: input.donationYappyDetails ?? null,
        next_donation_paypal_details: input.donationPaypalDetails ?? null,
        next_donation_external_url: input.donationExternalUrl ?? null,
        next_donation_other_details: input.donationOtherDetails ?? null,
        next_donation_disclaimer: input.donationDisclaimer ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapProtectivePublicProfile(supabase, data);
    },
    async uploadProtectivePublicProfileLogo(input) {
      assertProtectiveLogoMimeType(input.mimeType);

      const extension = input.fileName.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${input.householdId}/logo-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const fileBlob = input.fileBody ?? (input.fileUri ? await fetch(input.fileUri).then((response) => response.blob()) : null);

      if (!fileBlob) {
        throw new Error("El archivo del logo es obligatorio.");
      }

      const { error: uploadError } = await supabase.storage
        .from(protectiveHouseholdLogosBucketId)
        .upload(storagePath, fileBlob, {
          contentType: input.mimeType,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`No fue posible guardar el logo en Storage. Detalle: ${uploadError.message}`);
      }

      const { data, error } = await supabase.rpc("set_protective_public_profile_logo", {
        target_profile_id: input.profileId,
        next_logo_storage_bucket: protectiveHouseholdLogosBucketId,
        next_logo_storage_path: storagePath
      });

      if (error) {
        await supabase.storage.from(protectiveHouseholdLogosBucketId).remove([storagePath]);
        failMissingFosterSchema(error);
      }

      return mapProtectivePublicProfile(supabase, data);
    },
    async submitProtectivePublicProfile(profileId) {
      const { data, error } = await supabase.rpc("submit_protective_public_profile", {
        target_profile_id: profileId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapProtectivePublicProfile(supabase, data);
    },
    async reviewProtectivePublicProfile(profileId, input) {
      const { data, error } = await supabase.rpc("review_protective_public_profile", {
        target_profile_id: profileId,
        decision: input.decision,
        notes: input.notes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapProtectivePublicProfile(supabase, data);
    },
    async getPublicProtectiveProfileBySlug(slug) {
      const { data, error } = await supabase.rpc("get_public_protective_profile_by_slug", {
        target_slug: slug
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load public protective profile.");
      }

      return data?.[0] ? mapProtectivePublicProfile(supabase, data[0]) : null;
    },
    async listPendingProtectivePublicProfilesForAdmin() {
      const { data, error } = await supabase.rpc("list_pending_protective_public_profiles_for_admin", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load pending protective public profiles.");
      }

      return Promise.all((data ?? []).map((row) => mapAdminProtectivePublicProfile(supabase, row)));
    },
    async createPetTransferInvitation(input) {
      const { data, error } = await supabase.rpc("create_pet_transfer_invitation", {
        target_pet_id: input.petId,
        target_from_household_id: input.fromHouseholdId,
        target_recipient_email: input.recipientEmail,
        notes: input.transferNotes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return {
        id: data.id,
        petId: data.pet_id,
        petName: "Mascota",
        petSpecies: "Mascota",
        fromHouseholdId: data.from_household_id,
        fromHouseholdName: "Hogar emisor",
        toHouseholdId: data.to_household_id,
        toHouseholdName: null,
        recipientEmail: data.recipient_email,
        recipientUserId: data.recipient_user_id,
        adoptionApplicationId: data.adoption_application_id,
        status: data.status,
        consentSnapshot: data.consent_snapshot,
        transferNotes: data.transfer_notes,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        cancelledAt: data.cancelled_at
      };
    },
    async startPetAdoptionTransfer(applicationId) {
      const { data, error } = await supabase.rpc("start_pet_adoption_transfer", {
        target_application_id: applicationId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return {
        id: data.id,
        petId: data.pet_id,
        petName: "Mascota en adopcion",
        petSpecies: "Mascota",
        fromHouseholdId: data.from_household_id,
        fromHouseholdName: "Familia protectora",
        toHouseholdId: data.to_household_id,
        toHouseholdName: null,
        recipientEmail: data.recipient_email,
        recipientUserId: data.recipient_user_id,
        adoptionApplicationId: data.adoption_application_id,
        status: data.status,
        consentSnapshot: data.consent_snapshot,
        transferNotes: data.transfer_notes,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        cancelledAt: data.cancelled_at
      };
    },
    async acceptPetTransfer(transferId, targetHouseholdId) {
      const { data, error } = await supabase.rpc("accept_pet_transfer", {
        target_transfer_id: transferId,
        target_to_household_id: targetHouseholdId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return {
        id: data.id,
        petId: data.pet_id,
        petName: "Mascota transferida",
        petSpecies: "Mascota",
        fromHouseholdId: data.from_household_id,
        fromHouseholdName: "Hogar emisor",
        toHouseholdId: data.to_household_id,
        toHouseholdName: null,
        recipientEmail: data.recipient_email,
        recipientUserId: data.recipient_user_id,
        adoptionApplicationId: data.adoption_application_id,
        status: data.status,
        consentSnapshot: data.consent_snapshot,
        transferNotes: data.transfer_notes,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        cancelledAt: data.cancelled_at
      };
    },
    async rejectPetTransfer(transferId) {
      const { data, error } = await supabase.rpc("reject_pet_transfer", {
        target_transfer_id: transferId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return {
        id: data.id,
        petId: data.pet_id,
        petName: "Mascota",
        petSpecies: "Mascota",
        fromHouseholdId: data.from_household_id,
        fromHouseholdName: "Hogar emisor",
        toHouseholdId: data.to_household_id,
        toHouseholdName: null,
        recipientEmail: data.recipient_email,
        recipientUserId: data.recipient_user_id,
        adoptionApplicationId: data.adoption_application_id,
        status: data.status,
        consentSnapshot: data.consent_snapshot,
        transferNotes: data.transfer_notes,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        cancelledAt: data.cancelled_at
      };
    },
    async cancelPetTransfer(transferId) {
      const { data, error } = await supabase.rpc("cancel_pet_transfer", {
        target_transfer_id: transferId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return {
        id: data.id,
        petId: data.pet_id,
        petName: "Mascota",
        petSpecies: "Mascota",
        fromHouseholdId: data.from_household_id,
        fromHouseholdName: "Hogar emisor",
        toHouseholdId: data.to_household_id,
        toHouseholdName: null,
        recipientEmail: data.recipient_email,
        recipientUserId: data.recipient_user_id,
        adoptionApplicationId: data.adoption_application_id,
        status: data.status,
        consentSnapshot: data.consent_snapshot,
        transferNotes: data.transfer_notes,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        cancelledAt: data.cancelled_at
      };
    },
    async listIncomingPetTransfers() {
      const { data, error } = await supabase.rpc("list_incoming_pet_transfer_invitations", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load incoming pet transfers.");
      }

      return (data ?? []).map(mapPetTransferRecord);
    },
    async listOutgoingPetTransfers(householdId) {
      const { data, error } = await supabase.rpc("list_outgoing_pet_transfer_records", {
        target_household_id: householdId ?? null
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load outgoing pet transfers.");
      }

      return (data ?? []).map(mapPetTransferRecord);
    },
    async listPetCustodyHistory(petId) {
      const { data, error } = await supabase.rpc("list_pet_custody_history", {
        target_pet_id: petId
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load pet custody history.");
      }

      return (data ?? []).map(mapPetCustodyContext);
    },
    async listAdminPetTransfers() {
      const { data, error } = await supabase.rpc("list_pet_transfer_records_for_admin", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load pet transfer audit.");
      }

      return (data ?? []).map(mapPetTransferRecord);
    },
    async createPetAdoptionListing(petId, householdId) {
      const { data, error } = await supabase.rpc("create_pet_adoption_listing", {
        target_pet_id: petId,
        target_household_id: householdId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const [listing] = await mapPetAdoptionListings(supabase, [
        {
          ...data,
          pet_name: "Mascota",
          pet_species: "Mascota",
          pet_breed: null,
          pet_sex: "unknown",
          pet_birth_date: null,
          pet_is_sterilized: null,
          household_name: "Hogar protector"
        }
      ]);
      return listing;
    },
    async updatePetAdoptionListing(input) {
      const { data, error } = await supabase.rpc("update_pet_adoption_listing", {
        target_listing_id: input.listingId,
        next_title: input.title,
        next_public_story: input.publicStory ?? "",
        next_personality_notes: input.personalityNotes ?? "",
        next_public_health_summary: input.publicHealthSummary ?? "",
        next_adoption_requirements: input.adoptionRequirements ?? "",
        next_city: input.city,
        next_state_region: input.stateRegion ?? "",
        next_country_code: input.countryCode ?? "PA",
        next_compatibility_children: input.compatibilityChildren ?? "",
        next_compatibility_dogs: input.compatibilityDogs ?? "",
        next_compatibility_cats: input.compatibilityCats ?? "",
        next_special_needs_notes: input.specialNeedsNotes ?? ""
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const detail = await this.getPetAdoptionListingDetail(data.id);
      if (!detail) {
        throw new Error("No fue posible recargar la publicacion de adopcion.");
      }

      return detail;
    },
    async submitPetAdoptionListing(listingId) {
      const { data, error } = await supabase.rpc("submit_pet_adoption_listing", {
        responsibility_acknowledged: true,
        target_listing_id: listingId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const detail = await this.getPetAdoptionListingDetail(data.id);
      if (!detail) {
        throw new Error("No fue posible recargar la publicacion enviada.");
      }

      return detail;
    },
    async pausePetAdoptionListing(listingId) {
      const { data, error } = await supabase.rpc("pause_pet_adoption_listing", {
        target_listing_id: listingId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const detail = await this.getPetAdoptionListingDetail(data.id);
      if (!detail) {
        throw new Error("No fue posible recargar la publicacion pausada.");
      }

      return detail;
    },
    async closePetAdoptionListing(listingId) {
      const { data, error } = await supabase.rpc("close_pet_adoption_listing", {
        target_listing_id: listingId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const detail = await this.getPetAdoptionListingDetail(data.id);
      if (!detail) {
        throw new Error("No fue posible recargar la publicacion cerrada.");
      }

      return detail;
    },
    async reviewPetAdoptionListing(listingId, input) {
      const { data, error } = await supabase.rpc("review_pet_adoption_listing", {
        target_listing_id: listingId,
        decision: input.decision,
        notes: input.notes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const detail = await this.getPetAdoptionListingDetail(data.id);
      if (!detail) {
        throw new Error("No fue posible recargar la publicacion revisada.");
      }

      return detail;
    },
    async listMyPetAdoptionListings(householdId) {
      const { data, error } = await supabase.rpc("list_my_pet_adoption_listings", {
        target_household_id: householdId ?? null
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load adoption listings.");
      }

      return mapPetAdoptionListings(supabase, data ?? []);
    },
    async listPublishedPetAdoptionListings() {
      const { data, error } = await supabase.rpc("list_published_pet_adoption_listings", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load published adoption listings.");
      }

      return mapPetAdoptionListings(supabase, data ?? [], "public");
    },
    async getPetAdoptionListingDetail(listingId, visibility = "owner") {
      const { data, error } = await supabase.rpc("get_pet_adoption_listing_detail", {
        target_listing_id: listingId
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load adoption listing detail.");
      }

      const [listing] = await mapPetAdoptionListings(supabase, data ?? [], visibility);
      return listing ?? null;
    },
    async getPublicPetAdoptionListingBySlug(slug) {
      const { data, error } = await supabase.rpc("get_public_pet_adoption_listing_by_slug", {
        target_slug: slug
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load public adoption profile.");
      }

      return data?.[0] ? mapPublicPetAdoptionProfile(supabase, data[0]) : null;
    },
    async createPublicAdoptionRequest(input) {
      const { data, error } = await supabase.rpc("create_public_adoption_request", {
        target_listing_slug: input.listingSlug,
        next_requester_name: input.requesterName,
        next_requester_email: input.requesterEmail,
        next_requester_phone: input.requesterPhone ?? null,
        next_requester_city: input.requesterCity ?? null,
        next_motivation: input.motivation,
        next_experience: input.experience ?? null,
        next_housing_type: input.housingType ?? null,
        next_has_other_pets: input.hasOtherPets ?? null,
        next_has_children: input.hasChildren ?? null,
        next_privacy_acknowledged: input.privacyAcknowledged,
        next_source_url: input.sourceUrl ?? null,
        next_company_website: input.companyWebsite ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const created = data?.[0];
      if (!created) {
        fail(null, "No fue posible registrar la solicitud inicial.");
      }

      return {
        requestId: created.request_id,
        status: created.request_status,
        message: created.response_message
      };
    },
    async listReceivedPublicAdoptionRequests(householdId) {
      const { data, error } = await supabase.rpc("list_received_public_adoption_requests", {
        target_household_id: householdId ?? null,
        target_status: null
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "No fue posible cargar el interes publico recibido.");
      }

      return (data ?? []).map(mapPublicAdoptionRequest);
    },
    async updatePublicAdoptionRequestStatus(input) {
      const { data, error } = await supabase.rpc("update_public_adoption_request_status", {
        target_request_id: input.requestId,
        next_status: input.status,
        notes: input.notes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapPublicAdoptionRequest(data);
    },
    async createAdoptionInvite(input) {
      const { data, error } = await supabase.rpc("create_adoption_invite", {
        target_public_request_id: input.publicRequestId,
        expires_in_hours: input.expiresInHours ?? 168
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      const created = data?.[0];
      if (!created) {
        fail(null, "No fue posible crear la invitacion.");
      }

      const baseUrl = input.publicBaseUrl.replace(/\/$/, "");
      return {
        inviteId: created.invite_id,
        inviteUrl: `${baseUrl}/adoption-invite/${created.invite_token}`,
        expiresAt: created.invite_expires_at
      };
    },
    async resolveAdoptionInvite(token) {
      const { data, error } = await supabase.rpc("resolve_adoption_invite", { raw_token: token });

      if (error) {
        failMissingFosterSchema(error);
      }

      const context = data?.[0];
      if (!context) {
        return {
          appDeepLink: null,
          expiresAt: null,
          listingSlug: null,
          petName: null,
          protectiveDisplayName: null,
          status: "invalid"
        };
      }

      return {
        appDeepLink: context.invite_status === "opened" ? `petecosystem://adoption/invite/${token}` : null,
        expiresAt: context.expires_at,
        listingSlug: context.listing_slug,
        petName: context.pet_name,
        protectiveDisplayName: context.protective_display_name,
        status: context.invite_status
      };
    },
    async listPendingPetAdoptionListingsForAdmin() {
      const { data, error } = await supabase.rpc("list_pending_pet_adoption_listings_for_admin", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load pending adoption listings.");
      }

      return mapPetAdoptionListings(supabase, data ?? [], "admin");
    },
    async createPetAdoptionApplication(input) {
      const { data, error } = await supabase.rpc("create_pet_adoption_application", {
        target_listing_id: input.listingId,
        target_applicant_household_id: input.applicantHouseholdId ?? null,
        next_applicant_name: input.applicantName,
        next_applicant_email: input.applicantEmail,
        next_applicant_phone: input.applicantPhone ?? null,
        next_housing_type: input.housingType,
        next_has_children: input.hasChildren ?? null,
        next_has_other_pets: input.hasOtherPets ?? null,
        next_pet_experience: input.petExperience,
        next_motivation: input.motivation,
        next_availability_notes: input.availabilityNotes ?? null,
        next_commitment_acknowledged: input.commitmentAcknowledged
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapPetAdoptionApplication(data);
    },
    async listMyPetAdoptionApplications() {
      const { data, error } = await supabase.rpc("list_my_pet_adoption_applications", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load sent adoption applications.");
      }

      return (data ?? []).map(mapPetAdoptionApplication);
    },
    async listReceivedPetAdoptionApplications(householdId) {
      const { data, error } = await supabase.rpc("list_received_pet_adoption_applications", {
        target_household_id: householdId ?? null
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load received adoption applications.");
      }

      return (data ?? []).map(mapPetAdoptionApplication);
    },
    async withdrawPetAdoptionApplication(applicationId) {
      const { data, error } = await supabase.rpc("withdraw_pet_adoption_application", {
        target_application_id: applicationId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapPetAdoptionApplication(data);
    },
    async listAdminPetAdoptionApplications() {
      const { data, error } = await supabase.rpc("list_pet_adoption_applications_for_admin", {});

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load adoption application audit.");
      }

      return (data ?? []).map(mapPetAdoptionApplication);
    },
    async getPetAdoptionApplicationDetail(applicationId) {
      const { data, error } = await supabase.rpc("get_pet_adoption_application_detail", {
        target_application_id: applicationId
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load adoption application detail.");
      }

      return data?.[0] ? mapPetAdoptionApplication(data[0]) : null;
    },
    async updatePetAdoptionApplicationStatus(input) {
      const { data, error } = await supabase.rpc("update_pet_adoption_application_status", {
        target_application_id: input.applicationId,
        next_status: input.status,
        notes: input.notes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapPetAdoptionApplication(data);
    },
    async listPetAdoptionApplicationStatusHistory(applicationId) {
      const { data, error } = await supabase.rpc("list_pet_adoption_application_status_history", {
        target_application_id: applicationId
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load adoption application status history.");
      }

      return (data ?? []).map(mapPetAdoptionApplicationStatusHistory);
    },
    async getPetAdoptionClosureDetail(applicationId) {
      const { data, error } = await supabase.rpc("get_pet_adoption_closure_detail", {
        target_application_id: applicationId
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load adoption closure detail.");
      }

      return data?.[0] ? mapPetAdoptionClosureDetail(data[0]) : null;
    },
    async getProtectiveAdoptionCommitmentTemplate(householdId) {
      const { data, error } = await supabase.rpc("get_protective_adoption_commitment_template", {
        target_household_id: householdId
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load adoption commitment template.");
      }

      return data?.[0] ? mapProtectiveAdoptionCommitmentTemplate(supabase, data[0]) : null;
    },
    async uploadProtectiveAdoptionCommitmentTemplate(input) {
      const extension = input.fileName.split(".").pop()?.toLowerCase() || "pdf";
      const storagePath = `templates/${input.householdId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const fileBlob = input.fileBody ?? (input.fileUri ? await fetch(input.fileUri).then((response) => response.blob()) : null);

      if (!fileBlob) {
        throw new Error("Adoption commitment template file is required.");
      }

      const { error: uploadError } = await supabase.storage.from(fosterAdoptionDocumentsBucketId).upload(storagePath, fileBlob, {
        contentType: input.mimeType,
        upsert: false
      });

      if (uploadError) {
        throw new Error(`adoption_commitment_template_upload_failed: ${uploadError.message}`);
      }

      const { data, error } = await supabase.rpc("upsert_protective_adoption_commitment_template", {
        target_household_id: input.householdId,
        next_title: input.title,
        next_description: input.description ?? null,
        next_requirement_policy: input.requirementPolicy,
        next_storage_bucket: fosterAdoptionDocumentsBucketId,
        next_storage_path: storagePath,
        next_file_name: input.fileName,
        next_mime_type: input.mimeType,
        next_file_size_bytes: input.fileSizeBytes ?? null
      });

      if (error) {
        await supabase.storage.from(fosterAdoptionDocumentsBucketId).remove([storagePath]);
        failMissingFosterSchema(error);
      }

      return mapProtectiveAdoptionCommitmentTemplate(supabase, data);
    },
    async getApplicationCommitmentDocument(applicationId) {
      const { data, error } = await supabase.rpc("get_pet_adoption_application_commitment_document", {
        target_application_id: applicationId
      });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return null;
        }

        fail(error, "Unable to load adoption commitment document.");
      }

      return data?.[0] ? mapApplicationCommitmentDocument(supabase, data[0]) : null;
    },
    async uploadApplicationCommitmentDocument(input) {
      const extension = input.fileName.split(".").pop()?.toLowerCase() || "pdf";
      const storagePath = `applications/${input.applicationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const fileBlob = input.fileBody ?? (input.fileUri ? await fetch(input.fileUri).then((response) => response.blob()) : null);

      if (!fileBlob) {
        throw new Error("Adoption commitment document file is required.");
      }

      const { error: uploadError } = await supabase.storage.from(fosterAdoptionDocumentsBucketId).upload(storagePath, fileBlob, {
        contentType: input.mimeType,
        upsert: false
      });

      if (uploadError) {
        throw new Error(`adoption_commitment_document_upload_failed: ${uploadError.message}`);
      }

      const { data, error } = await supabase.rpc("register_pet_adoption_application_commitment_document", {
        target_application_id: input.applicationId,
        target_template_id: input.templateId ?? null,
        next_storage_bucket: fosterAdoptionDocumentsBucketId,
        next_storage_path: storagePath,
        next_file_name: input.fileName,
        next_mime_type: input.mimeType,
        next_file_size_bytes: input.fileSizeBytes ?? null
      });

      if (error) {
        await supabase.storage.from(fosterAdoptionDocumentsBucketId).remove([storagePath]);
        failMissingFosterSchema(error);
      }

      return mapApplicationCommitmentDocument(supabase, data);
    },
    async reviewApplicationCommitmentDocument(input) {
      const { data, error } = await supabase.rpc("review_pet_adoption_application_commitment_document", {
        target_application_id: input.applicationId,
        next_status: input.status,
        notes: input.notes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapApplicationCommitmentDocument(supabase, data);
    },
    async listFosterPetExpenses(petId) {
      const { data, error } = await supabase
        .from("foster_pet_expenses")
        .select("*")
        .eq("pet_id", petId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return [];
        }

        fail(error, "Unable to load foster pet expenses.");
      }

      return (data ?? []).map(mapFosterPetExpense);
    },
    async createFosterPetExpense(input) {
      const currentUserId = await requireCurrentUserId(supabase);
      const { data, error } = await supabase
        .from("foster_pet_expenses")
        .insert({
          pet_id: input.petId,
          protective_household_id: input.protectiveHouseholdId,
          expense_date: input.expenseDate,
          category: input.category,
          title: input.title,
          description: input.description ?? null,
          amount: input.amount,
          currency: input.currency ?? "USD",
          vendor_name: input.vendorName ?? null,
          payment_method: input.paymentMethod ?? null,
          receipt_document_id: input.receiptDocumentId ?? null,
          is_reimbursed: input.isReimbursed ?? false,
          reimbursement_note: input.reimbursementNote ?? null,
          created_by_user_id: currentUserId
        })
        .select("*")
        .single();

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapFosterPetExpense(data);
    },
    async updateFosterPetExpense(input) {
      const updatePayload: Database["public"]["Tables"]["foster_pet_expenses"]["Update"] = {};

      if (input.expenseDate !== undefined) updatePayload.expense_date = input.expenseDate;
      if (input.category !== undefined) updatePayload.category = input.category;
      if (input.title !== undefined) updatePayload.title = input.title;
      if (input.description !== undefined) updatePayload.description = input.description;
      if (input.amount !== undefined) updatePayload.amount = input.amount;
      if (input.currency !== undefined) updatePayload.currency = input.currency;
      if (input.vendorName !== undefined) updatePayload.vendor_name = input.vendorName;
      if (input.paymentMethod !== undefined) updatePayload.payment_method = input.paymentMethod;
      if (input.receiptDocumentId !== undefined) updatePayload.receipt_document_id = input.receiptDocumentId;
      if (input.isReimbursed !== undefined) updatePayload.is_reimbursed = input.isReimbursed;
      if (input.reimbursementNote !== undefined) updatePayload.reimbursement_note = input.reimbursementNote;

      const { data, error } = await supabase
        .from("foster_pet_expenses")
        .update(updatePayload)
        .eq("id", input.expenseId)
        .select("*")
        .single();

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapFosterPetExpense(data);
    },
    async deleteFosterPetExpense(expenseId) {
      const { error } = await supabase.from("foster_pet_expenses").delete().eq("id", expenseId);

      if (error) {
        failMissingFosterSchema(error);
      }
    },
    async getFosterPetExpenseSummary(householdId) {
      const { data, error } = await supabase
        .from("foster_pet_expenses")
        .select("*")
        .eq("protective_household_id", householdId)
        .order("expense_date", { ascending: false });

      if (error) {
        if (isMissingFosterSchemaError(error)) {
          return summarizeFosterPetExpenses([], householdId);
        }

        fail(error, "Unable to load foster pet expense summary.");
      }

      return summarizeFosterPetExpenses((data ?? []).map(mapFosterPetExpense), householdId);
    },
    async uploadPetAdoptionMedia(input) {
      const currentUserId = await requireCurrentUserId(supabase);
      const extension = input.fileName.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${input.listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const fileBlob = input.fileBody ?? (input.fileUri ? await fetch(input.fileUri).then((response) => response.blob()) : null);

      if (!fileBlob) {
        throw new Error("Adoption media file is required.");
      }

      const { data: canManageListing, error: permissionError } = await supabase.rpc("can_manage_pet_adoption_listing", {
        target_listing_id: input.listingId,
        target_user_id: currentUserId
      });

      if (permissionError) {
        throw new Error(`adoption_media_permission_check_failed: ${permissionError.message}`);
      }

      if (!canManageListing) {
        throw new Error("adoption_media_permission_failed: current session cannot manage this adoption listing.");
      }

      const { error: uploadError } = await supabase.storage
        .from("pet-adoption-media")
        .upload(storagePath, fileBlob, {
          contentType: input.mimeType,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`adoption_media_storage_upload_failed: ${uploadError.message}`);
      }

      const { data, error } = await supabase
        .from("pet_adoption_listing_media")
        .insert({
          listing_id: input.listingId,
          media_type: "image",
          storage_bucket: "pet-adoption-media",
          storage_path: storagePath,
          file_name: input.fileName,
          file_size_bytes: input.fileSizeBytes ?? null,
          mime_type: input.mimeType,
          moderation_status: "approved",
          display_order: 0,
          is_cover: input.isCover ?? false,
          created_by_user_id: currentUserId
        })
        .select("*")
        .single();

      if (error) {
        await supabase.storage.from("pet-adoption-media").remove([storagePath]);
        if (isMissingFosterSchemaError(error)) {
          failMissingFosterSchema(error);
        }

        throw new Error(`adoption_media_metadata_insert_failed: ${error.message}`);
      }

      return mapPetAdoptionMedia(supabase, data);
    },
    async setPetAdoptionListingCover(mediaId) {
      const { data, error } = await supabase.rpc("set_pet_adoption_listing_cover", {
        target_media_id: mediaId
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapPetAdoptionMedia(supabase, data);
    },
    async reviewPetAdoptionListingMedia(mediaId, input) {
      const { data, error } = await supabase.rpc("review_pet_adoption_listing_media", {
        target_media_id: mediaId,
        decision: input.decision,
        notes: input.notes ?? null
      });

      if (error) {
        failMissingFosterSchema(error);
      }

      return mapPetAdoptionMedia(supabase, data);
    },
    async removePetAdoptionMedia(mediaId) {
      const { data, error } = await supabase
        .from("pet_adoption_listing_media")
        .select("*")
        .eq("id", mediaId)
        .single();

      if (error) {
        failMissingFosterSchema(error);
      }

      await supabase.storage.from(data.storage_bucket).remove([data.storage_path]);

      const { error: deleteError } = await supabase.from("pet_adoption_listing_media").delete().eq("id", mediaId);

      if (deleteError) {
        fail(deleteError, "Unable to remove adoption media metadata.");
      }
    }
  };
}
