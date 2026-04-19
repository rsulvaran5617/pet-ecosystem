import { createClient } from "@supabase/supabase-js";

import type { Database } from "@pet/types";

import {
  createBookingsApiClient,
  createCoreApiClient,
  createHealthApiClient,
  createHouseholdsApiClient,
  createMarketplaceApiClient,
  createMessagingApiClient,
  createPetsApiClient,
  createProvidersApiClient,
  createRemindersApiClient,
  createReviewsApiClient,
  createSupportApiClient
} from "../../src/index.ts";
import type { SmokeEnv } from "./env.ts";

class MemoryStorage {
  private readonly storage = new Map<string, string>();

  async getItem(key: string) {
    return this.storage.has(key) ? this.storage.get(key)! : null;
  }

  async setItem(key: string, value: string) {
    this.storage.set(key, value);
  }

  async removeItem(key: string) {
    this.storage.delete(key);
  }
}

export interface SmokeClientBundle {
  bookings: ReturnType<typeof createBookingsApiClient>;
  core: ReturnType<typeof createCoreApiClient>;
  health: ReturnType<typeof createHealthApiClient>;
  households: ReturnType<typeof createHouseholdsApiClient>;
  marketplace: ReturnType<typeof createMarketplaceApiClient>;
  messaging: ReturnType<typeof createMessagingApiClient>;
  pets: ReturnType<typeof createPetsApiClient>;
  providers: ReturnType<typeof createProvidersApiClient>;
  reminders: ReturnType<typeof createRemindersApiClient>;
  reviews: ReturnType<typeof createReviewsApiClient>;
  support: ReturnType<typeof createSupportApiClient>;
}

export function createSmokeClientBundle(env: Pick<SmokeEnv, "supabaseUrl" | "supabaseAnonKey">, mobileLike = false): SmokeClientBundle {
  const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: mobileLike
      ? {
          storage: new MemoryStorage(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      : undefined
  });

  return {
    core: createCoreApiClient(supabase),
    households: createHouseholdsApiClient(supabase),
    pets: createPetsApiClient(supabase),
    health: createHealthApiClient(supabase),
    reminders: createRemindersApiClient(supabase),
    marketplace: createMarketplaceApiClient(supabase),
    bookings: createBookingsApiClient(supabase),
    messaging: createMessagingApiClient(supabase),
    reviews: createReviewsApiClient(supabase),
    support: createSupportApiClient(supabase),
    providers: createProvidersApiClient(supabase)
  };
}
