import { bookingModeLabels, bookingStatusLabels } from "@pet/config";
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
        eyebrow="EP-06 / Bookings"
        title="Transactional booking flow"
        description="Preview, pet selection, instant or approval-based creation, booking history, detail and basic cancellation. Saved payment methods are referenced only; payment capture remains deferred."
      >
        <View style={{ gap: 12 }}>
          {isLoading && !householdSnapshot ? <Text style={{ color: colorTokens.muted }}>Loading booking context from Supabase...</Text> : null}

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Marketplace handoff</Text>
              <StatusChip label={activeSelection ? "selection ready" : "history only"} tone={activeSelection ? "active" : "neutral"} />
            </View>
            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
              {activeSelection
                ? `Service selection imported from Marketplace.\nProvider: ${activeSelection.providerId}\nService: ${activeSelection.serviceId}`
                : "Select a public service in Marketplace to start the booking preview, or review previous bookings below."}
            </Text>
            {activeSelection ? (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} label="Build preview" onPress={() => void buildPreview()} />
                <Button disabled={isSubmitting} label="Clear selection" onPress={clearSelection} tone="secondary" />
              </View>
            ) : null}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Household</Text>
            {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
              <Pressable
                key={household.id}
                onPress={() => void selectHousehold(household.id)}
                style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
                <Text style={{ color: colorTokens.muted }}>{household.memberCount} member(s) - {household.myPermissions.join(", ")}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>Create a household first to book a provider service.</Text>}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Pet</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button disabled={!selectedHouseholdId} label="All pets" onPress={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
              {pets.map((pet) => (
                <Button key={pet.id} disabled={!selectedHouseholdId} label={pet.name} onPress={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"} />
              ))}
            </View>
            <Text style={{ color: colorTokens.muted }}>
              {activeSelection ? "Bookings require one concrete pet. Pick one before creating the reservation." : "The same selector filters booking history by pet when needed."}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Saved payment method</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button label="No card" onPress={() => selectPaymentMethod(null)} tone={selectedPaymentMethodId === null ? "primary" : "secondary"} />
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
              Linking a saved payment method is optional in this MVP slice. No charge is captured yet.
            </Text>
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Booking preview</Text>
              <StatusChip label={preview ? bookingStatusLabels[preview.statusOnCreate] : "not built"} tone={preview ? getStatusTone(preview.statusOnCreate) : "neutral"} />
            </View>
            {preview ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Provider</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{preview.providerName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Service</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{preview.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Pet</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{preview.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Mode</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{bookingModeLabels[preview.bookingMode]}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Starts</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(preview.scheduledStartAt)}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Price</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatMoney(preview.totalPriceCents, preview.currencyCode)}</Text>
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  Cancellation policy: this booking can be cancelled until {formatDateTime(preview.cancellationDeadlineAt)} under the base provider window of {preview.cancellationWindowHours} hour(s).
                </Text>
                <Text style={{ color: colorTokens.muted }}>
                  Payment method: {preview.paymentMethodSummary ? `${preview.paymentMethodSummary.brand.toUpperCase()} ${preview.paymentMethodSummary.last4}` : "No saved payment method linked"}
                </Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Create booking" onPress={() => void createBooking()} />
                  <Button disabled={isSubmitting} label="Refresh preview" onPress={() => void buildPreview()} tone="secondary" />
                </View>
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Build the preview after selecting household, pet and optional payment method. The preview resolves the next published provider slot, shows pricing and tells you whether the booking is instant or pending approval.
              </Text>
            )}
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Booking history</Text>
              <StatusChip label={`${bookings.length} booking(s)`} tone="neutral" />
            </View>
            {bookings.length ? bookings.map((booking) => (
              <Pressable key={booking.id} onPress={() => void openBookingDetail(booking.id)} style={inputStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{booking.serviceName}</Text>
                  <StatusChip label={bookingStatusLabels[booking.status]} tone={getStatusTone(booking.status)} />
                </View>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{booking.providerName} - {booking.petName}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(booking.scheduledStartAt)}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatMoney(booking.totalPriceCents, booking.currencyCode)}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>No bookings exist yet for the current household and pet filter.</Text>}
          </View>

          {selectedBookingDetail ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Booking detail</Text>
                <StatusChip label={bookingStatusLabels[selectedBookingDetail.booking.status]} tone={getStatusTone(selectedBookingDetail.booking.status)} />
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Provider</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedBookingDetail.booking.providerName}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Pet</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedBookingDetail.booking.petName}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Starts</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(selectedBookingDetail.booking.scheduledStartAt)}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Total</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatMoney(selectedBookingDetail.pricing.totalPriceCents, selectedBookingDetail.pricing.currencyCode)}</Text>
              </View>
              <Text style={{ color: colorTokens.muted }}>
                Payment method: {selectedBookingDetail.paymentMethodSummary ? `${selectedBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedBookingDetail.paymentMethodSummary.last4}` : "No saved payment method linked"}
              </Text>
              <Text style={{ color: colorTokens.muted }}>
                Cancellation deadline: {formatDateTime(selectedBookingDetail.booking.cancellationDeadlineAt)}
              </Text>
              {selectedBookingDetail.statusHistory.map((change) => (
                <View key={change.id} style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>{bookingStatusLabels[change.toStatus]}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(change.createdAt)}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{change.changeReason ?? "No extra reason captured."}</Text>
                </View>
              ))}
              {selectedBookingDetail.booking.status !== "cancelled" ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Cancel booking" onPress={() => void cancelBooking(selectedBookingDetail.booking.id)} />
                  {onOpenChatForBooking ? (
                    <Button disabled={isSubmitting} label="Open chat" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenReviewForBooking ? (
                    <Button disabled={isSubmitting} label="Open review" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenSupportForBooking ? (
                    <Button disabled={isSubmitting} label="Open support" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  <Button disabled={isSubmitting} label="Keep detail open" onPress={clearMessages} tone="secondary" />
                </View>
              ) : onOpenChatForBooking || onOpenReviewForBooking || onOpenSupportForBooking ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  {onOpenChatForBooking ? (
                    <Button disabled={isSubmitting} label="Open chat" onPress={() => onOpenChatForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenReviewForBooking ? (
                    <Button disabled={isSubmitting} label="Open review" onPress={() => onOpenReviewForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
                  ) : null}
                  {onOpenSupportForBooking ? (
                    <Button disabled={isSubmitting} label="Open support" onPress={() => onOpenSupportForBooking(selectedBookingDetail.booking.id)} tone="secondary" />
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
