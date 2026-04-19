import type {
  ChatMessage,
  ChatSenderRole,
  ChatThreadDetail,
  ChatThreadSummary,
  Database,
  ListChatThreadsFilters,
  SendChatMessageInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingSupabaseClient = SupabaseClient<Database>;
type ChatThreadRow = Database["public"]["Tables"]["chat_threads"]["Row"];
type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];

export interface MessagingApiClient {
  listThreads(filters?: ListChatThreadsFilters): Promise<ChatThreadSummary[]>;
  getThreadDetail(threadId: Uuid): Promise<ChatThreadDetail>;
  getThreadByBooking(bookingId: Uuid): Promise<ChatThreadSummary | null>;
  sendMessage(threadId: Uuid, input: SendChatMessageInput): Promise<ChatMessage>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function mapThread(row: ChatThreadRow): ChatThreadSummary {
  return {
    id: row.id,
    bookingId: row.booking_id,
    householdId: row.household_id,
    providerOrganizationId: row.provider_organization_id,
    customerUserId: row.customer_user_id,
    providerUserId: row.provider_user_id,
    customerDisplayName: row.customer_display_name,
    providerDisplayName: row.provider_display_name,
    petName: row.pet_name,
    serviceName: row.service_name,
    bookingStatus: row.booking_status,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getSenderRole(thread: ChatThreadSummary, senderUserId: string): ChatSenderRole {
  return senderUserId === thread.providerUserId ? "provider" : "customer";
}

function mapMessage(row: ChatMessageRow, thread: ChatThreadSummary): ChatMessage {
  const senderRole = getSenderRole(thread, row.sender_user_id);

  return {
    id: row.id,
    threadId: row.thread_id,
    senderUserId: row.sender_user_id,
    senderRole,
    senderDisplayName: senderRole === "provider" ? thread.providerDisplayName : thread.customerDisplayName,
    messageText: row.message_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function loadThreadRow(supabase: MessagingSupabaseClient, threadId: Uuid) {
  const { data, error } = await supabase.from("chat_threads").select("*").eq("id", threadId).single();

  if (error) {
    fail(error, "Unable to load the chat thread.");
  }

  return data;
}

export function createMessagingApiClient(supabase: MessagingSupabaseClient): MessagingApiClient {
  return {
    async listThreads(filters) {
      let query = supabase
        .from("chat_threads")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters?.bookingId) {
        query = query.eq("booking_id", filters.bookingId);
      }

      const { data, error } = await query;

      if (error) {
        fail(error, "Unable to load chat threads.");
      }

      return (data ?? []).map(mapThread);
    },
    async getThreadDetail(threadId) {
      const threadRow = await loadThreadRow(supabase, threadId);
      const thread = mapThread(threadRow);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) {
        fail(error, "Unable to load chat messages.");
      }

      return {
        thread,
        messages: (data ?? []).map((row) => mapMessage(row, thread))
      };
    },
    async getThreadByBooking(bookingId) {
      const { data, error } = await supabase.from("chat_threads").select("*").eq("booking_id", bookingId).maybeSingle();

      if (error) {
        fail(error, "Unable to load the booking chat thread.");
      }

      return data ? mapThread(data) : null;
    },
    async sendMessage(threadId, input) {
      const thread = mapThread(await loadThreadRow(supabase, threadId));
      const { data, error } = await supabase.rpc("send_chat_message", {
        target_thread_id: threadId,
        next_message_text: input.messageText
      });

      if (error) {
        fail(error, "Unable to send the chat message.");
      }

      return mapMessage(data, thread);
    }
  };
}
