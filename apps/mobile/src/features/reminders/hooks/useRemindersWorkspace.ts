import type { CalendarEvent, HouseholdsSnapshot, PetSummary, Reminder, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import {
  getMobileHouseholdsApiClient,
  getMobilePetsApiClient,
  getMobileRemindersApiClient
} from "../../core/services/supabase-mobile";

interface UseRemindersWorkspaceResult {
  householdSnapshot: HouseholdsSnapshot | null;
  pets: PetSummary[];
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
  selectedHouseholdId: Uuid | null;
  selectedPetId: Uuid | null;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  selectHousehold: (householdId: Uuid) => Promise<void>;
  selectPet: (petId: Uuid | null) => Promise<void>;
  refresh: () => Promise<void>;
  runAction: <T>(action: () => Promise<T>, successMessage?: string, refreshAfter?: boolean) => Promise<T>;
}

export function useRemindersWorkspace(enabled: boolean): UseRemindersWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedHouseholdIdRef = useRef<Uuid | null>(null);
  const selectedPetIdRef = useRef<Uuid | null>(null);
  const [householdSnapshot, setHouseholdSnapshot] = useState<HouseholdsSnapshot | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<Uuid | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadReminderData(householdId: Uuid | null, petId: Uuid | null) {
    if (!householdId) {
      if (mountedRef.current) {
        setReminders([]);
        setCalendarEvents([]);
      }

      return;
    }

    const [nextReminders, nextCalendarEvents] = await Promise.all([
      getMobileRemindersApiClient().listReminders({
        householdId,
        petId,
        includeCompleted: true
      }),
      getMobileRemindersApiClient().listCalendarEvents({
        householdId,
        petId,
        includeCompleted: true
      })
    ]);

    if (!mountedRef.current) {
      return;
    }

    setReminders(nextReminders);
    setCalendarEvents(nextCalendarEvents);
  }

  async function loadPets(householdId: Uuid | null) {
    if (!householdId) {
      if (mountedRef.current) {
        setPets([]);
        setSelectedPetId(null);
        selectedPetIdRef.current = null;
        setReminders([]);
        setCalendarEvents([]);
      }

      return;
    }

    const nextPets = await getMobilePetsApiClient().listHouseholdPets(householdId);

    if (!mountedRef.current) {
      return;
    }

    setPets(nextPets);

    const nextSelectedPetId = nextPets.find((pet) => pet.id === selectedPetIdRef.current)?.id ?? null;
    selectedPetIdRef.current = nextSelectedPetId;
    setSelectedPetId(nextSelectedPetId);
    await loadReminderData(householdId, nextSelectedPetId);
  }

  async function refresh() {
    if (!enabled) {
      if (mountedRef.current) {
        setHouseholdSnapshot(null);
        setPets([]);
        setReminders([]);
        setCalendarEvents([]);
        setSelectedHouseholdId(null);
        setSelectedPetId(null);
        selectedHouseholdIdRef.current = null;
        selectedPetIdRef.current = null;
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const nextHouseholdSnapshot = await getMobileHouseholdsApiClient().getHouseholdsSnapshot();

      if (!mountedRef.current) {
        return;
      }

      setHouseholdSnapshot(nextHouseholdSnapshot);

      const nextSelectedHouseholdId =
        nextHouseholdSnapshot.households.find((household) => household.id === selectedHouseholdIdRef.current)?.id ??
        nextHouseholdSnapshot.households[0]?.id ??
        null;

      selectedHouseholdIdRef.current = nextSelectedHouseholdId;
      setSelectedHouseholdId(nextSelectedHouseholdId);
      await loadPets(nextSelectedHouseholdId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to refresh the reminders workspace.");
      }
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
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Reminder action failed.");
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
    householdSnapshot,
    pets,
    reminders,
    calendarEvents,
    selectedHouseholdId,
    selectedPetId,
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
      selectedPetIdRef.current = null;
      setSelectedHouseholdId(householdId);
      setIsLoading(true);

      try {
        await loadPets(householdId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load household reminders.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    async selectPet(petId) {
      selectedPetIdRef.current = petId;
      setSelectedPetId(petId);
      setIsLoading(true);

      try {
        await loadReminderData(selectedHouseholdIdRef.current, petId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load filtered reminders.");
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
