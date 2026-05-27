"use client";

import { bookingModeLabels, bookingStatusLabels, formatCurrencyAmount, formatDateTimeLabel, formatHouseholdPermissions } from "@pet/config";
import type { BookingSlot, MarketplaceServiceSelection, Uuid } from "@pet/types";
import { useEffect, useMemo } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useBookingsWorkspace } from "../hooks/useBookingsWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;
const panelStyle = {
  ...cardStyle,
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(15,118,110,0.12)",
  boxShadow: "0 16px 42px rgba(15,23,42,0.06)"
} as const;
const railStyle = {
  ...cardStyle,
  background: "rgba(247,242,231,0.9)",
  border: "1px solid rgba(15,118,110,0.14)"
} as const;

function getStatusTone(status: "pending_approval" | "confirmed" | "completed" | "cancelled") {
  if (status === "confirmed" || status === "completed") {
    return "active" as const;
  }

  if (status === "pending_approval") {
    return "pending" as const;
  }

  return "neutral" as const;
}

function getSlotTone(slot: BookingSlot) {
  if (slot.status === "available" || slot.status === "low_capacity") {
    return "active" as const;
  }

  if (slot.status === "full" || slot.status === "expired") {
    return "pending" as const;
  }

  return "neutral" as const;
}

function getSlotLabel(slot: BookingSlot) {
  if (slot.status === "available") {
    return `${slot.availableCount} cupo(s)`;
  }

  if (slot.status === "low_capacity") {
    return `${slot.availableCount} ultimos`;
  }

  if (slot.status === "full") {
    return "sin cupos";
  }

  if (slot.status === "expired") {
    return "vencido";
  }

  return "no disponible";
}

