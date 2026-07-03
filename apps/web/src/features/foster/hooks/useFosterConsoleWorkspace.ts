"use client";

import type {
  HouseholdSummary,
  PetAdoptionApplication,
  PetAdoptionApplicationStatus,
  PetAdoptionApplicationStatusHistory,
  PetAdoptionListing,
  PetTransferRecord,
  ProtectiveHouseholdProfile,
  ProtectivePublicProfile,
  Uuid
} from "@pet/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getBrowserFosterApiClient,
  getBrowserHouseholdsApiClient,
  getBrowserSupabaseClient
} from "../../core/services/supabase-browser";

type AuthState = "checking" | "signed_out" | "signed_in";

export type FosterConsoleApplicationDetail = {
  application: PetAdoptionApplication;
  history: PetAdoptionApplicationStatusHistory[];
};

export type FosterConsoleHouseholdContext = {
  applications: PetAdoptionApplication[];
  listings: PetAdoptionListing[];
  profile: ProtectiveHouseholdProfile | null;
  publicProfile: ProtectivePublicProfile | null;
  transfers: PetTransferRecord[];
};

type FosterConsoleData = Record<Uuid, FosterConsoleHouseholdContext>;

export function useFosterConsoleWorkspace() {
  const mountedRef = useRef(true);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [dataByHousehold, setDataByHousehold] = useState<FosterConsoleData>({});
  const [selectedApplicationDetail, setSelectedApplicationDetail] = useState<FosterConsoleApplicationDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedHousehold = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId]
  );
  const selectedContext = selectedHouseholdId ? dataByHousehold[selectedHouseholdId] ?? null : null;
  const protectiveHouseholds = useMemo(
    () => households.filter((household) => household.householdType === "protective"),
    [households]
  );

  const loadHouseholdContext = useCallback(async (household: HouseholdSummary): Promise<FosterConsoleHouseholdContext> => {
    const [profile, publicProfile, listings, applications, transfers] = await Promise.all([
      getBrowserFosterApiClient().getProtectiveHouseholdProfile(household.id),
      getBrowserFosterApiClient().getProtectivePublicProfile(household.id),
      getBrowserFosterApiClient().listMyPetAdoptionListings(household.id),
      getBrowserFosterApiClient().listReceivedPetAdoptionApplications(household.id),
      getBrowserFosterApiClient().listOutgoingPetTransfers(household.id)
    ]);

    return {
      applications,
      listings,
      profile,
      publicProfile,
      transfers
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const sessionResult = await getBrowserSupabaseClient().auth.getSession();
      const hasSession = Boolean(sessionResult.data.session);

      if (!hasSession) {
        if (mountedRef.current) {
          setAuthState("signed_out");
          setHouseholds([]);
          setSelectedHouseholdId(null);
          setDataByHousehold({});
          setSelectedApplicationDetail(null);
        }
        return;
      }

      const snapshot = await getBrowserHouseholdsApiClient().getHouseholdsSnapshot();
      const nextHouseholds = snapshot.households;
      const nextProtectiveHouseholds = nextHouseholds.filter((household) => household.householdType === "protective");
      const nextSelectedHouseholdId =
        nextProtectiveHouseholds.find((household) => household.id === selectedHouseholdId)?.id ?? nextProtectiveHouseholds[0]?.id ?? null;
      const contextEntries = await Promise.all(
        nextProtectiveHouseholds.map(async (household) => [household.id, await loadHouseholdContext(household)] as const)
      );

      if (mountedRef.current) {
        setAuthState("signed_in");
        setHouseholds(nextHouseholds);
        setSelectedHouseholdId(nextSelectedHouseholdId);
        setDataByHousehold(Object.fromEntries(contextEntries));
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar la consola Foster.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadHouseholdContext, selectedHouseholdId]);

  const reloadSelectedHousehold = useCallback(async () => {
    if (!selectedHousehold) {
      return;
    }

    const context = await loadHouseholdContext(selectedHousehold);

    if (mountedRef.current) {
      setDataByHousehold((current) => ({ ...current, [selectedHousehold.id]: context }));
    }
  }, [loadHouseholdContext, selectedHousehold]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  async function openApplication(application: PetAdoptionApplication) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const [detail, history] = await Promise.all([
        getBrowserFosterApiClient().getPetAdoptionApplicationDetail(application.id),
        getBrowserFosterApiClient().listPetAdoptionApplicationStatusHistory(application.id)
      ]);

      if (mountedRef.current) {
        setSelectedApplicationDetail({ application: detail ?? application, history });
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir la solicitud.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function updateApplicationStatus(
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const updated = await getBrowserFosterApiClient().updatePetAdoptionApplicationStatus({
        applicationId: application.id,
        notes: notes?.trim() || null,
        status
      });
      const history = await getBrowserFosterApiClient().listPetAdoptionApplicationStatusHistory(updated.id);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setSelectedApplicationDetail({ application: updated, history });
        setInfoMessage("Estado de solicitud actualizado.");
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible actualizar la solicitud.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function startTransfer(application: PetAdoptionApplication) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getBrowserFosterApiClient().startPetAdoptionTransfer(application.id);
      const detail = await getBrowserFosterApiClient().getPetAdoptionApplicationDetail(application.id);
      const history = await getBrowserFosterApiClient().listPetAdoptionApplicationStatusHistory(application.id);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setSelectedApplicationDetail({ application: detail ?? application, history });
        setInfoMessage("Transferencia privada iniciada. La familia receptora debe aceptarla.");
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible iniciar la transferencia.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  return {
    applications: selectedContext?.applications ?? [],
    authState,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    listings: selectedContext?.listings ?? [],
    openApplication,
    profile: selectedContext?.profile ?? null,
    protectiveHouseholds,
    publicProfile: selectedContext?.publicProfile ?? null,
    refresh,
    selectedApplicationDetail,
    selectedHousehold,
    selectedHouseholdId,
    selectHousehold(householdId: Uuid) {
      setSelectedHouseholdId(householdId);
      setSelectedApplicationDetail(null);
      setErrorMessage(null);
      setInfoMessage(null);
    },
    startTransfer,
    transfers: selectedContext?.transfers ?? [],
    updateApplicationStatus
  };
}
