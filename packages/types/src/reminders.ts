import type { IsoDateString, TimestampedEntity, Uuid } from "./base";

export type ReminderType = "manual" | "vaccine";
export type ReminderStatus = "pending" | "completed";
export type ReminderSourceRecordType = "pet_vaccine";
export type CalendarEventType = "reminder";
export type CalendarEventStatus = "scheduled" | "completed";

export interface Reminder extends TimestampedEntity {
  id: Uuid;
  householdId: Uuid;
  petId: Uuid | null;
  createdByUserId: Uuid;
  title: string;
  notes: string | null;
  reminderType: ReminderType;
  status: ReminderStatus;
  dueAt: IsoDateString;
  completedAt: IsoDateString | null;
  sourceRecordType: ReminderSourceRecordType | null;
  sourceRecordId: Uuid | null;
}

export interface CalendarEvent extends TimestampedEntity {
  id: Uuid;
  reminderId: Uuid;
  householdId: Uuid;
  petId: Uuid | null;
  title: string;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  startsAt: IsoDateString;
  endsAt: IsoDateString | null;
}

export interface CreateReminderInput {
  householdId: Uuid;
  petId?: Uuid | null;
  title: string;
  dueAt: IsoDateString;
  notes?: string | null;
}

export interface ListRemindersFilters {
  householdId: Uuid;
  petId?: Uuid | null;
  includeCompleted?: boolean;
}

export interface ListCalendarEventsFilters {
  householdId: Uuid;
  petId?: Uuid | null;
  includeCompleted?: boolean;
  startAt?: IsoDateString | null;
  endAt?: IsoDateString | null;
}

export interface SnoozeReminderInput {
  dueAt: IsoDateString;
}
