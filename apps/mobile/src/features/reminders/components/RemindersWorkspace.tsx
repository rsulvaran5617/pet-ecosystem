import {
  calendarEventStatusLabels,
  formatDateLabel,
  formatDateTimeLabel,
  formatHouseholdPermissions,
  productLocale,
  productTimeZone,
  reminderStatusLabels,
  reminderTypeLabels
} from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { Reminder, Uuid } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

import { getMobileRemindersApiClient } from "../../core/services/supabase-mobile";
import { useRemindersWorkspace } from "../hooks/useRemindersWorkspace";
import {
  cancelReminderNotification,
  scheduleReminderNotification,
  type ReminderNotificationStatus
} from "../services/reminderNotifications";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(28,25,23,0.14)",
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "#fffdf8",
  color: "#1c1917"
} as const;

const cardStyle = { borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 } as const;

LocaleConfig.locales.es = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ],
  monthNamesShort: ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."],
  dayNames: ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"],
  dayNamesShort: ["Dom.", "Lun.", "Mar.", "Mie.", "Jue.", "Vie.", "Sab."],
  today: "Hoy"
};
LocaleConfig.defaultLocale = "es";

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function toIsoDateTime(dateValue: string, timeValue?: string, useExplicitTime = false) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Se requiere una fecha valida.");
  }

  const [hours, minutes] = useExplicitTime ? parseTimeInput(timeValue ?? "") : [9, 0];

  return new Date(year, month - 1, day, hours, minutes, 0).toISOString();
}

function formatDate(value: string) {
  return formatDateLabel(value);
}

function formatReminderSchedule(reminder: Reminder) {
  return reminder.remindTimeEnabled ? formatDateTimeLabel(reminder.dueAt) : formatDate(reminder.dueAt);
}

function getNotificationStatusLabel(reminder: Reminder) {
  if (reminder.status === "completed") {
    return "Completado";
  }

  if (!reminder.remindTimeEnabled) {
    return "Solo guardado en la app";
  }

  if (new Date(reminder.dueAt).getTime() <= Date.now()) {
    return "Hora vencida";
  }

  return "Notificacion local activa";
}

function parseTimeInput(value: string): [number, number] {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    throw new Error("Usa una hora valida en formato HH:MM.");
  }

  return [Number(match[1]), Number(match[2])];
}

