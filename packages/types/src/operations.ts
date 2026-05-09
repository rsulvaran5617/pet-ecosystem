import type { TimestampedEntity, Uuid } from "./base";

/**
 * Operation types supported in booking execution workflow
 */
export type BookingOperationType = "check_in" | "check_out";

/**
 * Operational state transitions for a booking
 * - pending: awaiting check-in
 * - checked_in: check-in recorded
 * - checked_out: check-out recorded
 * - evidence_pending: awaiting evidence upload
 * - documented: operation complete with evidence
 */
export type BookingOperationalState =
  | "pending"
  | "checked_in"
  | "checked_out"
  | "evidence_pending"
  | "documented";

/**
 * Check-in event: marks the start of service execution
 */
export interface BookingCheckIn extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  operationType: "check_in";
  createdByUserId: Uuid;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationLabel: string | null;
}

/**
 * Check-out event: marks the end of service execution
 */
export interface BookingCheckOut extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  operationType: "check_out";
  createdByUserId: Uuid;
}

/**
 * Evidence file associated with booking operation
 * Maximum 5 per booking, uploaded after check-out
 */
export interface BookingEvidence extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string | null;
  uploadedByUserId: Uuid;
}

/**
 * Service report card: summary of work performed, implemented in a later slice
 */
export interface BookingReportCard extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  reportText: string;
  createdByUserId: Uuid;
}

/**
 * Internal operation note: provider-to-provider communication
 * Not visible to customer, max 1000 chars per note
 */
export interface BookingOperationNote extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  noteText: string;
  createdByUserId: Uuid;
}

/**
 * Complete timeline of booking operations
 * Used for detail view and audit trail
 */
export interface BookingOperationsTimeline {
  bookingId: Uuid;
  operationalState: BookingOperationalState;
  checkIn: BookingCheckIn | null;
  checkOut: BookingCheckOut | null;
  evidences: BookingEvidence[];
  reportCard: BookingReportCard | null;
  notes: BookingOperationNote[];
}

export type BookingOperationTokenStatus = "active" | "used" | "expired" | "revoked";

/**
 * Plain QR token returned once by the create token RPC.
 * The persistent database row stores only token_hash.
 */
export interface BookingOperationTokenResult {
  token: string;
  tokenPreview: string | null;
  expiresAt: string;
  operationType: BookingOperationType;
  bookingId: Uuid;
}

export interface RevokeBookingOperationTokenResult {
  tokenId: Uuid;
  bookingId: Uuid;
  operationType: BookingOperationType;
  status: BookingOperationTokenStatus;
  revokedAt: string;
}

export interface ConsumeBookingOperationTokenResult {
  success: boolean;
  bookingId: Uuid;
  operationType: BookingOperationType;
  operationId: Uuid;
  usedAt: string;
}

// ============================================================================
// Input types for API operations
// ============================================================================

/**
 * Input for creating a check-in event
 */
export interface CreateCheckInInput {
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationLabel?: string | null;
}

/**
 * Input for uploading evidence file
 * File must be uploaded to Supabase Storage separately
 */
export interface UploadEvidenceInput {
  storageBucket?: string;
  fileName: string;
  fileBytes: ArrayBuffer;
  mimeType?: string | null;
}

/**
 * Input for upsert report card
 */
export interface UpsertReportCardInput {
  reportText: string;
}

/**
 * Input for adding operation note
 */
export interface AddOperationNoteInput {
  noteText: string;
}

/**
 * Filters for listing operational bookings
 */
export interface ListOperationalBookingsFilters {
  organizationId: Uuid;
  operationalState?: BookingOperationalState | null;
  includeCancelled?: boolean;
}
