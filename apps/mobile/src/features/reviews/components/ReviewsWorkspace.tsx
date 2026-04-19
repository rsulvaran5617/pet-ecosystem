import { bookingStatusLabels } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { ReviewRating, Uuid } from "@pet/types";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { useReviewsWorkspace } from "../hooks/useReviewsWorkspace";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(28,25,23,0.14)",
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "#fffdf8"
} as const;

const cardStyle = { borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 } as const;

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

function RatingButton({
  isSelected,
  onPress,
  rating
}: {
  isSelected: boolean;
  onPress: () => void;
  rating: ReviewRating;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(28,25,23,0.14)",
        backgroundColor: isSelected ? "rgba(15,118,110,0.12)" : "#fffdf8",
        paddingHorizontal: 12,
        paddingVertical: 10
      }}
    >
      <Text style={{ color: isSelected ? "#0f766e" : "#1c1917", fontWeight: "700" }}>{`${rating} star${rating === 1 ? "" : "s"}`}</Text>
    </Pressable>
  );
}

export function ReviewsWorkspace({
  enabled,
  focusedBookingId,
  focusVersion
}: {
  enabled: boolean;
  focusedBookingId: Uuid | null;
  focusVersion: number;
}) {
  const {
    reviewState,
    ratingDraft,
    commentDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    refresh,
    submitReview,
    setCommentDraft,
    setRatingDraft
  } = useReviewsWorkspace(enabled, focusedBookingId, focusVersion);

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="EP-07 / Reviews"
        title="Basic booking reviews"
        description="Reviews stay linked to completed bookings and remain limited to one customer review per booking in this MVP slice."
      >
        <View style={{ gap: 12 }}>
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Review target</Text>
              {reviewState ? (
                <StatusChip label={bookingStatusLabels[reviewState.bookingStatus]} tone={getStatusTone(reviewState.bookingStatus)} />
              ) : (
                <StatusChip label="no booking selected" tone="neutral" />
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} label="Refresh" onPress={() => void refresh()} tone="secondary" />
              <Button disabled={isSubmitting} label="Clear notices" onPress={clearMessages} tone="secondary" />
            </View>

            {isLoading && !reviewState ? (
              <Text style={{ color: colorTokens.muted }}>Loading booking review state from Supabase...</Text>
            ) : reviewState ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Provider</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{reviewState.providerName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Service</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{reviewState.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Pet</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{reviewState.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Scheduled end</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(reviewState.scheduledEndAt)}</Text>
                </View>

                {reviewState.review ? (
                  <View style={[inputStyle, { gap: 10 }]}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{`Submitted rating: ${reviewState.review.rating}/5`}</Text>
                    <Text style={{ color: "#44403c", lineHeight: 20 }}>{reviewState.review.commentText}</Text>
                    <Text style={{ color: "#78716c" }}>{formatDateTime(reviewState.review.createdAt)}</Text>
                  </View>
                ) : reviewState.isEligible ? (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <RatingButton
                          key={rating}
                          isSelected={ratingDraft === rating}
                          onPress={() => setRatingDraft(rating as ReviewRating)}
                          rating={rating as ReviewRating}
                        />
                      ))}
                    </View>
                    <TextInput
                      multiline
                      onChangeText={setCommentDraft}
                      placeholder="Leave a short review about the completed service..."
                      style={[inputStyle, { minHeight: 120, textAlignVertical: "top", color: "#1c1917" }]}
                      value={commentDraft}
                    />
                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                      <Button disabled={isSubmitting} label="Submit review" onPress={() => void submitReview()} />
                      <Button disabled={isSubmitting} label="Clear draft" onPress={() => setCommentDraft("")} tone="secondary" />
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>
                    {reviewState.eligibilityReason ?? "This booking is not eligible for review yet."}
                  </Text>
                )}
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Open a booking detail above and choose review. This slice does not create free-form reviews outside a booking.
              </Text>
            )}
          </View>
        </View>
      </CoreSectionCard>
    </View>
  );
}
