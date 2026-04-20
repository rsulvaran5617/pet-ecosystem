"use client";

import { bookingModeLabels, bookingStatusLabels, formatCurrencyAmount, formatDateTimeLabel, formatHouseholdPermissions } from "@pet/config";
import type { MarketplaceServiceSelection, Uuid } from "@pet/types";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useBookingsWorkspace } from "../hooks/useBookingsWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

function getStatusTone(status: "pending_approval" | "confirmed" | "completed" | "cancelled") {
  if (status === "confirmed" || status === "completed") {
    return "active" as const;
  }

  if (status === "pending_approval") {
    return "pending" as const;
  }

  return "neutral" as const;
}

function Button({
  children,
  disabled,
  onClick,
  tone = "primary"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      style={{
        borderRadius: "999px",
        border: tone === "primary" ? "none" : "1px solid rgba(28, 25, 23, 0.14)",
        background: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.82)",
        color: tone === "primary" ? "#f8fafc" : "#1c1917",
        padding: "12px 18px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
    </button>
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
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-06 / Reservas"
        title="Flujo transaccional de reservas"
        description="Preview, seleccion de mascota, creacion inmediata o con aprobacion, historial, detalle y cancelacion basica. Los metodos de pago guardados solo se referencian; el cobro sigue diferido."
      >
        {isLoading && !householdSnapshot ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando contexto de reservas desde Supabase...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,320px) minmax(0,1fr)", gap: "18px" }}>
            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Entrada desde Servicios</h3>
                  <StatusPill label={activeSelection ? "seleccion lista" : "solo historial"} tone={activeSelection ? "active" : "neutral"} />
                </div>
                <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                  {activeSelection ? (
                    <>
                      Seleccion de servicio importada desde Servicios.
                      <br />
                      Proveedor: <strong>{activeSelection.providerId}</strong>
                      <br />
                      Servicio: <strong>{activeSelection.serviceId}</strong>
                    </>
                  ) : (
                    "Selecciona un servicio publico en Servicios para iniciar el preview de reserva, o revisa tus reservas anteriores abajo."
                  )}
                </div>
                {activeSelection ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} onClick={() => void buildPreview()}>
                      Generar preview
                    </Button>
                    <Button disabled={isSubmitting} onClick={clearSelection} tone="secondary">
                      Limpiar seleccion
                    </Button>
                  </div>
                ) : null}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Hogar</h3>
                {householdSnapshot?.households.length ? (
                  householdSnapshot.households.map((household) => (
                    <button
                      key={household.id}
                      onClick={() => void selectHousehold(household.id)}
                      type="button"
                      style={{
                        ...inputStyle,
                        textAlign: "left",
                        cursor: "pointer",
                        background: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "#fffdf8"
                      }}
                    >
                      <strong>{household.name}</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>
                        {household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}
                      </div>
                    </button>
                  ))
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Crea primero un hogar para reservar un servicio.</p>
                )}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Mascota</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button disabled={!selectedHouseholdId} onClick={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"}>
                    Todas las mascotas
                  </Button>
                  {pets.map((pet) => (
                    <Button key={pet.id} disabled={!selectedHouseholdId} onClick={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"}>
                      {pet.name}
                    </Button>
                  ))}
                </div>
                <div style={{ color: "#57534e" }}>
                  {activeSelection ? "Las reservas requieren una mascota concreta. Elige una antes de crear la reserva." : "Este selector tambien filtra el historial por mascota cuando haga falta."}
                </div>
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Metodos de pago guardados</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button onClick={() => selectPaymentMethod(null)} tone={selectedPaymentMethodId === null ? "primary" : "secondary"}>
                    Sin tarjeta
                  </Button>
                  {paymentMethods.map((paymentMethod) => (
                    <Button
                      key={paymentMethod.id}
                      onClick={() => selectPaymentMethod(paymentMethod.id)}
                      tone={selectedPaymentMethodId === paymentMethod.id ? "primary" : "secondary"}
                    >
                      {`${paymentMethod.brand.toUpperCase()} ${paymentMethod.last4}`}
                    </Button>
                  ))}
                </div>
                <div style={{ color: "#57534e" }}>
                  Vincular un metodo de pago guardado es opcional en este MVP. Todavia no se realiza ningun cobro.
                </div>
              </article>
            </div>

            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Preview de reserva</h3>
                  <StatusPill label={preview ? bookingStatusLabels[preview.statusOnCreate] : "sin generar"} tone={preview ? getStatusTone(preview.statusOnCreate) : "neutral"} />
                </div>
                {preview ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                      <div style={inputStyle}>
                        <strong>Proveedor</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{preview.providerName}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Servicio</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{preview.serviceName}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Mascota</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{preview.petName}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Modo</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{bookingModeLabels[preview.bookingMode]}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Inicio</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTimeLabel(preview.scheduledStartAt)}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Precio</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{formatCurrencyAmount(preview.totalPriceCents, preview.currencyCode)}</div>
                      </div>
                    </div>
                    <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                      Política de cancelación: esta reserva puede cancelarse hasta {formatDateTimeLabel(preview.cancellationDeadlineAt)} dentro de la ventana base del proveedor de{" "}
                      {preview.cancellationWindowHours} hora(s).
                    </div>
                    <div style={{ color: "#57534e" }}>
                      Método de pago: {preview.paymentMethodSummary ? `${preview.paymentMethodSummary.brand.toUpperCase()} ${preview.paymentMethodSummary.last4}` : "Sin método de pago guardado vinculado"}
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button disabled={isSubmitting} onClick={() => void createBooking()}>
                        Crear reserva
                      </Button>
                      <Button disabled={isSubmitting} onClick={() => void buildPreview()} tone="secondary">
                        Actualizar preview
                      </Button>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                    Genera el preview después de seleccionar hogar, mascota y método de pago opcional. El preview resuelve el siguiente cupo publicado del proveedor, muestra el precio y te indica si la reserva es inmediata o queda pendiente de aprobación.
                  </p>
                )}
              </article>

              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Historial de reservas</h3>
                  <StatusPill label={`${bookings.length} reserva(s)`} tone="neutral" />
                </div>
                {bookings.length ? (
                  bookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => void openBookingDetail(booking.id)}
                      type="button"
                      style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "grid", gap: "8px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <strong>{booking.serviceName}</strong>
                        <StatusPill label={bookingStatusLabels[booking.status]} tone={getStatusTone(booking.status)} />
                      </div>
                      <div style={{ color: "#57534e" }}>
                        {booking.providerName} · {booking.petName}
                      </div>
                      <div style={{ color: "#57534e" }}>{formatDateTimeLabel(booking.scheduledStartAt)}</div>
                      <div style={{ color: "#57534e" }}>{formatCurrencyAmount(booking.totalPriceCents, booking.currencyCode)}</div>
                    </button>
                  ))
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay reservas para el hogar y filtro de mascota actuales.</p>
                )}
              </article>

              {selectedBookingDetail ? (
                <article style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Detalle de la reserva</h3>
                    <StatusPill label={bookingStatusLabels[selectedBookingDetail.booking.status]} tone={getStatusTone(selectedBookingDetail.booking.status)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                    <div style={inputStyle}>
                      <strong>Proveedor</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedBookingDetail.booking.providerName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Mascota</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedBookingDetail.booking.petName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Inicio</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTimeLabel(selectedBookingDetail.booking.scheduledStartAt)}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Total</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>
                        {formatCurrencyAmount(selectedBookingDetail.pricing.totalPriceCents, selectedBookingDetail.pricing.currencyCode)}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                    Método de pago:{" "}
                    {selectedBookingDetail.paymentMethodSummary
                      ? `${selectedBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedBookingDetail.paymentMethodSummary.last4}`
                      : "Sin método de pago guardado vinculado"}
                  </div>
                  <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                    Fecha límite de cancelación: {formatDateTimeLabel(selectedBookingDetail.booking.cancellationDeadlineAt)}
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {selectedBookingDetail.statusHistory.map((change) => (
                      <div key={change.id} style={inputStyle}>
                        <strong>{bookingStatusLabels[change.toStatus]}</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTimeLabel(change.createdAt)}</div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{change.changeReason ?? "Sin razon adicional registrada."}</div>
                      </div>
                    ))}
                  </div>
                  {selectedBookingDetail.booking.status !== "cancelled" ? (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button disabled={isSubmitting} onClick={() => void cancelBooking(selectedBookingDetail.booking.id)}>
                        Cancelar reserva
                      </Button>
                      {onOpenChatForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Abrir mensajes
                        </Button>
                      ) : null}
                      {onOpenReviewForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Abrir reseña
                        </Button>
                      ) : null}
                      {onOpenSupportForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Abrir soporte
                        </Button>
                      ) : null}
                      <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                        Mantener detalle abierto
                      </Button>
                    </div>
                  ) : onOpenChatForBooking || onOpenReviewForBooking || onOpenSupportForBooking ? (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {onOpenChatForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Abrir mensajes
                        </Button>
                      ) : null}
                      {onOpenReviewForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Abrir reseña
                        </Button>
                      ) : null}
                      {onOpenSupportForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Abrir soporte
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ) : null}
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
