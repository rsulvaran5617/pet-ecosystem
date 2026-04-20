import type { PetHealthDashboard, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getBrowserHealthApiClient } from "../../core/services/supabase-browser";

interface UsePetHealthSummaryResult {
  summary: PetHealthDashboard | null;
  isLoading: boolean;
  errorMessage: string | null;
}

export function usePetHealthSummary(petId: Uuid | null, enabled: boolean): UsePetHealthSummaryResult {
  const mountedRef = useRef(true);
  const [summary, setSummary] = useState<PetHealthDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !petId) {
      setSummary(null);
      setIsLoading(false);
      setErrorMessage(null);

      return () => {
        mountedRef.current = false;
      };
    }

    setIsLoading(true);
    setErrorMessage(null);

    void getBrowserHealthApiClient()
      .getPetHealthDetail(petId)
      .then((detail) => {
        if (!mountedRef.current) {
          return;
        }

        setSummary(detail.dashboard);
      })
      .catch((error) => {
        if (!mountedRef.current) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar el resumen de salud de la mascota.");
      })
      .finally(() => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, [enabled, petId]);

  return {
    summary,
    isLoading,
    errorMessage
  };
}
