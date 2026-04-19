"use client";

import { calendarEventStatusLabels, reminderStatusLabels, reminderTypeLabels } from "@pet/config";
import type { Reminder, Uuid } from "@pet/types";
import { useEffect, useMemo, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { getBrowserRemindersApiClient } from "../../core/services/supabase-browser";
import { useRemindersWorkspace } from "../hooks/useRemindersWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

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
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-04 / Reminders"
        title="Calendar and reminder basics"
        description="Manual reminders and vaccine-derived reminders only. Booking events remain explicitly deferred to EP-06."
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Loading reminders from Supabase...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,280px) minmax(220px,280px) minmax(0,1fr)", gap: "18px" }}>
            <article style={cardStyle}>
              <h3 style={{ margin: 0 }}>Households</h3>
              {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
                <button key={household.id} onClick={() => void selectHousehold(household.id)} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer", background: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "#fffdf8" }}>
                  <strong>{household.name}</strong>
                  <div style={{ color: "#57534e", marginTop: "6px" }}>{household.memberCount} member(s) - {household.myPermissions.join(", ")}</div>
                </button>
              )) : <p style={{ margin: 0, color: "#57534e" }}>Create a household first.</p>}
            </article>

            <article style={cardStyle}>
              <h3 style={{ margin: 0 }}>Pet filter</h3>
              {selectedHousehold ? (
                <>
                  <button onClick={() => void selectPet(null)} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer", background: selectedPetId === null ? "rgba(15,118,110,0.08)" : "#fffdf8" }}>
                    <strong>All household reminders</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>Manual household tasks plus pet reminders.</div>
                  </button>
                  {pets.length ? pets.map((pet) => (
                    <button key={pet.id} onClick={() => void selectPet(pet.id)} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer", background: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "#fffdf8" }}>
                      <strong>{pet.name}</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</div>
                    </button>
                  )) : <p style={{ margin: 0, color: "#57534e" }}>No pets in this household yet.</p>}
                </>
              ) : <p style={{ margin: 0, color: "#57534e" }}>Select a household first.</p>}
            </article>

            <div style={{ display: "grid", gap: "18px" }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Calendar snapshot</h3>
                    <div style={{ color: "#57534e" }}>{selectedPetId ? petNameById.get(selectedPetId) ?? "Selected pet" : selectedHousehold?.name ?? "Household"}</div>
                  </div>
                  <strong>{canEdit ? "editable" : "read-only"}</strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px" }}>
                  <div><strong>{pendingReminderCount}</strong><div style={{ color: "#57534e" }}>Pending</div></div>
                  <div><strong>{completedReminderCount}</strong><div style={{ color: "#57534e" }}>Completed</div></div>
                  <div><strong>{vaccineReminderCount}</strong><div style={{ color: "#57534e" }}>From vaccines</div></div>
                  <div><strong>{calendarEvents.length}</strong><div style={{ color: "#57534e" }}>Calendar events</div></div>
                </div>
                <div style={{ color: "#57534e" }}>
                  Booking-derived agenda events stay deferred until `EP-06 / Bookings`.
                </div>
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Create manual reminder</h3>
                {selectedHousehold ? canEdit ? (
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    clearMessages();
                    void runAction(
                      () => getBrowserRemindersApiClient().createReminder({
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
                  }} style={{ display: "grid", gap: "10px" }}>
                    <input style={inputStyle} placeholder="Reminder title" value={title} onChange={(event) => setTitle(event.target.value)} />
                    <select style={inputStyle} value={targetPetId} onChange={(event) => setTargetPetId(event.target.value as Uuid | "")}>
                      <option value="">Household-wide reminder</option>
                      {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                    </select>
                    <input style={inputStyle} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    <textarea style={inputStyle} rows={3} placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                    <button disabled={isSubmitting} type="submit">Save reminder</button>
                  </form>
                ) : <p style={{ margin: 0, color: "#57534e" }}>Read-only household. You can inspect the calendar but not mutate reminders.</p> : <p style={{ margin: 0, color: "#57534e" }}>Select a household first.</p>}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Reminders</h3>
                {reminders.length ? reminders.map((reminder) => (
                  <div key={reminder.id} style={inputStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <strong>{reminder.title}</strong>
                      <span>{reminderTypeLabels[reminder.reminderType]} - {reminderStatusLabels[reminder.status]}</span>
                    </div>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>
                      Due: {formatDate(reminder.dueAt)}
                      {reminder.petId ? ` - ${petNameById.get(reminder.petId) ?? "Pet reminder"}` : " - Household reminder"}
                    </div>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reminder.notes ?? "No notes yet."}</div>
                    {canEdit ? (
                      <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {reminder.status !== "completed" ? (
                            <button disabled={isSubmitting} type="button" onClick={() => {
                              clearMessages();
                              void runAction(
                                () => getBrowserRemindersApiClient().completeReminder(reminder.id),
                                "Reminder completed."
                              );
                            }}>
                              Complete
                            </button>
                          ) : null}
                          <input
                            style={inputStyle}
                            type="date"
                            value={snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder)}
                            onChange={(event) => setSnoozeDates((currentDates) => ({ ...currentDates, [reminder.id]: event.target.value }))}
                          />
                          <button disabled={isSubmitting} type="button" onClick={() => {
                            clearMessages();
                            void runAction(
                              () => getBrowserRemindersApiClient().snoozeReminder(reminder.id, {
                                dueAt: toIsoDate(snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder))
                              }),
                              "Reminder snoozed."
                            );
                          }}>
                            Snooze
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )) : <p style={{ margin: 0, color: "#57534e" }}>No reminders for this filter yet.</p>}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Calendar</h3>
                {calendarEvents.length ? calendarEvents.map((event) => (
                  <div key={event.id} style={inputStyle}>
                    <strong>{event.title}</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDate(event.startsAt)}</div>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{calendarEventStatusLabels[event.status]}</div>
                  </div>
                )) : <p style={{ margin: 0, color: "#57534e" }}>No calendar events for this filter yet.</p>}
              </article>
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
