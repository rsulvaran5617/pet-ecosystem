import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SmokeActorKey = "owner" | "member" | "provider" | "admin";

export interface SmokeActorCredentials {
  email: string;
  password: string;
}

export interface SmokeEnv {
  repoRoot: string;
  artifactDir: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  actors: Partial<Record<SmokeActorKey, SmokeActorCredentials>>;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../../../..");
const envFileCandidates = [
  path.join(repoRoot, "apps", "web", ".env.local"),
  path.join(repoRoot, "apps", "mobile", ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, ".env")
];

const actorVariableMap: Record<SmokeActorKey, { email: string[]; password: string[] }> = {
  owner: {
    email: ["QA_OWNER_EMAIL", "PILOT_CUSTOMER_EMAIL"],
    password: ["QA_OWNER_PASSWORD", "PILOT_CUSTOMER_PASSWORD"]
  },
  member: {
    email: ["QA_MEMBER_EMAIL"],
    password: ["QA_MEMBER_PASSWORD"]
  },
  provider: {
    email: ["QA_PROVIDER_EMAIL", "PILOT_PROVIDER_EMAIL"],
    password: ["QA_PROVIDER_PASSWORD", "PILOT_PROVIDER_PASSWORD"]
  },
  admin: {
    email: ["QA_ADMIN_EMAIL", "PILOT_ADMIN_EMAIL"],
    password: ["QA_ADMIN_PASSWORD", "PILOT_ADMIN_PASSWORD"]
  }
};

const smokeNoProxyEntries = ["localhost", "127.0.0.1", "::1", "supabase.co", ".supabase.co", "api.supabase.com"];

function appendNoProxyEntries(existingValue: string | undefined, entries: string[]) {
  const normalizedEntries = new Set(
    (existingValue ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

  for (const entry of entries) {
    normalizedEntries.add(entry);
  }

  return Array.from(normalizedEntries).join(",");
}

function shouldDropProxyValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();

  return (
    normalizedValue.includes("127.0.0.1:9") ||
    normalizedValue.includes("localhost:9") ||
    normalizedValue === "http://127.0.0.1:9" ||
    normalizedValue === "http://localhost:9"
  );
}

function sanitizeSmokeNetworkEnvironment() {
  const proxyVariables = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"];

  for (const proxyVariable of proxyVariables) {
    if (shouldDropProxyValue(process.env[proxyVariable])) {
      delete process.env[proxyVariable];
    }
  }

  const mergedNoProxy = appendNoProxyEntries(process.env.NO_PROXY ?? process.env.no_proxy, smokeNoProxyEntries);
  process.env.NO_PROXY = mergedNoProxy;
  process.env.no_proxy = mergedNoProxy;
}

function normalizeEnvValue(value: string) {
  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith("\"") && trimmedValue.endsWith("\"")) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function readEnvFileValue(variableName: string) {
  for (const fileName of envFileCandidates) {
    if (!fs.existsSync(fileName)) {
      continue;
    }

    const fileContents = fs.readFileSync(fileName, "utf8");

    for (const rawLine of fileContents.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#") || !line.includes("=")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim().replace(/^export\s+/, "");

      if (key !== variableName) {
        continue;
      }

      return normalizeEnvValue(line.slice(separatorIndex + 1));
    }
  }

  return null;
}

function readOptionalEnvValue(...variableNames: string[]) {
  for (const variableName of variableNames) {
    const processValue = process.env[variableName];

    if (processValue?.trim()) {
      return processValue.trim();
    }

    const fileValue = readEnvFileValue(variableName);

    if (fileValue?.trim()) {
      return fileValue.trim();
    }
  }

  return null;
}

function readRequiredEnvValue(...variableNames: string[]) {
  const value = readOptionalEnvValue(...variableNames);

  if (!value) {
    throw new Error(`Missing required environment variable. Expected one of: ${variableNames.join(", ")}.`);
  }

  return value;
}

function resolveArtifactDirectory() {
  const configuredDirectory = readOptionalEnvValue("SMOKE_ARTIFACT_DIR");

  if (!configuredDirectory) {
    return path.join(repoRoot, ".codex-tmp", "pilot-critical");
  }

  return path.isAbsolute(configuredDirectory) ? configuredDirectory : path.resolve(repoRoot, configuredDirectory);
}

function readActorCredentials(actorKey: SmokeActorKey): SmokeActorCredentials {
  const actorVariables = actorVariableMap[actorKey];

  return {
    email: readRequiredEnvValue(...actorVariables.email),
    password: readRequiredEnvValue(...actorVariables.password)
  };
}

export function loadSmokeEnv(requiredActors: SmokeActorKey[]): SmokeEnv {
  sanitizeSmokeNetworkEnvironment();

  const actors = Object.fromEntries(requiredActors.map((actorKey) => [actorKey, readActorCredentials(actorKey)]));

  return {
    repoRoot,
    artifactDir: resolveArtifactDirectory(),
    supabaseUrl: readRequiredEnvValue("NEXT_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readRequiredEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_SUPABASE_ANON_KEY"),
    actors
  };
}
