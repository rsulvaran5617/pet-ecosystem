import type {
  CalendarEvent,
  CreateReminderInput,
  Database,
  ListCalendarEventsFilters,
  ListRemindersFilters,
  Reminder,
  SnoozeReminderInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RemindersSupabaseClient = SupabaseClient<Database>;
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];
type CalendarEventRow = Database["public"]["Tables"]["calendar_events"]["Row"];

export interface RemindersApiClient {
  listReminders(filters: ListRemindersFilters): Promise<Reminder[]>;
  listCalendarEvents(filters: ListCalendarEventsFilters): Promise<CalendarEvent[]>;
  createReminder(input: CreateReminderInput): Promise<Reminder>;
  completeReminder(reminderId: Uuid): Promise<Reminder>;
  snoozeReminder(reminderId: Uuid, input: SnoozeReminderInput): Promise<Reminder>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    householdId: row.household_id,
    petId: row.pet_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    notes: row.notes,
    reminderType: row.reminder_type,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    sourceRecordType: row.source_record_type,
    sourceRecordId: row.source_record_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    householdId: row.household_id,
    petId: row.pet_id,
    title: row.title,
    eventType: row.event_type,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function findReminderById(supabase: RemindersSupabaseClient, reminderId: Uuid) {
  const { data, error } = await supabase.from("reminders").select("*").eq("id", reminderId).single();

  if (error) {
    fail(error, "Unable to load the reminder.");
  }

  return data;
}

export function createRemindersApiClient(supabase: RemindersSupabaseClient): RemindersApiClient {
  return {
    async listReminders(filters) {
      let query = supabase
        .from("reminders")
        .select("*")
        .eq("household_id", filters.householdId)
        .order("due_at", { ascending: true })
        .order("created_at", { ascending: true });

      if (filters.petId) {
        query = query.eq("pet_id", filters.petId);
      }

      if (!filters.includeCompleted) {
        query = query.eq("status", "pending");
      }

      const { data, error } = await query;

      if (error) {
        fail(error, "Unable to load reminders.");
      }

      return (data ?? []).map(mapReminder);
    },
    async listCalendarEvents(filters) {
      let query = supabase
        .from("calendar_events")
        .select("*")
        .eq("household_id", filters.householdId)
        .order("starts_at", { ascending: true })
        .order("created_at", { ascending: true });

      if (filters.petId) {
        query = query.eq("pet_id", filters.petId);
      }

      if (!filters.includeCompleted) {
        query = query.eq("status", "scheduled");
      }

      if (filters.startAt) {
        query = query.gte("starts_at", filters.startAt);
      }

      if (filters.endAt) {
        query = query.lte("starts_at", filters.endAt);
      }

      const { data, error } = await query;

      if (error) {
        fail(error, "Unable to load calendar events.");
      }

      return (data ?? []).map(mapCalendarEvent);
    },
    async createReminder(input) {
      const { data, error } = await supabase.rpc("create_reminder", {
        target_household_id: input.householdId,
        target_pet_id: input.petId ?? null,
        next_title: input.title,
        next_due_at: input.dueAt,
        next_notes: input.notes ?? null
      });

      if (error) {
        fail(error, "Unable to create the reminder.");
      }

      return mapReminder(data);
    },
    async completeReminder(reminderId) {
      const { data, error } = await supabase.rpc("complete_reminder", {
        target_reminder_id: reminderId
      });

      if (error) {
        fail(error, "Unable to complete the reminder.");
      }

      return mapReminder(await findReminderById(supabase, data.id));
    },
    async snoozeReminder(reminderId, input) {
      const { data, error } = await supabase.rpc("snooze_reminder", {
        target_reminder_id: reminderId,
        next_due_at: input.dueAt
      });

      if (error) {
        fail(error, "Unable to snooze the reminder.");
      }

      return mapReminder(await findReminderById(supabase, data.id));
    }
  };
}
