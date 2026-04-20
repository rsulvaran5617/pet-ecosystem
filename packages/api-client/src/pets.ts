import type {
  CreatePetInput,
  Database,
  PetDetail,
  PetDocument,
  PetSummary,
  UpdatePetInput,
  UploadPetDocumentInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type PetsSupabaseClient = SupabaseClient<Database>;
type PetRow = Database["public"]["Tables"]["pets"]["Row"];
type PetProfileRow = Database["public"]["Tables"]["pet_profiles"]["Row"];
type PetDocumentRow = Database["public"]["Tables"]["pet_documents"]["Row"];

const petDocumentsBucketId = "pet-documents";

export interface PetsApiClient {
  listHouseholdPets(householdId: Uuid): Promise<PetSummary[]>;
  createPet(input: CreatePetInput): Promise<PetSummary>;
  updatePet(petId: Uuid, input: UpdatePetInput): Promise<PetSummary>;
  getPetDetail(petId: Uuid): Promise<PetDetail>;
  listPetDocuments(petId: Uuid): Promise<PetDocument[]>;
  uploadPetDocument(petId: Uuid, input: UploadPetDocumentInput): Promise<PetDocument>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function isMissingSessionError(error: { message: string } | null) {
  return error?.message.toLowerCase().includes("auth session missing") ?? false;
}

async function getCurrentUser(supabase: PetsSupabaseClient) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    fail(error, "Unable to resolve the current auth user.");
  }

  return data.user ?? null;
}

async function requireCurrentUser(supabase: PetsSupabaseClient) {
  const user = await getCurrentUser(supabase);

  if (!user) {
    throw new Error("Authenticated user required.");
  }

  return user;
}

function mapPetDocument(row: PetDocumentRow): PetDocument {
  return {
    id: row.id,
    petId: row.pet_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    documentType: row.document_type,
    fileName: row.file_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPetSummary(
  petRow: PetRow,
  profileMap: Map<string, PetProfileRow>,
  documentCountByPetId: Map<string, number>
): PetSummary {
  const petProfile = profileMap.get(petRow.id);

  return {
    id: petRow.id,
    householdId: petRow.household_id,
    createdByUserId: petRow.created_by_user_id,
    name: petRow.name,
    species: petRow.species,
    breed: petProfile?.breed ?? null,
    sex: petProfile?.sex ?? "unknown",
    birthDate: petProfile?.birth_date ?? null,
    notes: petProfile?.notes ?? null,
    documentCount: documentCountByPetId.get(petRow.id) ?? 0,
    createdAt: petRow.created_at,
    updatedAt: petRow.updated_at
  };
}

async function listPetRowsByIds(supabase: PetsSupabaseClient, petIds: string[]) {
  if (petIds.length === 0) {
    return [] as PetRow[];
  }

  const { data, error } = await supabase.from("pets").select("*").in("id", petIds).order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load pets.");
  }

  return data ?? [];
}

async function listHouseholdPetRows(supabase: PetsSupabaseClient, householdId: string) {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "No fue posible cargar las mascotas del hogar.");
  }

  return data ?? [];
}

async function listPetProfiles(supabase: PetsSupabaseClient, petIds: string[]) {
  if (petIds.length === 0) {
    return new Map<string, PetProfileRow>();
  }

  const { data, error } = await supabase.from("pet_profiles").select("*").in("pet_id", petIds);

  if (error) {
    fail(error, "Unable to load pet profiles.");
  }

  return new Map((data ?? []).map((row) => [row.pet_id, row]));
}

async function listPetDocumentsRows(supabase: PetsSupabaseClient, petIds: string[]) {
  if (petIds.length === 0) {
    return [] as PetDocumentRow[];
  }

  const { data, error } = await supabase
    .from("pet_documents")
    .select("*")
    .in("pet_id", petIds)
    .order("created_at", { ascending: false });

  if (error) {
    fail(error, "Unable to load pet documents.");
  }

  return data ?? [];
}

