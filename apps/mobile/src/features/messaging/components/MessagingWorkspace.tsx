import { bookingStatusLabels } from "@pet/config";
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

type MessagingView = "bandeja" | "conversacion";
type MessageTimeFilter = "all" | "today" | "7d" | "30d";
type MessageStatusFilter = "all" | BookingStatus;

const messageTimeFilters: Array<{ id: MessageTimeFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" }
];

const messageStatusFilters: Array<{ id: MessageStatusFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "pending_approval", label: "Pendientes" },
  { id: "confirmed", label: "Confirmadas" },
  { id: "completed", label: "Completadas" },
  { id: "cancelled", label: "Canceladas" }
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getThreadActivityDate(thread: ChatThreadSummary) {
  return new Date(thread.lastMessageAt ?? thread.updatedAt ?? thread.createdAt);
}

function matchesTimeFilter(thread: ChatThreadSummary, filter: MessageTimeFilter) {
  if (filter === "all") {
    return true;
  }

  const activityDate = getThreadActivityDate(thread);
  const now = new Date();

  if (filter === "today") {
    return activityDate.toDateString() === now.toDateString();
  }

  const days = filter === "7d" ? 7 : 30;
  const from = new Date(now);
  from.setDate(now.getDate() - days);

  return activityDate >= from;
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

function FilterChip({ count, isActive, label, onPress }: { count: number; isActive: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        borderRadius: 999,
        backgroundColor: isActive ? colorTokens.accent : "rgba(0,151,143,0.06)",
        borderWidth: isActive ? 0 : 1,
        borderColor: "rgba(0,151,143,0.2)",
        paddingHorizontal: 9,
        paddingVertical: 7
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: isActive ? "#ffffff" : colorTokens.accentDark,
          fontSize: 9,
          fontWeight: "900",
          lineHeight: 12,
          textAlign: "center"
        }}
      >
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

  const [messagingView, setMessagingView] = useState<MessagingView>("bandeja");
  const [timeFilter, setTimeFilter] = useState<MessageTimeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<MessageStatusFilter>("all");
  const timeFilteredThreads = threads.filter((thread) => matchesTimeFilter(thread, timeFilter));
  const filteredThreads = timeFilteredThreads.filter((thread) => statusFilter === "all" || thread.bookingStatus === statusFilter);
  const getTimeFilterCount = (filter: MessageTimeFilter) => threads.filter((thread) => matchesTimeFilter(thread, filter)).length;
  const getStatusFilterCount = (filter: MessageStatusFilter) =>
    filter === "all" ? timeFilteredThreads.length : timeFilteredThreads.filter((thread) => thread.bookingStatus === filter).length;

  useEffect(() => {
    if (!enabled || !focusedBookingId || focusVersion === 0) {
      return;
    }

    setMessagingView("conversacion");
  }, [enabled, focusedBookingId, focusVersion]);

  const openConversation = async (threadId: Uuid) => {
    try {
      await openThread(threadId);
      setMessagingView("conversacion");
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
          <Text style={[sectionTitleStyle, messagingView === "conversacion" ? { fontSize: 15, lineHeight: 19 } : null]}>
            {messagingView === "bandeja" ? "Bandeja de reservas" : "Conversacion de reserva"}
          </Text>
          <Text style={sectionDescriptionStyle}>
            {messagingView === "bandeja"
              ? "Chats ligados a reservas activas o historicas."
              : "Conversacion vinculada a una reserva concreta."}
          </Text>
          {!errorMessage && infoMessage ? (
            <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "800", lineHeight: 14, marginTop: 3 }}>
              {infoMessage}
            </Text>
          ) : null}
        </View>
        <View style={{ gap: 9 }}>
          {messagingView === "bandeja" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <Text style={[cardTitleStyle, { flex: 1 }]}>Conversaciones por reserva</Text>
              <StatusChip label={`${filteredThreads.length} visibles`} tone="neutral" />
            </View>
            <View style={[inputStyle, { gap: 8, backgroundColor: "rgba(0,151,143,0.04)" }]}>
              <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Filtrar mensajes</Text>
              <View style={{ gap: 6 }}>
                <Text style={{ color: colorTokens.muted, fontSize: 9, fontWeight: "800" }}>Tiempo</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {messageTimeFilters.map((filter) => (
                    <FilterChip
                      key={filter.id}
                      count={getTimeFilterCount(filter.id)}
                      isActive={timeFilter === filter.id}
                      label={filter.label}
                      onPress={() => setTimeFilter(filter.id)}
                    />
                  ))}
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <Text style={{ color: colorTokens.muted, fontSize: 9, fontWeight: "800" }}>Estado de reserva</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {messageStatusFilters.map((filter) => (
                    <FilterChip
                      key={filter.id}
                      count={getStatusFilterCount(filter.id)}
                      isActive={statusFilter === filter.id}
                      label={filter.label}
                      onPress={() => setStatusFilter(filter.id)}
                    />
                  ))}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} label="Actualizar" onPress={() => void refresh()} tone="secondary" />
              <Button disabled={isSubmitting} label="Limpiar avisos" onPress={clearMessages} tone="secondary" />
            </View>
            {isLoading && !threads.length ? <Text style={bodyTextStyle}>Buscando conversaciones ligadas a tus reservas...</Text> : null}
            {filteredThreads.length ? filteredThreads.map((thread) => (
              <Pressable
                key={thread.id}
                onPress={() => void openConversation(thread.id)}
                style={[inputStyle, { gap: 7, backgroundColor: "#fffdf8" }]}
              >
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Text numberOfLines={2} style={{ flex: 1, fontWeight: "900", color: colorTokens.ink, fontSize: 13, lineHeight: 17 }}>{thread.serviceName}</Text>
                  <StatusChip label={bookingStatusLabels[thread.bookingStatus]} tone={getStatusTone(thread.bookingStatus)} />
                </View>
                <Text style={bodyTextStyle}>
                  {thread.customerDisplayName} - {thread.providerDisplayName}
                </Text>
                <Text style={bodyTextStyle}>Mascota: {thread.petName}</Text>
                <Text numberOfLines={2} style={bodyTextStyle}>
                  {thread.lastMessagePreview ?? "Todavia no hay mensajes. Abre el hilo para iniciar la conversacion de la reserva."}
                </Text>
                <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900", marginTop: 2 }}>Abrir conversacion</Text>
              </Pressable>
            )) : (
              <View style={[inputStyle, { gap: 6 }]}>
                <Text style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900" }}>Sin conversaciones para este filtro</Text>
                <Text style={bodyTextStyle}>
                  Cambia los filtros o abre una reserva y entra a Chat para iniciar una conversacion vinculada al servicio.
                </Text>
              </View>
            )}
          </View>
          ) : null}

          {messagingView === "conversacion" ? (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <Text style={[cardTitleStyle, { flex: 1 }]}>Conversacion</Text>
              {selectedThreadDetail ? (
                <StatusChip
                  label={bookingStatusLabels[selectedThreadDetail.thread.bookingStatus]}
                  tone={getStatusTone(selectedThreadDetail.thread.bookingStatus)}
                />
              ) : (
                <StatusChip label="sin hilo seleccionado" tone="neutral" />
              )}
            </View>
            <Button label="Volver a la bandeja" onPress={() => setMessagingView("bandeja")} tone="secondary" />

            {selectedThreadDetail ? (
              <>
                <View style={[inputStyle, { backgroundColor: "rgba(15,118,110,0.08)", gap: 6 }]}>
                  <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Reserva vinculada</Text>
                  <Text numberOfLines={2} style={{ fontWeight: "900", color: colorTokens.ink, fontSize: 13, lineHeight: 17 }}>{selectedThreadDetail.thread.serviceName}</Text>
                  <Text style={bodyTextStyle}>
                    {selectedThreadDetail.thread.providerDisplayName} - {selectedThreadDetail.thread.customerDisplayName}
                  </Text>
                  <Text style={bodyTextStyle}>Mascota: {selectedThreadDetail.thread.petName}</Text>
                </View>

                <View style={{ gap: 8 }}>
                  {selectedThreadDetail.messages.length ? selectedThreadDetail.messages.map((message) => {
                    const isMine = isMessageMine(message.senderUserId, message.senderRole);

                    return (
                      <View
                        key={message.id}
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: "rgba(28,25,23,0.08)",
                          backgroundColor: isMine ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.92)",
                          padding: 10,
                          gap: 6,
                          alignSelf: isMine ? "flex-end" : "flex-start",
                          width: "100%"
                        }}
                      >
                        <View style={{ gap: 4 }}>
                          <Text style={{ fontWeight: "900", color: colorTokens.ink, fontSize: 12 }}>
                            {getVisibleSenderName(message.senderUserId, message.senderRole, message.senderDisplayName)}
                          </Text>
                          <Text style={{ color: "#78716c", fontSize: 10 }}>{formatDateTime(message.createdAt)}</Text>
                        </View>
                        <Text style={{ color: "#44403c", fontSize: 12, lineHeight: 17 }}>{message.messageText}</Text>
                      </View>
                    );
                  }) : (
                    <Text style={bodyTextStyle}>
                      Todavia no se han enviado mensajes para esta reserva. Usa el compositor para iniciar la conversacion.
                    </Text>
                  )}
                </View>

                <TextInput
                  multiline
                  onChangeText={setMessageDraft}
                  placeholder="Escribe un mensaje relacionado con la reserva..."
                  style={[inputStyle, { minHeight: 90, textAlignVertical: "top", color: colorTokens.ink, fontSize: 12 }]}
                  value={messageDraft}
                />
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Enviar mensaje" onPress={() => void sendMessage()} />
                  <Button disabled={isSubmitting} label="Limpiar borrador" onPress={() => setMessageDraft("")} tone="secondary" />
                </View>
              </>
            ) : (
              <Text style={bodyTextStyle}>
                Selecciona un hilo desde la bandeja o abre mensajes desde el detalle de una reserva. En este MVP, cada conversacion queda ligada a una reserva.
              </Text>
            )}
          </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

