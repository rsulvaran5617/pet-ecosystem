import type {
  AdminProtectiveHouseholdProfile,
  Database,
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

export interface FosterApiClient {
  getProtectiveHouseholdProfile(householdId: Uuid): Promise<ProtectiveHouseholdProfile | null>;
  upsertProtectiveHouseholdProfile(input: ProtectiveHouseholdProfileInput): Promise<ProtectiveHouseholdProfile>;
  submitProtectiveHouseholdProfile(householdId: Uuid): Promise<ProtectiveHouseholdProfile>;
  listPendingProtectiveHouseholdProfiles(): Promise<AdminProtectiveHouseholdProfile[]>;
  reviewProtectiveHouseholdProfile(
    householdId: Uuid,
    input: ProtectiveHouseholdProfileReviewInput
  ): Promise<ProtectiveHouseholdProfile>;
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
    message.includes("list_pending_protective_household_profiles")
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
    }
  };
}
