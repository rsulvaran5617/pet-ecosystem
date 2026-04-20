import type { CoreRole, OnboardingTaskId, PaymentMethodType } from "@pet/types";

export const coreRoles = ["pet_owner", "provider", "admin"] as const satisfies readonly CoreRole[];

export const coreRoleLabels: Record<CoreRole, string> = {
  pet_owner: "Propietario de mascota",
  provider: "Proveedor",
  admin: "Administrador"
};

export const addressLabelLabels = {
  home: "Casa",
  work: "Trabajo",
  other: "Otro"
} as const;

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
    title: "Crear cuenta",
    description: "La persona usuaria ya tiene la identidad minima para entrar al sistema."
  },
  verify_contact: {
    title: "Verificar contacto",
    description: "El correo principal debe verificarse antes de considerar la cuenta confiable."
  },
  complete_profile: {
    title: "Completar perfil",
    description: "Los datos basicos del perfil viven en core y no dependen de hogares ni mascotas."
  },
  select_role: {
    title: "Elegir rol activo",
    description: "El rol actual define el contexto visible sin activar todavia la operacion de proveedor."
  },
  set_preferences: {
    title: "Configurar preferencias",
    description: "Las preferencias de recordatorios y comunicacion viven en el perfil base."
  },
  add_address: {
    title: "Agregar direccion",
    description: "Las direcciones guardadas pertenecen a la persona usuaria y pueden reutilizarse despues."
  },
  add_payment_method: {
    title: "Agregar metodo de pago",
    description: "Core solo guarda tarjetas; el cobro pertenece a reservas y pagos."
  }
};

export const coreSupportedPaymentMethodTypes = ["card"] as const satisfies readonly PaymentMethodType[];

export const coreMvpBoundaries = {
  savedPaymentsOnly: true,
  paymentCaptureInCore: false,
  householdsInCore: false,
  petsInCore: false
} as const;
