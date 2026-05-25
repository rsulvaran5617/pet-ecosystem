"use client";

import type { BookingDetail, BookingStatus, BookingSummary, ProviderOrganization, ProviderOrganizationDetail, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getBrowserBookingsApiClient, getBrowserMessagingApiClient, getBrowserProvidersApiClient } from "../../core/services/supabase-browser";

export interface ProviderMoneyIndicator {
  bookingCount: number;
  totalsByCurrency: Record<string, number>;
}

export interface ProviderBusinessOverview {
  organization: ProviderOrganization;
  bookingCounts: Record<BookingStatus, number>;
  moneyIndicators: {
    completed: ProviderMoneyIndicator;
    pendingService: ProviderMoneyIndicator;
    providerCancelled: ProviderMoneyIndicator;
  };
  pendingApprovalBookings: BookingSummary[];
  messageThreadCount: number;
  hasPublicProfile: boolean;
  hasService: boolean;
  hasAvailability: boolean;
  hasDocuments: boolean;
  hasPublicLocation: boolean;
  serviceCount: number;
  activeServiceCount: number;
  availabilityRuleCount: number;
  documentCount: number;
  isMarketplaceVisible: boolean;
}

interface UseProvidersWorkspaceResult {
  organizations: ProviderOrganization[];
  businessOverviews: ProviderBusinessOverview[];
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
  const [businessOverviews, setBusinessOverviews] = useState<ProviderBusinessOverview[]>([]);
  const [selectedOrganizationDetail, setSelectedOrganizationDetail] = useState<ProviderOrganizationDetail | null>(null);
  const [providerBookings, setProviderBookings] = useState<BookingSummary[]>([]);
  const [selectedProviderBookingDetail, setSelectedProviderBookingDetail] = useState<BookingDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function createMoneyIndicator(): ProviderMoneyIndicator {
    return {
      bookingCount: 0,
      totalsByCurrency: {}
    };
  }

  function addBookingToMoneyIndicator(indicator: ProviderMoneyIndicator, booking: BookingSummary) {
    indicator.bookingCount += 1;
    indicator.totalsByCurrency[booking.currencyCode] = (indicator.totalsByCurrency[booking.currencyCode] ?? 0) + booking.totalPriceCents;
  }

  function isProviderCancelledBooking(booking: BookingSummary) {
    const reason = booking.cancelReason?.toLowerCase() ?? "";

    return (
      booking.status === "cancelled" &&
      (reason.includes("provider") ||
        reason.includes("proveedor") ||
        reason.includes("rechazada") ||
        reason.includes("declined by provider"))
    );
  }

  async function loadProviderBookingDetail(bookingId: Uuid) {
    const detail = await getBrowserBookingsApiClient().getBookingDetail(bookingId);

    if (!mountedRef.current) {
      return detail;
    }

    selectedBookingIdRef.current = detail.booking.id;
    setSelectedProviderBookingDetail(detail);

    return detail;
  }

