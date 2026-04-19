"use client";

import { bookingStatusLabels } from "@pet/config";
import type { ReviewRating, Uuid } from "@pet/types";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useReviewsWorkspace } from "../hooks/useReviewsWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

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

function RatingButton({
  isSelected,
  onClick,
  rating
}: {
  isSelected: boolean;
  onClick: () => void;
  rating: ReviewRating;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        borderRadius: "999px",
        border: "1px solid rgba(28,25,23,0.14)",
        background: isSelected ? "rgba(15,118,110,0.12)" : "#fffdf8",
        color: isSelected ? "#0f766e" : "#1c1917",
        padding: "10px 14px",
        fontWeight: 700,
        cursor: "pointer"
      }}
    >
      {`${rating} star${rating === 1 ? "" : "s"}`}
    </button>
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
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-07 / Reviews"
        title="Basic booking reviews"
        description="Reviews stay linked to completed bookings and remain limited to one customer review per booking in this MVP slice."
      >
        <div style={{ display: "grid", gap: "18px" }}>
          <article style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Review target</h3>
              {reviewState ? (
                <StatusPill label={bookingStatusLabels[reviewState.bookingStatus]} tone={getStatusTone(reviewState.bookingStatus)} />
              ) : (
                <StatusPill label="no booking selected" tone="neutral" />
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Refresh
              </Button>
              <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                Clear notices
              </Button>
            </div>

            {isLoading && !reviewState ? (
              <p style={{ margin: 0, color: "#57534e" }}>Loading booking review state from Supabase...</p>
            ) : reviewState ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                  <div style={inputStyle}>
                    <strong>Provider</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reviewState.providerName}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Service</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reviewState.serviceName}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Pet</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reviewState.petName}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Scheduled end</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTime(reviewState.scheduledEndAt)}</div>
                  </div>
                </div>

                {reviewState.review ? (
                  <article style={{ ...inputStyle, display: "grid", gap: "10px" }}>
                    <strong>{`Submitted rating: ${reviewState.review.rating}/5`}</strong>
                    <div style={{ color: "#44403c", lineHeight: 1.7 }}>{reviewState.review.commentText}</div>
                    <div style={{ color: "#78716c" }}>{formatDateTime(reviewState.review.createdAt)}</div>
                  </article>
                ) : reviewState.isEligible ? (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <RatingButton
                          key={rating}
                          isSelected={ratingDraft === rating}
                          onClick={() => setRatingDraft(rating as ReviewRating)}
                          rating={rating as ReviewRating}
                        />
                      ))}
                    </div>
                    <textarea
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Leave a short review about the completed service..."
                      rows={5}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        minHeight: "120px",
                        fontFamily: "inherit"
                      }}
                      value={commentDraft}
                    />
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button disabled={isSubmitting} onClick={() => void submitReview()}>
                        Submit review
                      </Button>
                      <Button disabled={isSubmitting} onClick={() => setCommentDraft("")} tone="secondary">
                        Clear draft
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                    {reviewState.eligibilityReason ?? "This booking is not eligible for review yet."}
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                Open a booking detail above and choose review. This slice does not create free-form reviews outside a booking.
              </p>
            )}
          </article>
        </div>
      </CoreSection>
    </div>
  );
}
