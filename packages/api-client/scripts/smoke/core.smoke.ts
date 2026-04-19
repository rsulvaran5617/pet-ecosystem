import type { CoreRole } from "@pet/types";

import { createSmokeClientBundle } from "./clients.ts";
import type { SmokeEnv } from "./env.ts";
import { assertSmoke, loginAsActor, writeSmokeArtifact } from "./helpers.ts";

export interface CoreSmokeResult {
  addressCount: number;
  activeRole: CoreRole;
  availableRoles: CoreRole[];
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  paymentMethodCount: number;
  roleCount: number;
  roleSwitchValidation: {
    attempted: boolean;
    originalRole: CoreRole;
    restoredRole: CoreRole;
    switchedRole: CoreRole | null;
  };
}

export async function runCoreSmoke(env: SmokeEnv) {
  const ownerActor = env.actors.owner;

  assertSmoke(ownerActor, "The owner QA actor is required for the core smoke.");

  const ownerClients = createSmokeClientBundle(env);

  await loginAsActor(ownerClients, ownerActor, "pet_owner");

  const initialSnapshot = await ownerClients.core.getCoreSnapshot();
  const activeRole = initialSnapshot.roles.find((role) => role.isActive)?.role ?? "pet_owner";
  const alternateRole: CoreRole = activeRole === "provider" ? "pet_owner" : "provider";

  await ownerClients.core.switchRole({
    role: alternateRole
  });
  await ownerClients.core.switchRole({
    role: activeRole
  });

  const restoredSnapshot = await ownerClients.core.getCoreSnapshot();
  const restoredActiveRole = restoredSnapshot.roles.find((role) => role.isActive)?.role ?? activeRole;

  const result: CoreSmokeResult = {
    roleCount: restoredSnapshot.roles.length,
    addressCount: restoredSnapshot.addresses.length,
    paymentMethodCount: restoredSnapshot.paymentMethods.length,
    firstName: initialSnapshot.profile.firstName,
    lastName: initialSnapshot.profile.lastName,
    emailVerified: initialSnapshot.verification.status === "verified",
    activeRole,
    availableRoles: restoredSnapshot.roles.map((role) => role.role),
    roleSwitchValidation: {
      attempted: true,
      originalRole: activeRole,
      restoredRole: restoredActiveRole,
      switchedRole: alternateRole
    }
  };

  assertSmoke(result.emailVerified, "The QA owner account must be email verified.");
  assertSmoke(result.availableRoles.includes(alternateRole), "The alternate self-service role was not available after switching.");
  assertSmoke(result.roleSwitchValidation.restoredRole === activeRole, "The active role was not restored after switching.");

  await writeSmokeArtifact(env, "WEB-01-preconditions.json", result);

  return result;
}
