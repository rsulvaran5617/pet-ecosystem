import { createSmokeClientBundle } from "./clients.ts";
import type { SmokeEnv } from "./env.ts";
import { assertSmoke, loginAsActor, writeSmokeArtifact } from "./helpers.ts";

export interface HouseholdsSmokeResult {
  createHousehold: {
    householdId: string;
    name: string;
  };
  detailAfterCreate: {
    memberCount: number;
    myPermissions: string[];
  };
  inviteForAccept: {
    invitationId: string;
    permissions: string[];
  };
  inviteForReject: {
    invitationId: string;
    permissions: string[];
  };
  inviteeAccept: {
    acceptedInvitationId: string;
  };
  inviteeReject: {
    rejectedInvitationId: string;
  };
  inviteeUpdatedAccess: {
    canInviteAfterAdminRemoval: boolean;
    canUpdatePermissionsAfterAdminRemoval: boolean;
    inviteBlockedMessage: string | null;
    myPermissions: string[];
    permissionUpdateBlockedMessage: string | null;
  };
  listHouseholds: {
    householdCount: number;
  };
  memberPermissionsUpdate: {
    memberCount: number;
    updatedPermissions: string[];
  };
}

export async function runHouseholdsSmoke(env: SmokeEnv) {
  const ownerActor = env.actors.owner;
  const memberActor = env.actors.member;

  assertSmoke(ownerActor && memberActor, "The owner and member QA actors are required for the households smoke.");

  const ownerClients = createSmokeClientBundle(env);
  const memberClients = createSmokeClientBundle(env, true);

  await loginAsActor(ownerClients, ownerActor, "pet_owner");
  await loginAsActor(memberClients, memberActor, "pet_owner");

  const household = await ownerClients.households.createHousehold({
    name: `Pilot household ${Date.now()}`
  });
  const householdSnapshot = await ownerClients.households.getHouseholdsSnapshot();
  const detailAfterCreate = await ownerClients.households.getHouseholdDetail(household.id);
  const rejectInvitation = await ownerClients.households.inviteMember(household.id, {
    email: memberActor.email,
    permissions: ["view", "book"]
  });

  const pendingRejectInvitations = await memberClients.households.getHouseholdsSnapshot();
  const pendingRejectInvitationId = pendingRejectInvitations.pendingInvitations.find(
    (invitation) => invitation.id === rejectInvitation.id
  )?.id;

  assertSmoke(pendingRejectInvitationId, "The member did not receive the invitation to reject.");

  await memberClients.households.rejectInvitation(pendingRejectInvitationId);

  const acceptedInvitation = await ownerClients.households.inviteMember(household.id, {
    email: memberActor.email,
    permissions: ["view", "edit", "book"]
  });

  const pendingAcceptInvitations = await memberClients.households.getHouseholdsSnapshot();
  const pendingAcceptInvitationId = pendingAcceptInvitations.pendingInvitations.find(
    (invitation) => invitation.id === acceptedInvitation.id
  )?.id;

  assertSmoke(pendingAcceptInvitationId, "The member did not receive the invitation to accept.");

  await memberClients.households.acceptInvitation(pendingAcceptInvitationId);

  const householdDetailAfterAccept = await ownerClients.households.getHouseholdDetail(household.id);
  const invitedMember = householdDetailAfterAccept.members.find((member) => member.profile?.email === memberActor.email);

  assertSmoke(invitedMember, "The invited member was not visible in the household detail.");

  const updatedMember = await ownerClients.households.updateMemberPermissions(household.id, invitedMember.id, {
    permissions: ["view", "edit", "book", "pay"]
  });

  const memberDetail = await memberClients.households.getHouseholdDetail(household.id);
  let inviteBlockedMessage: string | null = null;
  let permissionUpdateBlockedMessage: string | null = null;

  try {
    await memberClients.households.inviteMember(household.id, {
      email: ownerActor.email,
      permissions: ["view"]
    });
  } catch (error) {
    inviteBlockedMessage = error instanceof Error ? error.message : String(error);
  }

  try {
    await memberClients.households.updateMemberPermissions(household.id, updatedMember.id, {
      permissions: ["view"]
    });
  } catch (error) {
    permissionUpdateBlockedMessage = error instanceof Error ? error.message : String(error);
  }

  const result: HouseholdsSmokeResult = {
    createHousehold: {
      householdId: household.id,
      name: household.name
    },
    listHouseholds: {
      householdCount: householdSnapshot.households.length
    },
    detailAfterCreate: {
      memberCount: detailAfterCreate.members.length,
      myPermissions: detailAfterCreate.household.myPermissions
    },
    inviteForReject: {
      invitationId: rejectInvitation.id,
      permissions: rejectInvitation.permissions
    },
    inviteeReject: {
      rejectedInvitationId: pendingRejectInvitationId
    },
    inviteForAccept: {
      invitationId: acceptedInvitation.id,
      permissions: acceptedInvitation.permissions
    },
    inviteeAccept: {
      acceptedInvitationId: pendingAcceptInvitationId
    },
    memberPermissionsUpdate: {
      memberCount: householdDetailAfterAccept.members.length,
      updatedPermissions: updatedMember.permissions
    },
    inviteeUpdatedAccess: {
      myPermissions: memberDetail.household.myPermissions,
      canInviteAfterAdminRemoval: inviteBlockedMessage === null,
      canUpdatePermissionsAfterAdminRemoval: permissionUpdateBlockedMessage === null,
      inviteBlockedMessage,
      permissionUpdateBlockedMessage
    }
  };

  assertSmoke(result.inviteeUpdatedAccess.canInviteAfterAdminRemoval === false, "The member should not invite after admin removal.");
  assertSmoke(
    result.inviteeUpdatedAccess.canUpdatePermissionsAfterAdminRemoval === false,
    "The member should not update permissions after admin removal."
  );

  await writeSmokeArtifact(env, "WEB-02-households.json", result);

  return result;
}
