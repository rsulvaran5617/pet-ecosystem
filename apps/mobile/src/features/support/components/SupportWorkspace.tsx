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
        eyebrow="EP-07 / Support"
        title="Basic booking support cases"
        description="Support stays platform-facing and anchored to a booking. This slice does not include disputes, support chat or attachments."
      >
        <View style={{ gap: 12 }}>
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Create support case</Text>
              <StatusChip label={focusedBookingId ? "booking selected" : "awaiting booking"} tone={focusedBookingId ? "active" : "neutral"} />
            </View>
            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
              {focusedBookingId
                ? `Booking focus ready: ${focusedBookingId}. Only household-side participants can open a case.`
                : "Open a booking detail above and choose support. Support stays tied to an existing booking in this MVP."}
            </Text>
            <TextInput
              onChangeText={setSubjectDraft}
              placeholder="Issue summary"
              style={[inputStyle, { color: "#1c1917" }]}
              value={subjectDraft}
            />
            <TextInput
              multiline
              onChangeText={setDescriptionDraft}
              placeholder="Describe what happened, what you need and any relevant booking context."
              style={[inputStyle, { minHeight: 140, textAlignVertical: "top", color: "#1c1917" }]}
              value={descriptionDraft}
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={!focusedBookingId || isSubmitting} label="Create case" onPress={() => void submitCase()} />
              <Button disabled={isSubmitting} label="Refresh" onPress={() => void refresh()} tone="secondary" />
              <Button disabled={isSubmitting} label="Clear notices" onPress={clearMessages} tone="secondary" />
            </View>
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>My support cases</Text>
              <StatusChip label={`${supportCases.length} case(s)`} tone="neutral" />
            </View>
            {supportCases.length ? supportCases.map((supportCase) => (
              <Pressable key={supportCase.id} onPress={() => void openCaseDetail(supportCase.id)} style={inputStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{supportCase.subject}</Text>
                  <StatusChip label={supportCaseStatusLabels[supportCase.status]} tone={getStatusTone(supportCase.status)} />
                </View>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{supportCase.providerName} - {supportCase.serviceName}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{supportCase.petName}</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(supportCase.createdAt)}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>No support cases created yet.</Text>}
          </View>

          <View style={cardStyle}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Case detail</Text>
              <StatusChip
                label={selectedCase ? supportCaseStatusLabels[selectedCase.status] : "no case selected"}
                tone={selectedCase ? getStatusTone(selectedCase.status) : "neutral"}
              />
            </View>
            {isLoading && !selectedCase ? (
              <Text style={{ color: colorTokens.muted }}>Loading support data from Supabase...</Text>
            ) : selectedCase ? (
              <>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Provider</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedCase.providerName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Service</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedCase.serviceName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Pet</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedCase.petName}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Scheduled start</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatDateTime(selectedCase.scheduledStartAt)}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Subject</Text>
                  <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.subject}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Description</Text>
                  <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.descriptionText}</Text>
                </View>
                <View style={inputStyle}>
                  <Text style={{ fontWeight: "600", color: "#1c1917" }}>Status</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{supportCaseStatusLabels[selectedCase.status]}</Text>
                </View>
                {selectedCase.adminNote ? (
                  <View style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>Admin note</Text>
                    <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.adminNote}</Text>
                  </View>
                ) : null}
                {selectedCase.resolutionText ? (
                  <View style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>Resolution</Text>
                    <Text style={{ color: "#44403c", marginTop: 6, lineHeight: 20 }}>{selectedCase.resolutionText}</Text>
                    {selectedCase.resolvedAt ? <Text style={{ color: "#78716c", marginTop: 6 }}>{formatDateTime(selectedCase.resolvedAt)}</Text> : null}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Pick one of your existing cases or open support from a booking detail to start the flow.
              </Text>
            )}
          </View>
        </View>
      </CoreSectionCard>
    </View>
  );
}
