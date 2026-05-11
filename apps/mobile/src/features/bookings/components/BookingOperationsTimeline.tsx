import type { BookingOperationType, BookingOperationsTimeline as BookingOperationsTimelineData, BookingStatus, Uuid } from "@pet/types";
import * as DocumentPicker from "expo-document-picker";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, { Circle, Path } from "react-native-svg";

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
  backgroundColor: "#ffffff",
  borderColor: "rgba(28,25,23,0.08)",
  borderRadius: 14,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 12,
  gap: 9,
  shadowColor: "#0f172a",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2
} as const;

const sectionHeaderStyle = {
  fontSize: 13,
  fontWeight: "900" as const,
  color: "#1c1917",
  lineHeight: 17
};

const statusBadgeStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 5,
  alignSelf: "flex-start" as const,
  paddingHorizontal: 8,
  paddingVertical: 5,
  borderRadius: 999
};

const statusTextStyle = {
  fontSize: 9,
  fontWeight: "900" as const,
  textTransform: "uppercase" as const
};

const timelineContainerStyle = {
  borderLeftWidth: 2,
  borderLeftColor: "rgba(0,151,143,0.3)",
  marginLeft: 14,
  paddingLeft: 16,
  paddingVertical: 4,
  gap: 2
} as const;

const emptyStateStyle = {
  textAlign: "center" as const,
  fontSize: 13,
  color: "#a8a29e",
  paddingVertical: 12
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
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10
};

const actionButtonDisabledStyle = {
  backgroundColor: "#99f6e4"
};

const actionButtonTextStyle = {
  color: "#fffdf8",
  fontSize: 11,
  fontWeight: "900" as const
};

const alternativeButtonStyle = {
  alignItems: "center" as const,
  borderColor: "rgba(28,25,23,0.12)",
  borderRadius: 10,
  borderWidth: 1,
  flex: 1,
  paddingHorizontal: 10,
  paddingVertical: 10
};

const alternativeButtonTextStyle = {
  color: "#475569",
  fontSize: 10,
  fontWeight: "800" as const,
  textAlign: "center" as const
};

const actionErrorStyle = {
  color: "#831843",
  fontSize: 12,
  fontWeight: "600" as const,
  lineHeight: 18,
  marginTop: 8
};

const actionSuccessStyle = {
  color: "#0f766e",
  fontSize: 12,
  fontWeight: "700" as const,
  lineHeight: 18,
  marginTop: 8
};

const qrPanelStyle = {
  alignItems: "center" as const,
  backgroundColor: "#ffffff",
  borderColor: "rgba(15,118,110,0.18)",
  borderRadius: 8,
  borderWidth: 1,
  gap: 8,
  marginTop: 9,
  padding: 12
};

const scannerPanelStyle = {
  backgroundColor: "#1c1917",
  borderRadius: 8,
  gap: 8,
  marginTop: 9,
  overflow: "hidden" as const,
  padding: 10
};

const scannerFrameStyle = {
  borderColor: "rgba(153,246,228,0.78)",
  borderRadius: 8,
  borderWidth: 2,
  height: 260,
  overflow: "hidden" as const
};

function TimelineStepCard({
  action,
  badgeLabel,
  detail,
  icon,
  isPending = false,
  title
}: {
  action?: ReactNode;
  badgeLabel?: string;
  detail: string;
  icon: ReactNode;
  isPending?: boolean;
  title: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 6 }}>
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 14,
          marginLeft: -31,
          marginTop: 15,
          borderWidth: 2,
          borderColor: "#ffffff",
          backgroundColor: isPending ? "#ccfbf1" : "#0f766e"
        }}
      >
        {icon}
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          borderColor: "rgba(28,25,23,0.08)",
          borderRadius: 10,
          borderWidth: 1,
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 9,
          shadowColor: "#0f172a",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <Text style={{ color: "#1c1917", flex: 1, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{title}</Text>
          {badgeLabel ? (
            <Text
              style={{
                backgroundColor: isPending ? "#fff7ed" : "#d1fae5",
                borderRadius: 999,
                color: isPending ? "#c2410c" : "#0f766e",
                fontSize: 9,
                fontWeight: "900",
                paddingHorizontal: 8,
                paddingVertical: 4
              }}
            >
              {badgeLabel}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: "#64748b", fontSize: 11, lineHeight: 15 }}>{detail}</Text>
        {action}
      </View>
    </View>
  );
}

