import type { BookingOperationTokenResult, BookingOperationType, BookingOperationsTimeline, Uuid } from "@pet/types";
import { useEffect, useState } from "react";

import { getMobileBookingOperationsApiClient } from "../../core/services/supabase-mobile";

interface UseBookingOperationsResult {
  timeline: BookingOperationsTimeline | null;
  isLoading: boolean;
  isSubmittingCheckIn: boolean;
  isSubmittingCheckOut: boolean;
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
  generateOperationQrToken: (operationType: BookingOperationType) => Promise<void>;
  consumeOperationQrToken: (rawToken: string) => Promise<boolean>;
  clearOperationQrToken: () => void;
  clearQrMessages: () => void;
}

export function useBookingOperations(bookingId: Uuid | null, enabled: boolean = true): UseBookingOperationsResult {
  const [timeline, setTimeline] = useState<BookingOperationsTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);
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
    isGeneratingOperationQr,
    isConsumingOperationQr,
    errorMessage,
    actionErrorMessage,
    qrErrorMessage,
    qrSuccessMessage,
    operationQrToken,
    registerCheckIn,
    registerCheckOut,
    generateOperationQrToken,
    consumeOperationQrToken,
    clearOperationQrToken,
    clearQrMessages,
    refresh
  };
}
