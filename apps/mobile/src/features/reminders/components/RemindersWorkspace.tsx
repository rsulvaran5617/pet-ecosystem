import { calendarEventStatusLabels, formatHouseholdPermissions, reminderStatusLabels, reminderTypeLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { Reminder, Uuid } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

import { getMobileRemindersApiClient } from "../../core/services/supabase-mobile";
import { useRemindersWorkspace } from "../hooks/useRemindersWorkspace";

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

function toIsoDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Se requiere una fecha valida.");
  }

  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0)).toISOString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PA", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDatePickerLabel(value: string) {
  if (!value) {
    return "Seleccionar fecha";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PA", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getDefaultSnoozeDate(reminder: Reminder) {
  const nextDate = new Date(reminder.dueAt);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return toDateInput(nextDate.toISOString());
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
          <Calendar
            current={selectedDate}
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

export function RemindersWorkspace({
  contextHouseholdId,
  contextPetId,
  enabled,
  mode = "standalone"
}: {
  contextHouseholdId?: Uuid | null;
  contextPetId?: Uuid | null;
  enabled: boolean;
  mode?: "standalone" | "pet-hub";
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
  const [notes, setNotes] = useState("");
  const [targetPetId, setTargetPetId] = useState<Uuid | "">("");
  const [snoozeDates, setSnoozeDates] = useState<Record<string, string>>({});
  const [activeReminderSection, setActiveReminderSection] = useState<"pending" | "completed" | "calendar">("pending");
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [openDatePicker, setOpenDatePicker] = useState<"dueDate" | string | null>(null);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const petNameById = useMemo(() => new Map(pets.map((pet) => [pet.id, pet.name])), [pets]);
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
            <Pressable key={household.id} onPress={() => void selectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</Text>
            </Pressable>
          )) : !isPetHubMode ? <Text style={{ color: colorTokens.muted }}>Crea primero un hogar.</Text> : null}

          {!isPetHubMode ? <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Filtro por mascota</Text>
            {selectedHousehold ? (
              <>
                <Button label="Todos los recordatorios del hogar" onPress={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
                {pets.length ? pets.map((pet) => (
                  <Button key={pet.id} label={pet.name} onPress={() => void selectPet(pet.id)} tone={pet.id === selectedPetId ? "primary" : "secondary"} />
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
                  helperText="Se guardara a las 09:00 del dia elegido. No cambia el formato enviado al MVP."
                  isOpen={openDatePicker === "dueDate"}
                  label="Fecha de vencimiento"
                  onChange={setDueDate}
                  onToggle={() => setOpenDatePicker((currentValue) => (currentValue === "dueDate" ? null : "dueDate"))}
                  value={dueDate}
                />
                <Field label="Notas" multiline onChange={setNotes} value={notes} />
                <Button
                  disabled={isSubmitting}
                  label="Guardar recordatorio"
                  onPress={() => {
                    clearMessages();
                    void runAction(
                      () => getMobileRemindersApiClient().createReminder({
                        householdId: selectedHousehold.id,
                        petId: targetPetId || null,
                        title: title.trim(),
                        dueAt: toIsoDate(dueDate),
                        notes: notes.trim() || null
                      }),
                      "Recordatorio creado."
                    ).then(() => {
                      setTitle("");
                      setDueDate("");
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
                  Vence: {formatDate(reminder.dueAt)}
                  {reminder.petId ? ` - ${petNameById.get(reminder.petId) ?? "Recordatorio de mascota"}` : " - Recordatorio del hogar"}
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
                          void runAction(
                            () => getMobileRemindersApiClient().completeReminder(reminder.id),
                            "Recordatorio completado."
                          );
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
                    <CompactButton
                      disabled={isSubmitting}
                      label="Posponer"
                      onPress={() => {
                        clearMessages();
                        void runAction(
                          () => getMobileRemindersApiClient().snoozeReminder(reminder.id, {
                            dueAt: toIsoDate(snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder))
                          }),
                          "Recordatorio pospuesto."
                        );
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
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{formatDate(event.startsAt)}</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{calendarEventStatusLabels[event.status]}</Text>
              </View>
            )) : <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>Todavia no hay eventos de calendario para este filtro.</Text>}
          </View> : null}
        </View>
      </View>
    </View>
  );
}
