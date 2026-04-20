import { calendarEventStatusLabels, formatHouseholdPermissions, reminderStatusLabels, reminderTypeLabels } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { Reminder, Uuid } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
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

function Field({ label, onChange, value, multiline = false }: { label: string; onChange: (value: string) => void; value: string; multiline?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        onChangeText={onChange}
        placeholder={label}
        style={[inputStyle, multiline ? { minHeight: 88, textAlignVertical: "top" } : null]}
        value={value}
      />
    </View>
  );
}

export function RemindersWorkspace({ enabled }: { enabled: boolean }) {
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

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const petNameById = useMemo(() => new Map(pets.map((pet) => [pet.id, pet.name])), [pets]);
  const canEdit =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;
  const pendingReminderCount = reminders.filter((reminder) => reminder.status === "pending").length;
  const completedReminderCount = reminders.filter((reminder) => reminder.status === "completed").length;
  const vaccineReminderCount = reminders.filter((reminder) => reminder.reminderType === "vaccine").length;

  useEffect(() => {
    setTargetPetId((currentPetId) => (currentPetId && !pets.some((pet) => pet.id === currentPetId) ? "" : currentPetId));
  }, [pets]);

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="EP-04 / Recordatorios"
        title="Calendario y recordatorios basicos"
        description="Solo recordatorios manuales y derivados de vacunas. Los eventos de reservas siguen diferidos hasta EP-06."
      >
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Cargando recordatorios desde Supabase...</Text> : null}

          {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
            <Pressable key={household.id} onPress={() => void selectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</Text>
            </Pressable>
          )) : <Text style={{ color: colorTokens.muted }}>Crea primero un hogar.</Text>}

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Filtro por mascota</Text>
            {selectedHousehold ? (
              <>
                <Button label="Todos los recordatorios del hogar" onPress={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
                {pets.length ? pets.map((pet) => (
                  <Button key={pet.id} label={pet.name} onPress={() => void selectPet(pet.id)} tone={pet.id === selectedPetId ? "primary" : "secondary"} />
                )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay mascotas en este hogar.</Text>}
              </>
            ) : <Text style={{ color: colorTokens.muted }}>Selecciona primero un hogar.</Text>}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Resumen del calendario</Text>
            <Text style={{ color: colorTokens.muted }}>{selectedPetId ? petNameById.get(selectedPetId) ?? "Mascota seleccionada" : selectedHousehold?.name ?? "Hogar"}</Text>
            <Text style={{ color: colorTokens.muted }}>Modo: {canEdit ? "editable" : "solo lectura"}</Text>
            <Text style={{ color: colorTokens.muted }}>Pendientes: {pendingReminderCount}</Text>
            <Text style={{ color: colorTokens.muted }}>Completados: {completedReminderCount}</Text>
            <Text style={{ color: colorTokens.muted }}>Desde vacunas: {vaccineReminderCount}</Text>
            <Text style={{ color: colorTokens.muted }}>Eventos del calendario: {calendarEvents.length}</Text>
            <Text style={{ color: colorTokens.muted }}>Los eventos de agenda derivados de reservas siguen diferidos hasta EP-06.</Text>
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Crear recordatorio manual</Text>
            {selectedHousehold ? canEdit ? (
              <>
                <Field label="Titulo del recordatorio" onChange={setTitle} value={title} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label="Recordatorio para todo el hogar" onPress={() => setTargetPetId("")} tone={targetPetId === "" ? "primary" : "secondary"} />
                  {pets.map((pet) => (
                    <Button key={pet.id} label={pet.name} onPress={() => setTargetPetId(pet.id)} tone={targetPetId === pet.id ? "primary" : "secondary"} />
                  ))}
                </View>
                <Field label="Fecha de vencimiento (AAAA-MM-DD)" onChange={setDueDate} value={dueDate} />
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
                    });
                  }}
                />
              </>
            ) : <Text style={{ color: colorTokens.muted }}>Hogar en modo solo lectura. Puedes revisar el calendario, pero no modificar recordatorios.</Text> : <Text style={{ color: colorTokens.muted }}>Selecciona primero un hogar.</Text>}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Recordatorios</Text>
            {reminders.length ? reminders.map((reminder) => (
              <View key={reminder.id} style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>{reminder.title}</Text>
                <Text style={{ color: colorTokens.muted }}>{reminderTypeLabels[reminder.reminderType]} - {reminderStatusLabels[reminder.status]}</Text>
                <Text style={{ color: colorTokens.muted }}>
                  Vence: {formatDate(reminder.dueAt)}
                  {reminder.petId ? ` - ${petNameById.get(reminder.petId) ?? "Recordatorio de mascota"}` : " - Recordatorio del hogar"}
                </Text>
                <Text style={{ color: colorTokens.muted }}>{reminder.notes ?? "Sin notas todavia."}</Text>
                {canEdit ? (
                  <View style={{ gap: 8 }}>
                    {reminder.status !== "completed" ? (
                      <Button
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
                    <Field
                      label="Posponer hasta (AAAA-MM-DD)"
                      onChange={(value) => setSnoozeDates((currentDates) => ({ ...currentDates, [reminder.id]: value }))}
                      value={snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder)}
                    />
                    <Button
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
            )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay recordatorios para este filtro.</Text>}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Calendario</Text>
            {calendarEvents.length ? calendarEvents.map((event) => (
              <View key={event.id} style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>{event.title}</Text>
                <Text style={{ color: colorTokens.muted }}>{formatDate(event.startsAt)}</Text>
                <Text style={{ color: colorTokens.muted }}>{calendarEventStatusLabels[event.status]}</Text>
              </View>
            )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay eventos de calendario para este filtro.</Text>}
          </View>
        </View>
      </CoreSectionCard>
    </View>
  );
}
