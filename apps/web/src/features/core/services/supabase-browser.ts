"use client";

import {
  createBookingsApiClient,
  createCoreApiClient,
  createHealthApiClient,
  createHouseholdsApiClient,
  createMarketplaceApiClient,
  createMessagingApiClient,
  createPetsApiClient,
  createProvidersApiClient,
  createReviewsApiClient,
  createRemindersApiClient,
  createSupportApiClient
} from "@pet/api-client";
import type { Database } from "@pet/types";
import { createClient } from "@supabase/supabase-js";

let browserSupabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let browserCoreApiClient: ReturnType<typeof createCoreApiClient> | null = null;
let browserBookingsApiClient: ReturnType<typeof createBookingsApiClient> | null = null;
let browserHouseholdsApiClient: ReturnType<typeof createHouseholdsApiClient> | null = null;
let browserPetsApiClient: ReturnType<typeof createPetsApiClient> | null = null;
let browserHealthApiClient: ReturnType<typeof createHealthApiClient> | null = null;
let browserRemindersApiClient: ReturnType<typeof createRemindersApiClient> | null = null;
let browserMarketplaceApiClient: ReturnType<typeof createMarketplaceApiClient> | null = null;
let browserMessagingApiClient: ReturnType<typeof createMessagingApiClient> | null = null;
let browserReviewsApiClient: ReturnType<typeof createReviewsApiClient> | null = null;
let browserSupportApiClient: ReturnType<typeof createSupportApiClient> | null = null;
let browserProvidersApiClient: ReturnType<typeof createProvidersApiClient> | null = null;

function getEnvValue(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getBrowserSupabaseClient() {
  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient<Database>(
      getEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
      getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }

  return browserSupabaseClient;
}

export function getBrowserCoreApiClient() {
  if (!browserCoreApiClient) {
    browserCoreApiClient = createCoreApiClient(getBrowserSupabaseClient());
  }

  return browserCoreApiClient;
}

export function getBrowserBookingsApiClient() {
  if (!browserBookingsApiClient) {
    browserBookingsApiClient = createBookingsApiClient(getBrowserSupabaseClient());
  }

  return browserBookingsApiClient;
}

export function getBrowserHouseholdsApiClient() {
  if (!browserHouseholdsApiClient) {
    browserHouseholdsApiClient = createHouseholdsApiClient(getBrowserSupabaseClient());
  }

  return browserHouseholdsApiClient;
}

export function getBrowserPetsApiClient() {
  if (!browserPetsApiClient) {
    browserPetsApiClient = createPetsApiClient(getBrowserSupabaseClient());
  }

  return browserPetsApiClient;
}

export function getBrowserHealthApiClient() {
  if (!browserHealthApiClient) {
    browserHealthApiClient = createHealthApiClient(getBrowserSupabaseClient());
  }

  return browserHealthApiClient;
}

export function getBrowserRemindersApiClient() {
  if (!browserRemindersApiClient) {
    browserRemindersApiClient = createRemindersApiClient(getBrowserSupabaseClient());
  }

  return browserRemindersApiClient;
}

export function getBrowserMarketplaceApiClient() {
  if (!browserMarketplaceApiClient) {
    browserMarketplaceApiClient = createMarketplaceApiClient(getBrowserSupabaseClient());
  }

  return browserMarketplaceApiClient;
}

export function getBrowserMessagingApiClient() {
  if (!browserMessagingApiClient) {
    browserMessagingApiClient = createMessagingApiClient(getBrowserSupabaseClient());
  }

  return browserMessagingApiClient;
}

export function getBrowserReviewsApiClient() {
  if (!browserReviewsApiClient) {
    browserReviewsApiClient = createReviewsApiClient(getBrowserSupabaseClient());
  }

  return browserReviewsApiClient;
}

export function getBrowserSupportApiClient() {
  if (!browserSupportApiClient) {
    browserSupportApiClient = createSupportApiClient(getBrowserSupabaseClient());
  }

  return browserSupportApiClient;
}

export function getBrowserProvidersApiClient() {
  if (!browserProvidersApiClient) {
    browserProvidersApiClient = createProvidersApiClient(getBrowserSupabaseClient());
  }

  return browserProvidersApiClient;
}

export function getBrowserRecoveryRedirectUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/`;
}