  async function loadOrganizationDetail(organizationId: Uuid) {
    const [detail, bookings] = await Promise.all([
      getBrowserProvidersApiClient().getProviderOrganizationDetail(organizationId),
      getBrowserBookingsApiClient().listProviderBookings({
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

  async function loadBusinessOverviews(nextOrganizations: ProviderOrganization[]) {
    const threads = await getBrowserMessagingApiClient().listThreads();
    const overviews: ProviderBusinessOverview[] = [];

    for (const organization of nextOrganizations) {
      const detail = await getBrowserProvidersApiClient().getProviderOrganizationDetail(organization.id);
      const bookings = await getBrowserBookingsApiClient().listProviderBookings({
        organizationId: organization.id,
        includeCancelled: true
      });
      const bookingCounts = bookings.reduce<Record<BookingStatus, number>>(
        (counts, booking) => {
          counts[booking.status] += 1;
          return counts;
        },
        {
          pending_approval: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0
        }
      );
      const moneyIndicators = {
        completed: createMoneyIndicator(),
        pendingService: createMoneyIndicator(),
        providerCancelled: createMoneyIndicator()
      };

      bookings.forEach((booking) => {
        if (booking.status === "completed") {
          addBookingToMoneyIndicator(moneyIndicators.completed, booking);
        }

        if (booking.status === "pending_approval" || booking.status === "confirmed") {
          addBookingToMoneyIndicator(moneyIndicators.pendingService, booking);
        }

        if (isProviderCancelledBooking(booking)) {
          addBookingToMoneyIndicator(moneyIndicators.providerCancelled, booking);
        }
      });
      const hasPublicProfile = Boolean(detail.publicProfile);
      const hasService = detail.services.some((service) => service.isPublic && service.isActive);
      const hasAvailability = detail.availability.length > 0 || detail.availabilityRules.some((rule) => rule.isActive);
      const hasDocuments = detail.approvalDocuments.length > 0;
      const hasPublicLocation = Boolean(detail.publicLocation?.isPublic);
      const isMarketplaceVisible =
        detail.organization.approvalStatus === "approved" &&
        detail.organization.isPublic &&
        Boolean(detail.publicProfile?.isPublic) &&
        hasService;

      overviews.push({
        organization: detail.organization,
        bookingCounts,
        moneyIndicators,
        pendingApprovalBookings: bookings.filter((booking) => booking.status === "pending_approval"),
        messageThreadCount: threads.filter((thread) => thread.providerOrganizationId === detail.organization.id && thread.lastMessageAt).length,
        hasPublicProfile,
        hasService,
        hasAvailability,
        hasDocuments,
        hasPublicLocation,
        serviceCount: detail.services.length,
        activeServiceCount: detail.services.filter((service) => service.isActive).length,
        availabilityRuleCount: detail.availabilityRules.length,
        documentCount: detail.approvalDocuments.length,
        isMarketplaceVisible
      });
    }

    return overviews;
  }

  async function refresh(preferredOrganizationId?: Uuid | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setOrganizations([]);
        setBusinessOverviews([]);
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
      const nextOrganizations = await getBrowserProvidersApiClient().listMyProviderOrganizations();

      if (!mountedRef.current) {
        return;
      }

      setOrganizations(nextOrganizations);
      setBusinessOverviews(await loadBusinessOverviews(nextOrganizations));

      const targetOrganizationId = preferredOrganizationId ?? selectedOrganizationIdRef.current ?? nextOrganizations[0]?.id ?? null;

      if (!targetOrganizationId) {
          selectedOrganizationIdRef.current = null;
          setSelectedOrganizationDetail(null);
          setBusinessOverviews([]);
          return;
      }

      await loadOrganizationDetail(targetOrganizationId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar las organizaciones de proveedores.");
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
        setErrorMessage(error instanceof Error ? error.message : "La accion del proveedor fallo.");
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
    businessOverviews,
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
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar la organizacion del proveedor.");
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
          setInfoMessage(`Detalle de la reserva cargado para ${detail.booking.serviceName}.`);
        }
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar el detalle de la reserva del proveedor.");
        }
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    async approveProviderBooking(bookingId) {
      await runAction(async () => {
        const detail = await getBrowserBookingsApiClient().approveBooking(bookingId);
        selectedBookingIdRef.current = detail.booking.id;

        if (mountedRef.current) {
          setSelectedProviderBookingDetail(detail);
        }

        await refresh(selectedOrganizationIdRef.current);
        return detail;
      }, "Reserva aprobada.");
    },
    async rejectProviderBooking(bookingId, reason) {
      await runAction(async () => {
        const detail = await getBrowserBookingsApiClient().rejectBooking(bookingId, reason);
        selectedBookingIdRef.current = detail.booking.id;

        if (mountedRef.current) {
          setSelectedProviderBookingDetail(detail);
        }

        await refresh(selectedOrganizationIdRef.current);
        return detail;
      }, "Reserva rechazada.");
    },
    async completeProviderBooking(bookingId) {
      await runAction(async () => {
        const detail = await getBrowserBookingsApiClient().completeBooking(bookingId);
        selectedBookingIdRef.current = detail.booking.id;

        if (mountedRef.current) {
          setSelectedProviderBookingDetail(detail);
        }

        await refresh(selectedOrganizationIdRef.current);
        return detail;
      }, "Reserva completada.");
    },
    refresh,
    runAction
  };
}

