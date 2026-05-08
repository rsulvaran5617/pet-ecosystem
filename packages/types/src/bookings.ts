import type { IsoDateString, TimestampedEntity, Uuid } from "./base";

export type BookingMode = "instant" | "approval_required";
export type BookingStatus = "pending_approval" | "confirmed" | "completed" | "cancelled";
export type BookingSlotStatus = "available" | "low_capacity" | "full" | "unavailable" | "expired";

export interface BookingPaymentMethodSummary {
  id: Uuid;
  brand: string;
  last4: string;
}

export interface BookingPreview {
  householdId: Uuid;
  petId: Uuid;
  providerOrganizationId: Uuid;
  providerServiceId: Uuid;
  selectedPaymentMethodId: Uuid | null;
  bookingMode: BookingMode;
  statusOnCreate: BookingStatus;
  scheduledStartAt: IsoDateString;
  scheduledEndAt: IsoDateString;
  cancellationDeadlineAt: IsoDateString;
  cancellationWindowHours: number;
  currencyCode: string;
  unitPriceCents: number;
  subtotalPriceCents: number;
  totalPriceCents: number;
  householdName: string;
  petName: string;
  providerName: string;
  serviceName: string;
  serviceDurationMinutes: number | null;
  paymentMethodSummary: BookingPaymentMethodSummary | null;
}

export interface BookingPricingSnapshot extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  providerServiceId: Uuid;
  serviceName: string;
  currencyCode: string;
  unitPriceCents: number;
  subtotalPriceCents: number;
  totalPriceCents: number;
}

export interface BookingStatusChange {
  id: Uuid;
  bookingId: Uuid;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  changedByUserId: Uuid;
  changeReason: string | null;
  createdAt: IsoDateString;
}

export interface BookingSummary extends TimestampedEntity {
  id: Uuid;
  householdId: Uuid;
  petId: Uuid;
  providerOrganizationId: Uuid;
  providerServiceId: Uuid;
  bookedByUserId: Uuid;
  selectedPaymentMethodId: Uuid | null;
  bookingMode: BookingMode;
  status: BookingStatus;
  scheduledStartAt: IsoDateString;
  scheduledEndAt: IsoDateString;
  cancellationDeadlineAt: IsoDateString;
  cancellationWindowHours: number;
  availabilityRuleId: Uuid | null;
  slotStartAt: IsoDateString | null;
  slotEndAt: IsoDateString | null;
  cancelledAt: IsoDateString | null;
  cancelReason: string | null;
  householdName: string;
  customerDisplayName: string;
  petName: string;
  providerName: string;
  serviceName: string;
  currencyCode: string;
  totalPriceCents: number;
}

export interface BookingDetail {
  booking: BookingSummary;
  pricing: BookingPricingSnapshot;
  statusHistory: BookingStatusChange[];
  paymentMethodSummary: BookingPaymentMethodSummary | null;
}

export interface CreateBookingPreviewInput {
  householdId: Uuid;
  petId: Uuid;
  providerId: Uuid;
  serviceId: Uuid;
  paymentMethodId?: Uuid | null;
}

export type CreateBookingInput = CreateBookingPreviewInput;

export interface BookingSlot {
  availabilityRuleId: Uuid;
  organizationId: Uuid;
  serviceId: Uuid;
  slotDate: string;
  slotStartAt: IsoDateString;
  slotEndAt: IsoDateString;
  capacityTotal: number;
  reservedCount: number;
  availableCount: number;
  status: BookingSlotStatus;
}

export interface ListBookingSlotsInput {
  serviceId: Uuid;
  fromDate: string;
  toDate: string;
}

export interface CreateBookingFromSlotInput {
  householdId: Uuid;
  petId: Uuid;
  serviceId: Uuid;
  availabilityRuleId: Uuid;
  slotStartAt: IsoDateString;
  slotEndAt: IsoDateString;
  paymentMethodId?: Uuid | null;
}

export interface CancelBookingInput {
  reason?: string | null;
}

export interface ListBookingsFilters {
  householdId: Uuid;
  petId?: Uuid | null;
  includeCancelled?: boolean;
}

export interface ListProviderBookingsFilters {
  organizationId: Uuid;
  includeCancelled?: boolean;
}
