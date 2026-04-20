import type { BookingMode, BookingStatus } from "@pet/types";

export const bookingModeLabels: Record<BookingMode, string> = {
  instant: "Reserva inmediata",
  approval_required: "Requiere aprobacion"
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending_approval: "Pendiente de aprobacion",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada"
};

export const bookingMvpBoundaries = {
  supportsSavedPaymentMethodReferenceOnly: true,
  supportsPaymentCapture: false,
  supportsReschedule: false,
  supportsRebook: false
} as const;
