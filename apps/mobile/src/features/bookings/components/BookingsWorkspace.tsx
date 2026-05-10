import { bookingModeLabels, bookingStatusLabels, formatCurrencyAmount, formatDateTimeLabel, formatHouseholdPermissions } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { BookingStatus, MarketplaceServiceSelection, Uuid } from "@pet/types";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { StatusChip } from "../../core/components/StatusChip";
import { BookingOperationsTimeline } from "./BookingOperationsTimeline";
import { BookingSlotsCalendar } from "./BookingSlotsCalendar";
import { useBookingsWorkspace } from "../hooks/useBookingsWorkspace";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colorTokens.line,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: colorTokens.surface
} as const;

const cardStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colorTokens.line,
  backgroundColor: colorTokens.surface,
  padding: 12,
  gap: 8,
  ...visualTokens.mobile.softShadow
} as const;

const sectionShellStyle = {
  borderRadius: visualTokens.mobile.sectionRadius,
  borderWidth: 1,
  borderColor: colorTokens.line,
  backgroundColor: "rgba(255,255,255,0.96)",
  padding: 14,
  gap: 9,
  ...visualTokens.mobile.shadow
} as const;

const sectionTitleStyle = {
  color: colorTokens.ink,
  fontSize: 17,
  fontWeight: "900",
  lineHeight: 21
} as const;

const sectionDescriptionStyle = {
  color: colorTokens.muted,
  fontSize: 11,
  fontWeight: "600",
  lineHeight: 16
} as const;

const cardTitleStyle = {
  fontSize: 14,
  fontWeight: "800",
  color: colorTokens.ink,
  lineHeight: 18
} as const;

const bodyTextStyle = {
  color: colorTokens.muted,
  fontSize: 12,
  lineHeight: 17
} as const;

const detailLabelStyle = {
  color: colorTokens.muted,
  fontSize: 8,
  fontWeight: "900",
  lineHeight: 10,
  textTransform: "uppercase"
} as const;

const detailValueStyle = {
  color: colorTokens.ink,
  fontSize: 10,
  fontWeight: "900",
  lineHeight: 13
} as const;

export type BookingHubPanel = "detalle" | "chat" | "review" | "soporte";
type BookingWorkspaceView = "historial" | "servicio" | "mascota" | "horario" | "metodo" | "preview" | "detalle";
type BookingStatusFilter = "all" | "active" | BookingStatus;

const bookingStatusFilters: Array<{ id: BookingStatusFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Activas" },
  { id: "pending_approval", label: "Pendientes" },
  { id: "confirmed", label: "Confirmadas" },
  { id: "completed", label: "Completadas" },
  { id: "cancelled", label: "Canceladas" }
];

function getStatusTone(status: "pending_approval" | "confirmed" | "completed" | "cancelled") {
  if (status === "confirmed" || status === "completed") {
    return "active" as const;
  }

  if (status === "pending_approval") {
    return "pending" as const;
  }

  return "neutral" as const;
}

