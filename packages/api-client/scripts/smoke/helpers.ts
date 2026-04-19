import fs from "node:fs/promises";
import path from "node:path";

import type { CoreRole } from "@pet/types";

import type { SmokeClientBundle } from "./clients.ts";
import type { SmokeActorCredentials, SmokeEnv } from "./env.ts";

export function assertSmoke(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function logoutSafely(clients: Pick<SmokeClientBundle, "core">) {
  await clients.core.logout().catch(() => undefined);
}

export async function loginAsActor(
  clients: Pick<SmokeClientBundle, "core">,
  actor: SmokeActorCredentials,
  desiredRole?: CoreRole
) {
  await logoutSafely(clients);
  await clients.core.login({
    email: actor.email,
    password: actor.password
  });

  if (!desiredRole) {
    return;
  }

  const snapshot = await clients.core.getCoreSnapshot();
  const roleAssignment = snapshot.roles.find((role) => role.role === desiredRole);

  assertSmoke(roleAssignment, `The actor ${actor.email} does not have the role ${desiredRole}.`);

  if (!roleAssignment.isActive) {
    await clients.core.switchRole({
      role: desiredRole
    });
  }
}

export async function ensureSavedPaymentMethod(clients: Pick<SmokeClientBundle, "core">) {
  const snapshot = await clients.core.getCoreSnapshot();
  const activeMethod = snapshot.paymentMethods.find((paymentMethod) => paymentMethod.status === "active");

  if (activeMethod) {
    return activeMethod.id;
  }

  const timestamp = Date.now().toString();
  const paymentMethods = await clients.core.addPaymentMethod({
    brand: "visa",
    last4: timestamp.slice(-4),
    expMonth: 12,
    expYear: 2030,
    cardholderName: "Pilot Critical Validation",
    isDefault: true
  });

  const newDefaultMethod = paymentMethods.find((paymentMethod) => paymentMethod.isDefault) ?? paymentMethods[0] ?? null;

  assertSmoke(newDefaultMethod, "Unable to create a saved payment method for the smoke suite.");

  return newDefaultMethod.id;
}

export async function writeSmokeArtifact(env: Pick<SmokeEnv, "artifactDir">, fileName: string, payload: unknown) {
  await fs.mkdir(env.artifactDir, { recursive: true });
  await fs.writeFile(path.join(env.artifactDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
