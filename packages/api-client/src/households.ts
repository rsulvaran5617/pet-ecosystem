import type {
  CreateHouseholdInput,
  Database,
  Household,
  HouseholdDetail,
  HouseholdInvitation,
  HouseholdMember,
  HouseholdMemberProfile,
  HouseholdsSnapshot,
  HouseholdSummary,
  InviteHouseholdMemberInput,
  UpdateHouseholdMemberPermissionsInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type HouseholdsSupabaseClient = SupabaseClient<Database>;
type HouseholdRow = Database["public"]["Tables"]["households"]["Row"];
type HouseholdMemberRow = Database["public"]["Tables"]["household_members"]["Row"];
type HouseholdInvitationRow = Database["public"]["Tables"]["household_invitations"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type HouseholdProfileRow = Pick<ProfileRow, "id" | "email" | "first_name" | "last_name">;

export interface HouseholdsApiClient {
  getHouseholdsSnapshot(): Promise<HouseholdsSnapshot>;
  createHousehold(input: CreateHouseholdInput): Promise<Household>;
  getHouseholdDetail(householdId: Uuid): Promise<HouseholdDetail>;
  inviteMember(householdId: Uuid, input: InviteHouseholdMemberInput): Promise<HouseholdInvitation>;
  acceptInvitation(invitationId: Uuid): Promise<HouseholdInvitation>;
  rejectInvitation(invitationId: Uuid): Promise<HouseholdInvitation>;
  updateMemberPermissions(
    householdId: Uuid,
    memberId: Uuid,
    input: UpdateHouseholdMemberPermissionsInput
  ): Promise<HouseholdMember>;
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

async function getCurrentUser(supabase: HouseholdsSupabaseClient) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    fail(error, "Unable to resolve the current auth user.");
  }

  return data.user ?? null;
}

async function requireCurrentUser(supabase: HouseholdsSupabaseClient) {
  const user = await getCurrentUser(supabase);

  if (!user) {
    throw new Error("Authenticated user required.");
  }

  return user;
}

function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMemberProfile(row: HouseholdProfileRow): HouseholdMemberProfile {
  return {
    userId: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name
  };
}

function mapHouseholdMember(row: HouseholdMemberRow, profileMap: Map<string, HouseholdMemberProfile>): HouseholdMember {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    createdByUserId: row.created_by_user_id,
    permissions: row.permissions ?? [],
    profile: profileMap.get(row.user_id) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapHouseholdInvitation(row: HouseholdInvitationRow): HouseholdInvitation {
  return {
    id: row.id,
    householdId: row.household_id,
    invitedUserId: row.invited_user_id,
    invitedEmail: row.invited_email,
    invitedByUserId: row.invited_by_user_id,
    permissions: row.permissions ?? [],
    status: row.status,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listHouseholdRows(supabase: HouseholdsSupabaseClient, householdIds: string[]) {
  if (householdIds.length === 0) {
    return [] as HouseholdRow[];
  }

  const { data, error } = await supabase
    .from("households")
    .select("*")
    .in("id", householdIds)
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load households.");
  }

  return data ?? [];
}

async function listHouseholdMembers(supabase: HouseholdsSupabaseClient, householdIds: string[]) {
  if (householdIds.length === 0) {
    return [] as HouseholdMemberRow[];
  }

  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .in("household_id", householdIds)
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load household members.");
  }

  return data ?? [];
}

async function listVisiblePendingInvitations(supabase: HouseholdsSupabaseClient, householdIds: string[]) {
  if (householdIds.length === 0) {
    return [] as HouseholdInvitationRow[];
  }

  const { data, error } = await supabase
    .from("household_invitations")
    .select("*")
    .in("household_id", householdIds)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load household invitations.");
  }

  return data ?? [];
}

async function listPendingInvitationsForUser(supabase: HouseholdsSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("household_invitations")
    .select("*")
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load incoming household invitations.");
  }

  return data ?? [];
}

async function listHouseholdProfiles(supabase: HouseholdsSupabaseClient, householdId: string) {
  const { data, error } = await supabase.rpc("get_household_member_profiles", {
    target_household_id: householdId
  });

  if (error) {
    fail(error, "Unable to load household member profiles.");
  }

  return new Map((data ?? []).map((row) => [row.id, mapMemberProfile(row)]));
}

