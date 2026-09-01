import type {
  AdminClinicalProfessionalSummary,
  AuthenticatedClinicalAccessContext,
  ClinicalProfessionalContext,
  ClinicalWriteRequest,
  ClinicalWriteScope,
  ClinicalAuditEvent,
  ClinicalTimelineEncounter,
  PrepareClinicalDocumentInput,
  PreparedClinicalDocumentUpload,
  FinalizeClinicalEncounterInput,
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
    async finalizeClinicalEncounter(input: FinalizeClinicalEncounterInput) {
      const { data, error } = await supabase.rpc("finalize_clinical_encounter", { target_request_id: input.requestId, next_idempotency_key: input.idempotencyKey, next_attended_at: input.attendedAt, next_encounter_type: input.encounterType, next_summary: input.summary, next_entries: input.entries });
      if (error || !data) fail(error, "No fue posible registrar la atencion clinica.");
      return data;
    },
    async listPetClinicalTimeline(petId: Uuid) {
      const { data, error } = await supabase.rpc("list_pet_clinical_timeline", { target_pet_id: petId });
      if (error) fail(error, "No fue posible consultar el historial profesional.");
      return (data ?? []) as unknown as ClinicalTimelineEncounter[];
    },
    async listMyProfessionalEncounters() {
      const { data, error } = await supabase.rpc("list_my_professional_encounters", {});
      if (error) fail(error, "No fue posible consultar las atenciones registradas.");
      return (data ?? []) as unknown as ClinicalTimelineEncounter[];
    },
    async prepareClinicalDocumentUpload(input: PrepareClinicalDocumentInput) {
      const { data, error } = await supabase.rpc("prepare_clinical_document_upload", {
        target_encounter_id: input.encounterId,
        next_idempotency_key: input.idempotencyKey,
        next_title: input.title,
        next_document_type: input.documentType,
        next_mime_type: input.mimeType,
        next_file_size_bytes: input.fileSizeBytes,
        next_checksum_sha256: input.checksumSha256 ?? null
      });
      if (error || !data) fail(error, "No fue posible preparar el documento clinico.");
      return data as unknown as PreparedClinicalDocumentUpload;
    },
    async uploadPreparedClinicalDocument(prepared: PreparedClinicalDocumentUpload, file: Blob) {
      const { error } = await supabase.storage.from(prepared.bucket).upload(prepared.path, file, { contentType: file.type, upsert: false });
      if (error) fail(error, "No fue posible cargar el documento clinico.");
      const { error: finalizeError } = await supabase.rpc("finalize_clinical_document_upload", { target_document_id: prepared.documentId });
      if (finalizeError) fail(finalizeError, "El documento se cargo, pero no pudo confirmarse.");
    },
    async getClinicalDocumentAccess(documentId: Uuid) {
      const { data, error } = await supabase.rpc("get_clinical_document_access", { target_document_id: documentId });
      if (error || !data) fail(error, "No fue posible abrir el documento clinico.");
      const access = data as unknown as { bucket: string; path: string };
      const { data: signed, error: signedError } = await supabase.storage.from(access.bucket).createSignedUrl(access.path, 60 * 5);
      if (signedError || !signed?.signedUrl) fail(signedError, "No fue posible abrir el documento clinico.");
      return signed.signedUrl;
    },
    async createClinicalEntryCorrection(entryId: Uuid, requestId: Uuid, title: string, details: string | null, reason: string) {
      const { data, error } = await supabase.rpc("create_clinical_entry_correction", { target_entry_id: entryId, target_request_id: requestId, next_title: title, next_details: details, next_reason: reason });
      if (error || !data) fail(error, "No fue posible registrar la rectificacion.");
      return data;
    },
    async listClinicalAuditEventsForAdmin() {
      const { data, error } = await supabase.rpc("list_clinical_audit_events_for_admin", {});
      if (error) fail(error, "No fue posible consultar la auditoria clinica.");
      return (data ?? []) as unknown as ClinicalAuditEvent[];
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
