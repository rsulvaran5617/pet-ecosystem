import { runCoreSmoke } from "./core.smoke.ts";
import { runCriticalTransactionalSmoke } from "./critical-transactional.smoke.ts";
import { loadSmokeEnv, type SmokeActorKey } from "./env.ts";
import { runHealthSmoke } from "./health.smoke.ts";
import { writeSmokeArtifact } from "./helpers.ts";
import { runHouseholdsSmoke } from "./households.smoke.ts";
import { runPetsSmoke } from "./pets.smoke.ts";
import { runRemindersSmoke } from "./reminders.smoke.ts";

type SmokeScope = "admin" | "critical" | "full" | "health" | "providers" | "reminders";

function normalizeScope(rawScope: string | undefined): SmokeScope {
  switch (rawScope) {
    case undefined:
    case "full":
      return "full";
    case "critical":
      return "critical";
    case "admin":
      return "admin";
    case "health":
      return "health";
    case "providers":
      return "providers";
    case "reminders":
      return "reminders";
    default:
      throw new Error(`Unsupported smoke scope "${rawScope}". Expected one of: full, critical, admin, health, providers, reminders.`);
  }
}

function resolveRequiredActors(scope: SmokeScope): SmokeActorKey[] {
  switch (scope) {
    case "health":
    case "reminders":
      return ["owner", "member"];
    case "providers":
      return ["provider", "admin"];
    case "admin":
      return ["owner", "provider", "admin"];
    case "critical":
    case "full":
      return ["owner", "member", "provider", "admin"];
  }
}

async function main() {
  const scope = normalizeScope(process.argv[2]);
  const env = loadSmokeEnv(resolveRequiredActors(scope));
  const generatedAt = new Date().toISOString();

  if (scope === "providers") {
    const providers = await runCriticalTransactionalSmoke(env, "providers");
    const payload = {
      scope,
      generatedAt,
      suites: {
        providers
      }
    };

    await writeSmokeArtifact(env, "run-mvp-providers.json", payload);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (scope === "admin") {
    const admin = await runCriticalTransactionalSmoke(env, "full");
    const payload = {
      scope,
      generatedAt,
      suites: {
        admin: {
          adminCases: admin.adminCases,
          manualPreconditions: admin.manualPreconditions
        }
      }
    };

    await writeSmokeArtifact(env, "run-mvp-admin.json", payload);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (scope === "health") {
    const health = await runHealthSmoke(env);
    const payload = {
      scope,
      generatedAt,
      suites: {
        health
      }
    };

    await writeSmokeArtifact(env, "run-mvp-health.json", payload);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (scope === "reminders") {
    const reminders = await runRemindersSmoke(env);
    const payload = {
      scope,
      generatedAt,
      suites: {
        reminders
      }
    };

    await writeSmokeArtifact(env, "run-mvp-reminders.json", payload);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const core = await runCoreSmoke(env);
  const households = await runHouseholdsSmoke(env);
  const pets = await runPetsSmoke(env);
  const health = await runHealthSmoke(env);
  const reminders = await runRemindersSmoke(env);
  const criticalTransactional = await runCriticalTransactionalSmoke(env, "full");
  const payload = {
    scope,
    generatedAt,
    suites: {
      core,
      households,
      pets,
      health,
      reminders,
      criticalTransactional
    }
  };

  await writeSmokeArtifact(env, `run-mvp-${scope}.json`, payload);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
