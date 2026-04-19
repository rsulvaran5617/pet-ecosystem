import { createSmokeClientBundle } from "./clients.ts";
import type { SmokeEnv } from "./env.ts";
import { assertSmoke, loginAsActor, writeSmokeArtifact } from "./helpers.ts";

export interface HealthSmokeResult {
  householdSetup: {
    householdId: string;
    invitationId: string;
    petId: string;
  };
  memberEditRestrictions: {
    canCreateAllergy: boolean;
    canCreateCondition: boolean;
    canCreateVaccine: boolean;
    canUpdateCondition: boolean;
    createAllergyError: string | null;
    createConditionError: string | null;
    createVaccineError: string | null;
    updateConditionError: string | null;
  };
  memberViewAccess: {
    allergyCount: number;
    conditionCount: number;
    criticalConditionCount: number;
    vaccineCount: number;
  };
  ownerHealthFlow: {
    allergyName: string;
    conditionName: string;
    conditionStatus: string;
    criticalConditionCount: number;
    nextVaccineDueDate: string | null;
    vaccineName: string;
  };
}

export async function runHealthSmoke(env: SmokeEnv) {
  const ownerActor = env.actors.owner;
  const memberActor = env.actors.member;

  assertSmoke(ownerActor && memberActor, "The owner and member QA actors are required for the health smoke.");

  const ownerClients = createSmokeClientBundle(env);
  const memberClients = createSmokeClientBundle(env, true);
  const timestamp = Date.now();
  const vaccineDueOn = "2026-06-20";

  await loginAsActor(ownerClients, ownerActor, "pet_owner");
  await loginAsActor(memberClients, memberActor, "pet_owner");

  const household = await ownerClients.households.createHousehold({
    name: `Health household ${timestamp}`
  });
  const invitation = await ownerClients.households.inviteMember(household.id, {
    email: memberActor.email,
    permissions: ["view"]
  });
  const memberSnapshot = await memberClients.households.getHouseholdsSnapshot();
  const pendingInvitationId = memberSnapshot.pendingInvitations.find((candidate) => candidate.id === invitation.id)?.id;

  assertSmoke(pendingInvitationId, "The member did not receive the health invitation.");

  await memberClients.households.acceptInvitation(pendingInvitationId);

  const pet = await ownerClients.pets.createPet({
    householdId: household.id,
    name: `Health pet ${timestamp}`,
    species: "dog",
    breed: "Mixed",
    sex: "female",
    birthDate: "2022-03-01",
    notes: "Pet used to validate the MVP health flow."
  });

  const createdVaccine = await ownerClients.health.createPetVaccine(pet.id, {
    name: `Core vaccine ${timestamp}`,
    administeredOn: "2026-04-01",
    nextDueOn: vaccineDueOn,
    notes: "Initial vaccine record for health validation."
  });
  const updatedVaccine = await ownerClients.health.updatePetVaccine(createdVaccine.id, {
    name: `${createdVaccine.name} updated`,
    administeredOn: createdVaccine.administeredOn,
    nextDueOn: vaccineDueOn,
    notes: "Updated vaccine note."
  });

  const createdAllergy = await ownerClients.health.createPetAllergy(pet.id, {
    allergen: `Pollen ${timestamp}`,
    reaction: "Sneezing",
    notes: "Initial allergy record."
  });
  const updatedAllergy = await ownerClients.health.updatePetAllergy(createdAllergy.id, {
    allergen: `${createdAllergy.allergen} updated`,
    reaction: "Sneezing and itching",
    notes: "Updated allergy note."
  });

  const createdCondition = await ownerClients.health.createPetCondition(pet.id, {
    name: `Condition ${timestamp}`,
    status: "active",
    diagnosedOn: "2026-03-10",
    isCritical: true,
    notes: "Initial condition record."
  });
  const updatedCondition = await ownerClients.health.updatePetCondition(createdCondition.id, {
    name: `${createdCondition.name} updated`,
    status: "managed",
    diagnosedOn: createdCondition.diagnosedOn,
    isCritical: true,
    notes: "Updated condition note."
  });

  const ownerHealthDetail = await ownerClients.health.getPetHealthDetail(pet.id);
  const memberHealthDetail = await memberClients.health.getPetHealthDetail(pet.id);

  let createVaccineError: string | null = null;
  let createAllergyError: string | null = null;
  let createConditionError: string | null = null;
  let updateConditionError: string | null = null;

  try {
    await memberClients.health.createPetVaccine(pet.id, {
      name: "Blocked vaccine",
      administeredOn: "2026-04-10"
    });
  } catch (error) {
    createVaccineError = error instanceof Error ? error.message : String(error);
  }

  try {
    await memberClients.health.createPetAllergy(pet.id, {
      allergen: "Blocked allergy"
    });
  } catch (error) {
    createAllergyError = error instanceof Error ? error.message : String(error);
  }

  try {
    await memberClients.health.createPetCondition(pet.id, {
      name: "Blocked condition"
    });
  } catch (error) {
    createConditionError = error instanceof Error ? error.message : String(error);
  }

  try {
    await memberClients.health.updatePetCondition(updatedCondition.id, {
      name: "Blocked condition update",
      status: "resolved",
      diagnosedOn: updatedCondition.diagnosedOn,
      isCritical: false,
      notes: "Should fail"
    });
  } catch (error) {
    updateConditionError = error instanceof Error ? error.message : String(error);
  }

  const result: HealthSmokeResult = {
    householdSetup: {
      householdId: household.id,
      invitationId: invitation.id,
      petId: pet.id
    },
    ownerHealthFlow: {
      vaccineName: updatedVaccine.name,
      allergyName: updatedAllergy.allergen,
      conditionName: updatedCondition.name,
      conditionStatus: updatedCondition.status,
      criticalConditionCount: ownerHealthDetail.dashboard.criticalConditionCount,
      nextVaccineDueDate: ownerHealthDetail.dashboard.nextVaccineDueDate
    },
    memberViewAccess: {
      vaccineCount: memberHealthDetail.vaccines.length,
      allergyCount: memberHealthDetail.allergies.length,
      conditionCount: memberHealthDetail.conditions.length,
      criticalConditionCount: memberHealthDetail.dashboard.criticalConditionCount
    },
    memberEditRestrictions: {
      canCreateVaccine: createVaccineError === null,
      canCreateAllergy: createAllergyError === null,
      canCreateCondition: createConditionError === null,
      canUpdateCondition: updateConditionError === null,
      createVaccineError,
      createAllergyError,
      createConditionError,
      updateConditionError
    }
  };

  assertSmoke(ownerHealthDetail.dashboard.vaccineCount === 1, "The health dashboard did not count the vaccine.");
  assertSmoke(ownerHealthDetail.dashboard.allergyCount === 1, "The health dashboard did not count the allergy.");
  assertSmoke(ownerHealthDetail.dashboard.conditionCount === 1, "The health dashboard did not count the condition.");
  assertSmoke(ownerHealthDetail.dashboard.criticalConditionNames.includes(updatedCondition.name), "The critical condition was not highlighted in the dashboard.");
  assertSmoke(result.ownerHealthFlow.nextVaccineDueDate === vaccineDueOn, "The dashboard did not expose the expected next vaccine due date.");
  assertSmoke(result.memberViewAccess.vaccineCount === 1, "The view-only member did not see the vaccine list.");
  assertSmoke(result.memberViewAccess.allergyCount === 1, "The view-only member did not see the allergy list.");
  assertSmoke(result.memberViewAccess.conditionCount === 1, "The view-only member did not see the condition list.");
  assertSmoke(result.memberEditRestrictions.canCreateVaccine === false, "A view-only member should not create vaccines.");
  assertSmoke(result.memberEditRestrictions.canCreateAllergy === false, "A view-only member should not create allergies.");
  assertSmoke(result.memberEditRestrictions.canCreateCondition === false, "A view-only member should not create conditions.");
  assertSmoke(result.memberEditRestrictions.canUpdateCondition === false, "A view-only member should not update conditions.");

  await writeSmokeArtifact(env, "WEB-05-health.json", result);

  return result;
}
