import type { BookingOperationsTimeline, Uuid } from "@pet/types";
import { useEffect, useState } from "react";

import { getMobileBookingOperationsApiClient } from "../../core/services/supabase-mobile";

interface UseBookingOperationsResult {
  timeline: BookingOperationsTimeline | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

export function useBookingOperations(bookingId: Uuid | null, enabled: boolean = true): UseBookingOperationsResult {
  const [timeline, setTimeline] = useState<BookingOperationsTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    refresh();
  }, [bookingId, enabled]);

  return {
    timeline,
    isLoading,
    errorMessage,
    refresh
  };
}
