import type { BookingOperationsTimeline as BookingOperationsTimelineData, Uuid } from "@pet/types";
import { Pressable, Text, View } from "react-native";

import { useBookingOperations } from "../hooks/useBookingOperations";
import {
  BookingCheckInCard,
  BookingCheckOutCard,
  BookingEvidenceCard,
  BookingOperationNotesCard,
  BookingReportCardComponent
} from "./BookingOperationTimelineCards";

const containerStyle = {
  flex: 1,
  backgroundColor: "#fffdf8",
  paddingHorizontal: 16,
  paddingVertical: 14,
  gap: 14
} as const;

const sectionHeaderStyle = {
  fontSize: 14,
  fontWeight: "700" as const,
  color: "#1c1917",
  marginBottom: 8
};

const statusBadgeStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  marginBottom: 12
};

const statusTextStyle = {
  fontSize: 12,
  fontWeight: "600" as const,
  textTransform: "uppercase" as const
};

const timelineContainerStyle = {
  borderLeftWidth: 2,
  borderLeftColor: "#e7e5e4",
  paddingLeft: 16,
  paddingVertical: 8,
  gap: 0
} as const;

const emptyStateStyle = {
  textAlign: "center" as const,
  fontSize: 13,
  color: "#a8a29e",
  paddingVertical: 16
};

const errorStyle = {
  backgroundColor: "#fce7f3",
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginBottom: 12
};

const errorTextStyle = {
  fontSize: 12,
  color: "#831843",
  fontWeight: "600" as const
};

const actionButtonStyle = {
  alignItems: "center" as const,
  backgroundColor: "#0f766e",
  borderRadius: 8,
  marginTop: 12,
  paddingHorizontal: 14,
  paddingVertical: 10
};

const actionButtonDisabledStyle = {
  backgroundColor: "#99f6e4"
};

const actionButtonTextStyle = {
  color: "#fffdf8",
  fontSize: 13,
  fontWeight: "700" as const
};

const actionErrorStyle = {
  color: "#831843",
  fontSize: 12,
  fontWeight: "600" as const,
  lineHeight: 18,
  marginTop: 8
};

export function BookingOperationsTimeline({ bookingId, enabled = true }: { bookingId: Uuid; enabled?: boolean }) {
  const { timeline, isLoading, isSubmittingCheckIn, errorMessage, actionErrorMessage, registerCheckIn } =
    useBookingOperations(bookingId, enabled);

  if (!enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={containerStyle}>
        <Text style={sectionHeaderStyle}>Ejecucion Operacional</Text>
        <Text style={emptyStateStyle}>Cargando...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={containerStyle}>
        <Text style={sectionHeaderStyle}>Ejecucion Operacional</Text>
        <View style={errorStyle}>
          <Text style={errorTextStyle}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (!timeline) {
    return (
      <View style={containerStyle}>
        <Text style={sectionHeaderStyle}>Ejecucion Operacional</Text>
        <Text style={emptyStateStyle}>Sin datos operacionales</Text>
      </View>
    );
  }

  const getStateColor = (state: BookingOperationsTimelineData["operationalState"]): string => {
    switch (state) {
      case "pending":
        return "#fbbf24";
      case "checked_in":
        return "#3b82f6";
      case "checked_out":
        return "#8b5cf6";
      case "evidence_pending":
        return "#f97316";
      case "documented":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const stateLabels: Record<BookingOperationsTimelineData["operationalState"], string> = {
    pending: "Pendiente",
    checked_in: "Registro de llegada",
    checked_out: "Registro de salida",
    evidence_pending: "Evidencia requerida",
    documented: "Documentado"
  };

  return (
    <View style={containerStyle}>
      <Text style={sectionHeaderStyle}>Ejecucion Operacional</Text>

      <View style={{ ...statusBadgeStyle, backgroundColor: getStateColor(timeline.operationalState) + "22" }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: getStateColor(timeline.operationalState)
          }}
        />
        <Text style={{ ...statusTextStyle, color: getStateColor(timeline.operationalState) }}>
          {stateLabels[timeline.operationalState]}
        </Text>
      </View>

      <View style={timelineContainerStyle}>
        <BookingCheckInCard checkIn={timeline.checkIn} />
        <BookingCheckOutCard checkOut={timeline.checkOut} />
        <BookingEvidenceCard evidences={timeline.evidences} />
        <BookingReportCardComponent reportCard={timeline.reportCard} />
        <BookingOperationNotesCard notes={timeline.notes} />

        {!timeline.checkIn && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>Esperando check-in del proveedor...</Text>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmittingCheckIn}
              onPress={() => {
                void registerCheckIn();
              }}
              style={{ ...actionButtonStyle, ...(isSubmittingCheckIn ? actionButtonDisabledStyle : {}) }}
            >
              <Text style={actionButtonTextStyle}>
                {isSubmittingCheckIn ? "Registrando check-in..." : "Registrar check-in"}
              </Text>
            </Pressable>
            {actionErrorMessage ? <Text style={actionErrorStyle}>{actionErrorMessage}</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}
