import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { createCoreApiClient } from "../packages/api-client/src/core";
import type { Database } from "../packages/types/src/database";

function readRootEnv(name: string) {
  const envText = fs.readFileSync(path.resolve(".env.local"), "utf8");
  const line = envText.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));

  if (!line) {
    throw new Error(`Missing ${name} in .env.local`);
  }

  return line.slice(name.length + 1).trim();
}

class MemoryStorage {
  private readonly store = new Map<string, string>();

  async getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  async removeItem(key: string) {
    this.store.delete(key);
  }
}

function createMobileLikeApiClient(storage: MemoryStorage) {
  const supabase = createClient<Database>(
    readRootEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readRootEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    }
  );

  return createCoreApiClient(supabase);
}

async function main() {
  const email = "petcore1775219560978367@sharebot.net";
  const password = "CoreLogin!482663";
  const timestamp = Date.now();
  const storage = new MemoryStorage();
  const mobileApi = createMobileLikeApiClient(storage);
  const result: Record<string, unknown> = {
    mode: "mobile-like-core-validation",
    login: null,
    persistedSessionReload: null,
    profileRead: null,
    profileUpdate: null,
    preferencesUpdate: null,
    addressRead: null,
    addressCreate: null,
    addressUpdate: null,
    roleSwitch: null,
    recoveryRequest: null,
    finalCleanup: null
  };

  await mobileApi.logout().catch(() => undefined);

  const loginResult = await mobileApi.login({ email, password });
  result.login = {
    emailVerified: loginResult.emailVerified,
    verificationRequired: loginResult.verificationRequired,
    activeRole: loginResult.activeRole
  };

  const authState = await mobileApi.getAuthState();

  if (!authState.isAuthenticated) {
    throw new Error("Mobile-like client did not stay authenticated after login.");
  }

  const reloadedApi = createMobileLikeApiClient(storage);
  const reloadedAuthState = await reloadedApi.getAuthState();
  result.persistedSessionReload = {
    isAuthenticated: reloadedAuthState.isAuthenticated,
    emailVerified: reloadedAuthState.emailVerified
  };

  if (!reloadedAuthState.isAuthenticated) {
    throw new Error("Persisted session did not reload with mobile-like storage.");
  }

  const beforeSnapshot = await reloadedApi.getCoreSnapshot();
  result.profileRead = {
    email: beforeSnapshot.profile.email,
    locale: beforeSnapshot.profile.locale,
    roles: beforeSnapshot.roles.map((role) => ({ role: role.role, isActive: role.isActive })),
    addressCount: beforeSnapshot.addresses.length
  };

  const originalProfile = beforeSnapshot.profile;
  const originalPreferences = beforeSnapshot.preferences;
  const originalActiveRole = beforeSnapshot.roles.find((role) => role.isActive)?.role ?? "pet_owner";

  const updatedPhone = `+50765${String(timestamp).slice(-6)}`;
  const updatedProfile = await reloadedApi.updateProfile({
    firstName: originalProfile.firstName,
    lastName: originalProfile.lastName,
    phone: updatedPhone,
    avatarUrl: originalProfile.avatarUrl ?? null,
    locale: originalProfile.locale
  });
  result.profileUpdate = {
    phone: updatedProfile.phone,
    locale: updatedProfile.locale
  };

  if (updatedProfile.phone !== updatedPhone) {
    throw new Error("Profile phone was not updated through the mobile-like client.");
  }

  const updatedPreferences = await reloadedApi.updatePreferences({
    marketingOptIn: !originalPreferences.marketingOptIn,
    reminderEmailOptIn: originalPreferences.reminderEmailOptIn,
    reminderPushOptIn: originalPreferences.reminderPushOptIn
  });
  result.preferencesUpdate = updatedPreferences;

  if (updatedPreferences.marketingOptIn !== !originalPreferences.marketingOptIn) {
    throw new Error("Preferences were not updated through the mobile-like client.");
  }

  result.addressRead = {
    beforeCount: beforeSnapshot.addresses.length
  };

  const createdAddresses = await reloadedApi.upsertAddress({
    label: "other",
    recipientName: `Mobile Core ${timestamp}`,
    line1: `Validation ${String(timestamp).slice(-5)}`,
    line2: "Initial",
    city: "Panama City",
    stateRegion: "Panama",
    postalCode: "0801",
    countryCode: "PA",
    isDefault: true
  });
  const createdAddress = createdAddresses[createdAddresses.length - 1];
  result.addressCreate = {
    addressCount: createdAddresses.length,
    createdAddressId: createdAddress.id,
    recipientName: createdAddress.recipientName,
    isDefault: createdAddress.isDefault
  };

  const updatedAddresses = await reloadedApi.upsertAddress({
    id: createdAddress.id,
    label: createdAddress.label,
    recipientName: `${createdAddress.recipientName} Updated`,
    line1: createdAddress.line1,
    line2: "Updated",
    city: createdAddress.city,
    stateRegion: createdAddress.stateRegion,
    postalCode: createdAddress.postalCode,
    countryCode: createdAddress.countryCode,
    isDefault: true
  });
  const updatedAddress = updatedAddresses.find((address) => address.id === createdAddress.id);
  result.addressUpdate = {
    updatedRecipientName: updatedAddress?.recipientName ?? null,
    updatedLine2: updatedAddress?.line2 ?? null
  };

  if (!updatedAddress || updatedAddress.line2 !== "Updated") {
    throw new Error("Address update did not persist through the mobile-like client.");
  }

  const switchedToProvider = await reloadedApi.switchRole({ role: "provider" });
  const activeAfterProvider = switchedToProvider.find((role) => role.isActive)?.role;
  const switchedBack = await reloadedApi.switchRole({ role: originalActiveRole });
  const activeAfterRestore = switchedBack.find((role) => role.isActive)?.role;
  result.roleSwitch = {
    activeAfterProvider,
    activeAfterRestore
  };

  if (activeAfterProvider !== "provider" || activeAfterRestore !== originalActiveRole) {
    throw new Error("Role switch did not persist correctly through the mobile-like client.");
  }

  const recovery = await reloadedApi.recoverAccess({ email });
  result.recoveryRequest = {
    enabled: recovery.enabled,
    channel: recovery.channel,
    maskedDestination: recovery.maskedDestination
  };

  await reloadedApi.updateProfile({
    firstName: originalProfile.firstName,
    lastName: originalProfile.lastName,
    phone: originalProfile.phone ?? null,
    avatarUrl: originalProfile.avatarUrl ?? null,
    locale: originalProfile.locale
  });
  await reloadedApi.updatePreferences(originalPreferences);
  result.finalCleanup = "profile-and-preferences-restored";

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