function normalizeTimeInput(value: string) {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());

  if (!match) {
    return value;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return value;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function getNotificationInfoMessage(status: ReminderNotificationStatus) {
  switch (status) {
    case "active":
      return "Recordatorio creado y notificacion local programada.";
    case "permission-denied":
      return "Recordatorio guardado. Activa notificaciones del sistema para recibir el aviso.";
    case "past":
      return "Recordatorio guardado. La hora elegida ya paso, por eso no se programo una notificacion.";
    case "unsupported":
      return "Recordatorio guardado. Este dispositivo no permitio programar la notificacion local.";
    case "saved-only":
    default:
      return "Recordatorio guardado en la app.";
  }
}

function formatDatePickerLabel(value: string) {
  if (!value) {
    return "Seleccionar fecha";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(productLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: productTimeZone
  });
}

function formatMonthYearPickerLabel(dateKey: string) {
  const [year, month] = dateKey.split("-");

  return month && year ? `${month}/${year}` : dateKey;
}

function shiftDateYear(dateKey: string, deltaYears: number, minDate?: string, maxDate?: string) {
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  date.setFullYear(date.getFullYear() + deltaYears);
  let nextDateKey = date.toISOString().slice(0, 10);

  if (minDate && nextDateKey < minDate) {
    nextDateKey = minDate;
  }

  if (maxDate && nextDateKey > maxDate) {
    nextDateKey = maxDate;
  }

  return nextDateKey;
}

function getDefaultSnoozeDate(reminder: Reminder) {
  const nextDate = new Date(reminder.dueAt);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return toDateInput(nextDate.toISOString());
}

function getDefaultSnoozeTime(reminder: Reminder) {
  if (!reminder.remindTimeEnabled) {
    return "09:00";
  }

  const parts = new Intl.DateTimeFormat(productLocale, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: productTimeZone
  }).formatToParts(new Date(reminder.dueAt));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "09";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

function Button({ disabled, label, onPress, tone = "primary" }: { disabled?: boolean; label: string; onPress: () => void; tone?: "primary" | "secondary" }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.92)",
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(28,25,23,0.14)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: disabled ? 0.65 : 1
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : "#1c1917", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function CompactButton({
  disabled,
  label,
  onPress,
  tone = "primary"
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        backgroundColor: tone === "primary" ? "#0f766e" : "rgba(15,118,110,0.1)",
        borderColor: "rgba(15,118,110,0.22)",
        borderWidth: 1,
        opacity: disabled ? 0.65 : 1,
        paddingHorizontal: 10,
        paddingVertical: 6
      }}
    >
      <Text style={{ color: tone === "primary" ? "#ffffff" : "#0f766e", fontSize: 11, fontWeight: "800", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function Field({
  helperText,
  label,
  onChange,
  placeholder,
  value,
  multiline = false
}: {
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor="#a8a29e"
        style={[inputStyle, multiline ? { minHeight: 88, textAlignVertical: "top" } : null]}
        value={value}
      />
      {helperText ? <Text style={{ color: "#78716c", fontSize: 12, lineHeight: 17 }}>{helperText}</Text> : null}
    </View>
  );
}

function DatePickerField({
  helperText,
  isOpen,
  label,
  minDate,
  onChange,
  onToggle,
  value
}: {
  helperText?: string;
  isOpen: boolean;
  label: string;
  minDate?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  value: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = value || minDate || today;
  const [visibleDate, setVisibleDate] = useState(selectedDate);

  useEffect(() => {
    if (isOpen) {
      setVisibleDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <Pressable
        onPress={onToggle}
        style={[
          inputStyle,
          {
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between"
          }
        ]}
      >
        <View style={{ gap: 2 }}>
          <Text style={{ color: value ? "#1c1917" : "#a8a29e", fontWeight: value ? "700" : "500" }}>
            {formatDatePickerLabel(value)}
          </Text>
          <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{value || "Toca para elegir en calendario"}</Text>
        </View>
        <Text style={{ color: colorTokens.accentDark, fontSize: 18, fontWeight: "900" }}>+</Text>
      </Pressable>
      {helperText ? <Text style={{ color: "#78716c", fontSize: 12, lineHeight: 17 }}>{helperText}</Text> : null}
      {isOpen ? (
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(28,25,23,0.1)",
            backgroundColor: "#ffffff",
            overflow: "hidden",
            ...visualTokens.mobile.softShadow
          }}
        >
          <View style={{ alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(28,25,23,0.08)", flexDirection: "row", gap: 8, justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisibleDate(shiftDateYear(visibleDate, -1, minDate))}
              style={{ borderColor: "rgba(0,122,107,0.18)", borderRadius: 999, borderWidth: 1, minWidth: 74, paddingHorizontal: 8, paddingVertical: 5 }}
            >
              <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textAlign: "center" }}>-1 ano</Text>
            </Pressable>
            <Text numberOfLines={1} style={{ color: colorTokens.ink, flex: 1, fontSize: 13, fontWeight: "900", textAlign: "center" }}>
              {formatMonthYearPickerLabel(visibleDate)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisibleDate(shiftDateYear(visibleDate, 1, minDate))}
              style={{ borderColor: "rgba(0,122,107,0.18)", borderRadius: 999, borderWidth: 1, minWidth: 74, paddingHorizontal: 8, paddingVertical: 5 }}
            >
              <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textAlign: "center" }}>+1 ano</Text>
            </Pressable>
          </View>
          <Calendar
            current={visibleDate}
            key={`reminder-${visibleDate.slice(0, 7)}`}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: colorTokens.accent,
                selectedTextColor: "#ffffff"
              }
            }}
            minDate={minDate}
            onDayPress={(day: { dateString: string }) => {
              onChange(day.dateString);
              onToggle();
            }}
            onMonthChange={(month: { dateString: string }) => setVisibleDate(month.dateString)}
            theme={{
              arrowColor: colorTokens.accent,
              calendarBackground: "#ffffff",
              monthTextColor: colorTokens.ink,
              selectedDayBackgroundColor: colorTokens.accent,
              selectedDayTextColor: "#ffffff",
              todayTextColor: colorTokens.accent
            }}
          />
          {value ? (
            <Pressable onPress={() => onChange("")} style={{ borderTopWidth: 1, borderTopColor: "rgba(28,25,23,0.08)", padding: 12 }}>
              <Text style={{ color: colorTokens.mutedStrong, fontSize: 12, fontWeight: "800", textAlign: "center" }}>
                Limpiar fecha
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TimeSelectorField({
  enabled,
  label = "Hora",
  onEnabledChange,
  onTimeChange,
  timeValue
}: {
  enabled: boolean;
  label?: string;
  onEnabledChange: (enabled: boolean) => void;
  onTimeChange: (value: string) => void;
  timeValue: string;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: enabled ? "rgba(15,118,110,0.2)" : "rgba(28,25,23,0.1)",
        backgroundColor: enabled ? "rgba(240,253,250,0.72)" : "#ffffff",
        padding: 12,
        gap: 10
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900" }}>{label}</Text>
          <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
            {enabled ? "La app intentara avisarte a esta hora." : "Activa una hora si quieres un aviso local."}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={enabled ? "Desactivar hora del recordatorio" : "Activar hora del recordatorio"}
          accessibilityRole="button"
          onPress={() => onEnabledChange(!enabled)}
          style={{
            alignItems: enabled ? "flex-end" : "flex-start",
            backgroundColor: enabled ? colorTokens.accent : "rgba(148,163,184,0.28)",
            borderRadius: 999,
            justifyContent: "center",
            padding: 3,
            width: 46
          }}
        >
          <View style={{ backgroundColor: "#ffffff", borderRadius: 999, height: 18, width: 18 }} />
        </Pressable>
      </View>
      {enabled ? (
        <View style={{ gap: 8 }}>
          <TextInput
            keyboardType="numbers-and-punctuation"
            onBlur={() => onTimeChange(normalizeTimeInput(timeValue))}
            onChangeText={onTimeChange}
            placeholder="09:00"
            placeholderTextColor="#a8a29e"
            style={[inputStyle, { fontSize: 16, fontWeight: "800" }]}
            value={timeValue}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["08:00", "09:00", "12:00", "18:00"].map((quickTime) => (
              <CompactButton key={quickTime} label={quickTime} onPress={() => onTimeChange(quickTime)} tone={timeValue === quickTime ? "primary" : "secondary"} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function RemindersWorkspace({
  contextHouseholdId,
  contextPetId,
  enabled,
  mode = "standalone",
  onActivePetChange,
  onRemindersChanged
}: {
  contextHouseholdId?: Uuid | null;
  contextPetId?: Uuid | null;
  enabled: boolean;
  mode?: "standalone" | "pet-hub";
  onActivePetChange?: (context: { householdId: Uuid | null; petId: Uuid | null }) => void;
  onRemindersChanged?: () => void | Promise<void>;
}) {
  const {
    householdSnapshot,
    pets,
    reminders,
    calendarEvents,
    selectedHouseholdId,
    selectedPetId,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    selectHousehold,
    selectPet,
    runAction
  } = useRemindersWorkspace(enabled);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [isDueTimeEnabled, setIsDueTimeEnabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [targetPetId, setTargetPetId] = useState<Uuid | "">("");
  const [snoozeDates, setSnoozeDates] = useState<Record<string, string>>({});
  const [snoozeTimes, setSnoozeTimes] = useState<Record<string, string>>({});
  const [snoozeTimeEnabled, setSnoozeTimeEnabled] = useState<Record<string, boolean>>({});
  const [localNotificationMessage, setLocalNotificationMessage] = useState<string | null>(null);
  const [activeReminderSection, setActiveReminderSection] = useState<"pending" | "completed" | "calendar">("pending");
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [openDatePicker, setOpenDatePicker] = useState<"dueDate" | string | null>(null);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const petNameById = useMemo(() => new Map(pets.map((pet) => [pet.id, pet.name])), [pets]);
  const reminderById = useMemo(() => new Map(reminders.map((reminder) => [reminder.id, reminder])), [reminders]);
  const canEdit =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;
  const pendingReminderCount = reminders.filter((reminder) => reminder.status === "pending").length;
  const completedReminderCount = reminders.filter((reminder) => reminder.status === "completed").length;
  const vaccineReminderCount = reminders.filter((reminder) => reminder.reminderType === "vaccine").length;
  const pendingReminders = reminders.filter((reminder) => reminder.status === "pending");
  const completedReminders = reminders.filter((reminder) => reminder.status === "completed");
  const activeReminders = activeReminderSection === "completed" ? completedReminders : pendingReminders;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const isPetHubMode = mode === "pet-hub";

  const handleSelectHousehold = async (householdId: Uuid) => {
    await selectHousehold(householdId);
    onActivePetChange?.({ householdId, petId: null });
  };

  const handleSelectPet = async (petId: Uuid | null) => {
    await selectPet(petId);
    onActivePetChange?.({ householdId: selectedHouseholdId, petId });
  };

  useEffect(() => {
    if (!enabled || !contextHouseholdId || contextHouseholdId === selectedHouseholdId) {
      return;
    }

    void selectHousehold(contextHouseholdId);
  }, [contextHouseholdId, enabled, selectHousehold, selectedHouseholdId]);

  useEffect(() => {
    if (!enabled || contextPetId === undefined || contextPetId === selectedPetId) {
      return;
    }

    if (contextPetId === null || pets.some((pet) => pet.id === contextPetId)) {
      void selectPet(contextPetId);
    }
  }, [contextPetId, enabled, pets, selectPet, selectedPetId]);

  useEffect(() => {
    setTargetPetId((currentPetId) => (currentPetId && !pets.some((pet) => pet.id === currentPetId) ? "" : currentPetId));
  }, [pets]);

  useEffect(() => {
    if (!isPetHubMode) {
      return;
    }

    setTargetPetId(selectedPetId ?? "");
  }, [isPetHubMode, selectedPetId]);

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      {!errorMessage && localNotificationMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{localNotificationMessage}</Text></View> : null}
      <View
        style={{
          borderRadius: visualTokens.mobile.sectionRadius,
          borderWidth: 1,
          borderColor: colorTokens.line,
          backgroundColor: "rgba(255,255,255,0.96)",
          padding: 16,
          gap: 12,
          ...visualTokens.mobile.shadow
        }}
      >
        <View style={{ gap: 3 }}>
          <Text style={{ color: colorTokens.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>
            Recordatorios
          </Text>
          <Text style={{ color: colorTokens.ink, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
            {isPetHubMode && selectedPet ? `Recordatorios de ${selectedPet.name}` : "Calendario y recordatorios"}
          </Text>
          <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 16 }}>
            Organiza tareas de cuidado y eventos derivados de salud en un solo lugar.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Preparando recordatorios del cuidado...</Text> : null}

          {!isPetHubMode && householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
            <Pressable key={household.id} onPress={() => void handleSelectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</Text>
            </Pressable>
          )) : !isPetHubMode ? <Text style={{ color: colorTokens.muted }}>Crea primero un hogar.</Text> : null}

          {!isPetHubMode ? <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Filtro por mascota</Text>
            {selectedHousehold ? (
              <>
                <Button label="Todos los recordatorios del hogar" onPress={() => void handleSelectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
                {pets.length ? pets.map((pet) => (
                  <Button key={pet.id} label={pet.name} onPress={() => void handleSelectPet(pet.id)} tone={pet.id === selectedPetId ? "primary" : "secondary"} />
                )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay mascotas en este hogar.</Text>}
              </>
            ) : <Text style={{ color: colorTokens.muted }}>Selecciona primero un hogar.</Text>}
          </View> : null}

          <View style={[cardStyle, { backgroundColor: "#ffffff" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: "#1c1917", fontSize: 15, fontWeight: "900" }}>
                  {selectedPetId ? petNameById.get(selectedPetId) ?? "Mascota seleccionada" : selectedHousehold?.name ?? "Hogar"}
                </Text>
                <Text style={{ color: colorTokens.muted, fontSize: 12 }}>{canEdit ? "editable" : "solo lectura"} - {vaccineReminderCount} desde vacunas</Text>
              </View>
              {canEdit ? (
                <CompactButton
                  label={isReminderFormOpen ? "Cerrar" : "+ Agregar"}
                  onPress={() => {
                    setOpenDatePicker(null);
                    setIsReminderFormOpen((currentValue) => !currentValue);
                  }}
                  tone={isReminderFormOpen ? "secondary" : "primary"}
                />
              ) : null}
            </View>
            <View style={{ gap: 8 }}>
              {[
                { count: pendingReminderCount, detail: "Tareas por completar", id: "pending" as const, label: "Pendientes" },
                { count: completedReminderCount, detail: "Historial cerrado", id: "completed" as const, label: "Completados" },
                { count: calendarEvents.length, detail: "Eventos programados", id: "calendar" as const, label: "Calendario" }
              ].map((item) => {
                const isActive = activeReminderSection === item.id;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setActiveReminderSection(item.id)}
                    style={{
                      borderRadius: 16,
                      backgroundColor: isActive ? "rgba(15,118,110,0.08)" : "rgba(247,250,252,0.92)",
                      borderColor: isActive ? "rgba(15,118,110,0.22)" : "rgba(15,23,42,0.06)",
                      borderWidth: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 10
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900" }}>{item.label}</Text>
                      <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 11 }}>
                        {item.count} registro(s) - {item.detail}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isReminderFormOpen ? <View style={cardStyle}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Crear recordatorio manual</Text>
            {selectedHousehold ? canEdit ? (
              <>
                <Field label="Titulo del recordatorio" onChange={setTitle} value={title} />
                {!isPetHubMode ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label="Recordatorio para todo el hogar" onPress={() => setTargetPetId("")} tone={targetPetId === "" ? "primary" : "secondary"} />
                  {pets.map((pet) => (
                    <Button key={pet.id} label={pet.name} onPress={() => setTargetPetId(pet.id)} tone={targetPetId === pet.id ? "primary" : "secondary"} />
                  ))}
                </View> : (
                  <View style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>Mascota</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedPet?.name ?? "Mascota seleccionada"}</Text>
                  </View>
                )}
                <DatePickerField
                  helperText={isDueTimeEnabled ? "La fecha y hora se usaran para programar el aviso local." : "Si no activas hora, quedara como recordatorio de dia completo."}
                  isOpen={openDatePicker === "dueDate"}
                  label="Fecha del recordatorio"
                  onChange={setDueDate}
                  onToggle={() => setOpenDatePicker((currentValue) => (currentValue === "dueDate" ? null : "dueDate"))}
                  value={dueDate}
                />
                <TimeSelectorField
                  enabled={isDueTimeEnabled}
                  onEnabledChange={setIsDueTimeEnabled}
                  onTimeChange={setDueTime}
                  timeValue={dueTime}
                />
                <Field label="Notas" multiline onChange={setNotes} value={notes} />
                <Button
                  disabled={isSubmitting}
                  label="Guardar recordatorio"
                  onPress={() => {
                    clearMessages();
                    setLocalNotificationMessage(null);
                    void runAction(
                      async () => {
                        const createdReminder = await getMobileRemindersApiClient().createReminder({
                          householdId: selectedHousehold.id,
                          petId: targetPetId || null,
                          title: title.trim(),
                          dueAt: toIsoDateTime(dueDate, dueTime, isDueTimeEnabled),
                          remindTimeEnabled: isDueTimeEnabled,
                          notes: notes.trim() || null
                        });

                        if (createdReminder.remindTimeEnabled) {
                          const notificationStatus = await scheduleReminderNotification({
                            body: createdReminder.notes,
                            dueAt: createdReminder.dueAt,
                            petName: createdReminder.petId ? petNameById.get(createdReminder.petId) : null,
                            reminderId: createdReminder.id,
                            title: createdReminder.title
                          });
                          setLocalNotificationMessage(getNotificationInfoMessage(notificationStatus));
                        }

                        return createdReminder;
                      },
                      "Recordatorio creado."
                    ).then(() => {
                      void onRemindersChanged?.();
                      setTitle("");
                      setDueDate("");
                      setDueTime("09:00");
                      setIsDueTimeEnabled(false);
                      setNotes("");
                      setTargetPetId("");
                      setOpenDatePicker(null);
                      setIsReminderFormOpen(false);
                      setActiveReminderSection("pending");
                    });
                  }}
                />
              </>
            ) : <Text style={{ color: colorTokens.muted }}>Hogar en modo solo lectura. Puedes revisar el calendario, pero no modificar recordatorios.</Text> : <Text style={{ color: colorTokens.muted }}>Selecciona primero un hogar.</Text>}
          </View> : null}

          {activeReminderSection !== "calendar" ? <View style={cardStyle}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>
              {activeReminderSection === "completed" ? "Completados" : "Pendientes"} ({activeReminders.length})
            </Text>
            {activeReminders.length ? activeReminders.map((reminder) => (
              <View key={reminder.id} style={inputStyle}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>{reminder.title}</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{reminderTypeLabels[reminder.reminderType]} - {reminderStatusLabels[reminder.status]}</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                  Programado: {formatReminderSchedule(reminder)}
                  {reminder.petId ? ` - ${petNameById.get(reminder.petId) ?? "Recordatorio de mascota"}` : " - Recordatorio del hogar"}
                </Text>
                <Text style={{ color: reminder.remindTimeEnabled ? colorTokens.accentDark : colorTokens.muted, fontSize: 11, fontWeight: reminder.remindTimeEnabled ? "800" : "500" }}>
                  {getNotificationStatusLabel(reminder)}
                </Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{reminder.notes ?? "Sin notas todavia."}</Text>
                {canEdit ? (
                  <View style={{ gap: 8 }}>
                    {reminder.status !== "completed" ? (
                      <CompactButton
                        disabled={isSubmitting}
                        label="Completar"
                        onPress={() => {
                          clearMessages();
                          setLocalNotificationMessage(null);
                          void runAction(
                            async () => {
                              const completedReminder = await getMobileRemindersApiClient().completeReminder(reminder.id);
                              await cancelReminderNotification(reminder.id);
                              return completedReminder;
                            },
                            "Recordatorio completado."
                          ).then(() => void onRemindersChanged?.());
                        }}
                      />
                    ) : null}
                    <DatePickerField
                      isOpen={openDatePicker === reminder.id}
                      label="Posponer hasta"
                      onChange={(value) => setSnoozeDates((currentDates) => ({ ...currentDates, [reminder.id]: value }))}
                      onToggle={() => setOpenDatePicker((currentValue) => (currentValue === reminder.id ? null : reminder.id))}
                      value={snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder)}
                    />
                    <TimeSelectorField
                      enabled={snoozeTimeEnabled[reminder.id] ?? reminder.remindTimeEnabled}
                      label="Hora al posponer"
                      onEnabledChange={(enabled) => setSnoozeTimeEnabled((currentValues) => ({ ...currentValues, [reminder.id]: enabled }))}
                      onTimeChange={(value) => setSnoozeTimes((currentTimes) => ({ ...currentTimes, [reminder.id]: value }))}
                      timeValue={snoozeTimes[reminder.id] ?? getDefaultSnoozeTime(reminder)}
                    />
                    <CompactButton
                      disabled={isSubmitting}
                      label="Posponer"
                      onPress={() => {
                          clearMessages();
                        setLocalNotificationMessage(null);
                        const nextRemindTimeEnabled = snoozeTimeEnabled[reminder.id] ?? reminder.remindTimeEnabled;
                        const nextDueAt = toIsoDateTime(
                          snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder),
                          snoozeTimes[reminder.id] ?? getDefaultSnoozeTime(reminder),
                          nextRemindTimeEnabled
                        );
                        void runAction(
                          async () => {
                            const snoozedReminder = await getMobileRemindersApiClient().snoozeReminder(reminder.id, {
                              dueAt: nextDueAt,
                              remindTimeEnabled: nextRemindTimeEnabled
                            });

                            if (snoozedReminder.remindTimeEnabled) {
                              const notificationStatus = await scheduleReminderNotification({
                                body: snoozedReminder.notes,
                                dueAt: snoozedReminder.dueAt,
                                petName: snoozedReminder.petId ? petNameById.get(snoozedReminder.petId) : null,
                                reminderId: snoozedReminder.id,
                                title: snoozedReminder.title
                              });
                              setLocalNotificationMessage(getNotificationInfoMessage(notificationStatus));
                            } else {
                              await cancelReminderNotification(snoozedReminder.id);
                              setLocalNotificationMessage("Recordatorio pospuesto sin notificacion local.");
                            }

                            return snoozedReminder;
                          },
                          "Recordatorio pospuesto."
                        ).then(() => void onRemindersChanged?.());
                      }}
                      tone="secondary"
                    />
                  </View>
                ) : null}
              </View>
            )) : <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>No hay recordatorios para este filtro. Crea uno desde esta mascota para mantener el cuidado al dia.</Text>}
          </View> : null}

          {activeReminderSection === "calendar" ? <View style={cardStyle}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Calendario ({calendarEvents.length})</Text>
            {calendarEvents.length ? calendarEvents.map((event) => (
              <View key={event.id} style={inputStyle}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>{event.title}</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                  {reminderById.get(event.reminderId)?.remindTimeEnabled ? formatDateTimeLabel(event.startsAt) : formatDate(event.startsAt)}
                </Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{calendarEventStatusLabels[event.status]}</Text>
              </View>
            )) : <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>Todavia no hay eventos de calendario para este filtro.</Text>}
          </View> : null}
        </View>
      </View>
    </View>
  );
}
