import { createSmokeClientBundle } from "./clients.ts";
import type { SmokeEnv } from "./env.ts";
import { assertSmoke, loginAsActor, writeSmokeArtifact } from "./helpers.ts";

export interface PetsSmokeResult {
  householdSetup: {
    householdId: string;
    invitationId: string;
  };
  memberEditRestrictions: {
    canCreatePet: boolean;
    canUpdatePet: boolean;
    createPetError: string | null;
    updatePetError: string | null;
  };
  memberViewAccess: {
    firstPetId: string | null;
    myPermissions: string[];
    petCount: number;
  };
  ownerPetFlow: {
    createdPetId: string;
    listCount: number;
    updatedBreed: string | null;
  };
}

export async function runPetsSmoke(env: SmokeEnv) {
  const ownerActor = env.actors.owner;
  const memberActor = env.actors.member;

  assertSmoke(ownerActor && memberActor, "The owner and member QA actors are required for the pets smoke.");

  const ownerClients = createSmokeClientBundle(env);
  const memberClients = createSmokeClientBundle(env, true);

  await loginAsActor(ownerClients, ownerActor, "pet_owner");
  await loginAsActor(memberClients, memberActor, "pet_owner");

  const household = await ownerClients.households.createHousehold({
    name: `Pets household ${Date.now()}`
  });
  const invitation = await ownerClients.households.inviteMember(household.id, {
    email: memberActor.email,
    permissions: ["view"]
  });
  const memberSnapshot = await memberClients.households.getHouseholdsSnapshot();
  const pendingInvitationId = memberSnapshot.pendingInvitations.find((candidate) => candidate.id === invitation.id)?.id;

  assertSmoke(pendingInvitationId, "The member did not receive the pets invitation.");

  await memberClients.households.acceptInvitation(pendingInvitationId);

  const createdPet = await ownerClients.pets.createPet({
    householdId: household.id,
    name: `Pilot pet ${Date.now()}`,
    species: "dog",
    breed: "Mixed",
    sex: "female",
    birthDate: "2021-05-10",
    notes: "Pilot pet for WEB-03 validation."
  });
  const updatedPet = await ownerClients.pets.updatePet(createdPet.id, {
    name: createdPet.name,
    species: createdPet.species,
    breed: "Mixed rescue",
    sex: createdPet.sex,
    birthDate: createdPet.birthDate,
    notes: "Updated profile summary for pilot validation."
  });

  const ownerHouseholdPets = await ownerClients.pets.listHouseholdPets(household.id);
  const memberHouseholdPets = await memberClients.pets.listHouseholdPets(household.id);
  const memberDetail = await memberClients.households.getHouseholdDetail(household.id);
  let createPetError: string | null = null;
  let updatePetError: string | null = null;

  try {
    await memberClients.pets.createPet({
      householdId: household.id,
      name: "Blocked create",
      species: "dog"
    });
  } catch (error) {
    createPetError = error instanceof Error ? error.message : String(error);
  }

  try {
    await memberClients.pets.updatePet(updatedPet.id, {
      name: "Blocked edit",
      species: "dog",
      breed: "Should fail",
      sex: "female",
      birthDate: "2021-05-10",
      notes: "Should fail"
    });
  } catch (error) {
    updatePetError = error instanceof Error ? error.message : String(error);
  }

  const result: PetsSmokeResult = {
    householdSetup: {
      householdId: household.id,
      invitationId: invitation.id
    },
    ownerPetFlow: {
      createdPetId: createdPet.id,
      updatedBreed: updatedPet.breed,
      listCount: ownerHouseholdPets.length
    },
    memberViewAccess: {
      petCount: memberHouseholdPets.length,
      firstPetId: memberHouseholdPets[0]?.id ?? null,
      myPermissions: memberDetail.household.myPermissions
    },
    memberEditRestrictions: {
      canCreatePet: createPetError === null,
      canUpdatePet: updatePetError === null,
      createPetError,
      updatePetError
    }
  };

  assertSmoke(result.memberEditRestrictions.canCreatePet === false, "A view-only member should not create pets.");
  assertSmoke(result.memberEditRestrictions.canUpdatePet === false, "A view-only member should not update pets.");

  await writeSmokeArtifact(env, "WEB-03-pets.json", result);

  return result;
}
