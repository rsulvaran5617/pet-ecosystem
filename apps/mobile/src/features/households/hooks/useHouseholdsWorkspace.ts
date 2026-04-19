import type { HouseholdDetail, HouseholdsSnapshot, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getMobileHouseholdsApiClient } from "../../core/services/supabase-mobile";

interface UseHouseholdsWorkspaceResult {
  snapshot: HouseholdsSnapshot | null;
  selectedHouseholdId: Uuid | null;
  selectedHouseholdDetail: HouseholdDetail | null;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  selectHousehold: (householdId: Uuid) => Promise<void>;
  refresh: () => Promise<void>;
  runAction: <T>(action: () => Promise<T>, successMessage?: string, refreshAfter?: boolean) => Promise<T>;
}

export function useHouseholdsWorkspace(enabled: boolean): UseHouseholdsWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedHouseholdIdRef = useRef<Uuid | null>(null);
  const [snapshot, setSnapshot] = useState<HouseholdsSnapshot | null>(null);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [selectedHouseholdDetail, setSelectedHouseholdDetail] = useState<HouseholdDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadDetail(householdId: Uuid | null) {
    if (!householdId) {
      if (mountedRef.current) {
        setSelectedHouseholdDetail(null);
      }

      return;
    }

    const detail = await getMobileHouseholdsApiClient().getHouseholdDetail(householdId);

    if (!mountedRef.current) {
      return;
    }

    setSelectedHouseholdDetail(detail);
  }

  async function refresh() {
    if (!enabled) {
      if (mountedRef.current) {
        setSnapshot(null);
        setSelectedHouseholdId(null);
        selectedHouseholdIdRef.current = null;
        setSelectedHouseholdDetail(null);
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const nextSnapshot = await getMobileHouseholdsApiClient().getHouseholdsSnapshot();

      if (!mountedRef.current) {
        return;
      }

      setSnapshot(nextSnapshot);

      const nextSelectedHouseholdId =
        nextSnapshot.households.find((household) => household.id === selectedHouseholdIdRef.current)?.id ??
        nextSnapshot.households[0]?.id ??
        null;

      selectedHouseholdIdRef.current = nextSelectedHouseholdId;
      setSelectedHouseholdId(nextSelectedHouseholdId);
      await loadDetail(nextSelectedHouseholdId);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Unable to refresh the households workspace.");
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function runAction<T>(action: () => Promise<T>, successMessage?: string, refreshAfter = true) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await action();

      if (refreshAfter) {
        await refresh();
      }

      if (mountedRef.current) {
        setInfoMessage(successMessage ?? null);
      }

      return result;
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Households action failed.";

      if (mountedRef.current) {
        setErrorMessage(nextMessage);
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

  return {
    snapshot,
    selectedHouseholdId,
    selectedHouseholdDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    async selectHousehold(householdId) {
      selectedHouseholdIdRef.current = householdId;
      setSelectedHouseholdId(householdId);
      setIsLoading(true);

      try {
        await loadDetail(householdId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the household detail.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    refresh,
    runAction
  };
}