function Button({ disabled, label, onPress, tone = "primary" }: { disabled?: boolean; label: string; onPress: () => void; tone?: "primary" | "secondary" }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: tone === "primary" ? colorTokens.accent : colorTokens.surface,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(0,151,143,0.26)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: disabled ? 0.65 : 1,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontWeight: "800", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function DetailFooterButton({
  disabled,
  label,
  onPress,
  tone = "secondary"
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "danger" | "secondary";
}) {
  const isDanger = tone === "danger";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: "48%",
        minHeight: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDanger ? "rgba(153,27,27,0.22)" : "rgba(0,151,143,0.2)",
        backgroundColor: isDanger ? "rgba(254,242,242,0.92)" : "rgba(0,151,143,0.06)",
        opacity: disabled ? 0.6 : 1,
        paddingHorizontal: 8,
        paddingVertical: 8
      }}
    >
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.76}
        style={{
          color: isDanger ? "#991b1b" : colorTokens.accentDark,
          fontSize: 10,
          fontWeight: "900",
          lineHeight: 13,
          textAlign: "center"
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PanelButton({
  isActive,
  label,
  onPress
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: isActive ? colorTokens.accent : "rgba(0,151,143,0.06)",
        borderWidth: isActive ? 0 : 1,
        borderColor: "rgba(0,151,143,0.2)",
        alignItems: "center",
        justifyContent: "center",
        width: "48%",
        minHeight: 34,
        paddingHorizontal: 10,
        paddingVertical: 7
      }}
    >
      <Text style={{ color: isActive ? "#f8fafc" : colorTokens.accentDark, fontSize: 10, fontWeight: "900", lineHeight: 13, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function formatSlotCancellationDeadline(slotStartAt: string, cancellationWindowHours: number) {
  const deadline = new Date(slotStartAt);
  deadline.setHours(deadline.getHours() - Math.max(cancellationWindowHours, 0));

  return formatDateTimeLabel(deadline.toISOString());
}

function formatReservationDate(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(value));
}

function formatReservationTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function BookingsWorkspace({
  activePanel = "detalle",
  enabled,
  marketplaceSelection,
  onClearMarketplaceSelection,
  onBookingContextChange,
  onPanelChange,
  onOpenChatForBooking,
  onOpenReviewForBooking,
  onOpenSupportForBooking
}: {
  activePanel?: BookingHubPanel;
  enabled: boolean;
  marketplaceSelection: MarketplaceServiceSelection | null;
  onClearMarketplaceSelection?: () => void;
  onBookingContextChange?: (context: { bookingId: Uuid | null }) => void;
  onPanelChange?: (panel: BookingHubPanel) => void;
  onOpenChatForBooking?: (bookingId: Uuid) => void;
  onOpenReviewForBooking?: (bookingId: Uuid) => void;
  onOpenSupportForBooking?: (bookingId: Uuid) => void;
}) {
  const {
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
    clearMessages,
    clearSelection,
    selectHousehold,
    selectPet,
    selectPaymentMethod,
    loadBookingSlots,
    selectSlotDate,
    selectBookingSlot,
    buildPreview,
    createBooking,
    openBookingDetail,
    cancelBooking
  } = useBookingsWorkspace(enabled, marketplaceSelection);

  const selectedBookingId = selectedBookingDetail?.booking.id ?? null;
  const [bookingView, setBookingView] = useState<BookingWorkspaceView>(marketplaceSelection ? "servicio" : "historial");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatusFilter>("all");
  const filteredBookings =
    bookingStatusFilter === "all"
      ? bookings
      : bookingStatusFilter === "active"
        ? bookings.filter((booking) => booking.status === "pending_approval" || booking.status === "confirmed")
        : bookings.filter((booking) => booking.status === bookingStatusFilter);
  const activeStatusFilterLabel = bookingStatusFilters.find((filter) => filter.id === bookingStatusFilter)?.label.toLowerCase() ?? "reservas";
  const getBookingStatusFilterCount = (filter: BookingStatusFilter) =>
    filter === "all"
      ? bookings.length
      : filter === "active"
        ? bookings.filter((booking) => booking.status === "pending_approval" || booking.status === "confirmed").length
        : bookings.filter((booking) => booking.status === filter).length;

  useEffect(() => {
    onBookingContextChange?.({ bookingId: selectedBookingId });
  }, [onBookingContextChange, selectedBookingId]);

  useEffect(() => {
    if (!marketplaceSelection) {
      return;
    }

    setBookingView(marketplaceSelection.selectedBookingSlot && marketplaceSelection.petId ? "metodo" : "servicio");
    onPanelChange?.("detalle");
  }, [marketplaceSelection?.selectedAt, onPanelChange]);

  useEffect(() => {
    if (bookingView !== "horario" || !activeSelection) {
      return;
    }

    void loadBookingSlots().catch(() => undefined);
  }, [activeSelection?.serviceId, bookingView]);

  const showBookingView = (view: BookingWorkspaceView) => {
    setBookingView(view);
    onPanelChange?.("detalle");
  };

  const handleClearSelection = () => {
    clearSelection();
    onClearMarketplaceSelection?.();
    showBookingView("historial");
  };

  const handleGeneratePreview = async () => {
    try {
      await buildPreview();
      showBookingView("preview");
    } catch {
      // El hook ya publica el mensaje de error visible para el usuario.
    }
  };

  const handleCreateBooking = async () => {
    try {
      await createBooking();
      onClearMarketplaceSelection?.();
      showBookingView("detalle");
    } catch {
      // El hook ya publica el mensaje de error visible para el usuario.
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 14 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? (
        <View style={cardStyle}>
          {bookingView === "detalle" && selectedBookingDetail ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colorTokens.accentDark, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                {selectedBookingDetail.booking.providerName}
              </Text>
              <Text style={bodyTextStyle}>Consulta proveedor, mascotas, timeline y soporte.</Text>
            </View>
          ) : (
            <Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text>
          )}
        </View>
      ) : null}
      <View style={sectionShellStyle}>
        <View style={{ gap: 3 }}>
          <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" }}>
            Reservas
          </Text>
          {bookingView !== "detalle" ? (
            <Text style={sectionTitleStyle}>
              {bookingView === "historial" ? "Tus reservas" : "Prepara tu reserva"}
            </Text>
          ) : null}
          {bookingView === "historial" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 5 }}>
              {bookingStatusFilters.map((filter) => {
                const isActive = bookingStatusFilter === filter.id;
                const count = getBookingStatusFilterCount(filter.id);

                return (
                  <Pressable
                    key={filter.id}
                    onPress={() => setBookingStatusFilter(filter.id)}
                    style={{
                      width: "31.5%",
                      borderRadius: 999,
                      backgroundColor: isActive ? colorTokens.accent : "rgba(0,151,143,0.08)",
                      borderWidth: isActive ? 0 : 1,
                      borderColor: "rgba(0,151,143,0.2)",
                      paddingHorizontal: 8,
                      paddingVertical: 7
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: isActive ? "#ffffff" : colorTokens.accentDark,
                        fontSize: 9,
                        fontWeight: "900",
                        lineHeight: 12,
                        textAlign: "center"
                      }}
                    >
                      {filter.label} · {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : bookingView === "detalle" ? null : (
            <Text style={sectionDescriptionStyle}>
              Elige mascota, horario y confirma solo al final.
            </Text>
          )}
        </View>
        <View style={{ gap: 9 }}>
          {isLoading && !householdSnapshot ? <Text style={bodyTextStyle}>Preparando tus reservas...</Text> : null}

          {bookingView === "servicio" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <Text style={[cardTitleStyle, { flex: 1 }]}>Servicio seleccionado</Text>
              <StatusChip label={activeSelection ? "seleccion lista" : "solo historial"} tone={activeSelection ? "active" : "neutral"} />
            </View>
            <Text style={bodyTextStyle}>
              {activeSelection
                ? "Ya tienes un servicio seleccionado desde Buscar. Continua con la mascota y elige un horario disponible."
                : "Selecciona un servicio publico en Buscar para preparar una reserva."}
            </Text>
            {activeSelection ? (
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} label="Continuar" onPress={() => showBookingView("mascota")} />
                <Button disabled={isSubmitting} label="Volver a historial" onPress={() => showBookingView("historial")} tone="secondary" />
                <Button
                  disabled={isSubmitting}
                  label="Limpiar seleccion"
                  onPress={handleClearSelection}
                  tone="secondary"
                />
              </View>
            ) : null}
          </View>
          ) : null}

          {bookingView === "mascota" ? (
          <>
          <View style={cardStyle}>
            <Text style={cardTitleStyle}>Hogar</Text>
            {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
              <Pressable
                key={household.id}
                onPress={() => void selectHousehold(household.id)}
                style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: colorTokens.ink }}>{household.name}</Text>
                <Text style={bodyTextStyle}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</Text>
              </Pressable>
            )) : <Text style={bodyTextStyle}>Crea primero un hogar para reservar un servicio.</Text>}
          </View>

          <View style={cardStyle}>
            <View style={{ gap: 8 }}>
              <Text style={cardTitleStyle}>Mascota</Text>
              <StatusChip label={selectedPetId ? "mascota lista" : "pendiente"} tone={selectedPetId ? "active" : "pending"} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {pets.map((pet) => (
                <Button key={pet.id} disabled={!selectedHouseholdId} label={pet.name} onPress={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"} />
              ))}
            </View>
            <Text style={bodyTextStyle}>
              Las reservas nuevas solo muestran mascotas activas. Las mascotas en memoria conservan su historial, pero no se usan para nuevos servicios.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button disabled={!selectedPetId || isSubmitting} label="Elegir horario" onPress={() => showBookingView("horario")} />
              <Button disabled={isSubmitting} label="Volver al servicio" onPress={() => showBookingView("servicio")} tone="secondary" />
            </View>
          </View>
          </>
          ) : null}

          {bookingView === "horario" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <Text style={[cardTitleStyle, { flex: 1 }]}>Selecciona un horario</Text>
              <StatusChip label={selectedBookingSlot ? "horario listo" : "pendiente"} tone={selectedBookingSlot ? "active" : "pending"} />
            </View>
            <Text style={bodyTextStyle}>
              Los cupos vienen del calendario del proveedor. La reserva final se valida nuevamente al confirmar para evitar sobreventa.
            </Text>
            <BookingSlotsCalendar
              isLoading={isLoadingSlots}
              onSelectDate={selectSlotDate}
              onSelectSlot={selectBookingSlot}
              selectedDate={selectedSlotDate}
              selectedSlot={selectedBookingSlot}
              slots={bookingSlots}
            />
            {selectedBookingSlot ? (
              <View style={inputStyle}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Horario elegido</Text>
                <Text style={[bodyTextStyle, { marginTop: 6 }]}>
                  {formatDateTimeLabel(selectedBookingSlot.slotStartAt)} - {formatDateTimeLabel(selectedBookingSlot.slotEndAt)}
                </Text>
                <Text style={[bodyTextStyle, { marginTop: 6 }]}>
                  {selectedBookingSlot.availableCount} cupo(s) disponible(s)
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button disabled={!selectedBookingSlot || isSubmitting} label="Continuar" onPress={() => showBookingView("metodo")} />
              {!bookingSlots.length && !isLoadingSlots ? (
                <Button disabled={isSubmitting} label="Continuar sin horario" onPress={() => showBookingView("metodo")} tone="secondary" />
              ) : null}
              <Button disabled={isSubmitting} label="Cambiar mascota" onPress={() => showBookingView("mascota")} tone="secondary" />
            </View>
          </View>
          ) : null}

          {bookingView === "metodo" ? (
          <View style={cardStyle}>
            <Text style={cardTitleStyle}>Metodos de pago guardados</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button label="Sin tarjeta" onPress={() => selectPaymentMethod(null)} tone={selectedPaymentMethodId === null ? "primary" : "secondary"} />
              {paymentMethods.map((paymentMethod) => (
                <Button
                  key={paymentMethod.id}
                  label={`${paymentMethod.brand.toUpperCase()} ${paymentMethod.last4}`}
                  onPress={() => selectPaymentMethod(paymentMethod.id)}
                  tone={selectedPaymentMethodId === paymentMethod.id ? "primary" : "secondary"}
                />
              ))}
            </View>
            <Text style={bodyTextStyle}>
              Vincular un metodo de pago guardado es opcional. No se realizara ningun cobro en este MVP.
            </Text>
            {selectedBookingSlot ? (
              <View style={inputStyle}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Horario seleccionado</Text>
                <Text style={[bodyTextStyle, { marginTop: 6 }]}>
                  {formatDateTimeLabel(selectedBookingSlot.slotStartAt)} - {formatDateTimeLabel(selectedBookingSlot.slotEndAt)}
                </Text>
              </View>
            ) : (
              <Text style={bodyTextStyle}>
                No hay horario seleccionado. Puedes continuar con el flujo anterior como fallback piloto.
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button
                disabled={!selectedPetId || !selectedHouseholdId || isSubmitting}
                label="Generar preview"
                onPress={() => void handleGeneratePreview()}
              />
              <Button disabled={isSubmitting} label="Cambiar horario" onPress={() => showBookingView("horario")} tone="secondary" />
            </View>
          </View>
          ) : null}

          {bookingView === "preview" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <Text style={[cardTitleStyle, { flex: 1 }]}>Preview de reserva</Text>
              <StatusChip label={preview ? bookingStatusLabels[preview.statusOnCreate] : "sin generar"} tone={preview ? getStatusTone(preview.statusOnCreate) : "neutral"} />
            </View>
            {preview ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Proveedor</Text>
                  <Text style={[bodyTextStyle, { marginTop: 6 }]}>{preview.providerName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Servicio</Text>
                  <Text style={[bodyTextStyle, { marginTop: 6 }]}>{preview.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Mascota</Text>
                  <Text style={[bodyTextStyle, { marginTop: 6 }]}>{preview.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Modo</Text>
                  <Text style={[bodyTextStyle, { marginTop: 6 }]}>{bookingModeLabels[preview.bookingMode]}</Text>
                </View>
                {selectedBookingSlot ? (
                  <View style={inputStyle}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Horario seleccionado</Text>
                    <Text style={[bodyTextStyle, { marginTop: 6 }]}>
                      {formatDateTimeLabel(selectedBookingSlot.slotStartAt)} - {formatDateTimeLabel(selectedBookingSlot.slotEndAt)}
                    </Text>
                    <Text style={[bodyTextStyle, { marginTop: 6 }]}>
                      Este cupo se validara de nuevo al crear la reserva.
                    </Text>
                  </View>
                ) : (
                  <View style={inputStyle}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Inicio</Text>
                    <Text style={[bodyTextStyle, { marginTop: 6 }]}>{formatDateTimeLabel(preview.scheduledStartAt)}</Text>
                  </View>
                )}
                <View style={inputStyle}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>Precio</Text>
                  <Text style={[bodyTextStyle, { marginTop: 6 }]}>{formatCurrencyAmount(preview.totalPriceCents, preview.currencyCode)}</Text>
                </View>
                <Text style={bodyTextStyle}>
                  Politica de cancelacion: esta reserva puede cancelarse hasta{" "}
                  {selectedBookingSlot
                    ? formatSlotCancellationDeadline(selectedBookingSlot.slotStartAt, preview.cancellationWindowHours)
                    : formatDateTimeLabel(preview.cancellationDeadlineAt)}{" "}
                  dentro de la ventana base del proveedor de {preview.cancellationWindowHours} hora(s).
                </Text>
                <Text style={bodyTextStyle}>
                  Metodo de pago: {preview.paymentMethodSummary ? `${preview.paymentMethodSummary.brand.toUpperCase()} ${preview.paymentMethodSummary.last4}` : "Sin metodo de pago guardado vinculado"}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    label="Confirmar reserva"
                    onPress={() => void handleCreateBooking()}
                  />
                  <Button disabled={isSubmitting} label="Cambiar horario" onPress={() => showBookingView("horario")} tone="secondary" />
                  <Button disabled={isSubmitting} label="Cambiar metodo" onPress={() => showBookingView("metodo")} tone="secondary" />
                  <Button disabled={isSubmitting} label="Volver a historial" onPress={() => showBookingView("historial")} tone="secondary" />
                </View>
              </>
            ) : (
              <Text style={bodyTextStyle}>
                Genera el preview despues de seleccionar hogar, mascota y metodo de pago opcional. El preview muestra precio y te indica si la reserva es inmediata o queda pendiente de aprobacion; si elegiste horario, el cupo final se valida al crear la reserva.
              </Text>
            )}
          </View>
          ) : null}

          {bookingView === "historial" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <Text style={[cardTitleStyle, { flex: 1 }]}>Historial de reservas</Text>
              <StatusChip label={`${filteredBookings.length} visibles`} tone="neutral" />
            </View>
            {activeSelection ? <Button label="Preparar reserva" onPress={() => showBookingView("servicio")} /> : null}
            {filteredBookings.length ? filteredBookings.map((booking) => (
              <Pressable
                key={booking.id}
                onPress={() => {
                  onPanelChange?.("detalle");
                  void openBookingDetail(booking.id).then(() => showBookingView("detalle"));
                }}
                style={[inputStyle, { backgroundColor: selectedBookingId === booking.id ? "rgba(15,118,110,0.08)" : "#fffdf8" }]}
              >
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colorTokens.ink }}>{booking.serviceName}</Text>
                  <StatusChip label={bookingStatusLabels[booking.status]} tone={getStatusTone(booking.status)} />
                </View>
                <Text style={[bodyTextStyle, { marginTop: 6 }]}>{booking.providerName} - {booking.petName}</Text>
                <Text style={[bodyTextStyle, { marginTop: 6 }]}>{formatDateTimeLabel(booking.scheduledStartAt)}</Text>
                <Text style={[bodyTextStyle, { marginTop: 6 }]}>{formatCurrencyAmount(booking.totalPriceCents, booking.currencyCode)}</Text>
                <Text style={{ color: colorTokens.accentDark, fontSize: 12, fontWeight: "800", marginTop: 8 }}>Ver detalle de reserva</Text>
              </Pressable>
            )) : <Text style={bodyTextStyle}>No hay {activeStatusFilterLabel} para mostrar. Puedes cambiar el filtro o preparar una reserva desde un servicio publicado.</Text>}
          </View>
          ) : null}

          {selectedBookingDetail && bookingView === "detalle" ? (
            <View style={cardStyle}>
              <View style={[inputStyle, { backgroundColor: "#ffffff", borderColor: "rgba(0,151,143,0.14)", gap: 9, padding: 12 }]}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1.15, gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <View
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "rgba(0,151,143,0.1)"
                        }}
                      >
                        <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>
                          {getInitials(selectedBookingDetail.booking.providerName)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={detailLabelStyle}>Proveedor</Text>
                        <Text numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.78} style={detailValueStyle}>
                          {selectedBookingDetail.booking.providerName}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <View
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "rgba(251,191,36,0.18)"
                        }}
                      >
                        <Text style={{ color: "#92400e", fontSize: 10, fontWeight: "900" }}>
                          {getInitials(selectedBookingDetail.booking.petName)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={detailLabelStyle}>Mascota</Text>
                        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={[detailValueStyle, { fontSize: 11, lineHeight: 14 }]}>
                          {selectedBookingDetail.booking.petName}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ width: 1, backgroundColor: colorTokens.line }} />
                  <View style={{ flex: 1, gap: 7 }}>
                    <View style={{ gap: 1 }}>
                      <Text style={detailLabelStyle}>Servicio</Text>
                      <Text numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.76} style={detailValueStyle}>
                        {selectedBookingDetail.booking.serviceName}
                      </Text>
                    </View>
                    <View style={{ gap: 1 }}>
                      <Text style={detailLabelStyle}>Fecha</Text>
                      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={[detailValueStyle, { fontWeight: "800" }]}>
                        {formatReservationDate(selectedBookingDetail.booking.scheduledStartAt)}
                      </Text>
                    </View>
                    <View style={{ gap: 1 }}>
                      <Text style={detailLabelStyle}>Hora</Text>
                      <Text style={[detailValueStyle, { fontWeight: "800" }]}>
                        {formatReservationTime(selectedBookingDetail.booking.scheduledStartAt)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{ borderTopWidth: 1, borderTopColor: colorTokens.line, paddingTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Text style={{ color: colorTokens.muted, fontSize: 8, fontWeight: "800", lineHeight: 11, textTransform: "uppercase" }}>Estado</Text>
                  <StatusChip label={bookingStatusLabels[selectedBookingDetail.booking.status]} tone={getStatusTone(selectedBookingDetail.booking.status)} />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                <PanelButton isActive={false} label="Volver a reservas" onPress={() => showBookingView("historial")} />
                <PanelButton isActive={activePanel === "detalle"} label="Resumen" onPress={() => onPanelChange?.("detalle")} />
                {onOpenReviewForBooking && selectedBookingDetail.booking.status === "completed" ? (
                  <PanelButton isActive={activePanel === "review"} label="Reseña" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} />
                ) : null}
              </View>
              <View style={[inputStyle, { gap: 8 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: colorTokens.muted }}>Total</Text>
                    <Text style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900", marginTop: 4 }}>
                      {formatCurrencyAmount(selectedBookingDetail.pricing.totalPriceCents, selectedBookingDetail.pricing.currencyCode)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: colorTokens.muted }}>Metodo de pago</Text>
                    <Text style={{ color: colorTokens.ink, fontSize: 12, fontWeight: "800", marginTop: 4 }}>
                      {selectedBookingDetail.paymentMethodSummary ? `${selectedBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedBookingDetail.paymentMethodSummary.last4}` : "Sin metodo"}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                  Cancelacion disponible hasta {formatDateTimeLabel(selectedBookingDetail.booking.cancellationDeadlineAt)}.
                </Text>
              </View>
              <BookingOperationsTimeline
                bookingId={selectedBookingDetail.booking.id}
                bookingStatus={selectedBookingDetail.booking.status}
                context="owner"
                enabled={selectedBookingDetail.booking.status === "confirmed" || selectedBookingDetail.booking.status === "completed"}
              />
              {activePanel !== "detalle" ? (
                <View style={inputStyle}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colorTokens.ink }}>
                    {activePanel === "chat" ? "Conversacion de esta reserva" : activePanel === "review" ? "Reseña de esta reserva" : "Soporte de esta reserva"}
                  </Text>
                  <Text style={[bodyTextStyle, { marginTop: 6 }]}>
                    {activePanel === "chat"
                      ? "El hilo queda ligado al booking; no hay chat libre fuera de una reserva."
                      : activePanel === "review"
                        ? "La reseña se habilita solo cuando la reserva esta completada."
                        : "El caso de soporte queda ligado a esta reserva. En MVP no hay disputas ni chat de soporte."}
                  </Text>
                </View>
              ) : null}
              {selectedBookingDetail.booking.status !== "cancelled" ? (
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                  <DetailFooterButton
                    disabled={isSubmitting}
                    label="Cancelar reserva"
                    onPress={() => {
                      void cancelBooking(selectedBookingDetail.booking.id).then(() => {
                        if (activePanel === "chat") {
                          onOpenChatForBooking?.(selectedBookingDetail.booking.id);
                        }
                      });
                    }}
                    tone="danger"
                  />
                  {onOpenChatForBooking ? (
                    <DetailFooterButton disabled={isSubmitting} label="Abrir chat" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} />
                  ) : null}
                  {onOpenReviewForBooking && selectedBookingDetail.booking.status === "completed" ? (
                    <DetailFooterButton disabled={isSubmitting} label="Dejar reseña" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} />
                  ) : null}
                  {onOpenSupportForBooking ? (
                    <DetailFooterButton disabled={isSubmitting} label="Abrir soporte" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} />
                  ) : null}
                  <DetailFooterButton disabled={isSubmitting} label="Limpiar avisos" onPress={clearMessages} />
                </View>
              ) : onOpenChatForBooking || onOpenReviewForBooking || onOpenSupportForBooking ? (
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                  {onOpenChatForBooking ? (
                    <DetailFooterButton disabled={isSubmitting} label="Abrir chat" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} />
                  ) : null}
                  {onOpenSupportForBooking ? (
                    <DetailFooterButton disabled={isSubmitting} label="Abrir soporte" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
