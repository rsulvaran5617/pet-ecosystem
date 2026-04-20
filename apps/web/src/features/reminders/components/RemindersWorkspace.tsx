"use client";

import { calendarEventStatusLabels, formatHouseholdPermissions, reminderStatusLabels, reminderTypeLabels } from "@pet/config";
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
        eyebrow="EP-04 / Recordatorios"
        title="Calendario y recordatorios basicos"
        description="Solo recordatorios manuales y derivados de vacunas. Los eventos de reservas siguen diferidos hasta EP-06."
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando recordatorios desde Supabase...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,280px) minmax(220px,280px) minmax(0,1fr)", gap: "18px" }}>
            <article style={cardStyle}>
              <h3 style={{ margin: 0 }}>Hogares</h3>
              {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
                <button key={household.id} onClick={() => void selectHousehold(household.id)} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer", background: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "#fffdf8" }}>
                  <strong>{household.name}</strong>
                  <div style={{ color: "#57534e", marginTop: "6px" }}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</div>
                </button>
              )) : <p style={{ margin: 0, color: "#57534e" }}>Crea primero un hogar.</p>}
            </article>

            <article style={cardStyle}>
              <h3 style={{ margin: 0 }}>Filtro por mascota</h3>
              {selectedHousehold ? (
                <>
                  <button onClick={() => void selectPet(null)} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer", background: selectedPetId === null ? "rgba(15,118,110,0.08)" : "#fffdf8" }}>
                    <strong>Todos los recordatorios del hogar</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>Incluye tareas manuales del hogar y recordatorios asociados a mascotas.</div>
                  </button>
                  {pets.length ? pets.map((pet) => (
                    <button key={pet.id} onClick={() => void selectPet(pet.id)} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer", background: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "#fffdf8" }}>
                      <strong>{pet.name}</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</div>
                    </button>
                  )) : <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay mascotas en este hogar.</p>}
                </>
              ) : <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero un hogar.</p>}
            </article>

            <div style={{ display: "grid", gap: "18px" }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Resumen del calendario</h3>
                    <div style={{ color: "#57534e" }}>{selectedPetId ? petNameById.get(selectedPetId) ?? "Mascota seleccionada" : selectedHousehold?.name ?? "Hogar"}</div>
                  </div>
                  <strong>{canEdit ? "editable" : "solo lectura"}</strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px" }}>
                  <div><strong>{pendingReminderCount}</strong><div style={{ color: "#57534e" }}>Pendientes</div></div>
                  <div><strong>{completedReminderCount}</strong><div style={{ color: "#57534e" }}>Completados</div></div>
                  <div><strong>{vaccineReminderCount}</strong><div style={{ color: "#57534e" }}>Desde vacunas</div></div>
                  <div><strong>{calendarEvents.length}</strong><div style={{ color: "#57534e" }}>Eventos del calendario</div></div>
                </div>
                <div style={{ color: "#57534e" }}>
                  Los eventos de agenda derivados de reservas siguen diferidos hasta `EP-06 / Reservas`.
                </div>
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Crear recordatorio manual</h3>
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
                      "Recordatorio creado."
                    ).then(() => {
                      setTitle("");
                      setDueDate("");
                      setNotes("");
                      setTargetPetId("");
                    });
                  }} style={{ display: "grid", gap: "10px" }}>
                    <input style={inputStyle} placeholder="Titulo del recordatorio" value={title} onChange={(event) => setTitle(event.target.value)} />
                    <select style={inputStyle} value={targetPetId} onChange={(event) => setTargetPetId(event.target.value as Uuid | "")}>
                      <option value="">Recordatorio para todo el hogar</option>
                      {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                    </select>
                    <input style={inputStyle} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    <textarea style={inputStyle} rows={3} placeholder="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} />
                    <button disabled={isSubmitting} type="submit">Guardar recordatorio</button>
                  </form>
                ) : <p style={{ margin: 0, color: "#57534e" }}>Hogar en modo solo lectura. Puedes revisar el calendario, pero no modificar recordatorios.</p> : <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero un hogar.</p>}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Recordatorios</h3>
                {reminders.length ? reminders.map((reminder) => (
                  <div key={reminder.id} style={inputStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <strong>{reminder.title}</strong>
                      <span>{reminderTypeLabels[reminder.reminderType]} - {reminderStatusLabels[reminder.status]}</span>
                    </div>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>
                      Vence: {formatDate(reminder.dueAt)}
                      {reminder.petId ? ` - ${petNameById.get(reminder.petId) ?? "Recordatorio de mascota"}` : " - Recordatorio del hogar"}
                    </div>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{reminder.notes ?? "Sin notas todavia."}</div>
                    {canEdit ? (
                      <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {reminder.status !== "completed" ? (
                            <button disabled={isSubmitting} type="button" onClick={() => {
                              clearMessages();
                              void runAction(
                                () => getBrowserRemindersApiClient().completeReminder(reminder.id),
                                "Recordatorio completado."
                              );
                            }}>
                              Completar
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
                              "Recordatorio pospuesto."
                            );
                          }}>
                            Posponer
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )) : <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay recordatorios para este filtro.</p>}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Calendario</h3>
                {calendarEvents.length ? calendarEvents.map((event) => (
                  <div key={event.id} style={inputStyle}>
                    <strong>{event.title}</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDate(event.startsAt)}</div>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{calendarEventStatusLabels[event.status]}</div>
                  </div>
                )) : <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay eventos de calendario para este filtro.</p>}
              </article>
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
