import type { BookingMode, BookingStatus } from "@pet/types";

export const bookingModeLabels: Record<BookingMode, string> = {
  instant: "Instant booking",
  approval_required: "Needs approval"
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending_approval: "Pending approval",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled"
};

export const bookingMvpBoundaries = {
  supportsSavedPaymentMethodReferenceOnly: true,
  supportsPaymentCapture: false,
  supportsReschedule: false,
  supportsRebook: false
} as const;
