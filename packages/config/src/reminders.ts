import type { CalendarEventStatus, ReminderStatus, ReminderType } from "@pet/types";

export const reminderTypeLabels: Record<ReminderType, string> = {
  manual: "Manual",
  vaccine: "Vacuna"
};

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  pending: "Pendiente",
  completed: "Completado"
};

export const calendarEventStatusLabels: Record<CalendarEventStatus, string> = {
  scheduled: "Programado",
  completed: "Completado"
};
