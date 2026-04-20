import type { HouseholdInvitationStatus, HouseholdPermission } from "@pet/types";

export const householdPermissionLabels: Record<HouseholdPermission, string> = {
  view: "Ver",
  edit: "Editar",
  book: "Reservar",
  pay: "Pagar",
  admin: "Administrar"
};

export const householdInvitationStatusLabels: Record<HouseholdInvitationStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada"
};

export function formatHouseholdPermissions(permissions: HouseholdPermission[]) {
  return permissions.map((permission) => householdPermissionLabels[permission]).join(", ");
}
