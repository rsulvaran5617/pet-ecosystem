import type { CoreRole, OnboardingTaskId, PaymentMethodType } from "@pet/types";

export const coreRoles = ["pet_owner", "provider", "admin"] as const satisfies readonly CoreRole[];

export const coreRoleLabels: Record<CoreRole, string> = {
  pet_owner: "Pet owner",
  provider: "Provider",
  admin: "Admin"
};

export const coreOnboardingTaskOrder = [
  "create_account",
  "verify_contact",
  "complete_profile",
  "select_role",
  "set_preferences",
  "add_address",
  "add_payment_method"
] as const satisfies readonly OnboardingTaskId[];

export const coreOnboardingTaskMeta: Record<OnboardingTaskId, { title: string; description: string }> = {
  create_account: {
    title: "Create account",
    description: "The user already has the minimum identity record to access the system."
  },
  verify_contact: {
    title: "Verify contact",
    description: "The primary email must be verified before the account is considered trusted."
  },
  complete_profile: {
    title: "Complete profile",
    description: "Basic profile fields stay inside core and do not depend on households or pets."
  },
  select_role: {
    title: "Choose active role",
    description: "The current role defines the visible context without activating provider operations yet."
  },
  set_preferences: {
    title: "Set preferences",
    description: "Reminder and communication preferences live in the base profile."
  },
  add_address: {
    title: "Add address",
    description: "Saved addresses belong to the user and can be reused later by checkout flows."
  },
  add_payment_method: {
    title: "Add payment method",
    description: "Core stores saved cards only; payment capture belongs to bookings and payments."
  }
};

export const coreSupportedPaymentMethodTypes = ["card"] as const satisfies readonly PaymentMethodType[];

export const coreMvpBoundaries = {
  savedPaymentsOnly: true,
  paymentCaptureInCore: false,
  householdsInCore: false,
  petsInCore: false
} as const;
