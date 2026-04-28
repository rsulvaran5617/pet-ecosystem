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
        eyebrow="Mensajes"
        title="Bandeja ligada a reservas"
        description="Los hilos se crean automaticamente desde las reservas. En este MVP, solo el cliente que reservo y el propietario del proveedor pueden leer o enviar mensajes."
      >
        <View style={{ gap: 12 }}>
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Bandeja</Text>
              <StatusChip label={`${threads.length} hilo(s)`} tone="neutral" />
            </View>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} label="Actualizar" onPress={() => void refresh()} tone="secondary" />
              <Button disabled={isSubmitting} label="Limpiar avisos" onPress={clearMessages} tone="secondary" />
            </View>
            {isLoading && !threads.length ? <Text style={{ color: colorTokens.muted }}>Buscando conversaciones ligadas a tus reservas...</Text> : null}
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
                <Text style={{ color: colorTokens.muted }}>Mascota: {thread.petName}</Text>
                <Text style={{ color: colorTokens.muted }}>
                  {thread.lastMessagePreview ?? "Todavia no hay mensajes. Abre el hilo para iniciar la conversacion de la reserva."}
                </Text>
              </Pressable>
            )) : (
              <View style={[inputStyle, { gap: 6 }]}>
                <Text style={{ color: "#1c1917", fontWeight: "700" }}>Sin conversaciones por ahora</Text>
                <Text style={{ color: colorTokens.muted }}>
                  Abre una reserva y entra a Chat para iniciar o continuar una conversacion vinculada al servicio.
                </Text>
              </View>
            )}
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Detalle del hilo</Text>
              {selectedThreadDetail ? (
                <StatusChip
                  label={bookingStatusLabels[selectedThreadDetail.thread.bookingStatus]}
                  tone={getStatusTone(selectedThreadDetail.thread.bookingStatus)}
                />
              ) : (
                <StatusChip label="sin hilo seleccionado" tone="neutral" />
              )}
            </View>

            {selectedThreadDetail ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Servicio</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedThreadDetail.thread.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Mascota</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedThreadDetail.thread.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Cliente</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedThreadDetail.thread.customerDisplayName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Proveedor</Text>
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
                      Todavia no se han enviado mensajes para esta reserva. Usa el compositor para iniciar la conversacion.
                    </Text>
                  )}
                </View>

                <TextInput
                  multiline
                  onChangeText={setMessageDraft}
                  placeholder="Escribe un mensaje relacionado con la reserva..."
                  style={[inputStyle, { minHeight: 110, textAlignVertical: "top", color: "#1c1917" }]}
                  value={messageDraft}
                />
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Enviar mensaje" onPress={() => void sendMessage()} />
                  <Button disabled={isSubmitting} label="Limpiar borrador" onPress={() => setMessageDraft("")} tone="secondary" />
                </View>
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Selecciona un hilo desde la bandeja o abre mensajes desde el detalle de una reserva. En este MVP, cada conversacion queda ligada a una reserva.
              </Text>
            )}
          </View>
        </View>
      </CoreSectionCard>
    </View>
  );
}

