import { bookingStatusLabels, formatDateTimeLabel, productLocale, productTimeZone } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { BookingStatus, ChatThreadSummary, Uuid } from "@pet/types";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { StatusChip } from "../../core/components/StatusChip";
import { useMessagingWorkspace } from "../hooks/useMessagingWorkspace";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colorTokens.line,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: colorTokens.surface
} as const;

const cardStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colorTokens.line,
  backgroundColor: colorTokens.surface,
  padding: 12,
  gap: 8,
  ...visualTokens.mobile.softShadow
} as const;

const sectionShellStyle = {
  borderRadius: visualTokens.mobile.sectionRadius,
  borderWidth: 1,
  borderColor: colorTokens.line,
  backgroundColor: "rgba(255,255,255,0.96)",
  padding: 14,
  gap: 9,
  ...visualTokens.mobile.shadow
} as const;

const sectionTitleStyle = {
  color: colorTokens.ink,
  fontSize: 17,
  fontWeight: "900",
  lineHeight: 21
} as const;

const sectionDescriptionStyle = {
  color: colorTokens.muted,
  fontSize: 11,
  fontWeight: "600",
  lineHeight: 16
} as const;

const cardTitleStyle = {
  color: colorTokens.ink,
  fontSize: 14,
  fontWeight: "900",
  lineHeight: 18
} as const;

const bodyTextStyle = {
  color: colorTokens.muted,
  fontSize: 11,
  lineHeight: 16
} as const;

type MessageStatusFilter = "all" | "active" | BookingStatus;

const messageStatusFilters: Array<{ id: MessageStatusFilter; label: string }> = [
  { id: "active", label: "Activas" },
  { id: "pending_approval", label: "Pendientes" },
  { id: "confirmed", label: "Confirmadas" },
  { id: "completed", label: "Completadas" },
  { id: "cancelled", label: "Canceladas" },
  { id: "all", label: "Todas" }
];

function formatDateTime(value: string) {
  return formatDateTimeLabel(value);
}

function getThreadActivityDate(thread: ChatThreadSummary) {
  return new Date(thread.lastMessageAt ?? thread.updatedAt ?? thread.createdAt);
}

function formatShortThreadDate(thread: ChatThreadSummary) {
  return new Intl.DateTimeFormat(productLocale, {
    day: "2-digit",
    month: "short",
    timeZone: productTimeZone
  }).format(getThreadActivityDate(thread));
}

function matchesStatusFilter(thread: ChatThreadSummary, filter: MessageStatusFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return thread.bookingStatus === "pending_approval" || thread.bookingStatus === "confirmed";
  }

  return thread.bookingStatus === filter;
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
        backgroundColor: tone === "primary" ? colorTokens.accent : "rgba(0,151,143,0.06)",
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(0,151,143,0.2)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: disabled ? 0.65 : 1
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontSize: 11, fontWeight: "900", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function DropdownOption({ count, isActive, label, onPress }: { count: number; isActive: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 14,
        backgroundColor: isActive ? "rgba(0,151,143,0.12)" : "#ffffff",
        borderWidth: isActive ? 0 : 1,
        borderColor: "rgba(0,151,143,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 8
      }}
    >
      <Text numberOfLines={1} style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>
        {label} · {count}
      </Text>
    </Pressable>
  );
}

