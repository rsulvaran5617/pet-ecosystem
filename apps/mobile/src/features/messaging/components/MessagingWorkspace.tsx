import { bookingStatusLabels } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { Uuid } from "@pet/types";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { useMessagingWorkspace } from "../hooks/useMessagingWorkspace";

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
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="EP-07 / Messaging"
        title="Booking-linked inbox"
        description="Threads are created automatically from bookings. Only the booked customer and the provider owner can read or send text messages in this MVP slice."
      >
        <View style={{ gap: 12 }}>
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Inbox</Text>
              <StatusChip label={`${threads.length} thread(s)`} tone="neutral" />
            </View>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} label="Refresh" onPress={() => void refresh()} tone="secondary" />
              <Button disabled={isSubmitting} label="Clear notices" onPress={clearMessages} tone="secondary" />
            </View>
            {isLoading && !threads.length ? <Text style={{ color: colorTokens.muted }}>Loading booking-linked threads from Supabase...</Text> : null}
            {threads.length ? threads.map((thread) => (
              <Pressable
                key={thread.id}
                onPress={() => void openThread(thread.id)}
                style={[inputStyle, { gap: 8, backgroundColor: thread.id === selectedThreadId ? "rgba(15,118,110,0.08)" : "#fffdf8" }]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{thread.serviceName}</Text>
                  <StatusChip label={bookingStatusLabels[thread.bookingStatus]} tone={getStatusTone(thread.bookingStatus)} />
                </View>
                <Text style={{ color: colorTokens.muted }}>{thread.customerDisplayName} · {thread.providerDisplayName}</Text>
                <Text style={{ color: colorTokens.muted }}>Pet: {thread.petName}</Text>
                <Text style={{ color: colorTokens.muted }}>
                  {thread.lastMessagePreview ?? "No messages yet. Open the thread to start the booking conversation."}
                </Text>
              </Pressable>
            )) : (
              <Text style={{ color: colorTokens.muted }}>
                No booking-linked chats are visible yet. Create or open a booking above to seed the first thread automatically.
              </Text>
            )}
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Thread detail</Text>
              {selectedThreadDetail ? (
                <StatusChip
                  label={bookingStatusLabels[selectedThreadDetail.thread.bookingStatus]}
                  tone={getStatusTone(selectedThreadDetail.thread.bookingStatus)}
                />
              ) : (
                <StatusChip label="no thread selected" tone="neutral" />
              )}
            </View>

            {selectedThreadDetail ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Service</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedThreadDetail.thread.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Pet</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedThreadDetail.thread.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Customer</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedThreadDetail.thread.customerDisplayName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Provider</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedThreadDetail.thread.providerDisplayName}</Text>
                </View>

                <View style={{ gap: 10 }}>
                  {selectedThreadDetail.messages.length ? selectedThreadDetail.messages.map((message) => {
                    const isProvider = message.senderRole === "provider";

                    return (
                      <View
                        key={message.id}
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: "rgba(28,25,23,0.08)",
                          backgroundColor: isProvider ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.92)",
                          padding: 14,
                          gap: 8,
                          alignSelf: isProvider ? "flex-end" : "flex-start",
                          width: "100%"
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{message.senderDisplayName}</Text>
                          <Text style={{ color: "#78716c", fontSize: 12 }}>{formatDateTime(message.createdAt)}</Text>
                        </View>
                        <Text style={{ color: "#44403c", lineHeight: 20 }}>{message.messageText}</Text>
                      </View>
                    );
                  }) : (
                    <Text style={{ color: colorTokens.muted }}>
                      No messages have been sent yet for this booking. Use the composer below to start the conversation.
                    </Text>
                  )}
                </View>

                <TextInput
                  multiline
                  onChangeText={setMessageDraft}
                  placeholder="Type a booking-related message..."
                  style={[inputStyle, { minHeight: 110, textAlignVertical: "top", color: "#1c1917" }]}
                  value={messageDraft}
                />
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Send message" onPress={() => void sendMessage()} />
                  <Button disabled={isSubmitting} label="Clear draft" onPress={() => setMessageDraft("")} tone="secondary" />
                </View>
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Select a thread from the inbox or open chat from a booking detail. Threads are never free-form in this MVP; every conversation stays linked to one booking.
              </Text>
            )}
          </View>
        </View>
      </CoreSectionCard>
    </View>
  );
}
