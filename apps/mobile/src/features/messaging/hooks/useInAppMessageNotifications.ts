import type { ChatSenderRole, ChatThreadSummary, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

import { getMobileMessagingApiClient } from "../../core/services/supabase-mobile";

export type InAppMessageNotice = {
  body: string;
  createdAt: string;
  senderName: string;
  threadId: Uuid;
};

type ViewerRole = "owner" | "provider";

function isMessageFromCurrentViewer(
  currentUserId: Uuid | null,
  senderUserId: Uuid,
  senderRole: ChatSenderRole,
  viewerRole: ViewerRole
) {
  if (currentUserId) {
    return senderUserId === currentUserId;
  }

  return viewerRole === "provider" ? senderRole === "provider" : senderRole === "customer";
}

function getThreadActivityKey(thread: ChatThreadSummary) {
  return thread.lastMessageAt ?? thread.updatedAt ?? thread.createdAt;
}

export function useInAppMessageNotifications({
  currentUserId,
  enabled,
  viewerRole
}: {
  currentUserId: Uuid | null;
  enabled: boolean;
  viewerRole: ViewerRole;
}) {
  const [notice, setNotice] = useState<InAppMessageNotice | null>(null);
  const activityByThreadRef = useRef<Map<Uuid, string>>(new Map());
  const hasHydratedRef = useRef(false);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      activityByThreadRef.current = new Map();
      hasHydratedRef.current = false;
      setNotice(null);
      return;
    }

    let isCancelled = false;

    async function pollThreads() {
      if (isPollingRef.current) {
        return;
      }

      isPollingRef.current = true;

      try {
        const threads = await getMobileMessagingApiClient().listThreads();
        const previousActivityByThread = activityByThreadRef.current;
        const nextActivityByThread = new Map<Uuid, string>();

        threads.forEach((thread) => {
          nextActivityByThread.set(thread.id, getThreadActivityKey(thread));
        });

        if (!hasHydratedRef.current) {
          activityByThreadRef.current = nextActivityByThread;
          hasHydratedRef.current = true;
          return;
        }

        const changedThread = threads.find((thread) => {
          const previousActivity = previousActivityByThread.get(thread.id);
          const nextActivity = nextActivityByThread.get(thread.id);

          return Boolean(nextActivity) && previousActivity !== nextActivity;
        });

        activityByThreadRef.current = nextActivityByThread;

        if (!changedThread || isCancelled) {
          return;
        }

        const detail = await getMobileMessagingApiClient().getThreadDetail(changedThread.id);
        const latestMessage = detail.messages[detail.messages.length - 1];

        if (!latestMessage || isCancelled) {
          return;
        }

        if (isMessageFromCurrentViewer(currentUserId, latestMessage.senderUserId, latestMessage.senderRole, viewerRole)) {
          return;
        }

        setNotice({
          body: latestMessage.messageText,
          createdAt: latestMessage.createdAt,
          senderName: latestMessage.senderDisplayName,
          threadId: latestMessage.threadId
        });
        Vibration.vibrate(140);
      } catch {
        // El aviso in-app es auxiliar: no debe interrumpir la experiencia principal.
      } finally {
        isPollingRef.current = false;
      }
    }

    void pollThreads();
    const intervalId = setInterval(() => {
      void pollThreads();
    }, 8000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [currentUserId, enabled, viewerRole]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setNotice(null);
    }, 6500);

    return () => clearTimeout(timeoutId);
  }, [notice]);

  return {
    notice,
    clearNotice() {
      setNotice(null);
    }
  };
}
