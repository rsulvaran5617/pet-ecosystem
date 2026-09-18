import type { BookingMode, BookingStatus, BookingSummary } from "@pet/types";

export const bookingModeLabels: Record<BookingMode, string> = {
  instant: "Reserva inmediata",
  approval_required: "Requiere aprobacion"
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending_approval: "Pendiente de aprobacion",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  expired: "Expirada sin aprobacion"
};

export const bookingMvpBoundaries = {
  supportsSavedPaymentMethodReferenceOnly: true,
  supportsPaymentCapture: false,
  supportsReschedule: false,
  supportsRebook: false
} as const;

export type BookingDisplayStatus = BookingStatus | "pending_closure";
export const bookingDisplayStatusLabels: Record<BookingDisplayStatus, string> = {
  ...bookingStatusLabels,
  pending_closure: "Pendiente de cierre"
};

// Presentation only: the database owns persisted transitions and approval deadlines.
export function getBookingDisplayStatus(booking: Pick<BookingSummary, "status" | "scheduledStartAt" | "scheduledEndAt">, now = Date.now()): BookingDisplayStatus {
  if (booking.status === "pending_approval" && Date.parse(booking.scheduledStartAt) <= now) return "expired";
  if (booking.status === "confirmed" && Date.parse(booking.scheduledEndAt) <= now) return "pending_closure";
  return booking.status;
}

export function isUpcomingBooking(booking: Pick<BookingSummary, "status" | "scheduledStartAt" | "scheduledEndAt">, now = Date.now()) {
  const status = getBookingDisplayStatus(booking, now);
  return status === "pending_approval" || status === "confirmed";
}

export function getBookingClosureLabel(timeline: { checkIn: unknown; checkOut: unknown }) {
  if (timeline.checkOut) return "Finalizacion pendiente";
  if (timeline.checkIn) return "Cierre de atencion pendiente";
  return "Pendiente de cierre: sin llegada registrada";
}
