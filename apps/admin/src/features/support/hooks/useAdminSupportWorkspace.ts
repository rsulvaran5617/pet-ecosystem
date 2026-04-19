"use client";

import type { SupportCaseDetail, SupportCaseStatus, SupportCaseSummary, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getAdminSupportApiClient } from "../../core/services/supabase-admin";

type SupportStatusFilter = SupportCaseStatus | "all";

interface UseAdminSupportWorkspaceResult {
  adminNoteDraft: string;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  resolutionDraft: string;
  selectedCase: SupportCaseDetail | null;
  selectedStatus: SupportCaseStatus;
  statusFilter: SupportStatusFilter;
  supportCases: SupportCaseSummary[];
  clearMessages: () => void;
  openCaseDetail: (caseId: Uuid) => Promise<void>;
  refresh: (preferredCaseId?: Uuid | null) => Promise<void>;
  saveCase: () => Promise<void>;
  setAdminNoteDraft: (value: string) => void;
  setResolutionDraft: (value: string) => void;
  setSelectedStatus: (value: SupportCaseStatus) => void;
  setStatusFilter: (value: SupportStatusFilter) => void;
}

export function useAdminSupportWorkspace(enabled: boolean): UseAdminSupportWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedCaseIdRef = useRef<Uuid | null>(null);
  const [supportCases, setSupportCases] = useState<SupportCaseSummary[]>([]);
  const [selectedCase, setSelectedCase] = useState<SupportCaseDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportStatusFilter>("all");
  const [selectedStatus, setSelectedStatus] = useState<SupportCaseStatus>("open");
  const [adminNoteDraft, setAdminNoteDraft] = useState("");
  const [resolutionDraft, setResolutionDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadCaseDetail(caseId: Uuid) {
    const detail = await getAdminSupportApiClient().getAdminSupportCaseDetail(caseId);

    if (!mountedRef.current) {
      return detail;
    }

    selectedCaseIdRef.current = detail.id;
    setSelectedCase(detail);
    setSelectedStatus(detail.status);
    setAdminNoteDraft(detail.adminNote ?? "");
    setResolutionDraft(detail.resolutionText ?? "");

    return detail;
  }

  async function refresh(preferredCaseId?: Uuid | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setSupportCases([]);
        setSelectedCase(null);
        selectedCaseIdRef.current = null;
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const summaries = await getAdminSupportApiClient().listAdminSupportCases(statusFilter === "all" ? null : statusFilter);

      if (!mountedRef.current) {
        return;
      }

      setSupportCases(summaries);

      const targetCaseId = preferredCaseId ?? selectedCaseIdRef.current ?? summaries[0]?.id ?? null;

      if (!targetCaseId) {
        selectedCaseIdRef.current = null;
        setSelectedCase(null);
        setSelectedStatus("open");
        setAdminNoteDraft("");
        setResolutionDraft("");
        return;
      }

      await loadCaseDetail(targetCaseId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load admin support cases.");
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
        setErrorMessage(error instanceof Error ? error.message : "Admin support action failed.");
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
    if (!enabled) {
      return;
    }

    void refresh(selectedCaseIdRef.current);
  }, [enabled, statusFilter]);

  return {
    adminNoteDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    resolutionDraft,
    selectedCase,
    selectedStatus,
    statusFilter,
    supportCases,
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
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the support case.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    refresh,
    async saveCase() {
      const caseId = selectedCaseIdRef.current;

      if (!caseId) {
        throw new Error("Select a support case first.");
      }

      const updatedCase = await runAction(
        () =>
          getAdminSupportApiClient().updateSupportCaseAdmin({
            caseId,
            status: selectedStatus,
            adminNote: adminNoteDraft.trim() || null,
            resolutionText: resolutionDraft.trim() || null
          }),
        "Support case updated."
      );

      await refresh(updatedCase.id);
    },
    setAdminNoteDraft,
    setResolutionDraft,
    setSelectedStatus,
    setStatusFilter
  };
}
