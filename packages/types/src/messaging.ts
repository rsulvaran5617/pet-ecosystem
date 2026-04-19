import type { BookingStatus } from "./bookings";
import type { IsoDateString, TimestampedEntity, Uuid } from "./base";

export type ChatSenderRole = "customer" | "provider";

export interface ChatThreadSummary extends TimestampedEntity {
  id: Uuid;
  bookingId: Uuid;
  householdId: Uuid;
  providerOrganizationId: Uuid;
  customerUserId: Uuid;
  providerUserId: Uuid;
  customerDisplayName: string;
  providerDisplayName: string;
  petName: string;
  serviceName: string;
  bookingStatus: BookingStatus;
  lastMessageAt: IsoDateString | null;
  lastMessagePreview: string | null;
}

export interface ChatMessage extends TimestampedEntity {
  id: Uuid;
  threadId: Uuid;
  senderUserId: Uuid;
  senderRole: ChatSenderRole;
  senderDisplayName: string;
  messageText: string;
}

export interface ChatThreadDetail {
  thread: ChatThreadSummary;
  messages: ChatMessage[];
}

export interface ListChatThreadsFilters {
  bookingId?: Uuid | null;
}

export interface SendChatMessageInput {
  messageText: string;
}
