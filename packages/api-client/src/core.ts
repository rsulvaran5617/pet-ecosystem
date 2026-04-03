import { coreOnboardingTaskMeta, coreOnboardingTaskOrder } from "@pet/config";
import type {
  AddPaymentMethodInput,
  AuthResult,
  CompleteRecoveryInput,
  CoreAuthState,
  CoreIdentitySnapshot,
  CoreRole,
  Database,
  OnboardingTask,
  RecoverAccessInput,
  RecoverySummary,
  RegisterInput,
  SwitchRoleInput,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpsertAddressInput,
  UserAddress,
  UserPaymentMethod,
  UserPreferences,
  UserProfile,
  UserRoleAssignment,
  Uuid,
  VerificationSummary,
  VerifyOtpInput,
  LoginInput
} from "@pet/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type CoreSupabaseClient = SupabaseClient<Database>;
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
type AddressRow = Database["public"]["Tables"]["user_addresses"]["Row"];
type PaymentMethodRow = Database["public"]["Tables"]["payment_methods"]["Row"];

export interface CoreApiClient {
  getAuthState(): Promise<CoreAuthState>;
  refreshSession(): Promise<CoreAuthState>;
  getCoreSnapshot(): Promise<CoreIdentitySnapshot>;
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  logout(): Promise<void>;
  verifyOtp(input: VerifyOtpInput): Promise<VerificationSummary>;
  recoverAccess(input: RecoverAccessInput): Promise<RecoverySummary>;
  completeRecovery(input: CompleteRecoveryInput): Promise<void>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  updatePreferences(input: UpdatePreferencesInput): Promise<UserPreferences>;
  switchRole(input: SwitchRoleInput): Promise<UserRoleAssignment[]>;
  upsertAddress(input: UpsertAddressInput): Promise<UserAddress[]>;
  addPaymentMethod(input: AddPaymentMethodInput): Promise<UserPaymentMethod[]>;
  setDefaultPaymentMethod(paymentMethodId: Uuid): Promise<UserPaymentMethod[]>;
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

function maskEmail(email: string) {
  const [localPart, domainPart = "example.com"] = email.split("@");
  const visibleLocal = localPart.slice(0, Math.min(localPart.length, 2));

  return `${visibleLocal || "**"}***@${domainPart}`;
}

function isCoreRole(value: unknown): value is CoreRole {
  return value === "pet_owner" || value === "provider";
}

function getRequestedRolesFromMetadata(metadata: User["user_metadata"] | null | undefined): CoreRole[] {
  const requestedRoles = metadata?.requested_roles;

  if (!Array.isArray(requestedRoles)) {
    return ["pet_owner"];
  }

  const roles = requestedRoles.filter(isCoreRole);

  return roles.length > 0 ? roles : ["pet_owner"];
}

function getUserLocale(metadata: User["user_metadata"] | null | undefined) {
  return typeof metadata?.locale === "string" && metadata.locale.trim() ? metadata.locale.trim() : "es";
}

function getUserFirstName(user: User) {
  if (typeof user.user_metadata?.first_name === "string" && user.user_metadata.first_name.trim()) {
    return user.user_metadata.first_name.trim();
  }

  return user.email?.split("@")[0] ?? "user";
}

function getUserLastName(user: User) {
  if (typeof user.user_metadata?.last_name === "string") {
    return user.user_metadata.last_name.trim();
  }

  return "";
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPreferences(row: ProfileRow): UserPreferences {
  return {
    marketingOptIn: row.marketing_opt_in,
    reminderEmailOptIn: row.reminder_email_opt_in,
    reminderPushOptIn: row.reminder_push_opt_in
  };
}

function mapRole(row: RoleRow): UserRoleAssignment {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAddress(row: AddressRow): UserAddress {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    recipientName: row.recipient_name,
    line1: row.line_1,
    line2: row.line_2,
    city: row.city,
    stateRegion: row.state_region,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPaymentMethod(row: PaymentMethodRow): UserPaymentMethod {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    brand: row.brand,
    last4: row.last_4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    cardholderName: row.cardholder_name,
    isDefault: row.is_default,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildVerification(user: User): VerificationSummary {
  const email = user.email ?? `${user.id}@pending.local`;

  return {
    channel: "email",
    status: user.email_confirmed_at ? "verified" : "pending",
    maskedDestination: maskEmail(email),
    lastSentAt: user.confirmation_sent_at ?? user.created_at ?? null
  };
}

function buildRecovery(email: string, lastRequestedAt?: string | null): RecoverySummary {
  return {
    enabled: true,
    channel: "email",
    maskedDestination: maskEmail(email),
    lastRequestedAt: lastRequestedAt ?? null
  };
}

function buildAuthState(user: User | null): CoreAuthState {
  return {
    isAuthenticated: Boolean(user),
    userId: user?.id ?? null,
    email: user?.email ?? null,
    emailVerified: Boolean(user?.email_confirmed_at)
  };
}

function buildOnboardingTasks(snapshot: Omit<CoreIdentitySnapshot, "onboardingTasks">): OnboardingTask[] {
  const isProfileComplete = Boolean(
    snapshot.profile.firstName &&
      snapshot.profile.lastName &&
      snapshot.profile.phone &&
      snapshot.profile.locale
  );
  const hasActiveRole = snapshot.roles.some((role) => role.isActive);
  const hasPreferences = [
    snapshot.preferences.marketingOptIn,
    snapshot.preferences.reminderEmailOptIn,
    snapshot.preferences.reminderPushOptIn
  ].every((value) => typeof value === "boolean");
  const statusByTask = {
    create_account: Boolean(snapshot.profile.email),
    verify_contact: snapshot.verification.status === "verified",
    complete_profile: isProfileComplete,
    select_role: hasActiveRole,
    set_preferences: hasPreferences,
    add_address: snapshot.addresses.length > 0,
    add_payment_method: snapshot.paymentMethods.length > 0
  } as const;

  return coreOnboardingTaskOrder.map((taskId) => ({
    id: taskId,
    title: coreOnboardingTaskMeta[taskId].title,
    description: coreOnboardingTaskMeta[taskId].description,
    status: statusByTask[taskId] ? "completed" : "pending"
  }));
}

async function getCurrentUser(supabase: CoreSupabaseClient) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    fail(error, "Unable to resolve the current auth user.");
  }

  return data.user ?? null;
}

async function requireCurrentUser(supabase: CoreSupabaseClient) {
  const user = await getCurrentUser(supabase);

  if (!user) {
    throw new Error("Authenticated user required.");
  }

  return user;
}

async function ensureProfileRecord(supabase: CoreSupabaseClient, user: User) {
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    fail(selectError, "Unable to load the user profile.");
  }

  if (existingProfile) {
    return existingProfile;
  }

  const fallbackInsert = {
    id: user.id,
    email: user.email ?? `${user.id}@pending.local`,
    first_name: getUserFirstName(user),
    last_name: getUserLastName(user),
    locale: getUserLocale(user.user_metadata)
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .upsert(fallbackInsert)
    .select("*")
    .single();

  if (insertError) {
    fail(insertError, "Unable to bootstrap the user profile.");
  }

  return insertedProfile;
}

async function ensureRoleRecords(supabase: CoreSupabaseClient, user: User) {
  const { data: existingRoles, error: selectError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (selectError) {
    fail(selectError, "Unable to load user roles.");
  }

  const normalizedRoles = existingRoles ?? [];

  if (normalizedRoles.length > 0) {
    return normalizedRoles;
  }

  const requestedRoles = getRequestedRolesFromMetadata(user.user_metadata);
  const { error: insertError } = await supabase.from("user_roles").insert(
    requestedRoles.map((role, index) => ({
      user_id: user.id,
      role,
      is_active: index === 0
    }))
  );

  if (insertError) {
    fail(insertError, "Unable to bootstrap the user roles.");
  }

  const { data: insertedRoles, error: reselectError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (reselectError) {
    fail(reselectError, "Unable to reload user roles.");
  }

  return insertedRoles;
}

async function listAddresses(supabase: CoreSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load user addresses.");
  }

  return data ?? [];
}

async function listPaymentMethods(supabase: CoreSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    fail(error, "Unable to load payment methods.");
  }

  return data ?? [];
}

async function getActiveRole(supabase: CoreSupabaseClient, user: User, fallbackRole: CoreRole = "pet_owner") {
  const roles = await ensureRoleRecords(supabase, user);

  return roles.find((role) => role.is_active)?.role ?? fallbackRole;
}

async function buildSnapshot(supabase: CoreSupabaseClient, user: User): Promise<CoreIdentitySnapshot> {
  const [profileRow, roleRows, addressRows, paymentMethodRows] = await Promise.all([
    ensureProfileRecord(supabase, user),
    ensureRoleRecords(supabase, user),
    listAddresses(supabase, user.id),
    listPaymentMethods(supabase, user.id)
  ]);

  const baseSnapshot = {
    profile: mapProfile(profileRow),
    preferences: mapPreferences(profileRow),
    roles: roleRows.map(mapRole),
    addresses: addressRows.map(mapAddress),
    paymentMethods: paymentMethodRows.map(mapPaymentMethod),
    verification: buildVerification(user),
    recovery: buildRecovery(user.email ?? `${user.id}@pending.local`)
  };

  return {
    ...baseSnapshot,
    onboardingTasks: buildOnboardingTasks(baseSnapshot)
  };
}

export function createCoreApiClient(supabase: CoreSupabaseClient): CoreApiClient {
  return {
    async getAuthState() {
      const user = await getCurrentUser(supabase);

      return buildAuthState(user);
    },
    async refreshSession() {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        fail(error, "Unable to refresh the auth session.");
      }

      return buildAuthState(data.user ?? data.session?.user ?? null);
    },
    async getCoreSnapshot() {
      const user = await requireCurrentUser(supabase);

      return buildSnapshot(supabase, user);
    },
    async register(input) {
      const requestedRoles: CoreRole[] = input.requestedRoles?.length ? input.requestedRoles : ["pet_owner"];
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: input.emailRedirectTo,
          data: {
            first_name: input.firstName,
            last_name: input.lastName,
            locale: input.locale ?? "es",
            requested_roles: requestedRoles
          }
        }
      });

      if (error) {
        fail(error, "Unable to register the user.");
      }

      const user = data.user;

      if (!user) {
        throw new Error("Registration completed without an auth user.");
      }

      return {
        userId: user.id,
        email: user.email ?? input.email,
        activeRole: requestedRoles[0],
        emailVerified: Boolean(user.email_confirmed_at),
        verificationRequired: !user.email_confirmed_at
      };
    },
    async login(input) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password
      });

      if (error) {
        fail(error, "Unable to authenticate the user.");
      }

      const user = data.user;

      if (!user) {
        throw new Error("Login completed without an auth user.");
      }

      const activeRole = await getActiveRole(supabase, user);

      return {
        userId: user.id,
        email: user.email ?? input.email,
        activeRole,
        emailVerified: Boolean(user.email_confirmed_at),
        verificationRequired: !user.email_confirmed_at
      };
    },
    async logout() {
      const { error } = await supabase.auth.signOut();

      if (error) {
        fail(error, "Unable to close the auth session.");
      }
    },
    async verifyOtp(input) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: input.email,
        token: input.token,
        type: "email"
      });

      if (error) {
        fail(error, "Unable to verify the registration code.");
      }

      const verifiedUser = data.user;

      return {
        channel: "email",
        status: "verified",
        maskedDestination: maskEmail(input.email),
        lastSentAt: verifiedUser?.email_confirmed_at ?? new Date().toISOString()
      };
    },
    async recoverAccess(input) {
      const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
        redirectTo: input.redirectTo
      });

      if (error) {
        fail(error, "Unable to trigger access recovery.");
      }

      return buildRecovery(input.email, new Date().toISOString());
    },
    async completeRecovery(input) {
      const { error } = await supabase.auth.updateUser({
        password: input.password
      });

      if (error) {
        fail(error, "Unable to complete access recovery.");
      }
    },
    async updateProfile(input) {
      const user = await requireCurrentUser(supabase);
      const { data, error } = await supabase
        .from("profiles")
        .update({
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          avatar_url: input.avatarUrl,
          locale: input.locale
        })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to update the user profile.");
      }

      return mapProfile(data);
    },
    async updatePreferences(input) {
      const user = await requireCurrentUser(supabase);
      const { data, error } = await supabase
        .from("profiles")
        .update({
          marketing_opt_in: input.marketingOptIn,
          reminder_email_opt_in: input.reminderEmailOptIn,
          reminder_push_opt_in: input.reminderPushOptIn
        })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to update user preferences.");
      }

      return mapPreferences(data);
    },
    async switchRole(input) {
      const { data, error } = await supabase.rpc("switch_active_user_role", {
        next_role: input.role
      });

      if (error) {
        fail(error, "Unable to switch the active role.");
      }

      return data.map(mapRole);
    },
    async upsertAddress(input) {
      const user = await requireCurrentUser(supabase);

      if (input.id) {
        const { error } = await supabase
          .from("user_addresses")
          .update({
            label: input.label,
            recipient_name: input.recipientName,
            line_1: input.line1,
            line_2: input.line2,
            city: input.city,
            state_region: input.stateRegion,
            postal_code: input.postalCode,
            country_code: input.countryCode,
            is_default: input.isDefault
          })
          .eq("id", input.id)
          .eq("user_id", user.id);

        if (error) {
          fail(error, "Unable to update the user address.");
        }
      } else {
        const { error } = await supabase.from("user_addresses").insert({
          user_id: user.id,
          label: input.label,
          recipient_name: input.recipientName,
          line_1: input.line1,
          line_2: input.line2,
          city: input.city,
          state_region: input.stateRegion,
          postal_code: input.postalCode,
          country_code: input.countryCode,
          is_default: input.isDefault
        });

        if (error) {
          fail(error, "Unable to create the user address.");
        }
      }

      const addresses = await listAddresses(supabase, user.id);

      return addresses.map(mapAddress);
    },
    async addPaymentMethod(input) {
      const user = await requireCurrentUser(supabase);
      const { error } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        type: "card",
        brand: input.brand,
        last_4: input.last4,
        exp_month: input.expMonth,
        exp_year: input.expYear,
        cardholder_name: input.cardholderName,
        is_default: input.isDefault
      });

      if (error) {
        fail(error, "Unable to save the payment method.");
      }

      const paymentMethods = await listPaymentMethods(supabase, user.id);

      return paymentMethods.map(mapPaymentMethod);
    },
    async setDefaultPaymentMethod(paymentMethodId) {
      const user = await requireCurrentUser(supabase);
      const { error } = await supabase
        .from("payment_methods")
        .update({
          is_default: true
        })
        .eq("id", paymentMethodId)
        .eq("user_id", user.id);

      if (error) {
        fail(error, "Unable to set the default payment method.");
      }

      const paymentMethods = await listPaymentMethods(supabase, user.id);

      return paymentMethods.map(mapPaymentMethod);
    }
  };
}
