import type { CalendarEventStatus, ReminderStatus, ReminderType } from "@pet/types";

export const reminderTypeLabels: Record<ReminderType, string> = {
  manual: "Manual",
  vaccine: "Vaccine"
};

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  pending: "Pending",
  completed: "Completed"
};

export const calendarEventStatusLabels: Record<CalendarEventStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed"
};
