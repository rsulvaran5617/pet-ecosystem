import type {
  BookingDetail,
  BookingPreview,
  BookingSlot,
  BookingSummary,
  HouseholdsSnapshot,
  MarketplaceServiceSelection,
  PetSummary,
  UserPaymentMethod,
  Uuid
} from "@pet/types";
import { useEffect, useRef, useState } from "react";

import {
  getMobileBookingsApiClient,
  getMobileCoreApiClient,
  getMobileHouseholdsApiClient,
  getMobilePetsApiClient
} from "../../core/services/supabase-mobile";

interface UseBookingsWorkspaceResult {
  householdSnapshot: HouseholdsSnapshot | null;
  pets: PetSummary[];
  paymentMethods: UserPaymentMethod[];
  bookings: BookingSummary[];
  activeSelection: MarketplaceServiceSelection | null;
  preview: BookingPreview | null;
  selectedBookingDetail: BookingDetail | null;
  selectedHouseholdId: Uuid | null;
  selectedPetId: Uuid | null;
  selectedPaymentMethodId: Uuid | null;
  bookingSlots: BookingSlot[];
  selectedBookingSlot: BookingSlot | null;
  selectedSlotDate: string | null;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isLoadingSlots: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  clearSelection: () => void;
  selectHousehold: (householdId: Uuid) => Promise<void>;
  selectPet: (petId: Uuid | null) => Promise<void>;
  selectPaymentMethod: (paymentMethodId: Uuid | null) => void;
  loadBookingSlots: () => Promise<BookingSlot[]>;
  selectSlotDate: (slotDate: string) => void;
  selectBookingSlot: (slot: BookingSlot | null) => void;
  buildPreview: () => Promise<BookingPreview>;
  createBooking: () => Promise<BookingDetail>;
  openBookingDetail: (bookingId: Uuid) => Promise<void>;
  cancelBooking: (bookingId: Uuid, reason?: string | null) => Promise<void>;
  refresh: (selectionOverride?: MarketplaceServiceSelection | null) => Promise<void>;
}

