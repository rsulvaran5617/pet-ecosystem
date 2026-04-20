import type { SupportCaseDetail, SupportCaseSummary, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getMobileSupportApiClient } from "../../core/services/supabase-mobile";

interface UseSupportWorkspaceResult {
  supportCases: SupportCaseSummary[];
  selectedCase: SupportCaseDetail | null;
  subjectDraft: string;
  descriptionDraft: string;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  openCaseDetail: (caseId: Uuid) => Promise<void>;
  refresh: (preferredCaseId?: Uuid | null) => Promise<void>;
  submitCase: () => Promise<void>;
  setDescriptionDraft: (value: string) => void;
  setSubjectDraft: (value: string) => void;
}

export function useSupportWorkspace(
  enabled: boolean,
  focusedBookingId: Uuid | null,
  focusVersion: number
): UseSupportWorkspaceResult {
  const mountedRef = useRef(true);
  const focusedBookingIdRef = useRef<Uuid | null>(focusedBookingId);
  const selectedCaseIdRef = useRef<Uuid | null>(null);
  const [supportCases, setSupportCases] = useState<SupportCaseSummary[]>([]);
  const [selectedCase, setSelectedCase] = useState<SupportCaseDetail | null>(null);
  const [subjectDraft, setSubjectDraft] = useState("Booking support request");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadCaseDetail(caseId: Uuid) {
    const detail = await getMobileSupportApiClient().getSupportCaseDetail(caseId);

    if (!mountedRef.current) {
      return detail;
    }

    selectedCaseIdRef.current = detail.id;
    setSelectedCase(detail);

    return detail;
  }

  async function refresh(preferredCaseId?: Uuid | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setSupportCases([]);
        setSelectedCase(null);
        selectedCaseIdRef.current = null;
        focusedBookingIdRef.current = null;
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const summaries = await getMobileSupportApiClient().listMySupportCases();

      if (!mountedRef.current) {
        return;
      }

      setSupportCases(summaries);

      const targetCaseId =
        preferredCaseId ??
        selectedCaseIdRef.current ??
        summaries.find((summary) => summary.bookingId === focusedBookingIdRef.current)?.id ??
        null;

      if (!targetCaseId) {
        selectedCaseIdRef.current = null;
        setSelectedCase(null);
        return;
      }

      await loadCaseDetail(targetCaseId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar los casos de soporte.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function runAction<T>(action: () => Promise<T>, successMessage?: string) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await action();

      if (mountedRef.current) {
        setInfoMessage(successMessage ?? null);
      }

      return result;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "La accion de soporte fallo.");
      }

      throw error;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !focusedBookingId || focusVersion === 0) {
      return;
    }

    focusedBookingIdRef.current = focusedBookingId;
    setErrorMessage(null);
    setInfoMessage("Se solicito soporte para la reserva. Cargando cualquier caso existente.");
    void refresh();
  }, [enabled, focusedBookingId, focusVersion]);

  return {
    supportCases,
    selectedCase,
    subjectDraft,
    descriptionDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    async openCaseDetail(caseId) {
      setErrorMessage(null);
      setInfoMessage(null);
      setIsLoading(true);

      try {
        await loadCaseDetail(caseId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar el caso de soporte.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    refresh,
    async submitCase() {
      const bookingId = focusedBookingIdRef.current;
      const normalizedSubject = subjectDraft.trim();
      const normalizedDescription = descriptionDraft.trim();

      if (!bookingId) {
        throw new Error("Abre primero el detalle de una reserva antes de crear un caso de soporte.");
      }

      if (!normalizedSubject) {
        throw new Error("Se requiere un asunto para el caso de soporte.");
      }

      if (!normalizedDescription) {
        throw new Error("Se requiere una descripcion para el caso de soporte.");
      }

      const createdCase = await runAction(
        () =>
          getMobileSupportApiClient().createSupportCase({
            bookingId,
            subject: normalizedSubject,
            descriptionText: normalizedDescription
          }),
        "Caso de soporte creado."
      );

      if (mountedRef.current) {
        setDescriptionDraft("");
      }

      await refresh(createdCase.id);
    },
    setDescriptionDraft,
    setSubjectDraft
  };
}

