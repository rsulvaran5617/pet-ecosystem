"use client";

import { supportCaseStatusLabels } from "@pet/config";
import type { Uuid } from "@pet/types";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useSupportWorkspace } from "../hooks/useSupportWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getStatusTone(status: "open" | "in_review" | "resolved") {
  if (status === "resolved") {
    return "active" as const;
  }

  if (status === "in_review") {
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

export function SupportWorkspace({
  enabled,
  focusedBookingId,
  focusVersion
}: {
  enabled: boolean;
  focusedBookingId: Uuid | null;
  focusVersion: number;
}) {
  const {
    supportCases,
    selectedCase,
    subjectDraft,
    descriptionDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    openCaseDetail,
    refresh,
    submitCase,
    setDescriptionDraft,
    setSubjectDraft
  } = useSupportWorkspace(enabled, focusedBookingId, focusVersion);

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-07 / Support"
        title="Basic booking support cases"
        description="Support remains platform-facing and anchored to a booking. This MVP slice stays out of disputes, chat and attachments."
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) minmax(0,1fr)", gap: "18px" }}>
          <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Create support case</h3>
                <StatusPill label={focusedBookingId ? "booking selected" : "awaiting booking"} tone={focusedBookingId ? "active" : "neutral"} />
              </div>
              <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                {focusedBookingId
                  ? `Booking focus ready: ${focusedBookingId}. Only household-side participants can open a case.`
                  : "Open a booking detail above and choose support. Support stays tied to an existing booking in this MVP."}
              </div>
              <input
                onChange={(event) => setSubjectDraft(event.target.value)}
                placeholder="Issue summary"
                style={inputStyle}
                value={subjectDraft}
              />
              <textarea
                onChange={(event) => setDescriptionDraft(event.target.value)}
                placeholder="Describe what happened, what you need and any relevant booking context."
                rows={6}
                style={{ ...inputStyle, resize: "vertical", minHeight: "140px", fontFamily: "inherit" }}
                value={descriptionDraft}
              />
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={!focusedBookingId || isSubmitting} onClick={() => void submitCase()}>
                  Create case
                </Button>
                <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                  Refresh
                </Button>
                <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                  Clear notices
                </Button>
              </div>
            </article>

            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>My support cases</h3>
                <StatusPill label={`${supportCases.length} case(s)`} tone="neutral" />
              </div>
              {supportCases.length ? (
                supportCases.map((supportCase) => (
                  <button
                    key={supportCase.id}
                    onClick={() => void openCaseDetail(supportCase.id)}
                    type="button"
                    style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "grid", gap: "8px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <strong>{supportCase.subject}</strong>
                      <StatusPill label={supportCaseStatusLabels[supportCase.status]} tone={getStatusTone(supportCase.status)} />
                    </div>
                    <div style={{ color: "#57534e" }}>
                      {supportCase.providerName} - {supportCase.serviceName}
                    </div>
                    <div style={{ color: "#57534e" }}>{supportCase.petName}</div>
                    <div style={{ color: "#57534e" }}>{formatDateTime(supportCase.createdAt)}</div>
                  </button>
                ))
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>No support cases created yet.</p>
              )}
            </article>
          </div>

          <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Case detail</h3>
                <StatusPill
                  label={selectedCase ? supportCaseStatusLabels[selectedCase.status] : "no case selected"}
                  tone={selectedCase ? getStatusTone(selectedCase.status) : "neutral"}
                />
              </div>
              {isLoading && !selectedCase ? (
                <p style={{ margin: 0, color: "#57534e" }}>Loading support data from Supabase...</p>
              ) : selectedCase ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                    <div style={inputStyle}>
                      <strong>Provider</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedCase.providerName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Service</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedCase.serviceName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Pet</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedCase.petName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Scheduled start</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTime(selectedCase.scheduledStartAt)}</div>
                    </div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Subject</strong>
                    <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.subject}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Description</strong>
                    <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.descriptionText}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Status</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{supportCaseStatusLabels[selectedCase.status]}</div>
                  </div>
                  {selectedCase.adminNote ? (
                    <div style={inputStyle}>
                      <strong>Admin note</strong>
                      <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.adminNote}</div>
                    </div>
                  ) : null}
                  {selectedCase.resolutionText ? (
                    <div style={inputStyle}>
                      <strong>Resolution</strong>
                      <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.resolutionText}</div>
                      {selectedCase.resolvedAt ? <div style={{ color: "#78716c", marginTop: "6px" }}>{formatDateTime(selectedCase.resolvedAt)}</div> : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                  Pick one of your existing cases or open support from a booking detail to start the flow.
                </p>
              )}
            </article>
          </div>
        </div>
      </CoreSection>
    </div>
  );
}
