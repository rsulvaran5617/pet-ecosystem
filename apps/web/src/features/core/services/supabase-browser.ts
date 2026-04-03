"use client";

import { createCoreApiClient } from "@pet/api-client";
import type { Database } from "@pet/types";
import { createClient } from "@supabase/supabase-js";

let browserSupabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let browserCoreApiClient: ReturnType<typeof createCoreApiClient> | null = null;

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

export function getBrowserRecoveryRedirectUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/`;
}