export function MessagingWorkspace({
  currentUserId = null,
  enabled,
  focusedBookingId,
  focusVersion,
  viewerRole = "owner"
}: {
  currentUserId?: Uuid | null;
  enabled: boolean;
  focusedBookingId: Uuid | null;
  focusVersion: number;
  viewerRole?: "owner" | "provider";
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

  const [statusFilter, setStatusFilter] = useState<MessageStatusFilter>("active");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [expandedThreadId, setExpandedThreadId] = useState<Uuid | null>(null);
  const sortedThreads = [...threads].sort((left, right) => getThreadActivityDate(right).getTime() - getThreadActivityDate(left).getTime());
  const filteredThreads = sortedThreads.filter((thread) => matchesStatusFilter(thread, statusFilter));
  const activeFilterLabel = messageStatusFilters.find((filter) => filter.id === statusFilter)?.label ?? "Activas";
  const getStatusFilterCount = (filter: MessageStatusFilter) => sortedThreads.filter((thread) => matchesStatusFilter(thread, filter)).length;

  useEffect(() => {
    if (!enabled || !focusedBookingId || focusVersion === 0 || !selectedThreadId) {
      return;
    }

    setExpandedThreadId(selectedThreadId);
  }, [enabled, focusedBookingId, focusVersion, selectedThreadId]);

  const openConversation = async (threadId: Uuid) => {
    if (expandedThreadId === threadId) {
      setExpandedThreadId(null);
      return;
    }

    setExpandedThreadId(threadId);

    try {
      await openThread(threadId);
    } catch {
      // El hook ya expone el error en la UI.
    }
  };

  const isMessageMine = (senderUserId: Uuid, senderRole: "customer" | "provider") =>
    currentUserId ? senderUserId === currentUserId : viewerRole === "provider" ? senderRole === "provider" : senderRole === "customer";

  const getVisibleSenderName = (senderUserId: Uuid, senderRole: "customer" | "provider", senderDisplayName: string) => {
    const isMine = isMessageMine(senderUserId, senderRole);

    return isMine ? "Yo" : senderDisplayName;
  };

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 14 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      <View style={sectionShellStyle}>
        <View style={{ gap: 3 }}>
          <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" }}>
            Mensajes
          </Text>
          <Text style={sectionTitleStyle}>Bandeja de reservas</Text>
          <Text style={sectionDescriptionStyle}>Conversaciones ordenadas de la mas reciente a la mas antigua.</Text>
          {!errorMessage && infoMessage ? (
            <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "800", lineHeight: 14, marginTop: 3 }}>
              {infoMessage}
            </Text>
          ) : null}
        </View>

        <View style={cardStyle}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <Text style={[cardTitleStyle, { flex: 1 }]}>Bandeja de entrada</Text>
            <StatusChip label={`${filteredThreads.length} visibles`} tone="neutral" />
          </View>

          <View style={[inputStyle, { gap: 8, backgroundColor: "rgba(0,151,143,0.04)" }]}>
            <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Estado de reserva</Text>
            <Pressable
              onPress={() => setIsStatusDropdownOpen((current) => !current)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(0,151,143,0.24)",
                backgroundColor: "#ffffff",
                paddingHorizontal: 12,
                paddingVertical: 9,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10
              }}
            >
              <Text style={{ color: colorTokens.ink, fontSize: 12, fontWeight: "900" }}>{activeFilterLabel}</Text>
              <Text style={{ color: colorTokens.accentDark, fontSize: 12, fontWeight: "900" }}>{isStatusDropdownOpen ? "^" : "?"}</Text>
            </Pressable>
            {isStatusDropdownOpen ? (
              <View style={{ gap: 6 }}>
                {messageStatusFilters.map((filter) => (
                  <DropdownOption
                    key={filter.id}
                    count={getStatusFilterCount(filter.id)}
                    isActive={statusFilter === filter.id}
                    label={filter.label}
                    onPress={() => {
                      setStatusFilter(filter.id);
                      setIsStatusDropdownOpen(false);
                    }}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button disabled={isSubmitting} label="Actualizar" onPress={() => void refresh()} tone="secondary" />
            <Button disabled={isSubmitting} label="Limpiar avisos" onPress={clearMessages} tone="secondary" />
          </View>

          {isLoading && !threads.length ? <Text style={bodyTextStyle}>Buscando conversaciones ligadas a tus reservas...</Text> : null}
          {filteredThreads.length ? filteredThreads.map((thread) => {
            const isExpanded = expandedThreadId === thread.id;
            const isSelectedDetail = selectedThreadDetail?.thread.id === thread.id;
            const preview = thread.lastMessagePreview ?? "Sin mensajes todavia.";

            return (
              <View key={thread.id} style={[inputStyle, { gap: 0, backgroundColor: "#fffdf8", padding: 0, overflow: "hidden" }]}>
                <Pressable onPress={() => void openConversation(thread.id)} style={{ gap: 6, padding: 11 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>
                      {formatShortThreadDate(thread)}
                    </Text>
                    <StatusChip label={bookingStatusLabels[thread.bookingStatus]} tone={getStatusTone(thread.bookingStatus)} />
                  </View>
                  <Text numberOfLines={1} style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                    {thread.providerDisplayName}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
                    {thread.petName} · {thread.serviceName}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: "#57534e", fontSize: 11, lineHeight: 15 }}>
                      {preview}
                    </Text>
                    <Text style={{ color: colorTokens.accentDark, fontSize: 14, fontWeight: "900" }}>{isExpanded ? "-" : "+"}</Text>
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: "rgba(28,25,23,0.08)", padding: 11, gap: 10 }}>
                    {isSelectedDetail ? (
                      <>
                        <View style={[inputStyle, { backgroundColor: "rgba(15,118,110,0.08)", gap: 5 }]}>
                          <Text style={{ color: colorTokens.accentDark, fontSize: 9, fontWeight: "900", textTransform: "uppercase" }}>Reserva vinculada</Text>
                          <Text numberOfLines={2} style={{ fontWeight: "900", color: colorTokens.ink, fontSize: 12, lineHeight: 16 }}>{selectedThreadDetail.thread.serviceName}</Text>
                          <Text style={bodyTextStyle}>{selectedThreadDetail.thread.providerDisplayName}</Text>
                          <Text style={bodyTextStyle}>Mascota: {selectedThreadDetail.thread.petName}</Text>
                        </View>

                        <View style={{ gap: 8 }}>
                          {selectedThreadDetail.messages.length ? selectedThreadDetail.messages.map((message) => {
                            const isMine = isMessageMine(message.senderUserId, message.senderRole);

                            return (
                              <View
                                key={message.id}
                                style={{
                                  borderRadius: 16,
                                  borderWidth: 1,
                                  borderColor: "rgba(28,25,23,0.08)",
                                  backgroundColor: isMine ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.92)",
                                  padding: 9,
                                  gap: 5,
                                  alignSelf: isMine ? "flex-end" : "flex-start",
                                  width: "100%"
                                }}
                              >
                                <View style={{ gap: 3 }}>
                                  <Text style={{ fontWeight: "900", color: colorTokens.ink, fontSize: 11 }}>
                                    {getVisibleSenderName(message.senderUserId, message.senderRole, message.senderDisplayName)}
                                  </Text>
                                  <Text style={{ color: "#78716c", fontSize: 9 }}>{formatDateTime(message.createdAt)}</Text>
                                </View>
                                <Text style={{ color: "#44403c", fontSize: 12, lineHeight: 17 }}>{message.messageText}</Text>
                              </View>
                            );
                          }) : (
                            <Text style={bodyTextStyle}>Todavia no se han enviado mensajes para esta reserva.</Text>
                          )}
                        </View>

                        <TextInput
                          multiline
                          onChangeText={setMessageDraft}
                          placeholder="Escribe un mensaje relacionado con la reserva..."
                          style={[inputStyle, { minHeight: 78, textAlignVertical: "top", color: colorTokens.ink, fontSize: 12 }]}
                          value={messageDraft}
                        />
                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                          <Button disabled={isSubmitting} label="Enviar mensaje" onPress={() => void sendMessage()} />
                          <Button disabled={isSubmitting} label="Limpiar borrador" onPress={() => setMessageDraft("")} tone="secondary" />
                        </View>
                      </>
                    ) : (
                      <Text style={bodyTextStyle}>Cargando conversacion...</Text>
                    )}
                  </View>
                ) : null}
              </View>
            );
          }) : (
            <View style={[inputStyle, { gap: 6 }]}>
              <Text style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900" }}>Sin conversaciones para este estado</Text>
              <Text style={bodyTextStyle}>Cambia el estado de reserva o abre una reserva y entra a Chat para iniciar una conversacion vinculada al servicio.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}