"use client";

import { bookingModeLabels, bookingStatusLabels } from "@pet/config";
import type { MarketplaceServiceSelection, Uuid } from "@pet/types";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useBookingsWorkspace } from "../hooks/useBookingsWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

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
        eyebrow="EP-06 / Bookings"
        title="Transactional booking flow"
        description="Preview, pet selection, instant or approval-based creation, booking history, detail and basic cancellation. Saved payment methods are referenced only; payment capture remains deferred."
      >
        {isLoading && !householdSnapshot ? (
          <p style={{ margin: 0, color: "#57534e" }}>Loading booking context from Supabase...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,320px) minmax(0,1fr)", gap: "18px" }}>
            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Marketplace handoff</h3>
                  <StatusPill label={activeSelection ? "selection ready" : "history only"} tone={activeSelection ? "active" : "neutral"} />
                </div>
                <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                  {activeSelection ? (
                    <>
                      Service selection imported from Marketplace.
                      <br />
                      Provider: <strong>{activeSelection.providerId}</strong>
                      <br />
                      Service: <strong>{activeSelection.serviceId}</strong>
                    </>
                  ) : (
                    "Select a public service in Marketplace to start the booking preview, or review previous bookings below."
                  )}
                </div>
                {activeSelection ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} onClick={() => void buildPreview()}>
                      Build preview
                    </Button>
                    <Button disabled={isSubmitting} onClick={clearSelection} tone="secondary">
                      Clear selection
                    </Button>
                  </div>
                ) : null}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Household</h3>
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
                        {household.memberCount} member(s) - {household.myPermissions.join(", ")}
                      </div>
                    </button>
                  ))
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Create a household first to book a provider service.</p>
                )}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Pet</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button disabled={!selectedHouseholdId} onClick={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"}>
                    All pets
                  </Button>
                  {pets.map((pet) => (
                    <Button key={pet.id} disabled={!selectedHouseholdId} onClick={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"}>
                      {pet.name}
                    </Button>
                  ))}
                </div>
                <div style={{ color: "#57534e" }}>
                  {activeSelection ? "Bookings require one concrete pet. Pick one before creating the reservation." : "The same selector filters booking history by pet when needed."}
                </div>
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Saved payment method</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button onClick={() => selectPaymentMethod(null)} tone={selectedPaymentMethodId === null ? "primary" : "secondary"}>
                    No card
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
                  Linking a saved payment method is optional in this MVP slice. No charge is captured yet.
                </div>
              </article>
            </div>

            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Booking preview</h3>
                  <StatusPill label={preview ? bookingStatusLabels[preview.statusOnCreate] : "not built"} tone={preview ? getStatusTone(preview.statusOnCreate) : "neutral"} />
                </div>
                {preview ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                      <div style={inputStyle}>
                        <strong>Provider</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{preview.providerName}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Service</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{preview.serviceName}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Pet</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{preview.petName}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Mode</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{bookingModeLabels[preview.bookingMode]}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Starts</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTime(preview.scheduledStartAt)}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong>Price</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{formatMoney(preview.totalPriceCents, preview.currencyCode)}</div>
                      </div>
                    </div>
                    <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                      Cancellation policy: this booking can be cancelled until {formatDateTime(preview.cancellationDeadlineAt)} under the base provider window of{" "}
                      {preview.cancellationWindowHours} hour(s).
                    </div>
                    <div style={{ color: "#57534e" }}>
                      Payment method: {preview.paymentMethodSummary ? `${preview.paymentMethodSummary.brand.toUpperCase()} ${preview.paymentMethodSummary.last4}` : "No saved payment method linked"}
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button disabled={isSubmitting} onClick={() => void createBooking()}>
                        Create booking
                      </Button>
                      <Button disabled={isSubmitting} onClick={() => void buildPreview()} tone="secondary">
                        Refresh preview
                      </Button>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                    Build the preview after selecting household, pet and optional payment method. The preview resolves the next published provider slot, shows pricing and tells you whether the booking is instant or pending approval.
                  </p>
                )}
              </article>

              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Booking history</h3>
                  <StatusPill label={`${bookings.length} booking(s)`} tone="neutral" />
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
                        {booking.providerName} - {booking.petName}
                      </div>
                      <div style={{ color: "#57534e" }}>{formatDateTime(booking.scheduledStartAt)}</div>
                      <div style={{ color: "#57534e" }}>{formatMoney(booking.totalPriceCents, booking.currencyCode)}</div>
                    </button>
                  ))
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>No bookings exist yet for the current household and pet filter.</p>
                )}
              </article>

              {selectedBookingDetail ? (
                <article style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Booking detail</h3>
                    <StatusPill label={bookingStatusLabels[selectedBookingDetail.booking.status]} tone={getStatusTone(selectedBookingDetail.booking.status)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                    <div style={inputStyle}>
                      <strong>Provider</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedBookingDetail.booking.providerName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Pet</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedBookingDetail.booking.petName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Starts</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTime(selectedBookingDetail.booking.scheduledStartAt)}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Total</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>
                        {formatMoney(selectedBookingDetail.pricing.totalPriceCents, selectedBookingDetail.pricing.currencyCode)}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                    Payment method:{" "}
                    {selectedBookingDetail.paymentMethodSummary
                      ? `${selectedBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedBookingDetail.paymentMethodSummary.last4}`
                      : "No saved payment method linked"}
                  </div>
                  <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                    Cancellation deadline: {formatDateTime(selectedBookingDetail.booking.cancellationDeadlineAt)}
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {selectedBookingDetail.statusHistory.map((change) => (
                      <div key={change.id} style={inputStyle}>
                        <strong>{bookingStatusLabels[change.toStatus]}</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTime(change.createdAt)}</div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{change.changeReason ?? "No extra reason captured."}</div>
                      </div>
                    ))}
                  </div>
                  {selectedBookingDetail.booking.status !== "cancelled" ? (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button disabled={isSubmitting} onClick={() => void cancelBooking(selectedBookingDetail.booking.id)}>
                        Cancel booking
                      </Button>
                      {onOpenChatForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Open chat
                        </Button>
                      ) : null}
                      {onOpenReviewForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Open review
                        </Button>
                      ) : null}
                      {onOpenSupportForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Open support
                        </Button>
                      ) : null}
                      <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                        Keep detail open
                      </Button>
                    </div>
                  ) : onOpenChatForBooking || onOpenReviewForBooking || onOpenSupportForBooking ? (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {onOpenChatForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Open chat
                        </Button>
                      ) : null}
                      {onOpenReviewForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Open review
                        </Button>
                      ) : null}
                      {onOpenSupportForBooking ? (
                        <Button disabled={isSubmitting} onClick={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary">
                          Open support
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
