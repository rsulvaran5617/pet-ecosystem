export interface ApiClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface AuthSessionLike {
  accessToken?: string;
}

export function createApiClientConfig(config: ApiClientConfig): ApiClientConfig {
  return config;
}

export * from "./core";
export * from "./bookings";
export * from "./health";
export * from "./households";
export * from "./marketplace";
export * from "./providers";
export * from "./pets";
export * from "./reminders";
export * from "./messaging";
export * from "./reviews";
export * from "./support";
