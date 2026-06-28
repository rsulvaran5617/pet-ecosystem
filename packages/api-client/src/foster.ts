import type {
  AdminProtectiveHouseholdProfile,
  CreatePetTransferInvitationInput,
  Database,
  PetAdoptionListing,
  PetAdoptionListingInput,
  PetAdoptionListingMedia,
  PetAdoptionListingReviewInput,
  PetAdoptionMediaReviewInput,
  PetAdoptionMediaUploadInput,
  PetCustodyContext,
  PetTransferRecord,
  ProtectiveHouseholdProfile,
  ProtectiveHouseholdProfileInput,
  ProtectiveHouseholdProfileReviewInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type FosterSupabaseClient = SupabaseClient<Database>;
type ProtectiveHouseholdProfileRow = Database["public"]["Tables"]["protective_household_profiles"]["Row"];
type AdminProtectiveHouseholdProfileRow =
  Database["public"]["Functions"]["list_pending_protective_household_profiles"]["Returns"][number];
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
type PetAdoptionListingMediaRow = Database["public"]["Tables"]["pet_adoption_listing_media"]["Row"];

export interface FosterApiClient {
  getProtectiveHouseholdProfile(householdId: Uuid): Promise<ProtectiveHouseholdProfile | null>;
  upsertProtectiveHouseholdProfile(input: ProtectiveHouseholdProfileInput): Promise<ProtectiveHouseholdProfile>;
  submitProtectiveHouseholdProfile(householdId: Uuid): Promise<ProtectiveHouseholdProfile>;
  listPendingProtectiveHouseholdProfiles(): Promise<AdminProtectiveHouseholdProfile[]>;
  reviewProtectiveHouseholdProfile(
    householdId: Uuid,
    input: ProtectiveHouseholdProfileReviewInput
  ): Promise<ProtectiveHouseholdProfile>;
  createPetTransferInvitation(input: CreatePetTransferInvitationInput): Promise<PetTransferRecord>;
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
  listPendingPetAdoptionListingsForAdmin(): Promise<PetAdoptionListing[]>;
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
    message.includes("submit_protective_household_profile") ||
    message.includes("review_protective_household_profile") ||
    message.includes("list_pending_protective_household_profiles") ||
    message.includes("pet_transfer_records") ||
    message.includes("pet_custody_contexts") ||
    message.includes("create_pet_transfer_invitation") ||
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
    message.includes("list_pending_pet_adoption_listings_for_admin")
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
    media
  };
}

async function mapPetAdoptionListings(
  supabase: FosterSupabaseClient,
  rows: PetAdoptionListingFunctionRow[],
  visibility: "admin" | "owner" | "public" = "owner"
): Promise<PetAdoptionListing[]> {
  const mediaByListing = await listPetAdoptionMedia(
    supabase,
    rows.map((row) => row.id),
    visibility
  );

  return rows.map((row) => mapPetAdoptionListing(row, mediaByListing.get(row.id) ?? []));
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
    async uploadPetAdoptionMedia(input) {
      const currentUserId = await requireCurrentUserId(supabase);
      const extension = input.fileName.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${input.listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const response = await fetch(input.fileUri);
      const fileBlob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from("pet-adoption-media")
        .upload(storagePath, fileBlob, {
          contentType: input.mimeType,
          upsert: false
        });

      if (uploadError) {
        fail(uploadError, "Unable to upload adoption media.");
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
          display_order: 0,
          is_cover: input.isCover ?? false,
          created_by_user_id: currentUserId
        })
        .select("*")
        .single();

      if (error) {
        await supabase.storage.from("pet-adoption-media").remove([storagePath]);
        failMissingFosterSchema(error);
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

      const { error: deleteError } = await supabase.from("pet_adoption_listing_media").delete().eq("id", mediaId);

      if (deleteError) {
        fail(deleteError, "Unable to remove adoption media metadata.");
      }

      await supabase.storage.from(data.storage_bucket).remove([data.storage_path]);
    }
  };
}
