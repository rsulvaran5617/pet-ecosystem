import type {
  CreateSupportCaseInput,
  Database,
  SupportCaseDetail,
  SupportCaseStatus,
  SupportCaseSummary,
  UpdateSupportCaseAdminInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupportSupabaseClient = SupabaseClient<Database>;
type SupportCaseRow = Database["public"]["Tables"]["support_cases"]["Row"];

export interface SupportApiClient {
  listMySupportCases(): Promise<SupportCaseSummary[]>;
  getSupportCaseDetail(caseId: Uuid): Promise<SupportCaseDetail>;
  createSupportCase(input: CreateSupportCaseInput): Promise<SupportCaseDetail>;
  listAdminSupportCases(status?: SupportCaseStatus | null): Promise<SupportCaseSummary[]>;
  getAdminSupportCaseDetail(caseId: Uuid): Promise<SupportCaseDetail>;
  updateSupportCaseAdmin(input: UpdateSupportCaseAdminInput): Promise<SupportCaseDetail>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function mapSupportCaseSummary(row: SupportCaseRow): SupportCaseSummary {
  return {
    id: row.id,
    bookingId: row.booking_id,
    householdId: row.household_id,
    petId: row.pet_id,
    providerOrganizationId: row.provider_organization_id,
    providerServiceId: row.provider_service_id,
    createdByUserId: row.created_by_user_id,
    creatorEmail: row.creator_email,
    creatorDisplayName: row.creator_display_name,
    providerName: row.provider_name,
    serviceName: row.service_name,
    petName: row.pet_name,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    subject: row.subject,
    status: row.status,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSupportCaseDetail(row: SupportCaseRow): SupportCaseDetail {
  return {
    ...mapSupportCaseSummary(row),
    descriptionText: row.description_text,
    adminNote: row.admin_note,
    resolutionText: row.resolution_text
  };
}

export function createSupportApiClient(supabase: SupportSupabaseClient): SupportApiClient {
  return {
    async listMySupportCases() {
      const { data, error } = await supabase.from("support_cases").select("*").order("created_at", { ascending: false });

      if (error) {
        fail(error, "Unable to load support cases.");
      }

      return (data ?? []).map(mapSupportCaseSummary);
    },
    async getSupportCaseDetail(caseId) {
      const { data, error } = await supabase.from("support_cases").select("*").eq("id", caseId).single();

      if (error) {
        fail(error, "Unable to load the support case.");
      }

      return mapSupportCaseDetail(data);
    },
    async createSupportCase(input) {
      const { data, error } = await supabase.rpc("create_support_case", {
        target_booking_id: input.bookingId,
        next_subject: input.subject,
        next_description_text: input.descriptionText
      });

      if (error) {
        fail(error, "Unable to create the support case.");
      }

      return mapSupportCaseDetail(data);
    },
    async listAdminSupportCases(status) {
      let query = supabase.from("support_cases").select("*").order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        fail(error, "Unable to load admin support cases.");
      }

      return (data ?? []).map(mapSupportCaseSummary);
    },
    async getAdminSupportCaseDetail(caseId) {
      const { data, error } = await supabase.from("support_cases").select("*").eq("id", caseId).single();

      if (error) {
        fail(error, "Unable to load the admin support case detail.");
      }

      return mapSupportCaseDetail(data);
    },
    async updateSupportCaseAdmin(input) {
      const { data, error } = await supabase.rpc("update_support_case_admin", {
        target_case_id: input.caseId,
        next_status: input.status,
        next_admin_note: input.adminNote ?? null,
        next_resolution_text: input.resolutionText ?? null
      });

      if (error) {
        fail(error, "Unable to update the support case.");
      }

      return mapSupportCaseDetail(data);
    }
  };
}
