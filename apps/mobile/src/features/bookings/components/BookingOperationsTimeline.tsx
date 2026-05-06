import type { BookingOperationType, BookingOperationsTimeline as BookingOperationsTimelineData, BookingStatus, Uuid } from "@pet/types";
import { Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

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

const qrPanelStyle = {
  alignItems: "center" as const,
  backgroundColor: "#ffffff",
  borderColor: "rgba(15,118,110,0.18)",
  borderRadius: 8,
  borderWidth: 1,
  gap: 10,
  marginTop: 12,
  padding: 14
};

function formatExpiryLabel(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getQrActionLabel(operationType: BookingOperationType) {
  return operationType === "check_in" ? "Mostrar QR de check-in" : "Mostrar QR de check-out";
}

export function BookingOperationsTimeline({
  bookingId,
  bookingStatus,
  context = "provider",
  enabled = true
}: {
  bookingId: Uuid;
  bookingStatus?: BookingStatus;
  context?: "owner" | "provider";
  enabled?: boolean;
}) {
  const {
    timeline,
    isLoading,
    isSubmittingCheckIn,
    isSubmittingCheckOut,
    isGeneratingOperationQr,
    errorMessage,
    actionErrorMessage,
    qrErrorMessage,
    operationQrToken,
    registerCheckIn,
    registerCheckOut,
    generateOperationQrToken
  } = useBookingOperations(bookingId, enabled);

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
  const isOwnerContext = context === "owner";
  const isProviderContext = context === "provider";
  const isConfirmedBooking = bookingStatus === "confirmed";
  const ownerCanGenerateCheckInQr = isOwnerContext && isConfirmedBooking && !timeline.checkIn;
  const ownerCanGenerateCheckOutQr = isOwnerContext && isConfirmedBooking && Boolean(timeline.checkIn) && !timeline.checkOut;
  const ownerQrOperationType: BookingOperationType | null = ownerCanGenerateCheckInQr
    ? "check_in"
    : ownerCanGenerateCheckOutQr
      ? "check_out"
      : null;
  const ownerQrHelperText =
    ownerQrOperationType === "check_in"
      ? "Muestra este codigo al proveedor para registrar el inicio del servicio."
      : "Muestra este codigo al proveedor para registrar el cierre del servicio.";

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

        {!timeline.checkIn && isProviderContext && (
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

        {timeline.checkIn && !timeline.checkOut && isProviderContext && (
          <View style={{ marginTop: 12 }}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmittingCheckOut}
              onPress={() => {
                void registerCheckOut();
              }}
              style={{ ...actionButtonStyle, ...(isSubmittingCheckOut ? actionButtonDisabledStyle : {}) }}
            >
              <Text style={actionButtonTextStyle}>
                {isSubmittingCheckOut ? "Registrando check-out..." : "Registrar check-out"}
              </Text>
            </Pressable>
            {actionErrorMessage ? <Text style={actionErrorStyle}>{actionErrorMessage}</Text> : null}
          </View>
        )}

        {ownerQrOperationType ? (
          <View style={{ marginTop: 12 }}>
            {!timeline.checkIn ? (
              <Text style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>Esperando check-in por QR...</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isGeneratingOperationQr}
              onPress={() => {
                void generateOperationQrToken(ownerQrOperationType);
              }}
              style={{ ...actionButtonStyle, ...(isGeneratingOperationQr ? actionButtonDisabledStyle : {}) }}
            >
              <Text style={actionButtonTextStyle}>
                {isGeneratingOperationQr ? "Generando QR..." : getQrActionLabel(ownerQrOperationType)}
              </Text>
            </Pressable>
            {qrErrorMessage ? <Text style={actionErrorStyle}>{qrErrorMessage}</Text> : null}
          </View>
        ) : null}

        {isOwnerContext && timeline.checkIn && timeline.checkOut ? (
          <Text style={{ color: "#0f766e", fontSize: 13, fontWeight: "700", marginTop: 12 }}>
            Operacion completada para check-in y check-out.
          </Text>
        ) : null}

        {operationQrToken ? (
          <View style={qrPanelStyle}>
            <Text style={{ color: "#0f766e", fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>
              Codigo temporal
            </Text>
            <QRCode backgroundColor="#ffffff" color="#1c1917" size={180} value={operationQrToken.token} />
            <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "700" }}>
              Expira: {formatExpiryLabel(operationQrToken.expiresAt)}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 17, textAlign: "center" }}>
              {ownerQrHelperText} No compartas este codigo fuera de esta reserva.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
