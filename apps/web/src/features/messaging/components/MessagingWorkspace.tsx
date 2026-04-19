"use client";

import { bookingStatusLabels } from "@pet/config";
import type { Uuid } from "@pet/types";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useMessagingWorkspace } from "../hooks/useMessagingWorkspace";

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

export function MessagingWorkspace({
  enabled,
  focusedBookingId,
  focusVersion
}: {
  enabled: boolean;
  focusedBookingId: Uuid | null;
  focusVersion: number;
}) {
  const {
    threads,
    selectedThreadDetail,
    selectedThreadId,
    messageDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    openThread,
    refresh,
    sendMessage,
    setMessageDraft
  } = useMessagingWorkspace(enabled, focusedBookingId, focusVersion);

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-07 / Messaging"
        title="Booking-linked inbox"
        description="Threads are created automatically from bookings. Only the booked customer and the provider owner can read or send text messages in this MVP slice."
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) minmax(0,1fr)", gap: "18px" }}>
          <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Inbox</h3>
                <StatusPill label={`${threads.length} thread(s)`} tone="neutral" />
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                  Refresh
                </Button>
                <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                  Clear notices
                </Button>
              </div>
              {isLoading && !threads.length ? (
                <p style={{ margin: 0, color: "#57534e" }}>Loading booking-linked threads from Supabase...</p>
              ) : threads.length ? (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => void openThread(thread.id)}
                    type="button"
                    style={{
                      ...inputStyle,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "grid",
                      gap: "8px",
                      background: thread.id === selectedThreadId ? "rgba(15,118,110,0.08)" : "#fffdf8"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <strong>{thread.serviceName}</strong>
                      <StatusPill label={bookingStatusLabels[thread.bookingStatus]} tone={getStatusTone(thread.bookingStatus)} />
                    </div>
                    <div style={{ color: "#57534e" }}>
                      {thread.customerDisplayName} · {thread.providerDisplayName}
                    </div>
                    <div style={{ color: "#57534e" }}>Pet: {thread.petName}</div>
                    <div style={{ color: "#57534e" }}>
                      {thread.lastMessagePreview ?? "No messages yet. Open the thread to start the booking conversation."}
                    </div>
                  </button>
                ))
              ) : (
                <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                  No booking-linked chats are visible yet. Create or open a booking above to seed the first thread automatically.
                </p>
              )}
            </article>
          </div>

          <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Thread detail</h3>
                {selectedThreadDetail ? (
                  <StatusPill
                    label={bookingStatusLabels[selectedThreadDetail.thread.bookingStatus]}
                    tone={getStatusTone(selectedThreadDetail.thread.bookingStatus)}
                  />
                ) : (
                  <StatusPill label="no thread selected" tone="neutral" />
                )}
              </div>
              {selectedThreadDetail ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                    <div style={inputStyle}>
                      <strong>Service</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedThreadDetail.thread.serviceName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Pet</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedThreadDetail.thread.petName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Customer</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedThreadDetail.thread.customerDisplayName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Provider</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedThreadDetail.thread.providerDisplayName}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                    {selectedThreadDetail.messages.length ? (
                      selectedThreadDetail.messages.map((message) => {
                        const isProvider = message.senderRole === "provider";

                        return (
                          <article
                            key={message.id}
                            style={{
                              justifySelf: isProvider ? "end" : "start",
                              width: "min(100%, 520px)",
                              borderRadius: "18px",
                              background: isProvider ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.9)",
                              border: "1px solid rgba(28,25,23,0.08)",
                              padding: "14px",
                              display: "grid",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                              <strong>{message.senderDisplayName}</strong>
                              <span style={{ color: "#78716c", fontSize: "12px" }}>{formatDateTime(message.createdAt)}</span>
                            </div>
                            <div style={{ color: "#44403c", lineHeight: 1.6 }}>{message.messageText}</div>
                          </article>
                        );
                      })
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>
                        No messages have been sent yet for this booking. Use the composer below to start the conversation.
                      </p>
                    )}
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <textarea
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="Type a booking-related message..."
                      value={messageDraft}
                      rows={4}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        minHeight: "110px",
                        fontFamily: "inherit"
                      }}
                    />
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button disabled={isSubmitting} onClick={() => void sendMessage()}>
                        Send message
                      </Button>
                      <Button disabled={isSubmitting} onClick={() => setMessageDraft("")} tone="secondary">
                        Clear draft
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                  Select a thread from the inbox or open chat from a booking detail. Threads are never free-form in this MVP; every conversation stays linked to one booking.
                </p>
              )}
            </article>
          </div>
        </div>
      </CoreSection>
    </div>
  );
}
