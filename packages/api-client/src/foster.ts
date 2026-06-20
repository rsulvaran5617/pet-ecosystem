import type {
  AdminProtectiveHouseholdProfile,
  CreatePetTransferInvitationInput,
  Database,
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
    message.includes("list_pet_custody_history")
  ) && (message.includes("schema cache") || message.includes("could not find") || message.includes("does not exist"));
}

function failMissingFosterSchema(error: { message: string } | null): never {
  if (isMissingFosterSchemaError(error)) {
    throw new Error("La migracion Foster-1A aun no esta aplicada en Supabase remoto.");
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
    }
  };
}
