import type { BookingEvidence, BookingOperationTokenResult, BookingOperationType, BookingOperationsTimeline, Uuid } from "@pet/types";
import { useEffect, useState } from "react";

import { getMobileBookingOperationsApiClient } from "../../core/services/supabase-mobile";

interface UseBookingOperationsResult {
  timeline: BookingOperationsTimeline | null;
  isLoading: boolean;
  isSubmittingCheckIn: boolean;
  isSubmittingCheckOut: boolean;
  isUploadingEvidence: boolean;
  isGeneratingOperationQr: boolean;
  isConsumingOperationQr: boolean;
  errorMessage: string | null;
  actionErrorMessage: string | null;
  qrErrorMessage: string | null;
  qrSuccessMessage: string | null;
  operationQrToken: BookingOperationTokenResult | null;
  refresh: () => Promise<void>;
  registerCheckIn: () => Promise<void>;
  registerCheckOut: () => Promise<void>;
  uploadEvidence: (input: { fileBytes: ArrayBuffer; fileName: string; mimeType?: string | null }) => Promise<BookingEvidence | null>;
  generateOperationQrToken: (operationType: BookingOperationType) => Promise<void>;
  consumeOperationQrToken: (rawToken: string) => Promise<boolean>;
  clearOperationQrToken: () => void;
  clearQrMessages: () => void;
}

const evidenceUploadFallbackMessage =
  "No se pudo cargar la evidencia documental. Verifica que la reserva tenga check-in y check-out, y que tu usuario tenga permisos de proveedor.";

function getEvidenceUploadErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return evidenceUploadFallbackMessage;
  }

  const message = error.message.trim();
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("bucket") && normalizedMessage.includes("not found")) {
    return "No se encontro el bucket privado de evidencia documental. Verifica la configuracion de Storage antes de reintentar.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("not authorized") ||
    normalizedMessage.includes("unauthorized")
  ) {
    return `${evidenceUploadFallbackMessage} Detalle tecnico: ${message}`;
  }

  return `No se pudo cargar la evidencia documental. Detalle tecnico: ${message}`;
}

export function useBookingOperations(bookingId: Uuid | null, enabled: boolean = true): UseBookingOperationsResult {
  const [timeline, setTimeline] = useState<BookingOperationsTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isGeneratingOperationQr, setIsGeneratingOperationQr] = useState(false);
  const [isConsumingOperationQr, setIsConsumingOperationQr] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);
  const [qrSuccessMessage, setQrSuccessMessage] = useState<string | null>(null);
  const [operationQrToken, setOperationQrToken] = useState<BookingOperationTokenResult | null>(null);

  const refresh = async () => {
    if (!bookingId || !enabled) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const client = getMobileBookingOperationsApiClient();
      const data = await client.getBookingOperations(bookingId);
      setTimeline(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load booking operations";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const registerCheckIn = async () => {
    if (!bookingId || !enabled || isSubmittingCheckIn) return;

    setIsSubmittingCheckIn(true);
    setActionErrorMessage(null);

    try {
      const client = getMobileBookingOperationsApiClient();
      await client.createCheckIn(bookingId, {});
      await refresh();
    } catch {
      setActionErrorMessage(
        "No se pudo registrar el check-in. Verifica que la reserva este confirmada y que tu usuario tenga permisos de proveedor."
      );
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const registerCheckOut = async () => {
    if (!bookingId || !enabled || isSubmittingCheckOut) return;

    setIsSubmittingCheckOut(true);
    setActionErrorMessage(null);

    try {
      const client = getMobileBookingOperationsApiClient();
      await client.createCheckOut(bookingId);
      await refresh();
    } catch {
      setActionErrorMessage(
        "No se pudo registrar el check-out. Verifica que la reserva tenga check-in y que tu usuario tenga permisos de proveedor."
      );
    } finally {
      setIsSubmittingCheckOut(false);
    }
  };

  const uploadEvidence = async (input: { fileBytes: ArrayBuffer; fileName: string; mimeType?: string | null }) => {
    if (!bookingId || !enabled || isUploadingEvidence) return null;

    setIsUploadingEvidence(true);
    setActionErrorMessage(null);

    try {
      const client = getMobileBookingOperationsApiClient();
      const evidence = await client.uploadEvidence(bookingId, input);
      await refresh();
      return evidence;
    } catch (error) {
      setActionErrorMessage(getEvidenceUploadErrorMessage(error));
      return null;
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const generateOperationQrToken = async (operationType: BookingOperationType) => {
    if (!bookingId || !enabled || isGeneratingOperationQr) return;

    setIsGeneratingOperationQr(true);
    setQrErrorMessage(null);
    setQrSuccessMessage(null);

    try {
      const client = getMobileBookingOperationsApiClient();
      const token = await client.createBookingOperationToken(bookingId, operationType);
      setOperationQrToken(token);
    } catch {
      setQrErrorMessage(
        "No se pudo generar el QR. Verifica que la reserva este confirmada y que tengas permisos sobre este hogar."
      );
    } finally {
      setIsGeneratingOperationQr(false);
    }
  };

  const consumeOperationQrToken = async (rawToken: string) => {
    if (!bookingId || !enabled || isConsumingOperationQr) return false;

    setIsConsumingOperationQr(true);
    setQrErrorMessage(null);
    setQrSuccessMessage(null);

    try {
      const client = getMobileBookingOperationsApiClient();
      await client.consumeBookingOperationToken(rawToken);
      await refresh();
      setQrSuccessMessage("Operacion registrada correctamente.");
      return true;
    } catch {
      setQrErrorMessage("No se pudo validar el QR. Puede haber expirado, ya fue usado o no corresponde a esta reserva.");
      return false;
    } finally {
      setIsConsumingOperationQr(false);
    }
  };

  const clearOperationQrToken = () => {
    setOperationQrToken(null);
    setQrErrorMessage(null);
  };

  const clearQrMessages = () => {
    setQrErrorMessage(null);
    setQrSuccessMessage(null);
  };

  useEffect(() => {
    refresh();
  }, [bookingId, enabled]);

  useEffect(() => {
    clearOperationQrToken();
  }, [bookingId]);

  return {
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
    clearOperationQrToken,
    clearQrMessages,
    refresh
  };
}
