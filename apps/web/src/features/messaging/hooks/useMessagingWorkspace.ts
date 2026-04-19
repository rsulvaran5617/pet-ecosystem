"use client";

import type { ChatThreadDetail, ChatThreadSummary, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getBrowserMessagingApiClient } from "../../core/services/supabase-browser";

interface UseMessagingWorkspaceResult {
  threads: ChatThreadSummary[];
  selectedThreadDetail: ChatThreadDetail | null;
  selectedThreadId: Uuid | null;
  messageDraft: string;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  openThread: (threadId: Uuid) => Promise<void>;
  refresh: (preferredBookingId?: Uuid | null) => Promise<void>;
  sendMessage: () => Promise<void>;
  setMessageDraft: (value: string) => void;
}

export function useMessagingWorkspace(
  enabled: boolean,
  focusedBookingId: Uuid | null,
  focusVersion: number
): UseMessagingWorkspaceResult {
  const mountedRef = useRef(true);
  const selectedThreadIdRef = useRef<Uuid | null>(null);
  const focusedBookingIdRef = useRef<Uuid | null>(focusedBookingId);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [selectedThreadDetail, setSelectedThreadDetail] = useState<ChatThreadDetail | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<Uuid | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadThreadDetail(threadId: Uuid) {
    const detail = await getBrowserMessagingApiClient().getThreadDetail(threadId);

    if (!mountedRef.current) {
      return detail;
    }

    selectedThreadIdRef.current = threadId;
    setSelectedThreadId(threadId);
    setSelectedThreadDetail(detail);

    return detail;
  }

  async function refresh(preferredBookingId?: Uuid | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setThreads([]);
        setSelectedThreadDetail(null);
        setSelectedThreadId(null);
        setMessageDraft("");
        focusedBookingIdRef.current = null;
        selectedThreadIdRef.current = null;
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      const nextThreads = await getBrowserMessagingApiClient().listThreads();

      if (!mountedRef.current) {
        return;
      }

      setThreads(nextThreads);

      const nextSelectedThreadId =
        (preferredBookingId ? nextThreads.find((thread) => thread.bookingId === preferredBookingId)?.id ?? null : null) ??
        nextThreads.find((thread) => thread.id === selectedThreadIdRef.current)?.id ??
        nextThreads[0]?.id ??
        null;

      if (preferredBookingId && !nextSelectedThreadId) {
        setSelectedThreadDetail(null);
        setSelectedThreadId(null);
        selectedThreadIdRef.current = null;
        setErrorMessage("Unable to locate the chat thread for the selected booking.");
        return;
      }

      if (!nextSelectedThreadId) {
        setSelectedThreadDetail(null);
        setSelectedThreadId(null);
        selectedThreadIdRef.current = null;
        return;
      }

      await loadThreadDetail(nextSelectedThreadId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to refresh the messaging workspace.");
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
        await refresh(focusedBookingIdRef.current);
      }

      if (mountedRef.current) {
        setInfoMessage(successMessage ?? null);
      }

      return result;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Messaging action failed.");
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

  useEffect(() => {
    if (!enabled || !focusedBookingId || focusVersion === 0) {
      return;
    }

    focusedBookingIdRef.current = focusedBookingId;
    setErrorMessage(null);
    setInfoMessage("Booking chat requested. Loading the linked thread.");
    void refresh(focusedBookingId);
  }, [enabled, focusedBookingId, focusVersion]);

  return {
    threads,
    selectedThreadDetail,
    selectedThreadId,
    messageDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    async openThread(threadId) {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const detail = await loadThreadDetail(threadId);
        focusedBookingIdRef.current = detail.thread.bookingId;

        if (mountedRef.current) {
          setInfoMessage(`Thread loaded for ${detail.thread.serviceName}.`);
        }
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to open the chat thread.");
        }
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    refresh,
    async sendMessage() {
      const threadId = selectedThreadIdRef.current;

      if (!threadId) {
        throw new Error("Select a thread before sending a message.");
      }

      const normalizedDraft = messageDraft.trim();

      if (!normalizedDraft) {
        throw new Error("Write a message before sending it.");
      }

      await runAction(
        async () => {
          const message = await getBrowserMessagingApiClient().sendMessage(threadId, {
            messageText: normalizedDraft
          });

          if (mountedRef.current) {
            setMessageDraft("");
            focusedBookingIdRef.current = selectedThreadDetail?.thread.bookingId ?? focusedBookingIdRef.current;
          }

          return message;
        },
        "Message sent."
      );
    },
    setMessageDraft
  };
}
