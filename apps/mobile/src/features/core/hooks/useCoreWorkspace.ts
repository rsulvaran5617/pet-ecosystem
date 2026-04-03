import type { CoreAuthState, CoreIdentitySnapshot } from "@pet/types";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";

import {
  consumeMobileAuthRedirectUrl,
  getMobileCoreApiClient,
  getMobileSupabaseClient
} from "../services/supabase-mobile";

interface UseCoreWorkspaceResult {
  authState: CoreAuthState;
  snapshot: CoreIdentitySnapshot | null;
  errorMessage: string | null;
  infoMessage: string | null;
  configError: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  isRecoverySession: boolean;
  clearMessages: () => void;
  clearRecoverySession: () => void;
  refresh: () => Promise<void>;
  runAction: <T>(action: () => Promise<T>, successMessage?: string, refreshAfter?: boolean) => Promise<T>;
}

const signedOutState: CoreAuthState = {
  isAuthenticated: false,
  userId: null,
  email: null,
  emailVerified: false
};

export function useCoreWorkspace(): UseCoreWorkspaceResult {
  const mountedRef = useRef(true);
  const [authState, setAuthState] = useState<CoreAuthState>(signedOutState);
  const [snapshot, setSnapshot] = useState<CoreIdentitySnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  async function refresh() {
    try {
      const client = getMobileCoreApiClient();
      const nextAuthState = await client.getAuthState();

      if (!mountedRef.current) {
        return;
      }

      setAuthState(nextAuthState);

      if (!nextAuthState.isAuthenticated) {
        setSnapshot(null);
        setIsRecoverySession(false);
        return;
      }

      const nextSnapshot = await client.getCoreSnapshot();

      if (!mountedRef.current) {
        return;
      }

      setSnapshot(nextSnapshot);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Unable to refresh the mobile core workspace.");
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
      const nextMessage = error instanceof Error ? error.message : "Core action failed.";

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

    let unsubscribe = () => undefined;
    let removeLinkListener = () => undefined;

    async function handleIncomingUrl(nextUrl: string | null) {
      if (!nextUrl) {
        return;
      }

      try {
        const redirectResult = await consumeMobileAuthRedirectUrl(nextUrl);

        if (!redirectResult || !mountedRef.current) {
          return;
        }

        if (redirectResult.isRecoveryFlow) {
          setIsRecoverySession(true);
          setInfoMessage("Recovery link opened. Set a new password below.");
        }

        await refresh();
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to consume the mobile auth redirect.");
      }
    }

    async function bootstrap() {
      try {
        const supabase = getMobileSupabaseClient();

        const {
          data: { subscription }
        } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
          if (event === "PASSWORD_RECOVERY") {
            setIsRecoverySession(true);
          }

          if (event === "SIGNED_OUT") {
            setIsRecoverySession(false);
          }

          void refresh();
        });

        unsubscribe = () => {
          subscription.unsubscribe();
        };

        const linkSubscription = Linking.addEventListener("url", ({ url }) => {
          void handleIncomingUrl(url);
        });

        removeLinkListener = () => {
          linkSubscription.remove();
        };

        await handleIncomingUrl(await Linking.getInitialURL());
        await refresh();
      } catch (error) {
        if (mountedRef.current) {
          setConfigError(error instanceof Error ? error.message : "Unable to initialize Supabase on mobile.");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mountedRef.current = false;
      unsubscribe();
      removeLinkListener();
    };
  }, []);

  return {
    authState,
    snapshot,
    errorMessage,
    infoMessage,
    configError,
    isLoading,
    isSubmitting,
    isRecoverySession,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    clearRecoverySession() {
      setIsRecoverySession(false);
    },
    refresh,
    runAction
  };
}