async function getPetSummaryById(supabase: PetsSupabaseClient, petId: string) {
  const petRows = await listPetRowsByIds(supabase, [petId]);
  const petRow = petRows[0];

  if (!petRow) {
    throw new Error("Pet not found or not accessible.");
  }

  const [profileMap, documentRows] = await Promise.all([
    listPetProfiles(supabase, [petId]),
    listPetDocumentsRows(supabase, [petId])
  ]);
  const documentCountByPetId = new Map<string, number>([[petId, documentRows.length]]);

  return mapPetSummary(petRow, profileMap, documentCountByPetId);
}

function sanitizeFileName(fileName: string) {
  const normalizedFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");

  return normalizedFileName || "document.bin";
}

function buildDocumentStoragePath(petId: string, fileName: string) {
  return `${petId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizeFileName(fileName)}`;
}

export function createPetsApiClient(supabase: PetsSupabaseClient): PetsApiClient {
  return {
    async listHouseholdPets(householdId) {
      const petRows = await listHouseholdPetRows(supabase, householdId);
      const petIds = petRows.map((pet) => pet.id);
      const [profileMap, documentRows] = await Promise.all([
        listPetProfiles(supabase, petIds),
        listPetDocumentsRows(supabase, petIds)
      ]);
      const documentCountByPetId = documentRows.reduce((countMap, row) => {
        countMap.set(row.pet_id, (countMap.get(row.pet_id) ?? 0) + 1);
        return countMap;
      }, new Map<string, number>());

      return petRows.map((petRow) => mapPetSummary(petRow, profileMap, documentCountByPetId));
    },
    async createPet(input) {
      const { data, error } = await supabase.rpc("create_pet", {
        target_household_id: input.householdId,
        next_name: input.name,
        next_species: input.species,
        next_breed: input.breed ?? null,
        next_sex: input.sex ?? "unknown",
        next_birth_date: input.birthDate ?? null,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to create the pet.");
      }

      return getPetSummaryById(supabase, data.id);
    },
    async updatePet(petId, input) {
      const { data, error } = await supabase.rpc("update_pet", {
        target_pet_id: petId,
        next_name: input.name,
        next_species: input.species,
        next_breed: input.breed ?? null,
        next_sex: input.sex ?? "unknown",
        next_birth_date: input.birthDate ?? null,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to update the pet.");
      }

      return getPetSummaryById(supabase, data.id);
    },
    async getPetDetail(petId) {
      const pet = await getPetSummaryById(supabase, petId);
      const documents = await this.listPetDocuments(petId);

      return {
        pet,
        documents
      };
    },
    async listPetDocuments(petId) {
      const documentRows = await listPetDocumentsRows(supabase, [petId]);

      return documentRows.map(mapPetDocument);
    },
    async uploadPetDocument(petId, input) {
      const user = await requireCurrentUser(supabase);

      if (input.fileBytes.byteLength === 0) {
        throw new Error("Document file is empty.");
      }

      const storagePath = buildDocumentStoragePath(petId, input.fileName);
      const uploadPayload = new Uint8Array(input.fileBytes);
      const { error: uploadError } = await supabase.storage.from(petDocumentsBucketId).upload(storagePath, uploadPayload, {
        contentType: input.mimeType ?? undefined,
        upsert: false
      });

      if (uploadError) {
        fail(uploadError, "Unable to upload the pet document.");
      }

      const { data, error } = await supabase
        .from("pet_documents")
        .insert({
          pet_id: petId,
          created_by_user_id: user.id,
          title: input.title,
          document_type: input.documentType,
          file_name: input.fileName,
          storage_bucket: petDocumentsBucketId,
          storage_path: storagePath,
          mime_type: input.mimeType ?? null,
          file_size_bytes: input.fileBytes.byteLength
        })
        .select("*")
        .single();

      if (error) {
        await supabase.storage.from(petDocumentsBucketId).remove([storagePath]).catch(() => undefined);
        fail(error, "Unable to save the pet document record.");
      }

      return mapPetDocument(data);
    }
  };
}
