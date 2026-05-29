"use client";

import { formatCoreAuthErrorMessage } from "@pet/api-client";
import type { CoreAuthState, CoreIdentitySnapshot } from "@pet/types";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import { getBrowserCoreApiClient, getBrowserSupabaseClient } from "../services/supabase-browser";

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

function isSupabaseAuthLockNoise(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("auth-token") && message.includes("another request stole it");
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function useCoreWorkspace(): UseCoreWorkspaceResult {
  const mountedRef = useRef(true);
  const bootstrapTimedOutRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const [authState, setAuthState] = useState<CoreAuthState>(signedOutState);
  const [snapshot, setSnapshot] = useState<CoreIdentitySnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  async function loadCoreSnapshot() {
    const client = getBrowserCoreApiClient();
    const nextAuthState = await withTimeout(
      client.getAuthState(),
      12000,
      "La sesion tardo demasiado en responder. Refresca la pagina o vuelve a iniciar sesion."
    );

    if (!mountedRef.current) {
      return;
    }

    setAuthState(nextAuthState);
    setIsLoading(false);

    if (!nextAuthState.isAuthenticated) {
      setSnapshot(null);
      setIsRecoverySession(false);
      return;
    }

    const nextSnapshot = await withTimeout(
      client.getCoreSnapshot(),
      15000,
      "No se pudo cargar tu espacio a tiempo. Refresca la pagina o vuelve a iniciar sesion."
    );

    if (!mountedRef.current) {
      return;
    }

    setSnapshot(nextSnapshot);
    setErrorMessage((currentMessage) => (currentMessage && isSupabaseAuthLockNoise(new Error(currentMessage)) ? null : currentMessage));
    bootstrapTimedOutRef.current = false;
  }

  async function refreshCore() {
    try {
      await loadCoreSnapshot();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      if (isSupabaseAuthLockNoise(error)) {
        setErrorMessage(null);
        await wait(300);

        if (!mountedRef.current) {
          return;
        }

        try {
          await loadCoreSnapshot();
        } catch (retryError) {
          if (mountedRef.current && !isSupabaseAuthLockNoise(retryError)) {
            setErrorMessage(retryError instanceof Error ? retryError.message : "No fue posible actualizar tu espacio.");
          }
        }

        return;
      }

      setErrorMessage(formatCoreAuthErrorMessage(error instanceof Error ? error.message : null, "No fue posible actualizar tu espacio."));
    }
  }

  async function refresh() {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = refreshCore().finally(() => {
      refreshPromiseRef.current = null;
    });

    return refreshPromiseRef.current;
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
      const nextMessage = formatCoreAuthErrorMessage(error instanceof Error ? error.message : null, "No fue posible completar la accion.");

      if (mountedRef.current) {
        setErrorMessage(isSupabaseAuthLockNoise(error) ? null : nextMessage);
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

    async function bootstrap() {
      const bootstrapFallbackTimer = window.setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        bootstrapTimedOutRef.current = true;
        setIsLoading(false);
        setErrorMessage((currentMessage) => currentMessage ?? "La carga inicial sigue tardando. Puedes intentar refrescar la pagina o cambiar de rol cuando aparezca tu sesion.");
      }, 8000);

      try {
        const supabase = getBrowserSupabaseClient();

        await refresh();

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
      } catch (error) {
        if (mountedRef.current) {
          setConfigError(
            isSupabaseAuthLockNoise(error)
              ? null
              : formatCoreAuthErrorMessage(error instanceof Error ? error.message : null, "No fue posible inicializar Supabase en web.")
          );
        }
      } finally {
        window.clearTimeout(bootstrapFallbackTimer);

        if (mountedRef.current) {
          setIsLoading(false);
          if (!bootstrapTimedOutRef.current) {
            setErrorMessage((currentMessage) =>
              currentMessage === "La carga inicial sigue tardando. Puedes intentar refrescar la pagina o cambiar de rol cuando aparezca tu sesion." ? null : currentMessage
            );
          }
        }
      }
    }

    void bootstrap();

    return () => {
      mountedRef.current = false;
      unsubscribe();
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
