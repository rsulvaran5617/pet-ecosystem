import type {
  CreatedPetClinicalAccess,
  Database,
  PetClinicalAccessDuration,
  PetClinicalAccessGrant,
  PublicPetClinicalAccess,
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
