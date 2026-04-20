"use client";

import { createCoreApiClient, createProvidersApiClient, createSupportApiClient } from "@pet/api-client";
import type { Database } from "@pet/types";
import { createClient } from "@supabase/supabase-js";

let adminSupabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let adminCoreApiClient: ReturnType<typeof createCoreApiClient> | null = null;
let adminSupportApiClient: ReturnType<typeof createSupportApiClient> | null = null;
let adminProvidersApiClient: ReturnType<typeof createProvidersApiClient> | null = null;

function getEnvValue(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }

  return value;
}

export function getAdminSupabaseClient() {
  if (!adminSupabaseClient) {
    adminSupabaseClient = createClient<Database>(
      getEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
      getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }

  return adminSupabaseClient;
}

export function getAdminCoreApiClient() {
  if (!adminCoreApiClient) {
    adminCoreApiClient = createCoreApiClient(getAdminSupabaseClient());
  }

  return adminCoreApiClient;
}

export function getAdminSupportApiClient() {
  if (!adminSupportApiClient) {
    adminSupportApiClient = createSupportApiClient(getAdminSupabaseClient());
  }

  return adminSupportApiClient;
}

export function getAdminProvidersApiClient() {
  if (!adminProvidersApiClient) {
    adminProvidersApiClient = createProvidersApiClient(getAdminSupabaseClient());
  }

  return adminProvidersApiClient;
}
