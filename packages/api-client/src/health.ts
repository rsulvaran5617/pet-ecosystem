import type {
  CreatePetAllergyInput,
  CreatePetConditionInput,
  CreatePetVaccineInput,
  Database,
  PetAllergy,
  PetCondition,
  PetHealthDashboard,
  PetHealthDetail,
  PetVaccine,
  UpdatePetAllergyInput,
  UpdatePetConditionInput,
  UpdatePetVaccineInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type HealthSupabaseClient = SupabaseClient<Database>;
type PetVaccineRow = Database["public"]["Tables"]["pet_vaccines"]["Row"];
type PetAllergyRow = Database["public"]["Tables"]["pet_allergies"]["Row"];
type PetConditionRow = Database["public"]["Tables"]["pet_conditions"]["Row"];

export interface HealthApiClient {
  getPetHealthDetail(petId: Uuid): Promise<PetHealthDetail>;
  listPetVaccines(petId: Uuid): Promise<PetVaccine[]>;
  createPetVaccine(petId: Uuid, input: CreatePetVaccineInput): Promise<PetVaccine>;
  updatePetVaccine(vaccineId: Uuid, input: UpdatePetVaccineInput): Promise<PetVaccine>;
  listPetAllergies(petId: Uuid): Promise<PetAllergy[]>;
  createPetAllergy(petId: Uuid, input: CreatePetAllergyInput): Promise<PetAllergy>;
  updatePetAllergy(allergyId: Uuid, input: UpdatePetAllergyInput): Promise<PetAllergy>;
  listPetConditions(petId: Uuid): Promise<PetCondition[]>;
  createPetCondition(petId: Uuid, input: CreatePetConditionInput): Promise<PetCondition>;
  updatePetCondition(conditionId: Uuid, input: UpdatePetConditionInput): Promise<PetCondition>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function mapPetVaccine(row: PetVaccineRow): PetVaccine {
  return {
    id: row.id,
    petId: row.pet_id,
    createdByUserId: row.created_by_user_id,
    name: row.name,
    administeredOn: row.administered_on,
    nextDueOn: row.next_due_on,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPetAllergy(row: PetAllergyRow): PetAllergy {
  return {
    id: row.id,
    petId: row.pet_id,
    createdByUserId: row.created_by_user_id,
    allergen: row.allergen,
    reaction: row.reaction,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPetCondition(row: PetConditionRow): PetCondition {
  return {
    id: row.id,
    petId: row.pet_id,
    createdByUserId: row.created_by_user_id,
    name: row.name,
    status: row.status,
    diagnosedOn: row.diagnosed_on,
    isCritical: row.is_critical,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildPetHealthDashboard(
  petId: Uuid,
  vaccines: PetVaccine[],
  allergies: PetAllergy[],
  conditions: PetCondition[]
): PetHealthDashboard {
  const sortedVaccines = [...vaccines].sort((left, right) => right.administeredOn.localeCompare(left.administeredOn));
  const upcomingVaccines = sortedVaccines
    .filter((vaccine) => vaccine.nextDueOn)
    .sort((left, right) => (left.nextDueOn ?? "").localeCompare(right.nextDueOn ?? ""));
  const activeConditions = conditions.filter((condition) => condition.status !== "resolved");
  const criticalConditions = conditions.filter((condition) => condition.isCritical);

  return {
    petId,
    vaccineCount: vaccines.length,
    allergyCount: allergies.length,
    conditionCount: conditions.length,
    activeConditionCount: activeConditions.length,
    criticalConditionCount: criticalConditions.length,
    latestVaccineDate: sortedVaccines[0]?.administeredOn ?? null,
    nextVaccineDueDate: upcomingVaccines[0]?.nextDueOn ?? null,
    allergyNames: allergies.map((allergy) => allergy.allergen),
    criticalConditionNames: criticalConditions.map((condition) => condition.name)
  };
}

async function listPetVaccineRows(supabase: HealthSupabaseClient, petId: Uuid) {
  const { data, error } = await supabase
    .from("pet_vaccines")
    .select("*")
    .eq("pet_id", petId)
    .order("administered_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    fail(error, "Unable to load pet vaccines.");
  }

  return data ?? [];
}

async function listPetAllergyRows(supabase: HealthSupabaseClient, petId: Uuid) {
  const { data, error } = await supabase
    .from("pet_allergies")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load pet allergies.");
  }

  return data ?? [];
}

async function listPetConditionRows(supabase: HealthSupabaseClient, petId: Uuid) {
  const { data, error } = await supabase
    .from("pet_conditions")
    .select("*")
    .eq("pet_id", petId)
    .order("is_critical", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load pet conditions.");
  }

  return data ?? [];
}

async function findPetVaccineById(supabase: HealthSupabaseClient, vaccineId: Uuid) {
  const { data, error } = await supabase.from("pet_vaccines").select("*").eq("id", vaccineId).single();

  if (error) {
    fail(error, "Unable to load the vaccine record.");
  }

  return data;
}

async function findPetAllergyById(supabase: HealthSupabaseClient, allergyId: Uuid) {
  const { data, error } = await supabase.from("pet_allergies").select("*").eq("id", allergyId).single();

  if (error) {
    fail(error, "Unable to load the allergy record.");
  }

  return data;
}

async function findPetConditionById(supabase: HealthSupabaseClient, conditionId: Uuid) {
  const { data, error } = await supabase.from("pet_conditions").select("*").eq("id", conditionId).single();

  if (error) {
    fail(error, "Unable to load the condition record.");
  }

  return data;
}

export function createHealthApiClient(supabase: HealthSupabaseClient): HealthApiClient {
  return {
    async getPetHealthDetail(petId) {
      const [vaccines, allergies, conditions] = await Promise.all([
        this.listPetVaccines(petId),
        this.listPetAllergies(petId),
        this.listPetConditions(petId)
      ]);

      return {
        dashboard: buildPetHealthDashboard(petId, vaccines, allergies, conditions),
        vaccines,
        allergies,
        conditions
      };
    },
    async listPetVaccines(petId) {
      const rows = await listPetVaccineRows(supabase, petId);
      return rows.map(mapPetVaccine);
    },
    async createPetVaccine(petId, input) {
      const { data, error } = await supabase.rpc("create_pet_vaccine", {
        target_pet_id: petId,
        next_name: input.name,
        next_administered_on: input.administeredOn,
        next_due_on: input.nextDueOn ?? null,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to register the vaccine.");
      }

      return mapPetVaccine(data);
    },
    async updatePetVaccine(vaccineId, input) {
      const { data, error } = await supabase.rpc("update_pet_vaccine", {
        target_vaccine_id: vaccineId,
        next_name: input.name,
        next_administered_on: input.administeredOn,
        next_due_on: input.nextDueOn ?? null,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to update the vaccine.");
      }

      return mapPetVaccine(await findPetVaccineById(supabase, data.id));
    },
    async listPetAllergies(petId) {
      const rows = await listPetAllergyRows(supabase, petId);
      return rows.map(mapPetAllergy);
    },
    async createPetAllergy(petId, input) {
      const { data, error } = await supabase.rpc("create_pet_allergy", {
        target_pet_id: petId,
        next_allergen: input.allergen,
        next_reaction: input.reaction ?? null,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to register the allergy.");
      }

      return mapPetAllergy(data);
    },
    async updatePetAllergy(allergyId, input) {
      const { data, error } = await supabase.rpc("update_pet_allergy", {
        target_allergy_id: allergyId,
        next_allergen: input.allergen,
        next_reaction: input.reaction ?? null,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to update the allergy.");
      }

      return mapPetAllergy(await findPetAllergyById(supabase, data.id));
    },
    async listPetConditions(petId) {
      const rows = await listPetConditionRows(supabase, petId);
      return rows.map(mapPetCondition);
    },
    async createPetCondition(petId, input) {
      const { data, error } = await supabase.rpc("create_pet_condition", {
        target_pet_id: petId,
        next_name: input.name,
        next_status: input.status ?? "active",
        next_diagnosed_on: input.diagnosedOn ?? null,
        next_is_critical: input.isCritical ?? false,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to register the condition.");
      }

      return mapPetCondition(data);
    },
    async updatePetCondition(conditionId, input) {
      const { data, error } = await supabase.rpc("update_pet_condition", {
        target_condition_id: conditionId,
        next_name: input.name,
        next_status: input.status ?? "active",
        next_diagnosed_on: input.diagnosedOn ?? null,
        next_is_critical: input.isCritical ?? false,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to update the condition.");
      }

      return mapPetCondition(await findPetConditionById(supabase, data.id));
    }
  };
}
