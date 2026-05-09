import { bookingModeLabels, bookingStatusLabels, formatCurrencyAmount, formatDateTimeLabel, formatHouseholdPermissions } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { MarketplaceServiceSelection, Uuid } from "@pet/types";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { BookingOperationsTimeline } from "./BookingOperationsTimeline";
import { BookingSlotsCalendar } from "./BookingSlotsCalendar";
import { useBookingsWorkspace } from "../hooks/useBookingsWorkspace";

const inputStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colorTokens.line,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: colorTokens.surface
} as const;

const cardStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colorTokens.line,
  backgroundColor: colorTokens.surface,
  padding: 14,
  gap: 10,
  ...visualTokens.mobile.softShadow
} as const;

export type BookingHubPanel = "detalle" | "chat" | "review" | "soporte";
type BookingWorkspaceView = "historial" | "servicio" | "mascota" | "horario" | "metodo" | "preview" | "detalle";

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
        backgroundColor: isActive ? "#0f766e" : "rgba(255,255,255,0.92)",
        borderWidth: isActive ? 0 : 1,
        borderColor: "rgba(28,25,23,0.14)",
        paddingHorizontal: 12,
        paddingVertical: 9
      }}
    >
      <Text style={{ color: isActive ? "#f8fafc" : "#1c1917", fontSize: 13, fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function formatSlotCancellationDeadline(slotStartAt: string, cancellationWindowHours: number) {
  const deadline = new Date(slotStartAt);
  deadline.setHours(deadline.getHours() - Math.max(cancellationWindowHours, 0));

  return formatDateTimeLabel(deadline.toISOString());
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
  const pendingBookings = bookings.filter((booking) => booking.status === "pending_approval");
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const [bookingView, setBookingView] = useState<BookingWorkspaceView>(marketplaceSelection ? "servicio" : "historial");

  useEffect(() => {
    onBookingContextChange?.({ bookingId: selectedBookingId });
  }, [onBookingContextChange, selectedBookingId]);

  useEffect(() => {
    if (!marketplaceSelection) {
      return;
    }

    setBookingView("servicio");
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
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="Reservas"
        title={bookingView === "historial" ? "Tus reservas" : bookingView === "detalle" ? "Detalle de reserva" : "Prepara tu reserva"}
        description={
          bookingView === "historial"
            ? "Revisa tus reservas anteriores y abre el detalle para chat, soporte o resena."
            : bookingView === "detalle"
              ? "Consulta estado, proveedor, mascota y acciones disponibles para esta reserva."
              : "Sigue el flujo: servicio, mascota, metodo opcional y vista previa. No hay cobro real en este MVP."
        }
      >
        <View style={{ gap: 12 }}>
          {isLoading && !householdSnapshot ? <Text style={{ color: colorTokens.muted }}>Preparando tus reservas...</Text> : null}

          {bookingView === "servicio" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Servicio seleccionado</Text>
              <StatusChip label={activeSelection ? "seleccion lista" : "solo historial"} tone={activeSelection ? "active" : "neutral"} />
            </View>
            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
              {activeSelection
                ? "Ya tienes un servicio seleccionado desde Buscar. Continua con la mascota y elige un horario disponible."
                : "Selecciona un servicio publico en Buscar para preparar una reserva."}
            </Text>
            {activeSelection ? (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Hogar</Text>
            {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
              <Pressable
                key={household.id}
                onPress={() => void selectHousehold(household.id)}
                style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
                <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>Crea primero un hogar para reservar un servicio.</Text>}
          </View>

          <View style={cardStyle}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Mascota</Text>
              <StatusChip label={selectedPetId ? "mascota lista" : "pendiente"} tone={selectedPetId ? "active" : "pending"} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {pets.map((pet) => (
                <Button key={pet.id} disabled={!selectedHouseholdId} label={pet.name} onPress={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"} />
              ))}
            </View>
            <Text style={{ color: colorTokens.muted }}>
              Las reservas requieren una mascota concreta. Elige una antes de seleccionar el horario.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={!selectedPetId || isSubmitting} label="Elegir horario" onPress={() => showBookingView("horario")} />
              <Button disabled={isSubmitting} label="Volver al servicio" onPress={() => showBookingView("servicio")} tone="secondary" />
            </View>
          </View>
          </>
          ) : null}

          {bookingView === "horario" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Selecciona un horario</Text>
              <StatusChip label={selectedBookingSlot ? "horario listo" : "pendiente"} tone={selectedBookingSlot ? "active" : "pending"} />
            </View>
            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
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
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Horario elegido</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                  {formatDateTimeLabel(selectedBookingSlot.slotStartAt)} - {formatDateTimeLabel(selectedBookingSlot.slotEndAt)}
                </Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                  {selectedBookingSlot.availableCount} cupo(s) disponible(s)
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Metodos de pago guardados</Text>
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
            <Text style={{ color: colorTokens.muted }}>
              Vincular un metodo de pago guardado es opcional. No se realizara ningun cobro en este MVP.
            </Text>
            {selectedBookingSlot ? (
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Horario seleccionado</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                  {formatDateTimeLabel(selectedBookingSlot.slotStartAt)} - {formatDateTimeLabel(selectedBookingSlot.slotEndAt)}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                No hay horario seleccionado. Puedes continuar con el flujo anterior como fallback piloto.
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Preview de reserva</Text>
              <StatusChip label={preview ? bookingStatusLabels[preview.statusOnCreate] : "sin generar"} tone={preview ? getStatusTone(preview.statusOnCreate) : "neutral"} />
            </View>
            {preview ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Proveedor</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{preview.providerName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Servicio</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{preview.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Mascota</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{preview.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Modo</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{bookingModeLabels[preview.bookingMode]}</Text>
                </View>
                {selectedBookingSlot ? (
                  <View style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>Horario seleccionado</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      {formatDateTimeLabel(selectedBookingSlot.slotStartAt)} - {formatDateTimeLabel(selectedBookingSlot.slotEndAt)}
                    </Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      Este cupo se validara de nuevo al crear la reserva.
                    </Text>
                  </View>
                ) : (
                  <View style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>Inicio</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTimeLabel(preview.scheduledStartAt)}</Text>
                  </View>
                )}
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Precio</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatCurrencyAmount(preview.totalPriceCents, preview.currencyCode)}</Text>
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  Politica de cancelacion: esta reserva puede cancelarse hasta{" "}
                  {selectedBookingSlot
                    ? formatSlotCancellationDeadline(selectedBookingSlot.slotStartAt, preview.cancellationWindowHours)
                    : formatDateTimeLabel(preview.cancellationDeadlineAt)}{" "}
                  dentro de la ventana base del proveedor de {preview.cancellationWindowHours} hora(s).
                </Text>
                <Text style={{ color: colorTokens.muted }}>
                  Metodo de pago: {preview.paymentMethodSummary ? `${preview.paymentMethodSummary.brand.toUpperCase()} ${preview.paymentMethodSummary.last4}` : "Sin metodo de pago guardado vinculado"}
                </Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    label="Crear reserva"
                    onPress={() => void handleCreateBooking()}
                  />
                  <Button disabled={isSubmitting} label="Cambiar horario" onPress={() => showBookingView("horario")} tone="secondary" />
                  <Button disabled={isSubmitting} label="Cambiar metodo" onPress={() => showBookingView("metodo")} tone="secondary" />
                  <Button disabled={isSubmitting} label="Volver a historial" onPress={() => showBookingView("historial")} tone="secondary" />
                </View>
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Genera el preview despues de seleccionar hogar, mascota y metodo de pago opcional. El preview muestra precio y te indica si la reserva es inmediata o queda pendiente de aprobacion; si elegiste horario, el cupo final se valida al crear la reserva.
              </Text>
            )}
          </View>
          ) : null}

          {bookingView === "historial" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Historial de reservas</Text>
              <StatusChip label={`${bookings.length} reserva(s)`} tone="neutral" />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <StatusChip label={`${pendingBookings.length} pendientes`} tone={pendingBookings.length ? "pending" : "neutral"} />
              <StatusChip label={`${confirmedBookings.length} confirmadas`} tone={confirmedBookings.length ? "active" : "neutral"} />
            </View>
            {activeSelection ? <Button label="Preparar reserva" onPress={() => showBookingView("servicio")} /> : null}
            {bookings.length ? bookings.map((booking) => (
              <Pressable
                key={booking.id}
                onPress={() => {
                  onPanelChange?.("detalle");
                  void openBookingDetail(booking.id).then(() => showBookingView("detalle"));
                }}
                style={[inputStyle, { backgroundColor: selectedBookingId === booking.id ? "rgba(15,118,110,0.08)" : "#fffdf8" }]}
              >
                <View style={{ gap: 8 }}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>{booking.serviceName}</Text>
                  <StatusChip label={bookingStatusLabels[booking.status]} tone={getStatusTone(booking.status)} />
                </View>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{booking.providerName} - {booking.petName}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTimeLabel(booking.scheduledStartAt)}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatCurrencyAmount(booking.totalPriceCents, booking.currencyCode)}</Text>
                <Text style={{ color: "#0f766e", fontWeight: "700", marginTop: 8 }}>Ver detalle de reserva</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay reservas con este filtro. Busca un proveedor aprobado y prepara una reserva desde un servicio publicado.</Text>}
          </View>
          ) : null}

          {selectedBookingDetail && bookingView === "detalle" ? (
            <View style={cardStyle}>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Detalle de la reserva</Text>
                <StatusChip label={bookingStatusLabels[selectedBookingDetail.booking.status]} tone={getStatusTone(selectedBookingDetail.booking.status)} />
              </View>
              <View style={[inputStyle, { backgroundColor: "#1c1917", gap: 8 }]}>
                <Text style={{ color: "#f8fafc", fontSize: 22, fontWeight: "800" }}>{selectedBookingDetail.booking.serviceName}</Text>
                <Text style={{ color: "#d6d3d1", lineHeight: 20 }}>
                  {selectedBookingDetail.booking.providerName} - {selectedBookingDetail.booking.petName}
                </Text>
                <Text style={{ color: "#d6d3d1", lineHeight: 20 }}>{formatDateTimeLabel(selectedBookingDetail.booking.scheduledStartAt)}</Text>
              </View>
              <Button label="Volver a la lista de reservas" onPress={() => showBookingView("historial")} tone="secondary" />
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <PanelButton isActive={activePanel === "detalle"} label="Detalle" onPress={() => onPanelChange?.("detalle")} />
                {onOpenChatForBooking ? (
                  <PanelButton isActive={activePanel === "chat"} label="Chat" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} />
                ) : null}
                {onOpenReviewForBooking && selectedBookingDetail.booking.status === "completed" ? (
                  <PanelButton isActive={activePanel === "review"} label="Reseña" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} />
                ) : null}
                {onOpenSupportForBooking ? (
                  <PanelButton isActive={activePanel === "soporte"} label="Soporte" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} />
                ) : null}
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Proveedor</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedBookingDetail.booking.providerName}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Mascota</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedBookingDetail.booking.petName}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Inicio</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTimeLabel(selectedBookingDetail.booking.scheduledStartAt)}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Total</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatCurrencyAmount(selectedBookingDetail.pricing.totalPriceCents, selectedBookingDetail.pricing.currencyCode)}</Text>
              </View>
              <Text style={{ color: colorTokens.muted }}>
                Metodo de pago: {selectedBookingDetail.paymentMethodSummary ? `${selectedBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedBookingDetail.paymentMethodSummary.last4}` : "Sin metodo de pago guardado vinculado"}
              </Text>
              <Text style={{ color: colorTokens.muted }}>
                Fecha limite de cancelacion: {formatDateTimeLabel(selectedBookingDetail.booking.cancellationDeadlineAt)}
              </Text>
              {selectedBookingDetail.statusHistory.map((change) => (
                <View key={change.id} style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>{bookingStatusLabels[change.toStatus]}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTimeLabel(change.createdAt)}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{change.changeReason ?? "Sin razon adicional registrada."}</Text>
                </View>
              ))}
              <BookingOperationsTimeline
                bookingId={selectedBookingDetail.booking.id}
                bookingStatus={selectedBookingDetail.booking.status}
                context="owner"
                enabled={selectedBookingDetail.booking.status === "confirmed"}
              />
              {activePanel !== "detalle" ? (
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>
                    {activePanel === "chat" ? "Conversacion de esta reserva" : activePanel === "review" ? "Reseña de esta reserva" : "Soporte de esta reserva"}
                  </Text>
                  <Text style={{ color: colorTokens.muted, lineHeight: 20, marginTop: 6 }}>
                    {activePanel === "chat"
                      ? "El hilo queda ligado al booking; no hay chat libre fuera de una reserva."
                      : activePanel === "review"
                        ? "La reseña se habilita solo cuando la reserva esta completada."
                        : "El caso de soporte queda ligado a esta reserva. En MVP no hay disputas ni chat de soporte."}
                  </Text>
                </View>
              ) : null}
              {selectedBookingDetail.booking.status !== "cancelled" ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Cancelar reserva" onPress={() => void cancelBooking(selectedBookingDetail.booking.id)} />
                  {onOpenChatForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir chat" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenReviewForBooking && selectedBookingDetail.booking.status === "completed" ? (
                    <Button disabled={isSubmitting} label="Dejar reseña" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenSupportForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir soporte" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  <Button disabled={isSubmitting} label="Limpiar avisos" onPress={clearMessages} tone="secondary" />
                </View>
              ) : onOpenChatForBooking || onOpenReviewForBooking || onOpenSupportForBooking ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  {onOpenChatForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir chat" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenSupportForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir soporte" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </CoreSectionCard>
    </View>
  );
}
