"use client";

import { useEffect, useState } from "react";

export function getClinicalAuthReturn(search: string) {
  const params = new URLSearchParams(search);
  const token = params.get("clinicalReturn");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return {
    path: `/clinical-access/${token}`,
    mode: params.get("auth") === "login" ? "login" as const : "register" as const
  };
}

export function useClinicalAuthReturn(isAuthenticated: boolean, isRecoverySession: boolean, selectPanel: (panel: "login" | "register") => void) {
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    const next = getClinicalAuthReturn(window.location.search);
    if (!next) return;
    setDestination(next.path);
    selectPanel(next.mode);
  }, [selectPanel]);

  useEffect(() => {
    if (destination && isAuthenticated && !isRecoverySession) window.location.replace(destination);
  }, [destination, isAuthenticated, isRecoverySession]);

  return destination;
}
