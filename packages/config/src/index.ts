export const appTargets = ["mobile", "web", "admin"] as const;

export const workspacePackages = ["@pet/types", "@pet/ui", "@pet/api-client", "@pet/config"] as const;

export const requiredEnvVarNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_DB_PASSWORD"
] as const;

export * from "./core";
