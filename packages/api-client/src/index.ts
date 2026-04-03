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
