import { calendarEventStatusLabels, reminderStatusLabels, reminderTypeLabels } from "@pet/config";
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
    throw new Error("A valid due date is required.");
  }

  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0)).toISOString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
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
        eyebrow="EP-04 / Reminders"
        title="Calendar and reminder basics"
        description="Manual reminders and vaccine-derived reminders only. Booking events remain explicitly deferred to EP-06."
      >
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Loading reminders from Supabase...</Text> : null}

          {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
            <Pressable key={household.id} onPress={() => void selectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{household.memberCount} member(s) - {household.myPermissions.join(", ")}</Text>
            </Pressable>
          )) : <Text style={{ color: colorTokens.muted }}>Create a household first.</Text>}

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Pet filter</Text>
            {selectedHousehold ? (
              <>
                <Button label="All household reminders" onPress={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
                {pets.length ? pets.map((pet) => (
                  <Button key={pet.id} label={pet.name} onPress={() => void selectPet(pet.id)} tone={pet.id === selectedPetId ? "primary" : "secondary"} />
                )) : <Text style={{ color: colorTokens.muted }}>No pets in this household yet.</Text>}
              </>
            ) : <Text style={{ color: colorTokens.muted }}>Select a household first.</Text>}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Calendar snapshot</Text>
            <Text style={{ color: colorTokens.muted }}>{selectedPetId ? petNameById.get(selectedPetId) ?? "Selected pet" : selectedHousehold?.name ?? "Household"}</Text>
            <Text style={{ color: colorTokens.muted }}>Mode: {canEdit ? "editable" : "read-only"}</Text>
            <Text style={{ color: colorTokens.muted }}>Pending: {pendingReminderCount}</Text>
            <Text style={{ color: colorTokens.muted }}>Completed: {completedReminderCount}</Text>
            <Text style={{ color: colorTokens.muted }}>From vaccines: {vaccineReminderCount}</Text>
            <Text style={{ color: colorTokens.muted }}>Calendar events: {calendarEvents.length}</Text>
            <Text style={{ color: colorTokens.muted }}>Booking-derived agenda events stay deferred until EP-06.</Text>
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Create manual reminder</Text>
            {selectedHousehold ? canEdit ? (
              <>
                <Field label="Reminder title" onChange={setTitle} value={title} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label="Household-wide" onPress={() => setTargetPetId("")} tone={targetPetId === "" ? "primary" : "secondary"} />
                  {pets.map((pet) => (
                    <Button key={pet.id} label={pet.name} onPress={() => setTargetPetId(pet.id)} tone={targetPetId === pet.id ? "primary" : "secondary"} />
                  ))}
                </View>
                <Field label="Due date (YYYY-MM-DD)" onChange={setDueDate} value={dueDate} />
                <Field label="Notes" multiline onChange={setNotes} value={notes} />
                <Button
                  disabled={isSubmitting}
                  label="Save reminder"
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
                      "Reminder created."
                    ).then(() => {
                      setTitle("");
                      setDueDate("");
                      setNotes("");
                      setTargetPetId("");
                    });
                  }}
                />
              </>
            ) : <Text style={{ color: colorTokens.muted }}>Read-only household. You can inspect the calendar but not mutate reminders.</Text> : <Text style={{ color: colorTokens.muted }}>Select a household first.</Text>}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Reminders</Text>
            {reminders.length ? reminders.map((reminder) => (
              <View key={reminder.id} style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>{reminder.title}</Text>
                <Text style={{ color: colorTokens.muted }}>{reminderTypeLabels[reminder.reminderType]} - {reminderStatusLabels[reminder.status]}</Text>
                <Text style={{ color: colorTokens.muted }}>
                  Due: {formatDate(reminder.dueAt)}
                  {reminder.petId ? ` - ${petNameById.get(reminder.petId) ?? "Pet reminder"}` : " - Household reminder"}
                </Text>
                <Text style={{ color: colorTokens.muted }}>{reminder.notes ?? "No notes yet."}</Text>
                {canEdit ? (
                  <View style={{ gap: 8 }}>
                    {reminder.status !== "completed" ? (
                      <Button
                        disabled={isSubmitting}
                        label="Complete"
                        onPress={() => {
                          clearMessages();
                          void runAction(
                            () => getMobileRemindersApiClient().completeReminder(reminder.id),
                            "Reminder completed."
                          );
                        }}
                      />
                    ) : null}
                    <Field
                      label="Snooze to (YYYY-MM-DD)"
                      onChange={(value) => setSnoozeDates((currentDates) => ({ ...currentDates, [reminder.id]: value }))}
                      value={snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder)}
                    />
                    <Button
                      disabled={isSubmitting}
                      label="Snooze"
                      onPress={() => {
                        clearMessages();
                        void runAction(
                          () => getMobileRemindersApiClient().snoozeReminder(reminder.id, {
                            dueAt: toIsoDate(snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder))
                          }),
                          "Reminder snoozed."
                        );
                      }}
                      tone="secondary"
                    />
                  </View>
                ) : null}
              </View>
            )) : <Text style={{ color: colorTokens.muted }}>No reminders for this filter yet.</Text>}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Calendar</Text>
            {calendarEvents.length ? calendarEvents.map((event) => (
              <View key={event.id} style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>{event.title}</Text>
                <Text style={{ color: colorTokens.muted }}>{formatDate(event.startsAt)}</Text>
                <Text style={{ color: colorTokens.muted }}>{calendarEventStatusLabels[event.status]}</Text>
              </View>
            )) : <Text style={{ color: colorTokens.muted }}>No calendar events for this filter yet.</Text>}
          </View>
        </View>
      </CoreSectionCard>
    </View>
  );
}
