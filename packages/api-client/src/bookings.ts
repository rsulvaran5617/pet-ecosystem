import type {
  BookingDetail,
  BookingPaymentMethodSummary,
  BookingPreview,
  BookingPricingSnapshot,
  BookingStatusChange,
  BookingSummary,
  CreateBookingInput,
  CreateBookingPreviewInput,
  Database,
  ListBookingsFilters,
  ListProviderBookingsFilters,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type BookingsSupabaseClient = SupabaseClient<Database>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type BookingPricingRow = Database["public"]["Tables"]["booking_pricing"]["Row"];
type BookingStatusHistoryRow = Database["public"]["Tables"]["booking_status_history"]["Row"];
type HouseholdRow = Database["public"]["Tables"]["households"]["Row"];
type PaymentMethodRow = Database["public"]["Tables"]["payment_methods"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PreviewBookingRow = Database["public"]["Functions"]["preview_booking"]["Returns"][number];

export interface BookingsApiClient {
  previewBooking(input: CreateBookingPreviewInput): Promise<BookingPreview>;
  createBooking(input: CreateBookingInput): Promise<BookingDetail>;
  listBookings(filters: ListBookingsFilters): Promise<BookingSummary[]>;
  listProviderBookings(filters: ListProviderBookingsFilters): Promise<BookingSummary[]>;
  getBookingDetail(bookingId: Uuid): Promise<BookingDetail>;
  approveBooking(bookingId: Uuid): Promise<BookingDetail>;
  rejectBooking(bookingId: Uuid, reason?: string | null): Promise<BookingDetail>;
  completeBooking(bookingId: Uuid): Promise<BookingDetail>;
  cancelBooking(bookingId: Uuid, reason?: string | null): Promise<BookingDetail>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function mapPaymentMethodSummary(
  row:
    | Pick<PaymentMethodRow, "id" | "brand" | "last_4">
    | { id: string | null; brand: string | null; last_4: string | null }
    | null
): BookingPaymentMethodSummary | null {
  if (!row?.id || !row.brand || !row.last_4) {
    return null;
  }

  return {
    id: row.id,
    brand: row.brand,
    last4: row.last_4
  };
}

function mapBookingPricing(row: BookingPricingRow): BookingPricingSnapshot {
  return {
    id: row.id,
    bookingId: row.booking_id,
    providerServiceId: row.provider_service_id,
    serviceName: row.service_name,
    currencyCode: row.currency_code,
    unitPriceCents: row.unit_price_cents,
    subtotalPriceCents: row.subtotal_price_cents,
    totalPriceCents: row.total_price_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBookingStatusChange(row: BookingStatusHistoryRow): BookingStatusChange {
  return {
    id: row.id,
    bookingId: row.booking_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedByUserId: row.changed_by_user_id,
    changeReason: row.change_reason,
    createdAt: row.created_at
  };
}

function mapPreviewBooking(row: PreviewBookingRow): BookingPreview {
  return {
    householdId: row.household_id,
    petId: row.pet_id,
    providerOrganizationId: row.provider_organization_id,
    providerServiceId: row.provider_service_id,
    selectedPaymentMethodId: row.selected_payment_method_id,
    bookingMode: row.booking_mode,
    statusOnCreate: row.status_on_create,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    cancellationDeadlineAt: row.cancellation_deadline_at,
    cancellationWindowHours: row.cancellation_window_hours,
    currencyCode: row.currency_code,
    unitPriceCents: row.unit_price_cents,
    subtotalPriceCents: row.subtotal_price_cents,
    totalPriceCents: row.total_price_cents,
    householdName: row.household_name,
    petName: row.pet_name,
    providerName: row.provider_name,
    serviceName: row.service_name,
    serviceDurationMinutes: row.service_duration_minutes,
    paymentMethodSummary: mapPaymentMethodSummary({
      id: row.selected_payment_method_id,
      brand: row.payment_method_brand,
      last_4: row.payment_method_last_4
    })
  };
}

async function loadPricingByBookingId(supabase: BookingsSupabaseClient, bookingIds: string[]) {
  if (bookingIds.length === 0) {
    return new Map<string, BookingPricingSnapshot>();
  }

  const { data, error } = await supabase.from("booking_pricing").select("*").in("booking_id", bookingIds);

  if (error) {
    fail(error, "Unable to load booking pricing.");
  }

  return new Map((data ?? []).map((row) => [row.booking_id, mapBookingPricing(row)] as const));
}

async function loadPetNamesById(supabase: BookingsSupabaseClient, petIds: string[]) {
  if (petIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("pets").select("id, name").in("id", petIds);

  if (error) {
    fail(error, "Unable to load booking pet names.");
  }

  return new Map((data ?? []).map((row) => [row.id, row.name] as const));
}

async function loadHouseholdNamesById(supabase: BookingsSupabaseClient, householdIds: string[]) {
  if (householdIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("households").select("id, name").in("id", householdIds);

  if (error) {
    fail(error, "Unable to load booking household names.");
  }

  return new Map((data ?? []).map((row: Pick<HouseholdRow, "id" | "name">) => [row.id, row.name] as const));
}

async function loadProviderNamesById(supabase: BookingsSupabaseClient, providerIds: string[]) {
  if (providerIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("provider_organizations").select("id, name").in("id", providerIds);

  if (error) {
    fail(error, "Unable to load booking provider names.");
  }

  return new Map((data ?? []).map((row) => [row.id, row.name] as const));
}

async function loadCustomerNamesById(supabase: BookingsSupabaseClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", userIds);

  if (error) {
    fail(error, "Unable to load booking customer names.");
  }

  return new Map(
    (data ?? []).map((row: Pick<ProfileRow, "email" | "first_name" | "id" | "last_name">) => {
      const displayName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.email || "Unknown customer";
      return [row.id, displayName] as const;
    })
  );
}

async function loadPaymentMethodSummariesById(supabase: BookingsSupabaseClient, paymentMethodIds: string[]) {
  if (paymentMethodIds.length === 0) {
    return new Map<string, BookingPaymentMethodSummary>();
  }

  const { data, error } = await supabase.from("payment_methods").select("id, brand, last_4").in("id", paymentMethodIds);

  if (error) {
    fail(error, "Unable to load booking payment method summaries.");
  }

  return new Map(
    (data ?? [])
      .map((row) => mapPaymentMethodSummary(row))
      .filter((row): row is BookingPaymentMethodSummary => Boolean(row))
      .map((row) => [row.id, row] as const)
  );
}

function buildBookingSummary(
  bookingRow: BookingRow,
  pricingByBookingId: Map<string, BookingPricingSnapshot>,
  householdNamesById: Map<string, string>,
  customerNamesById: Map<string, string>,
  petNamesById: Map<string, string>,
  providerNamesById: Map<string, string>
): BookingSummary {
  const pricing = pricingByBookingId.get(bookingRow.id);

  if (!pricing) {
    throw new Error(`Missing booking pricing snapshot for booking ${bookingRow.id}.`);
  }

  return {
    id: bookingRow.id,
    householdId: bookingRow.household_id,
    petId: bookingRow.pet_id,
    providerOrganizationId: bookingRow.provider_organization_id,
    providerServiceId: bookingRow.provider_service_id,
    bookedByUserId: bookingRow.booked_by_user_id,
    selectedPaymentMethodId: bookingRow.selected_payment_method_id,
    bookingMode: bookingRow.booking_mode,
    status: bookingRow.status,
    scheduledStartAt: bookingRow.scheduled_start_at,
    scheduledEndAt: bookingRow.scheduled_end_at,
    cancellationDeadlineAt: bookingRow.cancellation_deadline_at,
    cancellationWindowHours: bookingRow.cancellation_window_hours,
    cancelledAt: bookingRow.cancelled_at,
    cancelReason: bookingRow.cancel_reason,
    householdName: householdNamesById.get(bookingRow.household_id) ?? "Unknown household",
    customerDisplayName: customerNamesById.get(bookingRow.booked_by_user_id) ?? "Unknown customer",
    petName: petNamesById.get(bookingRow.pet_id) ?? "Unknown pet",
    providerName: providerNamesById.get(bookingRow.provider_organization_id) ?? "Unknown provider",
    serviceName: pricing.serviceName,
    currencyCode: pricing.currencyCode,
    totalPriceCents: pricing.totalPriceCents,
    createdAt: bookingRow.created_at,
    updatedAt: bookingRow.updated_at
  };
}

async function buildBookingSummaryMap(supabase: BookingsSupabaseClient, bookingRows: BookingRow[]) {
  const bookingIds = bookingRows.map((row) => row.id);
  const householdIds = Array.from(new Set(bookingRows.map((row) => row.household_id)));
  const customerIds = Array.from(new Set(bookingRows.map((row) => row.booked_by_user_id)));
  const petIds = Array.from(new Set(bookingRows.map((row) => row.pet_id)));
  const providerIds = Array.from(new Set(bookingRows.map((row) => row.provider_organization_id)));
  const [pricingByBookingId, householdNamesById, customerNamesById, petNamesById, providerNamesById] = await Promise.all([
    loadPricingByBookingId(supabase, bookingIds),
    loadHouseholdNamesById(supabase, householdIds),
    loadCustomerNamesById(supabase, customerIds),
    loadPetNamesById(supabase, petIds),
    loadProviderNamesById(supabase, providerIds)
  ]);

  return new Map(
    bookingRows.map(
      (row) =>
        [row.id, buildBookingSummary(row, pricingByBookingId, householdNamesById, customerNamesById, petNamesById, providerNamesById)] as const
    )
  );
}

async function buildBookingDetail(supabase: BookingsSupabaseClient, bookingRow: BookingRow): Promise<BookingDetail> {
  const bookingSummaryMap = await buildBookingSummaryMap(supabase, [bookingRow]);
  const summary = bookingSummaryMap.get(bookingRow.id);

  if (!summary) {
    throw new Error(`Missing booking summary for booking ${bookingRow.id}.`);
  }

  const [{ data: pricingRow, error: pricingError }, { data: statusRows, error: statusError }, paymentMethodsById] =
    await Promise.all([
      supabase.from("booking_pricing").select("*").eq("booking_id", bookingRow.id).single(),
      supabase.from("booking_status_history").select("*").eq("booking_id", bookingRow.id).order("created_at", { ascending: true }),
      loadPaymentMethodSummariesById(
        supabase,
        bookingRow.selected_payment_method_id ? [bookingRow.selected_payment_method_id] : []
      )
    ]);

  if (pricingError) {
    fail(pricingError, "Unable to load booking pricing detail.");
  }

  if (statusError) {
    fail(statusError, "Unable to load booking status history.");
  }

  return {
    booking: summary,
    pricing: mapBookingPricing(pricingRow),
    statusHistory: (statusRows ?? []).map(mapBookingStatusChange),
    paymentMethodSummary: bookingRow.selected_payment_method_id
      ? paymentMethodsById.get(bookingRow.selected_payment_method_id) ?? null
      : null
  };
}

export function createBookingsApiClient(supabase: BookingsSupabaseClient): BookingsApiClient {
  return {
    async previewBooking(input) {
      const { data, error } = await supabase
        .rpc("preview_booking", {
          target_household_id: input.householdId,
          target_pet_id: input.petId,
          target_provider_organization_id: input.providerId,
          target_provider_service_id: input.serviceId,
          target_payment_method_id: input.paymentMethodId ?? null
        })
        .single();

      if (error) {
        fail(error, "Unable to build the booking preview.");
      }

      return mapPreviewBooking(data);
    },
    async createBooking(input) {
      const { data, error } = await supabase.rpc("create_booking", {
        target_household_id: input.householdId,
        target_pet_id: input.petId,
        target_provider_organization_id: input.providerId,
        target_provider_service_id: input.serviceId,
        target_payment_method_id: input.paymentMethodId ?? null
      });

      if (error) {
        fail(error, "Unable to create the booking.");
      }

      return buildBookingDetail(supabase, data);
    },
    async listBookings(filters) {
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("household_id", filters.householdId)
        .order("scheduled_start_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.petId) {
        query = query.eq("pet_id", filters.petId);
      }

      if (!filters.includeCancelled) {
        query = query.neq("status", "cancelled");
      }

      const { data, error } = await query;

      if (error) {
        fail(error, "Unable to load bookings history.");
      }

      const bookingRows = data ?? [];
      const bookingSummaryMap = await buildBookingSummaryMap(supabase, bookingRows);

      return bookingRows.map((row) => {
        const summary = bookingSummaryMap.get(row.id);

        if (!summary) {
          throw new Error(`Missing booking summary for booking ${row.id}.`);
        }

        return summary;
      });
    },
    async listProviderBookings(filters) {
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("provider_organization_id", filters.organizationId)
        .order("scheduled_start_at", { ascending: true })
        .order("created_at", { ascending: false });

      if (!filters.includeCancelled) {
        query = query.neq("status", "cancelled");
      }

      const { data, error } = await query;

      if (error) {
        fail(error, "Unable to load provider bookings history.");
      }

      const bookingRows = data ?? [];
      const bookingSummaryMap = await buildBookingSummaryMap(supabase, bookingRows);

      return bookingRows.map((row) => {
        const summary = bookingSummaryMap.get(row.id);

        if (!summary) {
          throw new Error(`Missing booking summary for booking ${row.id}.`);
        }

        return summary;
      });
    },
    async getBookingDetail(bookingId) {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).single();

      if (error) {
        fail(error, "No fue posible cargar el detalle de la reserva.");
      }

      return buildBookingDetail(supabase, data);
    },
    async approveBooking(bookingId) {
      const { data, error } = await supabase.rpc("approve_booking", {
        target_booking_id: bookingId
      });

      if (error) {
        fail(error, "Unable to approve the booking.");
      }

      return buildBookingDetail(supabase, data);
    },
    async rejectBooking(bookingId, reason) {
      const { data, error } = await supabase.rpc("reject_booking", {
        target_booking_id: bookingId,
        next_reason: reason ?? null
      });

      if (error) {
        fail(error, "Unable to reject the booking.");
      }

      return buildBookingDetail(supabase, data);
    },
    async completeBooking(bookingId) {
      const { data, error } = await supabase.rpc("complete_booking", {
        target_booking_id: bookingId
      });

      if (error) {
        fail(error, "Unable to complete the booking.");
      }

      return buildBookingDetail(supabase, data);
    },
    async cancelBooking(bookingId, reason) {
      const { data, error } = await supabase.rpc("cancel_booking", {
        target_booking_id: bookingId,
        next_reason: reason ?? null
      });

      if (error) {
        fail(error, "Unable to cancel the booking.");
      }

      return buildBookingDetail(supabase, data);
    }
  };
}
