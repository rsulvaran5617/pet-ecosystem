import { supportCaseStatusLabels } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { Uuid } from "@pet/types";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { useSupportWorkspace } from "../hooks/useSupportWorkspace";

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

function getStatusTone(status: "open" | "in_review" | "resolved") {
  if (status === "resolved") {
    return "active" as const;
  }

  if (status === "in_review") {
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
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="Soporte"
        title="Casos de soporte basicos para reservas"
        description="El soporte sigue anclado a una reserva y orientado a la plataforma. Este MVP no incluye disputas, chat de soporte ni adjuntos."
      >
        <View style={{ gap: 12 }}>
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Crear caso de soporte</Text>
              <StatusChip label={focusedBookingId ? "reserva seleccionada" : "esperando reserva"} tone={focusedBookingId ? "active" : "neutral"} />
            </View>
            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
              {focusedBookingId
                ? `Reserva lista para soporte: ${focusedBookingId}. Solo los participantes del hogar pueden abrir un caso.`
                : "Abre el detalle de una reserva y elige soporte. En este MVP, cada caso queda ligado a una reserva existente."}
            </Text>
            <TextInput
              onChangeText={setSubjectDraft}
              placeholder="Resumen del problema"
              style={[inputStyle, { color: "#1c1917" }]}
              value={subjectDraft}
            />
            <TextInput
              multiline
              onChangeText={setDescriptionDraft}
              placeholder="Describe lo ocurrido, lo que necesitas y cualquier contexto relevante de la reserva."
              style={[inputStyle, { minHeight: 140, textAlignVertical: "top", color: "#1c1917" }]}
              value={descriptionDraft}
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={!focusedBookingId || isSubmitting} label="Crear caso" onPress={() => void submitCase()} />
              <Button disabled={isSubmitting} label="Actualizar" onPress={() => void refresh()} tone="secondary" />
              <Button disabled={isSubmitting} label="Limpiar avisos" onPress={clearMessages} tone="secondary" />
            </View>
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Mis casos de soporte</Text>
              <StatusChip label={`${supportCases.length} caso(s)`} tone="neutral" />
            </View>
            {supportCases.length ? supportCases.map((supportCase) => (
              <Pressable key={supportCase.id} onPress={() => void openCaseDetail(supportCase.id)} style={inputStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{supportCase.subject}</Text>
                  <StatusChip label={supportCaseStatusLabels[supportCase.status]} tone={getStatusTone(supportCase.status)} />
                </View>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{supportCase.providerName} · {supportCase.serviceName}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{supportCase.petName}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(supportCase.createdAt)}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>Todavia no has creado casos de soporte.</Text>}
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Detalle del caso</Text>
              <StatusChip
                label={selectedCase ? supportCaseStatusLabels[selectedCase.status] : "sin caso seleccionado"}
                tone={selectedCase ? getStatusTone(selectedCase.status) : "neutral"}
              />
            </View>
            {isLoading && !selectedCase ? (
              <Text style={{ color: colorTokens.muted }}>Preparando el detalle del caso de soporte...</Text>
            ) : selectedCase ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Proveedor</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedCase.providerName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Servicio</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedCase.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Mascota</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedCase.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Inicio programado</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(selectedCase.scheduledStartAt)}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Asunto</Text>
                  <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.subject}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Descripcion</Text>
                  <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.descriptionText}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Estado</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{supportCaseStatusLabels[selectedCase.status]}</Text>
                </View>
                {selectedCase.adminNote ? (
                  <View style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>Nota administrativa</Text>
                    <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.adminNote}</Text>
                  </View>
                ) : null}
                {selectedCase.resolutionText ? (
                  <View style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>Resolucion</Text>
                    <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.resolutionText}</Text>
                    {selectedCase.resolvedAt ? <Text style={{ color: "#78716c", marginTop: 6 }}>{formatDateTime(selectedCase.resolvedAt)}</Text> : null}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Elige uno de tus casos existentes o abre soporte desde el detalle de una reserva para iniciar el flujo.
              </Text>
            )}
          </View>
        </View>
      </CoreSectionCard>
    </View>
  );
}
