import type { BookingDetail, BookingSummary, ProviderOrganization, ProviderOrganizationDetail, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getMobileBookingsApiClient, getMobileProvidersApiClient } from "../../core/services/supabase-mobile";

interface UseProvidersWorkspaceResult {
  organizations: ProviderOrganization[];
  selectedOrganizationId: Uuid | null;
  selectedOrganizationDetail: ProviderOrganizationDetail | null;
  providerBookings: BookingSummary[];
  selectedProviderBookingDetail: BookingDetail | null;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  selectOrganization: (organizationId: Uuid) => Promise<void>;
  openProviderBookingDetail: (bookingId: Uuid) => Promise<void>;
  approveProviderBooking: (bookingId: Uuid) => Promise<void>;
  rejectProviderBooking: (bookingId: Uuid, reason?: string | null) => Promise<void>;
  completeProviderBooking: (bookingId: Uuid) => Promise<void>;
  refresh: (preferredOrganizationId?: Uuid | null) => Promise<void>;
  runAction: <T>(action: () => Promise<T>, successMessage?: string) => Promise<T>;
}

export function useProvidersWorkspace(enabled: boolean): UseProvidersWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedOrganizationIdRef = useRef<Uuid | null>(null);
  const selectedBookingIdRef = useRef<Uuid | null>(null);
  const [organizations, setOrganizations] = useState<ProviderOrganization[]>([]);
  const [selectedOrganizationDetail, setSelectedOrganizationDetail] = useState<ProviderOrganizationDetail | null>(null);
  const [providerBookings, setProviderBookings] = useState<BookingSummary[]>([]);
  const [selectedProviderBookingDetail, setSelectedProviderBookingDetail] = useState<BookingDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadProviderBookingDetail(bookingId: Uuid) {
    const detail = await getMobileBookingsApiClient().getBookingDetail(bookingId);

    if (!mountedRef.current) {
      return detail;
    }

    selectedBookingIdRef.current = detail.booking.id;
    setSelectedProviderBookingDetail(detail);

    return detail;
  }

  async function loadOrganizationDetail(organizationId: Uuid) {
    const [detail, bookings] = await Promise.all([
      getMobileProvidersApiClient().getProviderOrganizationDetail(organizationId),
      getMobileBookingsApiClient().listProviderBookings({
        organizationId,
        includeCancelled: true
      })
    ]);

    if (!mountedRef.current) {
      return detail;
    }

    selectedOrganizationIdRef.current = detail.organization.id;
    setSelectedOrganizationDetail(detail);
    setProviderBookings(bookings);

    const persistedBookingId =
      bookings.find((booking) => booking.id === selectedBookingIdRef.current)?.id ??
      bookings.find((booking) => booking.status === "pending_approval")?.id ??
      bookings[0]?.id ??
      null;

    if (!persistedBookingId) {
      selectedBookingIdRef.current = null;
      setSelectedProviderBookingDetail(null);
      return detail;
    }

    await loadProviderBookingDetail(persistedBookingId);

    return detail;
  }

  async function refresh(preferredOrganizationId?: Uuid | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setOrganizations([]);
        setSelectedOrganizationDetail(null);
        setProviderBookings([]);
        setSelectedProviderBookingDetail(null);
        selectedOrganizationIdRef.current = null;
        selectedBookingIdRef.current = null;
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const nextOrganizations = await getMobileProvidersApiClient().listMyProviderOrganizations();

      if (!mountedRef.current) {
        return;
      }

      setOrganizations(nextOrganizations);

      const targetOrganizationId = preferredOrganizationId ?? selectedOrganizationIdRef.current ?? nextOrganizations[0]?.id ?? null;

      if (!targetOrganizationId) {
        selectedOrganizationIdRef.current = null;
        setSelectedOrganizationDetail(null);
        return;
      }

      await loadOrganizationDetail(targetOrganizationId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load provider organizations.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function runAction<T>(action: () => Promise<T>, successMessage?: string) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await action();

      if (mountedRef.current) {
        setInfoMessage(successMessage ?? null);
      }

      return result;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Provider action failed.");
      }

      throw error;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [enabled]);

  return {
    organizations,
    selectedOrganizationId: selectedOrganizationIdRef.current,
    selectedOrganizationDetail,
    providerBookings,
    selectedProviderBookingDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    async selectOrganization(organizationId) {
      setErrorMessage(null);
      setInfoMessage(null);
      setIsLoading(true);
      selectedBookingIdRef.current = null;
      setSelectedProviderBookingDetail(null);

      try {
        await loadOrganizationDetail(organizationId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the provider organization.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    async openProviderBookingDetail(bookingId) {
      setErrorMessage(null);
      setInfoMessage(null);
      setIsSubmitting(true);

      try {
        const detail = await loadProviderBookingDetail(bookingId);

        if (mountedRef.current) {
          setInfoMessage(`Booking detail loaded for ${detail.booking.serviceName}.`);
        }
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the provider booking detail.");
        }
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    async approveProviderBooking(bookingId) {
      await runAction(async () => {
        const detail = await getMobileBookingsApiClient().approveBooking(bookingId);
        selectedBookingIdRef.current = detail.booking.id;

        if (mountedRef.current) {
          setSelectedProviderBookingDetail(detail);
        }

        await refresh(selectedOrganizationIdRef.current);
        return detail;
      }, "Booking approved.");
    },
    async rejectProviderBooking(bookingId, reason) {
      await runAction(async () => {
        const detail = await getMobileBookingsApiClient().rejectBooking(bookingId, reason);
        selectedBookingIdRef.current = detail.booking.id;

        if (mountedRef.current) {
          setSelectedProviderBookingDetail(detail);
        }

        await refresh(selectedOrganizationIdRef.current);
        return detail;
      }, "Booking rejected.");
    },
    async completeProviderBooking(bookingId) {
      await runAction(async () => {
        const detail = await getMobileBookingsApiClient().completeBooking(bookingId);
        selectedBookingIdRef.current = detail.booking.id;

        if (mountedRef.current) {
          setSelectedProviderBookingDetail(detail);
        }

        await refresh(selectedOrganizationIdRef.current);
        return detail;
      }, "Booking completed.");
    },
    refresh,
    runAction
  };
}
