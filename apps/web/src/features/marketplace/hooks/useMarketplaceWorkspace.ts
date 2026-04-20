"use client";

import type {
  HouseholdsSnapshot,
  MarketplaceHomeSnapshot,
  MarketplaceProviderDetail,
  MarketplaceProviderSummary,
  MarketplaceSearchFilters,
  PetSummary,
  Uuid
} from "@pet/types";
import { useEffect, useRef, useState } from "react";

import {
  getBrowserHouseholdsApiClient,
  getBrowserMarketplaceApiClient,
  getBrowserPetsApiClient
} from "../../core/services/supabase-browser";

interface UseMarketplaceWorkspaceResult {
  householdSnapshot: HouseholdsSnapshot | null;
  homeSnapshot: MarketplaceHomeSnapshot | null;
  pets: PetSummary[];
  providers: MarketplaceProviderSummary[];
  selectedProviderDetail: MarketplaceProviderDetail | null;
  selectedHouseholdId: Uuid | null;
  selectedPetId: Uuid | null;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  clearMessages: () => void;
  selectHousehold: (householdId: Uuid) => Promise<void>;
  selectPet: (petId: Uuid | null) => Promise<void>;
  search: (filters: MarketplaceSearchFilters) => Promise<MarketplaceProviderSummary[]>;
  openProvider: (providerId: Uuid) => Promise<MarketplaceProviderDetail>;
  clearSelectedProvider: () => void;
  refresh: () => Promise<void>;
}

export function useMarketplaceWorkspace(enabled: boolean): UseMarketplaceWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedHouseholdIdRef = useRef<Uuid | null>(null);
  const selectedPetIdRef = useRef<Uuid | null>(null);
  const [householdSnapshot, setHouseholdSnapshot] = useState<HouseholdsSnapshot | null>(null);
  const [homeSnapshot, setHomeSnapshot] = useState<MarketplaceHomeSnapshot | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [providers, setProviders] = useState<MarketplaceProviderSummary[]>([]);
  const [selectedProviderDetail, setSelectedProviderDetail] = useState<MarketplaceProviderDetail | null>(null);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<Uuid | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  function isAuthRequiredError(error: unknown) {
    return error instanceof Error && error.message === "Authenticated user required.";
  }

  async function loadPets(householdId: Uuid | null) {
    if (!householdId) {
      if (mountedRef.current) {
        setPets([]);
        setSelectedPetId(null);
        selectedPetIdRef.current = null;
      }

      return;
    }

    const nextPets = await getBrowserPetsApiClient().listHouseholdPets(householdId);

    if (!mountedRef.current) {
      return;
    }

    setPets(nextPets);
    const nextSelectedPetId = nextPets.find((pet) => pet.id === selectedPetIdRef.current)?.id ?? null;
    selectedPetIdRef.current = nextSelectedPetId;
    setSelectedPetId(nextSelectedPetId);
  }

  async function refresh() {
    if (!enabled) {
      if (mountedRef.current) {
        setHouseholdSnapshot(null);
        setHomeSnapshot(null);
        setPets([]);
        setProviders([]);
        setSelectedProviderDetail(null);
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
      const [nextHomeSnapshot, nextHouseholdSnapshot] = await Promise.all([
        getBrowserMarketplaceApiClient().getMarketplaceHome(),
        getBrowserHouseholdsApiClient()
          .getHouseholdsSnapshot()
          .catch((error) => {
            if (isAuthRequiredError(error)) {
              return null;
            }

            throw error;
          })
      ]);

      if (!mountedRef.current) {
        return;
      }

      setHouseholdSnapshot(nextHouseholdSnapshot);
      setHomeSnapshot(nextHomeSnapshot);

      const nextSelectedHouseholdId =
        nextHouseholdSnapshot?.households.find((household) => household.id === selectedHouseholdIdRef.current)?.id ??
        nextHouseholdSnapshot?.households[0]?.id ??
        null;

      selectedHouseholdIdRef.current = nextSelectedHouseholdId;
      setSelectedHouseholdId(nextSelectedHouseholdId);
      await loadPets(nextSelectedHouseholdId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible actualizar el espacio de servicios.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
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
    homeSnapshot,
    pets,
    providers,
    selectedProviderDetail,
    selectedHouseholdId,
    selectedPetId,
    errorMessage,
    infoMessage,
    isLoading,
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
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar las mascotas del hogar para servicios.");
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
    },
    async search(filters) {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextProviders = await getBrowserMarketplaceApiClient().listMarketplaceProviders(filters);

        if (mountedRef.current) {
          setProviders(nextProviders);
          setInfoMessage(nextProviders.length ? `${nextProviders.length} provider(s) found.` : "No providers matched those filters yet.");
        }

        return nextProviders;
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible buscar proveedores en el marketplace.");
        }

        throw error;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    async openProvider(providerId) {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const providerDetail = await getBrowserMarketplaceApiClient().getMarketplaceProvider(providerId);

        if (mountedRef.current) {
          setSelectedProviderDetail(providerDetail);
          setInfoMessage(null);
        }

        return providerDetail;
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar el perfil del proveedor.");
        }

        throw error;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    clearSelectedProvider() {
      setSelectedProviderDetail(null);
    },
    refresh
  };
}
