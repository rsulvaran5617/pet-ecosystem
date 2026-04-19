"use client";

import type { ProviderOrganization, ProviderOrganizationDetail, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getAdminProvidersApiClient } from "../../core/services/supabase-admin";

interface UseAdminProvidersWorkspaceResult {
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  pendingOrganizations: ProviderOrganization[];
  selectedOrganization: ProviderOrganizationDetail | null;
  clearMessages: () => void;
  openOrganization: (organizationId: Uuid) => Promise<void>;
  refresh: (preferredOrganizationId?: Uuid | null) => Promise<void>;
  approveOrganization: () => Promise<void>;
  rejectOrganization: () => Promise<void>;
}

export function useAdminProvidersWorkspace(enabled: boolean): UseAdminProvidersWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedOrganizationIdRef = useRef<Uuid | null>(null);
  const [pendingOrganizations, setPendingOrganizations] = useState<ProviderOrganization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<ProviderOrganizationDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadOrganizationDetail(organizationId: Uuid) {
    const detail = await getAdminProvidersApiClient().getAdminProviderOrganizationDetail(organizationId);

    if (!mountedRef.current) {
      return detail;
    }

    selectedOrganizationIdRef.current = detail.organization.id;
    setSelectedOrganization(detail);

    return detail;
  }

  async function refresh(preferredOrganizationId?: Uuid | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setPendingOrganizations([]);
        setSelectedOrganization(null);
        selectedOrganizationIdRef.current = null;
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const organizations = await getAdminProvidersApiClient().listPendingProviderOrganizations();

      if (!mountedRef.current) {
        return;
      }

      setPendingOrganizations(organizations);

      const targetOrganizationId =
        preferredOrganizationId && organizations.some((organization) => organization.id === preferredOrganizationId)
          ? preferredOrganizationId
          : organizations.find((organization) => organization.id === selectedOrganizationIdRef.current)?.id ??
            organizations[0]?.id ??
            null;

      if (!targetOrganizationId) {
        selectedOrganizationIdRef.current = null;
        setSelectedOrganization(null);
        return;
      }

      await loadOrganizationDetail(targetOrganizationId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load pending provider organizations.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function runAction<T>(action: () => Promise<T>, successMessage: string) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await action();

      if (mountedRef.current) {
        setInfoMessage(successMessage);
      }

      return result;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Admin provider action failed.");
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
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    pendingOrganizations,
    selectedOrganization,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    async openOrganization(organizationId) {
      setErrorMessage(null);
      setInfoMessage(null);
      setIsLoading(true);

      try {
        await loadOrganizationDetail(organizationId);
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the provider organization.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    refresh,
    async approveOrganization() {
      const organizationId = selectedOrganizationIdRef.current;

      if (!organizationId) {
        throw new Error("Select a provider organization first.");
      }

      await runAction(
        () => getAdminProvidersApiClient().approveProviderOrganization(organizationId),
        "Provider organization approved."
      );
      await refresh();
    },
    async rejectOrganization() {
      const organizationId = selectedOrganizationIdRef.current;

      if (!organizationId) {
        throw new Error("Select a provider organization first.");
      }

      await runAction(
        () => getAdminProvidersApiClient().rejectProviderOrganization(organizationId),
        "Provider organization rejected."
      );
      await refresh();
    }
  };
}
