import type { IsoDateString, TimestampedEntity, Uuid } from "./base";

export type HouseholdPermission = "view" | "edit" | "book" | "pay" | "admin";
export type HouseholdInvitationStatus = "pending" | "accepted" | "rejected";

export interface Household extends TimestampedEntity {
  id: Uuid;
  name: string;
  createdByUserId: Uuid;
}

export interface HouseholdMemberProfile {
  userId: Uuid;
  email: string;
  firstName: string;
  lastName: string;
}

export interface HouseholdMember extends TimestampedEntity {
  id: Uuid;
  householdId: Uuid;
  userId: Uuid;
  createdByUserId: Uuid;
  permissions: HouseholdPermission[];
  profile: HouseholdMemberProfile | null;
}

export interface HouseholdInvitation extends TimestampedEntity {
  id: Uuid;
  householdId: Uuid;
  invitedUserId: Uuid;
  invitedEmail: string;
  invitedByUserId: Uuid;
  permissions: HouseholdPermission[];
  status: HouseholdInvitationStatus;
  respondedAt?: IsoDateString | null;
}

export interface HouseholdSummary extends Household {
  myMemberId: Uuid | null;
  myPermissions: HouseholdPermission[];
  memberCount: number;
  pendingInvitationCount: number;
}

export interface HouseholdDetail {
  household: HouseholdSummary;
  members: HouseholdMember[];
  invitations: HouseholdInvitation[];
}

export interface HouseholdsSnapshot {
  households: HouseholdSummary[];
  pendingInvitations: HouseholdInvitation[];
}

export interface CreateHouseholdInput {
  name: string;
}

export interface InviteHouseholdMemberInput {
  email: string;
  permissions: HouseholdPermission[];
}

export interface UpdateHouseholdMemberPermissionsInput {
  permissions: HouseholdPermission[];
}