function OperationalIcon({ color = "#0f766e", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={8} cy={7} fill="none" r={3} stroke={color} strokeWidth={2.2} />
      <Circle cx={16} cy={7} fill="none" r={3} stroke={color} strokeWidth={2.2} />
      <Path d="M8 10v5m8-5v5M5 20c1-3 3-5 7-5s6 2 7 5" fill="none" stroke={color} strokeLinecap="round" strokeWidth={2.2} />
    </Svg>
  );
}

function QrIcon({ color = "#0f766e", size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke={color} strokeLinejoin="round" strokeWidth={2.2} />
      <Path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill={color} />
    </Svg>
  );
}

function CameraIcon({ color = "#0f766e", size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M8 7 9.5 5h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" fill="none" stroke={color} strokeLinejoin="round" strokeWidth={2.2} />
      <Circle cx={12} cy={13} fill="none" r={3.2} stroke={color} strokeWidth={2.2} />
    </Svg>
  );
}

function ArrowActionIcon({ color = "#64748b", size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M9 6h7a2 2 0 0 1 2 2v8M14 12H4m0 0 4-4m-4 4 4 4" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} />
    </Svg>
  );
}

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
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScannerLocked, setIsScannerLocked] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const {
    timeline,
    isLoading,
    isSubmittingCheckIn,
    isSubmittingCheckOut,
    isUploadingEvidence,
    isGeneratingOperationQr,
    isConsumingOperationQr,
    errorMessage,
    actionErrorMessage,
    qrErrorMessage,
    qrSuccessMessage,
    operationQrToken,
    registerCheckIn,
    registerCheckOut,
    uploadEvidence,
    generateOperationQrToken,
    consumeOperationQrToken,
    clearQrMessages
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
  const hasOperationInProgress =
    isSubmittingCheckIn || isSubmittingCheckOut || isUploadingEvidence || isGeneratingOperationQr || isConsumingOperationQr;
  const ownerCanGenerateCheckInQr = isOwnerContext && isConfirmedBooking && !timeline.checkIn;
  const ownerCanGenerateCheckOutQr = isOwnerContext && isConfirmedBooking && Boolean(timeline.checkIn) && !timeline.checkOut;
  const providerQrScannerAvailable = isProviderContext && isConfirmedBooking && !timeline.checkOut;
  const providerCanScanQr = providerQrScannerAvailable && !hasOperationInProgress;
  const providerCanUploadEvidence =
    isProviderContext &&
    isConfirmedBooking &&
    Boolean(timeline.checkIn) &&
    Boolean(timeline.checkOut) &&
    timeline.evidences.length === 0;
  const ownerQrOperationType: BookingOperationType | null = ownerCanGenerateCheckInQr
    ? "check_in"
    : ownerCanGenerateCheckOutQr
      ? "check_out"
      : null;
  const ownerQrHelperText =
    ownerQrOperationType === "check_in"
      ? "Muestra este codigo al proveedor para registrar el inicio del servicio."
      : "Muestra este codigo al proveedor para registrar el cierre del servicio.";
  const openScanner = async () => {
    clearQrMessages();
    setCameraErrorMessage(null);

    if (!cameraPermission?.granted) {
      const nextPermission = await requestCameraPermission();

      if (!nextPermission.granted) {
        setCameraErrorMessage("Necesitamos acceso a la camara para escanear el codigo QR.");
        return;
      }
    }

    setIsScannerLocked(false);
    setIsScannerOpen(true);
  };
  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (isScannerLocked || isConsumingOperationQr) {
      return;
    }

    const rawToken = result.data.trim();

    if (!rawToken) {
      return;
    }

    setIsScannerLocked(true);
    const consumed = await consumeOperationQrToken(rawToken);

    if (consumed) {
      setIsScannerOpen(false);
      return;
    }

    setIsScannerLocked(false);
  };
  const handleUploadEvidence = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*"
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      return;
    }

    try {
      const response = await fetch(asset.uri);
      const fileBytes = await response.arrayBuffer();

      await uploadEvidence({
        fileBytes,
        fileName: asset.name,
        mimeType: asset.mimeType ?? null
      });
    } catch {
      // El hook publica el mensaje de error visible para el usuario.
    }
  };

  return (
    <View style={containerStyle}>
      <View style={{ gap: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flexDirection: "row", flex: 1, gap: 8, alignItems: "center" }}>
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "rgba(0,151,143,0.1)"
              }}
            >
              <OperationalIcon size={17} />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={[sectionHeaderStyle, { flex: 1 }]}>
              Ejecucion operacional
            </Text>
          </View>
          <View style={{ ...statusBadgeStyle, backgroundColor: getStateColor(timeline.operationalState) + "22" }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: getStateColor(timeline.operationalState)
              }}
            />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74} style={{ ...statusTextStyle, color: getStateColor(timeline.operationalState) }}>
              {stateLabels[timeline.operationalState]}
            </Text>
          </View>
        </View>
        <Text style={{ color: "#64748b", fontSize: 10, lineHeight: 14 }}>
          Sigue los pasos para completar el servicio.
        </Text>
      </View>

      <View style={timelineContainerStyle}>
        {providerQrScannerAvailable ? (
          <View style={{ marginBottom: 8, marginLeft: -2 }}>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderColor: "rgba(0,151,143,0.18)",
                borderRadius: 10,
                borderWidth: 1,
                gap: 9,
                padding: 10
              }}
            >
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    backgroundColor: "rgba(0,151,143,0.1)"
                  }}
                >
                  <QrIcon size={20} />
                </View>
                <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>
                    Escanear QR operacional
                  </Text>
                  <Text style={{ color: "#64748b", fontSize: 10, lineHeight: 14 }}>
                    Escanea el QR del owner para registrar entrada o salida.
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={!providerCanScanQr}
                onPress={() => {
                  void openScanner();
                }}
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  gap: 7,
                  justifyContent: "center",
                  backgroundColor: providerCanScanQr ? "#0f766e" : "#99f6e4",
                  borderRadius: 10,
                  minHeight: 42,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  width: "100%"
                }}
              >
                <QrIcon color="#ffffff" size={18} />
                <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "900" }}>
                  {isConsumingOperationQr ? "Validando" : "Escanear"}
                </Text>
              </Pressable>
            </View>
            {cameraErrorMessage ? <Text style={actionErrorStyle}>{cameraErrorMessage}</Text> : null}
            {qrErrorMessage ? <Text style={actionErrorStyle}>{qrErrorMessage}</Text> : null}
            {qrSuccessMessage ? <Text style={actionSuccessStyle}>{qrSuccessMessage}</Text> : null}
          </View>
        ) : null}

        <BookingCheckInCard checkIn={timeline.checkIn} />
        <BookingCheckOutCard checkOut={timeline.checkOut} />
        <BookingEvidenceCard evidences={timeline.evidences} />
        {providerCanUploadEvidence ? (
          <TimelineStepCard
            action={
              <Pressable
                accessibilityRole="button"
                disabled={isUploadingEvidence}
                onPress={() => {
                  void handleUploadEvidence();
                }}
                style={{
                  ...actionButtonStyle,
                  ...(isUploadingEvidence ? actionButtonDisabledStyle : {}),
                  backgroundColor: isUploadingEvidence ? "#99f6e4" : "#ffffff",
                  borderColor: "rgba(0,151,143,0.72)",
                  borderWidth: 1,
                  marginTop: 2
                }}
              >
                <Text style={{ ...actionButtonTextStyle, color: "#0f766e" }}>
                  {isUploadingEvidence ? "Cargando evidencia..." : "Cargar evidencia de actividad"}
                </Text>
              </Pressable>
            }
            badgeLabel="Pendiente"
            detail="Carga fotos o un resumen de la actividad realizada."
            icon={<CameraIcon />}
            isPending
            title="Evidencia del servicio"
          />
        ) : null}
        <BookingReportCardComponent reportCard={timeline.reportCard} />
        <BookingOperationNotesCard notes={timeline.notes} />

        {isScannerOpen && providerQrScannerAvailable ? (
          <View style={scannerPanelStyle}>
            <Text style={{ color: "#f8fafc", fontSize: 13, fontWeight: "700", textAlign: "center" }}>
              Escanea el codigo mostrado por el propietario
            </Text>
            <View style={scannerFrameStyle}>
              <CameraView
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                facing="back"
                onBarcodeScanned={isScannerLocked ? undefined : handleBarcodeScanned}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={{ color: "#d6d3d1", fontSize: 12, lineHeight: 17, textAlign: "center" }}>
              {isConsumingOperationQr || isScannerLocked ? "Validando QR..." : "Apunta la camara al QR temporal del owner."}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={isConsumingOperationQr}
              onPress={() => {
                setIsScannerOpen(false);
                setIsScannerLocked(false);
              }}
              style={{ ...actionButtonStyle, backgroundColor: "#fffdf8" }}
            >
              <Text style={{ ...actionButtonTextStyle, color: "#1c1917" }}>Cerrar scanner</Text>
            </Pressable>
          </View>
        ) : null}

        {isProviderContext && (!timeline.checkIn || (timeline.checkIn && !timeline.checkOut)) ? (
          <View style={{ marginLeft: -2, marginTop: 8 }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={{ backgroundColor: "#e7e5e4", flex: 1, height: 1 }} />
              <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800" }}>Acciones alternativas</Text>
              <View style={{ backgroundColor: "#e7e5e4", flex: 1, height: 1 }} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {!timeline.checkIn ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmittingCheckIn}
                  onPress={() => {
                    void registerCheckIn();
                  }}
                  style={{ ...alternativeButtonStyle, ...(isSubmittingCheckIn ? { opacity: 0.65 } : {}) }}
                >
                  <ArrowActionIcon />
                  <Text style={[alternativeButtonTextStyle, { marginTop: 4 }]}>
                    {isSubmittingCheckIn ? "Registrando..." : "Registrar check-in manual"}
                  </Text>
                </Pressable>
              ) : null}
              {timeline.checkIn && !timeline.checkOut ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmittingCheckOut}
                  onPress={() => {
                    void registerCheckOut();
                  }}
                  style={{ ...alternativeButtonStyle, ...(isSubmittingCheckOut ? { opacity: 0.65 } : {}) }}
                >
                  <ArrowActionIcon />
                  <Text style={[alternativeButtonTextStyle, { marginTop: 4 }]}>
                    {isSubmittingCheckOut ? "Registrando..." : "Registrar check-out manual"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {actionErrorMessage ? <Text style={actionErrorStyle}>{actionErrorMessage}</Text> : null}
          </View>
        ) : null}

        {ownerQrOperationType ? (
          <View style={{ marginLeft: -2, marginTop: 8 }}>
            {!timeline.checkIn ? (
              <Text style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 6 }}>Esperando check-in por QR...</Text>
            ) : null}
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#ffffff",
                borderColor: "rgba(0,151,143,0.18)",
                borderRadius: 10,
                borderWidth: 1,
                flexDirection: "row",
                gap: 10,
                padding: 10
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>{getQrActionLabel(ownerQrOperationType)}</Text>
                <Text style={{ color: "#64748b", fontSize: 10, lineHeight: 14 }}>
                  Genera el codigo temporal para que el proveedor lo escanee.
                </Text>
              </View>
              <Pressable
                accessibilityLabel={getQrActionLabel(ownerQrOperationType)}
                accessibilityRole="button"
                disabled={isGeneratingOperationQr}
                onPress={() => {
                  void generateOperationQrToken(ownerQrOperationType);
                }}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isGeneratingOperationQr ? "#99f6e4" : "#0f766e",
                  borderRadius: 12,
                  height: 48,
                  width: 56
                }}
              >
                <QrIcon color="#ffffff" size={22} />
                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900", marginTop: 2 }}>
                  {isGeneratingOperationQr ? "..." : "QR"}
                </Text>
              </Pressable>
            </View>
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
