import type { ClinicalWriteRequest, HouseholdsSnapshot, PetSummary } from "@pet/types";

export interface PendingClinicalRequest {
  petId: string;
  petName: string;
  request: ClinicalWriteRequest;
}

interface Sources {
  getHouseholdsSnapshot: () => Promise<HouseholdsSnapshot>;
  listHouseholdPets: (householdId: string) => Promise<PetSummary[]>;
  listPetClinicalWriteRequests: (petId: string) => Promise<ClinicalWriteRequest[]>;
}

// Use the existing authenticated APIs; the server still authorizes every decision.
export async function loadPendingClinicalRequests(sources: Sources): Promise<PendingClinicalRequest[]> {
  const snapshot = await sources.getHouseholdsSnapshot();
  const households = snapshot.households.filter((household) =>
    household.householdType === "owner" && household.myPermissions.some((permission) => permission === "edit" || permission === "admin")
  );
  const pets = (await Promise.all(households.map((household) => sources.listHouseholdPets(household.id)))).flat();
  const results = await Promise.all(pets.map(async (pet) => {
    const requests = await sources.listPetClinicalWriteRequests(pet.id);
    return requests.filter((request) => request.status === "requested" && Date.parse(request.expiresAt) > Date.now())
      .map((request) => ({ petId: pet.id, petName: pet.name, request }));
  }));
  return results.flat().sort((a, b) =>
    (a.request.requestedAt ?? a.request.expiresAt).localeCompare(b.request.requestedAt ?? b.request.expiresAt)
  );
}
