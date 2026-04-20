import { bookingModeLabels, bookingStatusLabels, formatCurrencyAmount, formatDateTimeLabel, formatHouseholdPermissions } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { MarketplaceServiceSelection, Uuid } from "@pet/types";
import { Pressable, Text, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { useBookingsWorkspace } from "../hooks/useBookingsWorkspace";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(28,25,23,0.14)",
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "#fffdf8"
} as const;

const cardStyle = { borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 } as const;

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
        backgroundColor: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.92)",
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(28,25,23,0.14)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: disabled ? 0.65 : 1
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : "#1c1917", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

export function BookingsWorkspace({
  enabled,
  marketplaceSelection,
  onOpenChatForBooking,
  onOpenReviewForBooking,
  onOpenSupportForBooking
}: {
  enabled: boolean;
  marketplaceSelection: MarketplaceServiceSelection | null;
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
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    clearSelection,
    selectHousehold,
    selectPet,
    selectPaymentMethod,
    buildPreview,
    createBooking,
    openBookingDetail,
    cancelBooking
  } = useBookingsWorkspace(enabled, marketplaceSelection);

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="EP-06 / Reservas"
        title="Flujo transaccional de reservas"
        description="Preview, seleccion de mascota, creacion inmediata o con aprobacion, historial, detalle y cancelacion basica. Los metodos de pago guardados solo se referencian; el cobro sigue diferido."
      >
        <View style={{ gap: 12 }}>
          {isLoading && !householdSnapshot ? <Text style={{ color: colorTokens.muted }}>Cargando contexto de reservas desde Supabase...</Text> : null}

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Entrada desde Servicios</Text>
              <StatusChip label={activeSelection ? "seleccion lista" : "solo historial"} tone={activeSelection ? "active" : "neutral"} />
            </View>
            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
              {activeSelection
                ? `Seleccion de servicio importada desde Servicios.\nProveedor: ${activeSelection.providerId}\nServicio: ${activeSelection.serviceId}`
                : "Selecciona un servicio publico en Servicios para iniciar el preview de reserva, o revisa tus reservas anteriores abajo."}
            </Text>
            {activeSelection ? (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} label="Generar preview" onPress={() => void buildPreview()} />
                <Button disabled={isSubmitting} label="Limpiar seleccion" onPress={clearSelection} tone="secondary" />
              </View>
            ) : null}
          </View>

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
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Mascota</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button disabled={!selectedHouseholdId} label="Todas las mascotas" onPress={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
              {pets.map((pet) => (
                <Button key={pet.id} disabled={!selectedHouseholdId} label={pet.name} onPress={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"} />
              ))}
            </View>
            <Text style={{ color: colorTokens.muted }}>
              {activeSelection ? "Las reservas requieren una mascota concreta. Elige una antes de crear la reserva." : "Este selector tambien filtra el historial por mascota cuando haga falta."}
            </Text>
          </View>

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
              Vincular un metodo de pago guardado es opcional en este MVP. Todavia no se realiza ningun cobro.
            </Text>
          </View>

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
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Inicio</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTimeLabel(preview.scheduledStartAt)}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Precio</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatCurrencyAmount(preview.totalPriceCents, preview.currencyCode)}</Text>
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  Politica de cancelacion: esta reserva puede cancelarse hasta {formatDateTimeLabel(preview.cancellationDeadlineAt)} dentro de la ventana base del proveedor de {preview.cancellationWindowHours} hora(s).
                </Text>
                <Text style={{ color: colorTokens.muted }}>
                  Metodo de pago: {preview.paymentMethodSummary ? `${preview.paymentMethodSummary.brand.toUpperCase()} ${preview.paymentMethodSummary.last4}` : "Sin metodo de pago guardado vinculado"}
                </Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Crear reserva" onPress={() => void createBooking()} />
                  <Button disabled={isSubmitting} label="Actualizar preview" onPress={() => void buildPreview()} tone="secondary" />
                </View>
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Genera el preview despues de seleccionar hogar, mascota y metodo de pago opcional. El preview resuelve el siguiente cupo publicado del proveedor, muestra el precio y te indica si la reserva es inmediata o queda pendiente de aprobacion.
              </Text>
            )}
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Historial de reservas</Text>
              <StatusChip label={`${bookings.length} reserva(s)`} tone="neutral" />
            </View>
            {bookings.length ? bookings.map((booking) => (
              <Pressable key={booking.id} onPress={() => void openBookingDetail(booking.id)} style={inputStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{booking.serviceName}</Text>
                  <StatusChip label={bookingStatusLabels[booking.status]} tone={getStatusTone(booking.status)} />
                </View>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{booking.providerName} · {booking.petName}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTimeLabel(booking.scheduledStartAt)}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatCurrencyAmount(booking.totalPriceCents, booking.currencyCode)}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay reservas para el hogar y filtro de mascota actuales.</Text>}
          </View>

          {selectedBookingDetail ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Detalle de la reserva</Text>
                <StatusChip label={bookingStatusLabels[selectedBookingDetail.booking.status]} tone={getStatusTone(selectedBookingDetail.booking.status)} />
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
              {selectedBookingDetail.booking.status !== "cancelled" ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Cancelar reserva" onPress={() => void cancelBooking(selectedBookingDetail.booking.id)} />
                  {onOpenChatForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir mensajes" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenReviewForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir resena" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenSupportForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir soporte" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  <Button disabled={isSubmitting} label="Mantener detalle abierto" onPress={clearMessages} tone="secondary" />
                </View>
              ) : onOpenChatForBooking || onOpenReviewForBooking || onOpenSupportForBooking ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  {onOpenChatForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir mensajes" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenReviewForBooking ? (
                    <Button disabled={isSubmitting} label="Abrir resena" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
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