function formatSlotTimeRange(slot: BookingSlot) {
  return `${new Date(slot.slotStartAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })} - ${new Date(slot.slotEndAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatSlotDate(slotDate: string) {
  return new Date(`${slotDate}T00:00:00`).toLocaleDateString("es-PA", {
    weekday: "short",
    month: "short",
    day: "2-digit"
  });
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
  const slotsByDate = useMemo(() => {
    return bookingSlots.reduce<Record<string, BookingSlot[]>>((accumulator, slot) => {
      accumulator[slot.slotDate] = [...(accumulator[slot.slotDate] ?? []), slot];
      return accumulator;
    }, {});
  }, [bookingSlots]);
  const selectedDateSlots = selectedSlotDate ? slotsByDate[selectedSlotDate] ?? [] : [];
  const slotDates = Object.keys(slotsByDate);
  const activeStep = preview ? 4 : selectedBookingSlot ? 3 : selectedPetId ? 2 : activeSelection ? 1 : 0;

  useEffect(() => {
    if (!activeSelection || bookingSlots.length || isLoadingSlots) {
      return;
    }

    void loadBookingSlots();
  }, [activeSelection?.selectedAt, bookingSlots.length, isLoadingSlots]);

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        density="compact"
        eyebrow="EP-06 / Reservas"
        title="Reservar servicio"
        description="Confirma el servicio, elige mascota, revisa horarios con cupos y genera la vista previa antes de crear la reserva."
      >
        {isLoading && !householdSnapshot ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando contexto de reservas desde Supabase...</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
          <div className="booking-step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(130px, 1fr))", gap: "10px" }}>
            {[
              ["Servicio", activeSelection ? "listo" : "pendiente"],
              ["Mascota", selectedPetId ? "lista" : "pendiente"],
              ["Horario", selectedBookingSlot ? "elegido" : bookingSlots.length ? "disponible" : "pendiente"],
              ["Resumen", preview ? "generado" : "pendiente"]
            ].map(([label, status], index) => (
              <div
                key={label}
                style={{
                  ...inputStyle,
                  background: activeStep >= index + 1 ? "rgba(15,118,110,0.08)" : "#ffffff",
                  borderColor: activeStep >= index + 1 ? "rgba(15,118,110,0.28)" : "rgba(28,25,23,0.12)"
                }}
              >
                <strong style={{ color: activeStep >= index + 1 ? "#0f766e" : "#1c1917", fontSize: "11px" }}>{label}</strong>
                <div style={{ color: "#57534e", fontSize: "10px", marginTop: "4px" }}>{status}</div>
              </div>
            ))}
          </div>

          <div className="booking-owner-grid" style={{ display: "grid", gridTemplateColumns: "minmax(240px,300px) minmax(0,1fr)", gap: "14px" }}>
            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article style={railStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "15px" }}>Servicio</h3>
                  <StatusPill label={activeSelection ? "seleccion lista" : "solo historial"} tone={activeSelection ? "active" : "neutral"} />
                </div>
                <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                  {activeSelection ? (
                    <div style={{ display: "grid", gap: "8px" }}>
                      <strong style={{ color: "#1c1917", fontSize: "13px" }}>{activeSelection.providerName ?? "Proveedor seleccionado"}</strong>
                      <span>{activeSelection.serviceName ?? "Servicio seleccionado"}</span>
                      <span>
                        {activeSelection.serviceDurationMinutes ? `${activeSelection.serviceDurationMinutes} min - ` : ""}
                        {activeSelection.serviceBasePriceCents !== undefined && activeSelection.serviceCurrencyCode
                          ? formatCurrencyAmount(activeSelection.serviceBasePriceCents, activeSelection.serviceCurrencyCode)
                          : "Precio por confirmar"}
                      </span>
                    </div>
                  ) : (
                    "Selecciona un servicio desde Buscar para iniciar una nueva reserva."
                  )}
                </div>
                {activeSelection ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Button disabled={isLoadingSlots} onClick={() => void loadBookingSlots()}>
                      {isLoadingSlots ? "Consultando..." : "Ver horarios"}
                    </Button>
                    <Button disabled={isSubmitting} onClick={clearSelection} tone="secondary">
                      Limpiar seleccion
                    </Button>
                  </div>
                ) : null}
              </article>

              <article style={railStyle}>
                <h3 style={{ margin: 0, fontSize: "15px" }}>Hogar</h3>
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

              <article style={railStyle}>
                <h3 style={{ margin: 0, fontSize: "15px" }}>Mascota</h3>
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

              <article style={railStyle}>
                <h3 style={{ margin: 0, fontSize: "15px" }}>Metodo de pago</h3>
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

            <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
              <article style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "16px" }}>Horarios y cupos</h3>
                  <StatusPill label={selectedBookingSlot ? "horario elegido" : `${bookingSlots.length} cupo(s)`} tone={selectedBookingSlot ? "active" : "neutral"} />
                </div>
                {activeSelection ? (
                  <>
                    {slotDates.length ? (
                      <>
                        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                          {slotDates.map((slotDate) => (
                            <button
                              key={slotDate}
                              onClick={() => selectSlotDate(slotDate)}
                              type="button"
                              style={{
                                ...inputStyle,
                                background: selectedSlotDate === slotDate ? "rgba(15,118,110,0.1)" : "#ffffff",
                                borderColor: selectedSlotDate === slotDate ? "rgba(15,118,110,0.36)" : "rgba(28,25,23,0.12)",
                                cursor: "pointer",
                                minWidth: "112px",
                                textAlign: "center"
                              }}
                            >
                              <strong style={{ color: "#0f766e", fontSize: "11px" }}>{formatSlotDate(slotDate)}</strong>
                              <div style={{ color: "#57534e", fontSize: "9px", marginTop: "4px" }}>{slotsByDate[slotDate]?.length ?? 0} horario(s)</div>
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px" }}>
                          {selectedDateSlots.map((slot) => {
                            const isSelectable = slot.status === "available" || slot.status === "low_capacity";
                            const isSelected = selectedBookingSlot?.slotStartAt === slot.slotStartAt;

                            return (
                              <button
                                disabled={!isSelectable}
                                key={`${slot.availabilityRuleId}-${slot.slotStartAt}`}
                                onClick={() => selectBookingSlot(slot)}
                                type="button"
                                style={{
                                  ...inputStyle,
                                  background: isSelected ? "rgba(15,118,110,0.1)" : "#ffffff",
                                  borderColor: isSelected ? "rgba(15,118,110,0.42)" : "rgba(28,25,23,0.12)",
                                  cursor: isSelectable ? "pointer" : "not-allowed",
                                  opacity: isSelectable ? 1 : 0.62,
                                  textAlign: "left"
                                }}
                              >
                                <strong style={{ fontSize: "12px" }}>{formatSlotTimeRange(slot)}</strong>
                                <div style={{ color: "#57534e", fontSize: "10px", marginTop: "5px" }}>
                                  {slot.availableCount} de {slot.capacityTotal} cupo(s) disponible(s)
                                </div>
                                <div style={{ marginTop: "8px" }}>
                                  <StatusPill label={getSlotLabel(slot)} tone={getSlotTone(slot)} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div style={{ ...inputStyle, display: "grid", gap: "8px" }}>
                        <strong>{isLoadingSlots ? "Consultando horarios..." : "Sin horarios visibles"}</strong>
                        <span style={{ color: "#57534e", fontSize: "11px" }}>
                          {isLoadingSlots
                            ? "Estamos leyendo los cupos publicados por el proveedor."
                            : "Este servicio no tiene slots publicados para los proximos dias. Puedes intentar el flujo legacy de preview si el proveedor mantiene disponibilidad semanal."}
                        </span>
                        <div>
                          <Button disabled={isLoadingSlots} onClick={() => void loadBookingSlots()} tone="secondary">
                            Reconsultar horarios
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedBookingSlot ? (
                      <div style={{ ...inputStyle, background: "rgba(15,118,110,0.08)" }}>
                        <strong>Horario seleccionado</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>
                          {formatDateTimeLabel(selectedBookingSlot.slotStartAt)} - {formatDateTimeLabel(selectedBookingSlot.slotEndAt)}
                        </div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedBookingSlot.availableCount} cupo(s) disponible(s)</div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>Elige un servicio desde Buscar para consultar horarios publicados.</p>
                )}
              </article>

              <article style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "16px" }}>Resumen de reserva</h3>
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
                  <div style={{ display: "grid", gap: "10px" }}>
                    <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                      Genera el resumen despues de elegir mascota y horario. Si no hay slots publicados, puedes generar un preview legacy con la disponibilidad semanal del proveedor.
                    </p>
                    <div>
                      <Button disabled={!activeSelection || !selectedPetId || isSubmitting} onClick={() => void buildPreview()}>
                        Generar resumen
                      </Button>
                    </div>
                  </div>
                )}
              </article>

              <article style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "16px" }}>Historial de reservas</h3>
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
          </div>
        )}
      </CoreSection>
      <style>{`
        @media (max-width: 900px) {
          .booking-owner-grid {
            grid-template-columns: 1fr !important;
          }

          .booking-step-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}
