import type {
  AdminClinicalProfessionalSummary,
  AuthenticatedClinicalAccessContext,
  ClinicalProfessionalContext,
  ClinicalWriteRequest,
  ClinicalWriteScope,
  CreatedPetClinicalAccess,
  Database,
  PetClinicalAccessDuration,
  PetClinicalAccessGrant,
  PublicPetClinicalAccess,
  UpsertClinicalProfessionalProfileInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ClinicalAccessClient = SupabaseClient<Database>;

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

function mapGrant(row: {
  id: string;
  pet_id: string;
  duration_code: string;
  status: string;
  expires_at: string;
  revoked_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
}): PetClinicalAccessGrant {
  return {
    id: row.id,
    petId: row.pet_id,
    durationCode: row.duration_code as PetClinicalAccessDuration,
    status: row.status as PetClinicalAccessGrant["status"],
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastAccessedAt: row.last_accessed_at,
    accessCount: row.access_count,
    createdAt: row.created_at
  };
}

export function createClinicalAccessApiClient(supabase: ClinicalAccessClient) {
  return {
    async getMyClinicalProfessionalContext() {
      const { data, error } = await supabase.rpc("get_my_clinical_professional_context", {});
      if (error || !data) fail(error, "No fue posible consultar la identidad profesional.");
      return data as unknown as ClinicalProfessionalContext;
    },
    async saveMyClinicalProfessionalProfile(input: UpsertClinicalProfessionalProfileInput) {
      const { data, error } = await supabase.rpc("upsert_my_clinical_professional_profile", {
        next_professional_name: input.professionalName,
        next_professional_type: input.professionalType,
        next_license_reference: input.licenseReference,
        next_jurisdiction: input.jurisdiction,
        next_country_code: input.countryCode,
        next_provider_organization_id: input.providerOrganizationId ?? null
      });
      if (error || !data) fail(error, "No fue posible guardar la identidad profesional.");
      return data as unknown as ClinicalProfessionalContext;
    },
    async submitMyClinicalProfessionalProfile() {
      const { data, error } = await supabase.rpc("submit_my_clinical_professional_profile", {});
      if (error || !data) fail(error, "No fue posible enviar la identidad profesional.");
      return data as unknown as ClinicalProfessionalContext;
    },
    async getAuthenticatedClinicalAccessContext(token: string) {
      const { data, error } = await supabase.rpc("get_clinical_access_authenticated_context", { raw_token: token });
      if (error || !data) fail(error, "No fue posible validar la identidad en este acceso.");
      return data as unknown as AuthenticatedClinicalAccessContext;
    },
    async listClinicalProfessionalsForAdmin() {
      const { data, error } = await supabase.rpc("list_pending_clinical_professionals_for_admin", {});
      if (error) fail(error, "No fue posible consultar la cola profesional.");
      return (data ?? []).map((row): AdminClinicalProfessionalSummary => ({
        id: row.id,
        userId: row.user_id,
        professionalName: row.professional_name,
        professionalType: row.professional_type,
        licenseReference: row.license_reference,
        jurisdiction: row.jurisdiction,
        countryCode: row.country_code,
        organizationName: row.organization_name,
        verificationStatus: row.verification_status,
        submittedAt: row.submitted_at
      }));
    },
    async reviewClinicalProfessionalProfile(profileId: Uuid, decision: "verified" | "rejected" | "suspended", reason?: string | null, expiresAt?: string | null) {
      const { error } = await supabase.rpc("review_clinical_professional_profile", {
        target_profile_id: profileId,
        decision,
        reason: reason ?? null,
        next_verification_expires_at: expiresAt ?? null
      });
      if (error) fail(error, "No fue posible revisar la identidad profesional.");
    },
    async requestClinicalWriteAccess(token: string, scopes: ClinicalWriteScope[], note?: string | null) {
      const { data, error } = await supabase.rpc("request_clinical_write_access", { raw_token: token, next_scopes: scopes, next_note: note ?? null });
      if (error || !data) fail(error, "No fue posible solicitar autorizacion.");
      return data;
    },
    async getMyClinicalWriteRequest(token: string) {
      const { data, error } = await supabase.rpc("get_my_clinical_write_request", { raw_token: token });
      if (error) fail(error, "No fue posible consultar la solicitud.");
      return data as unknown as ClinicalWriteRequest | null;
    },
    async listPetClinicalWriteRequests(petId: Uuid) {
      const { data, error } = await supabase.rpc("list_pet_clinical_write_requests", { target_pet_id: petId });
      if (error) fail(error, "No fue posible consultar las solicitudes.");
      return (data ?? []).map((row): ClinicalWriteRequest => ({ id: row.id, professionalName: row.professional_name, professionalType: row.professional_type, organizationName: row.organization_name, requestedScopes: row.requested_scopes as ClinicalWriteScope[], requestNote: row.request_note, status: row.status as ClinicalWriteRequest["status"], requestedAt: row.requested_at, expiresAt: row.expires_at, decisionNote: row.decision_note }));
    },
    async reviewClinicalWriteRequest(requestId: Uuid, decision: "approved" | "rejected", scopes?: ClinicalWriteScope[], note?: string | null) {
      const { error } = await supabase.rpc("review_clinical_write_request", { target_request_id: requestId, decision, next_approved_scopes: scopes ?? null, next_decision_note: note ?? null });
      if (error) fail(error, "No fue posible responder la solicitud.");
    },
    async revokeClinicalWriteAuthorization(requestId: Uuid, reason?: string | null) {
      const { error } = await supabase.rpc("revoke_clinical_write_authorization", { target_request_id: requestId, reason: reason ?? null });
      if (error) fail(error, "No fue posible revocar la autorizacion.");
    },
    async createPetClinicalAccess(petId: Uuid, durationCode: PetClinicalAccessDuration) {
      const { data, error } = await supabase.rpc("create_pet_clinical_access", {
        target_pet_id: petId,
        next_duration_code: durationCode
      });
      if (error || !data) fail(error, "No fue posible crear el acceso clinico.");
      return data as unknown as CreatedPetClinicalAccess;
    },
    async listPetClinicalAccessGrants(petId: Uuid) {
      const { data, error } = await supabase.rpc("list_pet_clinical_access_grants", { target_pet_id: petId });
      if (error) fail(error, "No fue posible consultar los accesos clinicos.");
      return ((data ?? []) as unknown as Parameters<typeof mapGrant>[0][]).map(mapGrant);
    },
    async revokePetClinicalAccess(grantId: Uuid) {
      const { error } = await supabase.rpc("revoke_pet_clinical_access", { target_grant_id: grantId });
      if (error) fail(error, "No fue posible revocar el acceso clinico.");
    },
    async getPublicPetClinicalAccess(token: string) {
      const { data, error } = await supabase.rpc("get_public_pet_clinical_access", { raw_token: token });
      if (error || !data) fail(error, "El acceso clinico no existe o ya vencio.");
      return data as unknown as PublicPetClinicalAccess;
    }
  };
}
