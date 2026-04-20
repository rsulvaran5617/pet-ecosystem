import type { HouseholdsSnapshot, PetHealthDetail, PetSummary, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import {
  getBrowserHealthApiClient,
  getBrowserHouseholdsApiClient,
  getBrowserPetsApiClient
} from "../../core/services/supabase-browser";

interface UseHealthWorkspaceResult {
  householdSnapshot: HouseholdsSnapshot | null;
  pets: PetSummary[];
  selectedHouseholdId: Uuid | null;
  selectedPetId: Uuid | null;
  selectedPetHealthDetail: PetHealthDetail | null;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  selectHousehold: (householdId: Uuid) => Promise<void>;
  selectPet: (petId: Uuid) => Promise<void>;
  refresh: () => Promise<void>;
  runAction: <T>(action: () => Promise<T>, successMessage?: string, refreshAfter?: boolean) => Promise<T>;
}

export function useHealthWorkspace(enabled: boolean): UseHealthWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedHouseholdIdRef = useRef<Uuid | null>(null);
  const selectedPetIdRef = useRef<Uuid | null>(null);
  const [householdSnapshot, setHouseholdSnapshot] = useState<HouseholdsSnapshot | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<Uuid | null>(null);
  const [selectedPetHealthDetail, setSelectedPetHealthDetail] = useState<PetHealthDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadHealthDetail(petId: Uuid | null) {
    if (!petId) {
      if (mountedRef.current) {
        setSelectedPetHealthDetail(null);
      }

      return;
    }

    const detail = await getBrowserHealthApiClient().getPetHealthDetail(petId);

    if (!mountedRef.current) {
      return;
    }

    setSelectedPetHealthDetail(detail);
  }

  async function loadPets(householdId: Uuid | null) {
    if (!householdId) {
      if (mountedRef.current) {
        setPets([]);
        setSelectedPetId(null);
        selectedPetIdRef.current = null;
        setSelectedPetHealthDetail(null);
      }

      return;
    }

    const nextPets = await getBrowserPetsApiClient().listHouseholdPets(householdId);

    if (!mountedRef.current) {
      return;
    }

    setPets(nextPets);

    const nextSelectedPetId = nextPets.find((pet) => pet.id === selectedPetIdRef.current)?.id ?? nextPets[0]?.id ?? null;
    selectedPetIdRef.current = nextSelectedPetId;
    setSelectedPetId(nextSelectedPetId);
    await loadHealthDetail(nextSelectedPetId);
  }

  async function refresh() {
    if (!enabled) {
      if (mountedRef.current) {
        setHouseholdSnapshot(null);
        setPets([]);
        setSelectedHouseholdId(null);
        setSelectedPetId(null);
        selectedHouseholdIdRef.current = null;
        selectedPetIdRef.current = null;
        setSelectedPetHealthDetail(null);
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const nextHouseholdSnapshot = await getBrowserHouseholdsApiClient().getHouseholdsSnapshot();

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
        setErrorMessage(error instanceof Error ? error.message : "No fue posible actualizar el espacio de salud.");
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
        setErrorMessage(error instanceof Error ? error.message : "La accion de salud fallo.");
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
    selectedHouseholdId,
    selectedPetId,
    selectedPetHealthDetail,
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
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar la salud del hogar.");
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
        await loadHealthDetail(petId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar el detalle de salud de la mascota.");
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