async function buildSummaryRows(supabase: HouseholdsSupabaseClient, user: User) {
  const { data: membershipRows, error: membershipError } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (membershipError) {
    fail(membershipError, "Unable to load household memberships.");
  }

  const myMemberships = membershipRows ?? [];
  const myHouseholdIds = [...new Set(myMemberships.map((row) => row.household_id))];
  const incomingInvitationRows = await listPendingInvitationsForUser(supabase, user.id);
  const relevantHouseholdIds = [...new Set([...myHouseholdIds, ...incomingInvitationRows.map((row) => row.household_id)])];
  const [householdRows, memberRows, visibleInvitationRows] = await Promise.all([
    listHouseholdRows(supabase, relevantHouseholdIds),
    listHouseholdMembers(supabase, myHouseholdIds),
    listVisiblePendingInvitations(supabase, myHouseholdIds)
  ]);

  return {
    householdRows,
    memberRows,
    myMemberships,
    incomingInvitationRows,
    visibleInvitationRows
  };
}

function buildHouseholdSummary(
  householdRow: HouseholdRow,
  myMemberships: HouseholdMemberRow[],
  memberRows: HouseholdMemberRow[],
  visibleInvitationRows: HouseholdInvitationRow[]
): HouseholdSummary {
  const myMembership = myMemberships.find((membership) => membership.household_id === householdRow.id) ?? null;

  return {
    ...mapHousehold(householdRow),
    myMemberId: myMembership?.id ?? null,
    myPermissions: myMembership?.permissions ?? [],
    memberCount: memberRows.filter((member) => member.household_id === householdRow.id).length,
    pendingInvitationCount: visibleInvitationRows.filter((invitation) => invitation.household_id === householdRow.id).length
  };
}

export function createHouseholdsApiClient(supabase: HouseholdsSupabaseClient): HouseholdsApiClient {
  return {
    async getHouseholdsSnapshot() {
      const user = await requireCurrentUser(supabase);
      const { householdRows, memberRows, myMemberships, incomingInvitationRows, visibleInvitationRows } =
        await buildSummaryRows(supabase, user);

      return {
        households: householdRows
          .filter((household) => myMemberships.some((membership) => membership.household_id === household.id))
          .map((household) => buildHouseholdSummary(household, myMemberships, memberRows, visibleInvitationRows)),
        pendingInvitations: incomingInvitationRows.map(mapHouseholdInvitation)
      };
    },
    async createHousehold(input) {
      const { data, error } = await supabase.rpc("create_household", {
        next_name: input.name
      });

      if (error) {
        fail(error, "Unable to create the household.");
      }

      return mapHousehold(data);
    },
    async getHouseholdDetail(householdId) {
      const user = await requireCurrentUser(supabase);
      const [householdRows, memberRows, invitationRows] = await Promise.all([
        listHouseholdRows(supabase, [householdId]),
        listHouseholdMembers(supabase, [householdId]),
        listVisiblePendingInvitations(supabase, [householdId])
      ]);

      const householdRow = householdRows[0];

      if (!householdRow) {
        throw new Error("Household not found or not accessible.");
      }

      const profileMap = await listHouseholdProfiles(supabase, householdId);
      const myMemberships = memberRows.filter((member) => member.user_id === user.id);

      return {
        household: buildHouseholdSummary(householdRow, myMemberships, memberRows, invitationRows),
        members: memberRows.map((member) => mapHouseholdMember(member, profileMap)),
        invitations: invitationRows.map(mapHouseholdInvitation)
      };
    },
    async inviteMember(householdId, input) {
      const { data, error } = await supabase.rpc("invite_household_member", {
        target_household_id: householdId,
        invitee_email: input.email,
        next_permissions: input.permissions
      });

      if (error) {
        fail(error, "Unable to invite the household member.");
      }

      return mapHouseholdInvitation(data);
    },
    async acceptInvitation(invitationId) {
      const { data, error } = await supabase.rpc("accept_household_invitation", {
        target_invitation_id: invitationId
      });

      if (error) {
        fail(error, "Unable to accept the household invitation.");
      }

      return mapHouseholdInvitation(data);
    },
    async rejectInvitation(invitationId) {
      const { data, error } = await supabase.rpc("reject_household_invitation", {
        target_invitation_id: invitationId
      });

      if (error) {
        fail(error, "Unable to reject the household invitation.");
      }

      return mapHouseholdInvitation(data);
    },
    async updateMemberPermissions(householdId, memberId, input) {
      const { data, error } = await supabase.rpc("update_household_member_permissions", {
        target_household_id: householdId,
        target_member_id: memberId,
        next_permissions: input.permissions
      });

      if (error) {
        fail(error, "Unable to update household member permissions.");
      }

      const profileMap = await listHouseholdProfiles(supabase, householdId);

      return mapHouseholdMember(data, profileMap);
    }
  };
}
