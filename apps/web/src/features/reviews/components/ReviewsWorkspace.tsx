"use client";

import { bookingStatusLabels } from "@pet/config";
import type { ReviewRating, Uuid } from "@pet/types";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useReviewsWorkspace } from "../hooks/useReviewsWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
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
      {`${rating} estrella${rating === 1 ? "" : "s"}`}
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
        eyebrow="EP-07 / Reseñas"
        title="Reseñas basicas de reservas"
        description="Las reseñas permanecen ligadas a reservas completadas y se limitan a una reseña por cliente para cada reserva dentro del MVP."
      >
        <div style={{ display: "grid", gap: "18px" }}>
          <article style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Reserva a reseñar</h3>
              {reviewState ? (
                <StatusPill label={bookingStatusLabels[reviewState.bookingStatus]} tone={getStatusTone(reviewState.bookingStatus)} />
              ) : (
                <StatusPill label="sin reserva seleccionada" tone="neutral" />
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Actualizar
              </Button>
              <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                Limpiar avisos
              </Button>
            </div>

            {isLoading && !reviewState ? (
              <p style={{ margin: 0, color: "#57534e" }}>Cargando estado de reseña desde Supabase...</p>
            ) : reviewState ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                  <div style={inputStyle}>
                    <strong>Proveedor</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reviewState.providerName}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Servicio</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reviewState.serviceName}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Mascota</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reviewState.petName}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Fin programado</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTime(reviewState.scheduledEndAt)}</div>
                  </div>
                </div>

                {reviewState.review ? (
                  <article style={{ ...inputStyle, display: "grid", gap: "10px" }}>
                    <strong>{`Calificacion enviada: ${reviewState.review.rating}/5`}</strong>
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
                      placeholder="Escribe una reseña breve sobre el servicio completado..."
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
                        Enviar reseña
                      </Button>
                      <Button disabled={isSubmitting} onClick={() => setCommentDraft("")} tone="secondary">
                        Limpiar borrador
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                    {reviewState.eligibilityReason ?? "Esta reserva todavia no es elegible para recibir una reseña."}
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                Abre el detalle de una reserva y elige reseña. Este flujo no crea reseñas libres fuera de una reserva.
              </p>
            )}
          </article>
        </div>
      </CoreSection>
    </div>
  );
}

