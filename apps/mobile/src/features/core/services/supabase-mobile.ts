import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCoreApiClient } from "@pet/api-client";
import type { Database } from "@pet/types";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { AppState } from "react-native";

let mobileSupabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let mobileCoreApiClient: ReturnType<typeof createCoreApiClient> | null = null;
let authRefreshBound = false;
const mobileAppScheme = "petecosystem";
const mobileRecoveryRedirectUrl = `${mobileAppScheme}://auth/recovery`;

function getEnvValue(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY") {
  const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const value =
    name === "EXPO_PUBLIC_SUPABASE_URL" ? processEnv?.EXPO_PUBLIC_SUPABASE_URL : processEnv?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getDeepLinkParam(url: URL, key: string) {
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);

  return url.searchParams.get(key) ?? hashParams.get(key);
}

export function getMobileSupabaseClient() {
  if (!mobileSupabaseClient) {
    mobileSupabaseClient = createClient<Database>(
      getEnvValue("EXPO_PUBLIC_SUPABASE_URL"),
      getEnvValue("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
      {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      }
    );
  }

  if (!authRefreshBound) {
    AppState.addEventListener("change", (state) => {
      if (!mobileSupabaseClient) {
        return;
      }

      if (state === "active") {
        mobileSupabaseClient.auth.startAutoRefresh();
        return;
      }

      mobileSupabaseClient.auth.stopAutoRefresh();
    });
    authRefreshBound = true;
  }

  return mobileSupabaseClient;
}

export function getMobileRecoveryRedirectUrl() {
  return mobileRecoveryRedirectUrl;
}

export async function consumeMobileAuthRedirectUrl(nextUrl: string) {
  const parsedUrl = new URL(nextUrl);
  const authCode = getDeepLinkParam(parsedUrl, "code");
  const accessToken = getDeepLinkParam(parsedUrl, "access_token");
  const refreshToken = getDeepLinkParam(parsedUrl, "refresh_token");
  const authType = getDeepLinkParam(parsedUrl, "type");
  const errorCode = getDeepLinkParam(parsedUrl, "error_code") ?? getDeepLinkParam(parsedUrl, "error");
  const errorDescription = getDeepLinkParam(parsedUrl, "error_description");

  if (errorCode) {
    throw new Error(errorDescription ?? errorCode);
  }

  if (authCode) {
    const { data, error } = await getMobileSupabaseClient().auth.exchangeCodeForSession(authCode);

    if (error) {
      throw new Error(error.message);
    }

    return {
      isRecoveryFlow: authType === "recovery" || parsedUrl.href.startsWith(mobileRecoveryRedirectUrl),
      sessionEstablished: Boolean(data.session)
    };
  }

  if (!accessToken && !refreshToken) {
    return null;
  }

  if (!accessToken || !refreshToken) {
    throw new Error("Recovery link is missing auth tokens.");
  }

  const { data, error } = await getMobileSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    isRecoveryFlow: authType === "recovery" || parsedUrl.href.startsWith(mobileRecoveryRedirectUrl),
    sessionEstablished: Boolean(data.session)
  };
}

export function getMobileCoreApiClient() {
  if (!mobileCoreApiClient) {
    mobileCoreApiClient = createCoreApiClient(getMobileSupabaseClient());
  }

  return mobileCoreApiClient;
}
