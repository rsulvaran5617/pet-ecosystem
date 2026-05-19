import { colorTokens, visualTokens } from "@pet/ui";
import { ScrollView, Text, View } from "react-native";

export type BookingProgressStepId = "service" | "pet" | "slot" | "summary" | "confirm";
export type BookingProgressStepStatus = "completed" | "active" | "pending" | "locked";

interface BookingProgressStep {
  id: BookingProgressStepId;
  label: string;
  marker: string;
  status: BookingProgressStepStatus;
}

const stepLabels: Array<{ id: BookingProgressStepId; label: string; marker: string }> = [
  { id: "service", label: "Servicio", marker: "S" },
  { id: "pet", label: "Mascota", marker: "M" },
  { id: "slot", label: "Horario", marker: "H" },
  { id: "summary", label: "Resumen", marker: "R" },
  { id: "confirm", label: "Confirmar", marker: "OK" }
];

function getStepColors(status: BookingProgressStepStatus) {
  if (status === "completed") {
    return {
      backgroundColor: "rgba(0,151,143,0.12)",
      borderColor: "rgba(0,151,143,0.32)",
      markerBackgroundColor: colorTokens.accent,
      markerColor: "#ffffff",
      labelColor: colorTokens.accentDark
    };
  }

  if (status === "active") {
    return {
      backgroundColor: colorTokens.accent,
      borderColor: colorTokens.accent,
      markerBackgroundColor: "#ffffff",
      markerColor: colorTokens.accentDark,
      labelColor: "#ffffff"
    };
  }

  if (status === "locked") {
    return {
      backgroundColor: "rgba(148,163,184,0.08)",
      borderColor: "rgba(148,163,184,0.14)",
      markerBackgroundColor: "rgba(148,163,184,0.16)",
      markerColor: "#94a3b8",
      labelColor: "#94a3b8"
    };
  }

  return {
    backgroundColor: "#f8fafc",
    borderColor: "rgba(148,163,184,0.22)",
    markerBackgroundColor: "rgba(0,151,143,0.08)",
    markerColor: colorTokens.muted,
    labelColor: colorTokens.muted
  };
}

export function BookingProgressStepper({
  activeStep,
  completedSteps
}: {
  activeStep: BookingProgressStepId;
  completedSteps: BookingProgressStepId[];
}) {
  const completedStepSet = new Set(completedSteps);
  const activeStepIndex = stepLabels.findIndex((step) => step.id === activeStep);
  const steps: BookingProgressStep[] = stepLabels.map((step, index) => {
    const status: BookingProgressStepStatus = completedStepSet.has(step.id)
      ? "completed"
      : step.id === activeStep
        ? "active"
        : index > activeStepIndex
          ? "locked"
          : "pending";

    return { ...step, status };
  });

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
        Progreso de reserva
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 7, paddingRight: 4 }}>
          {steps.map((step) => {
            const colors = getStepColors(step.status);
            const markerLabel = step.status === "completed" ? "✓" : step.marker;

            return (
              <View
                key={step.id}
                style={{
                  minWidth: 78,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  backgroundColor: colors.backgroundColor,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 7,
                  paddingVertical: 6,
                  ...visualTokens.mobile.softShadow
                }}
              >
                <View
                  style={{
                    width: 19,
                    height: 19,
                    borderRadius: 999,
                    backgroundColor: colors.markerBackgroundColor,
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Text style={{ color: colors.markerColor, fontSize: 9, fontWeight: "900", lineHeight: 11 }}>
                    {markerLabel}
                  </Text>
                </View>
                <Text numberOfLines={1} style={{ color: colors.labelColor, flex: 1, fontSize: 9, fontWeight: "900" }}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