export function useBookingsWorkspace(
  enabled: boolean,
  incomingSelection: MarketplaceServiceSelection | null
): UseBookingsWorkspaceResult {
  const mountedRef = useRef(true);
  const activeSelectionRef = useRef<MarketplaceServiceSelection | null>(incomingSelection);
  const selectedHouseholdIdRef = useRef<Uuid | null>(incomingSelection?.householdId ?? null);
  const selectedPetIdRef = useRef<Uuid | null>(incomingSelection?.petId ?? null);
  const selectedPaymentMethodIdRef = useRef<Uuid | null>(null);
  const selectedBookingSlotRef = useRef<BookingSlot | null>(null);
  const [householdSnapshot, setHouseholdSnapshot] = useState<HouseholdsSnapshot | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [activeSelection, setActiveSelection] = useState<MarketplaceServiceSelection | null>(incomingSelection);
  const [preview, setPreview] = useState<BookingPreview | null>(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<BookingDetail | null>(null);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(incomingSelection?.householdId ?? null);
  const [selectedPetId, setSelectedPetId] = useState<Uuid | null>(incomingSelection?.petId ?? null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<Uuid | null>(null);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<BookingSlot | null>(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function formatDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function resetSlotSelection() {
    selectedBookingSlotRef.current = null;
    setSelectedBookingSlot(null);
  }

  function getActionErrorMessage(error: unknown, fallbackMessage: string) {
    if (error instanceof Error && error.message === "Selected slot is no longer available") {
      return "Este horario acaba de llenarse. Elige otro.";
    }

    return error instanceof Error ? error.message : fallbackMessage;
  }

  async function loadBookings(householdId: Uuid | null, petId: Uuid | null) {
    if (!householdId) {
      if (mountedRef.current) {
        setBookings([]);
        setSelectedBookingDetail(null);
      }

      return;
    }

    const nextBookings = await getMobileBookingsApiClient().listBookings({
      householdId,
      petId,
      includeCancelled: true
    });

    if (!mountedRef.current) {
      return;
    }

    setBookings(nextBookings);
  }

  async function loadPets(householdId: Uuid | null, preferredPetId: Uuid | null) {
    if (!householdId) {
      if (mountedRef.current) {
        setPets([]);
        setSelectedPetId(null);
        selectedPetIdRef.current = null;
        setBookings([]);
        setSelectedBookingDetail(null);
      }

      return;
    }

    const nextPets = await getMobilePetsApiClient().listHouseholdPets(householdId);

    if (!mountedRef.current) {
      return;
    }

    setPets(nextPets);

    const nextSelectedPetId =
      nextPets.find((pet) => pet.id === preferredPetId)?.id ??
      nextPets.find((pet) => pet.id === activeSelectionRef.current?.petId)?.id ??
      null;

    selectedPetIdRef.current = nextSelectedPetId;
    setSelectedPetId(nextSelectedPetId);
    await loadBookings(householdId, nextSelectedPetId);
  }

  async function refresh(selectionOverride?: MarketplaceServiceSelection | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setHouseholdSnapshot(null);
        setPets([]);
        setPaymentMethods([]);
        setBookings([]);
        setPreview(null);
        setSelectedBookingDetail(null);
        setActiveSelection(null);
        setSelectedHouseholdId(null);
        setSelectedPetId(null);
        setSelectedPaymentMethodId(null);
        setBookingSlots([]);
        setSelectedSlotDate(null);
        resetSlotSelection();
        activeSelectionRef.current = null;
        selectedHouseholdIdRef.current = null;
        selectedPetIdRef.current = null;
        selectedPaymentMethodIdRef.current = null;
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const [nextHouseholdSnapshot, nextCoreSnapshot] = await Promise.all([
        getMobileHouseholdsApiClient().getHouseholdsSnapshot(),
        getMobileCoreApiClient().getCoreSnapshot()
      ]);

      if (!mountedRef.current) {
        return;
      }

      const effectiveSelection = selectionOverride ?? activeSelectionRef.current;
      const nextSelectedHouseholdId =
        nextHouseholdSnapshot.households.find((household) => household.id === effectiveSelection?.householdId)?.id ??
        nextHouseholdSnapshot.households.find((household) => household.id === selectedHouseholdIdRef.current)?.id ??
        nextHouseholdSnapshot.households[0]?.id ??
        null;

      const nextSelectedPaymentMethodId =
        nextCoreSnapshot.paymentMethods.find((paymentMethod) => paymentMethod.id === selectedPaymentMethodIdRef.current)?.id ??
        nextCoreSnapshot.paymentMethods.find((paymentMethod) => paymentMethod.isDefault)?.id ??
        nextCoreSnapshot.paymentMethods[0]?.id ??
        null;

      setHouseholdSnapshot(nextHouseholdSnapshot);
      setPaymentMethods(nextCoreSnapshot.paymentMethods);
      selectedHouseholdIdRef.current = nextSelectedHouseholdId;
      selectedPaymentMethodIdRef.current = nextSelectedPaymentMethodId;
      setSelectedHouseholdId(nextSelectedHouseholdId);
      setSelectedPaymentMethodId(nextSelectedPaymentMethodId);
      await loadPets(nextSelectedHouseholdId, effectiveSelection?.petId ?? selectedPetIdRef.current);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible actualizar el espacio de reservas.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function runAction<T>(action: () => Promise<T>, successMessage?: string, refreshAfter = true) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await action();

      if (refreshAfter) {
        await loadBookings(selectedHouseholdIdRef.current, selectedPetIdRef.current);
      }

      if (mountedRef.current) {
        setInfoMessage(successMessage ?? null);
      }

      return result;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(getActionErrorMessage(error, "La accion de reservas fallo."));
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

  useEffect(() => {
    if (!enabled || !incomingSelection) {
      return;
    }

    activeSelectionRef.current = incomingSelection;
    selectedHouseholdIdRef.current = incomingSelection.householdId ?? selectedHouseholdIdRef.current;
    selectedPetIdRef.current = incomingSelection.petId ?? null;
    setActiveSelection(incomingSelection);
    setPreview(null);
    setSelectedBookingDetail(null);
    setBookingSlots([]);
    setSelectedSlotDate(null);
    resetSlotSelection();
    setInfoMessage("Seleccion de servicio importada desde Servicios. Revisa hogar, mascota y metodo de pago antes de generar la vista previa.");
    setErrorMessage(null);
    void refresh(incomingSelection);
  }, [enabled, incomingSelection?.selectedAt]);

  return {
    householdSnapshot,
    pets,
    paymentMethods,
    bookings,
    activeSelection,
    preview,
    selectedBookingDetail,
    selectedHouseholdId,
    selectedPetId,
    selectedPaymentMethodId,
    bookingSlots,
    selectedBookingSlot,
    selectedSlotDate,
    errorMessage,
    infoMessage,
    isLoading,
    isLoadingSlots,
    isSubmitting,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    clearSelection() {
      activeSelectionRef.current = null;
      setActiveSelection(null);
      setPreview(null);
      setBookingSlots([]);
      setSelectedSlotDate(null);
      resetSlotSelection();
      setInfoMessage("Seleccion de servicio limpiada. Puedes buscar un nuevo servicio cuando quieras preparar otra reserva.");
    },
    async selectHousehold(householdId) {
      selectedHouseholdIdRef.current = householdId;
      selectedPetIdRef.current = null;
      setSelectedHouseholdId(householdId);
      setPreview(null);
      resetSlotSelection();
      setIsLoading(true);

      try {
        await loadPets(householdId, null);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar las reservas del hogar seleccionado.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    async selectPet(petId) {
      selectedPetIdRef.current = petId;
      setSelectedPetId(petId);
      setPreview(null);
      resetSlotSelection();
      setIsLoading(true);

      try {
        await loadBookings(selectedHouseholdIdRef.current, petId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible filtrar las reservas por mascota.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    selectPaymentMethod(paymentMethodId) {
      selectedPaymentMethodIdRef.current = paymentMethodId;
      setSelectedPaymentMethodId(paymentMethodId);
      setPreview(null);
    },
    async loadBookingSlots() {
      if (!activeSelectionRef.current) {
        throw new Error("Selecciona un servicio antes de consultar horarios.");
      }

      setIsLoadingSlots(true);
      setErrorMessage(null);

      try {
        const from = new Date();
        const to = new Date(from);
        to.setDate(to.getDate() + 21);
        const slots = await getMobileBookingsApiClient().listBookingSlots({
          serviceId: activeSelectionRef.current.serviceId,
          fromDate: formatDateOnly(from),
          toDate: formatDateOnly(to)
        });

        if (mountedRef.current) {
          setBookingSlots(slots);
          const firstAvailableSlot =
            slots.find((slot) => slot.status === "available" || slot.status === "low_capacity") ?? slots[0] ?? null;
          setSelectedSlotDate(firstAvailableSlot?.slotDate ?? formatDateOnly(from));
          selectedBookingSlotRef.current = null;
          setSelectedBookingSlot(null);
        }

        return slots;
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar los horarios disponibles.");
        }

        throw error;
      } finally {
        if (mountedRef.current) {
          setIsLoadingSlots(false);
        }
      }
    },
    selectSlotDate(slotDate) {
      setSelectedSlotDate(slotDate);
      resetSlotSelection();
    },
    selectBookingSlot(slot) {
      selectedBookingSlotRef.current = slot;
      setSelectedBookingSlot(slot);
      setPreview(null);
    },
    async buildPreview() {
      if (!activeSelectionRef.current) {
        throw new Error("Selecciona un servicio del marketplace antes de generar la vista previa de la reserva.");
      }

      if (!selectedHouseholdIdRef.current) {
        throw new Error("Elige un hogar antes de continuar con la vista previa de la reserva.");
      }

      if (!selectedPetIdRef.current) {
        throw new Error("Elige una mascota antes de continuar con la vista previa de la reserva.");
      }

      return runAction(
        async () => {
          const nextPreview = await getMobileBookingsApiClient().previewBooking({
            householdId: selectedHouseholdIdRef.current!,
            petId: selectedPetIdRef.current!,
            providerId: activeSelectionRef.current!.providerId,
            serviceId: activeSelectionRef.current!.serviceId,
            paymentMethodId: selectedPaymentMethodIdRef.current
          });

          if (mountedRef.current) {
            setPreview(nextPreview);
            setSelectedBookingDetail(null);
          }

          return nextPreview;
        },
        "Vista previa de la reserva lista.",
        false
      );
    },
    async createBooking() {
      if (!activeSelectionRef.current) {
        throw new Error("Selecciona un servicio del marketplace antes de crear una reserva.");
      }

      if (!selectedHouseholdIdRef.current || !selectedPetIdRef.current) {
        throw new Error("Se requieren hogar y mascota para crear una reserva.");
      }

      return runAction(async () => {
        const selectedSlot = selectedBookingSlotRef.current;
        const detail = selectedSlot
          ? await getMobileBookingsApiClient().createBookingFromSlot({
              householdId: selectedHouseholdIdRef.current!,
              petId: selectedPetIdRef.current!,
              serviceId: activeSelectionRef.current!.serviceId,
              availabilityRuleId: selectedSlot.availabilityRuleId,
              slotStartAt: selectedSlot.slotStartAt,
              slotEndAt: selectedSlot.slotEndAt,
              paymentMethodId: selectedPaymentMethodIdRef.current
            })
          : await getMobileBookingsApiClient().createBooking({
              householdId: selectedHouseholdIdRef.current!,
              petId: selectedPetIdRef.current!,
              providerId: activeSelectionRef.current!.providerId,
              serviceId: activeSelectionRef.current!.serviceId,
              paymentMethodId: selectedPaymentMethodIdRef.current
            });

        activeSelectionRef.current = null;
        selectedBookingSlotRef.current = null;

        if (mountedRef.current) {
          setActiveSelection(null);
          setPreview(null);
          setBookingSlots([]);
          setSelectedBookingSlot(null);
          setSelectedSlotDate(null);
          setSelectedBookingDetail(detail);
        }

        return detail;
    }, "Reserva creada.");
    },
    async openBookingDetail(bookingId) {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const detail = await getMobileBookingsApiClient().getBookingDetail(bookingId);

        if (mountedRef.current) {
          setSelectedBookingDetail(detail);
          setInfoMessage(`Detalle de la reserva cargado para ${detail.booking.serviceName}.`);
        }
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar el detalle de la reserva.");
        }
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    async cancelBooking(bookingId, reason) {
      await runAction(async () => {
        const detail = await getMobileBookingsApiClient().cancelBooking(bookingId, reason);

        if (mountedRef.current) {
          setSelectedBookingDetail(detail);
        }

        return detail;
    }, "Reserva cancelada.");
    },
    refresh
  };
}


