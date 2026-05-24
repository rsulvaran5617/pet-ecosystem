"use client";

import { calendarEventStatusLabels, formatHouseholdPermissions, reminderStatusLabels, reminderTypeLabels } from "@pet/config";
import type { Reminder, Uuid } from "@pet/types";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { getBrowserRemindersApiClient } from "../../core/services/supabase-browser";
import { useRemindersWorkspace } from "../hooks/useRemindersWorkspace";

const cardStyle: CSSProperties = {
  borderRadius: "14px",
  background: "rgba(247,242,231,0.78)",
  padding: "12px",
  display: "grid",
  gap: "8px",
  border: "1px solid rgba(28,25,23,0.06)"
};

const inputStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid rgba(28,25,23,0.14)",
  padding: "7px 9px",
  background: "#fffdf8",
  fontSize: "9px"
};

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

function Button({
  children,
  disabled,
  onClick,
  tone = "primary",
  type = "button"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        borderRadius: "999px",
        border: tone === "primary" ? "none" : "1px solid rgba(15,118,110,0.22)",
        background: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.92)",
        color: tone === "primary" ? "#f8fafc" : "#0f766e",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "9px",
        fontWeight: 800,
        opacity: disabled ? 0.65 : 1,
        padding: "6px 10px"
      }}
      type={type}
    >
      {children}
    </button>
  );
}

function SectionButton({
  count,
  detail,
  isActive,
  label,
  onClick
}: {
  count: number;
  detail: string;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...inputStyle,
        background: isActive ? "rgba(15,118,110,0.08)" : "rgba(255,255,255,0.86)",
        border: isActive ? "1px solid rgba(15,118,110,0.26)" : inputStyle.border,
        cursor: "pointer",
        display: "grid",
        gap: "2px",
        textAlign: "left"
      }}
      type="button"
    >
      <strong style={{ fontSize: "10px" }}>{label}</strong>
      <span style={{ color: "#57534e", fontSize: "8px" }}>{count} registro(s) - {detail}</span>
    </button>
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
  const [activeReminderSection, setActiveReminderSection] = useState<"pending" | "completed" | "calendar">("pending");
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const petNameById = useMemo(() => new Map(pets.map((pet) => [pet.id, pet.name])), [pets]);
  const canEdit =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;
  const pendingReminderCount = reminders.filter((reminder) => reminder.status === "pending").length;
  const completedReminderCount = reminders.filter((reminder) => reminder.status === "completed").length;
  const vaccineReminderCount = reminders.filter((reminder) => reminder.reminderType === "vaccine").length;
  const pendingReminders = reminders.filter((reminder) => reminder.status === "pending");
  const completedReminders = reminders.filter((reminder) => reminder.status === "completed");
  const activeReminders = activeReminderSection === "completed" ? completedReminders : pendingReminders;

  useEffect(() => {
    setTargetPetId((currentPetId) => (currentPetId && !pets.some((pet) => pet.id === currentPetId) ? "" : currentPetId));
  }, [pets]);

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-04 / Recordatorios"
        title="Calendario y recordatorios basicos"
        description="Organiza tareas de cuidado y eventos derivados de salud en un solo lugar. Los eventos de reservas siguen diferidos hasta EP-06."
        density="compact"
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Cargando recordatorios desde Supabase...</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "13px" }}>Hogares</h3>
                {selectedHousehold ? <StatusPill label={canEdit ? "editable" : "solo lectura"} tone={canEdit ? "active" : "neutral"} /> : null}
              </div>
              {householdSnapshot?.households.length ? (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                  {householdSnapshot.households.map((household) => (
                    <button
                      key={household.id}
                      onClick={() => void selectHousehold(household.id)}
                      style={{
                        ...inputStyle,
                        minWidth: "180px",
                        background: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "#fffdf8",
                        cursor: "pointer",
                        display: "grid",
                        gap: "4px",
                        textAlign: "left"
                      }}
                      type="button"
                    >
                      <strong style={{ fontSize: "9px" }}>{household.name}</strong>
                      <span style={{ color: "#57534e", fontSize: "8px" }}>
                        {household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Crea primero un hogar.</p>
              )}
            </article>

            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "13px" }}>Filtro por mascota</h3>
                  <p style={{ color: "#57534e", fontSize: "9px", margin: "2px 0 0" }}>Filtra recordatorios del hogar o de una mascota.</p>
                </div>
                <StatusPill label={selectedPet ? selectedPet.name : "todo el hogar"} tone="neutral" />
              </div>
              {selectedHousehold ? (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                  <button
                    onClick={() => void selectPet(null)}
                    style={{
                      ...inputStyle,
                      minWidth: "180px",
                      background: selectedPetId === null ? "rgba(15,118,110,0.08)" : "#fffdf8",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                    type="button"
                  >
                    <strong style={{ fontSize: "9px" }}>Todos los recordatorios</strong>
                    <div style={{ color: "#57534e", marginTop: "4px", fontSize: "8px" }}>Hogar y mascotas</div>
                  </button>
                  {pets.length ? pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => void selectPet(pet.id)}
                      style={{
                        ...inputStyle,
                        minWidth: "150px",
                        background: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "#fffdf8",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      type="button"
                    >
                      <strong style={{ fontSize: "9px" }}>{pet.name}</strong>
                      <div style={{ color: "#57534e", marginTop: "4px", fontSize: "8px" }}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</div>
                    </button>
                  )) : <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Todavia no hay mascotas en este hogar.</p>}
                </div>
              ) : <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Selecciona primero un hogar.</p>}
            </article>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 0.38fr) minmax(0, 1fr)", gap: "12px", alignItems: "start", minWidth: 0 }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "12px" }}>{selectedPetId ? petNameById.get(selectedPetId) ?? "Mascota seleccionada" : selectedHousehold?.name ?? "Hogar"}</h3>
                    <p style={{ color: "#57534e", fontSize: "9px", margin: "2px 0 0" }}>{canEdit ? "editable" : "solo lectura"} - {vaccineReminderCount} desde vacunas</p>
                  </div>
                  {canEdit ? (
                    <Button
                      onClick={() => setIsReminderFormOpen((currentValue) => !currentValue)}
                      tone={isReminderFormOpen ? "secondary" : "primary"}
                    >
                      {isReminderFormOpen ? "Cerrar" : "+ Agregar"}
                    </Button>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: "7px" }}>
                  <SectionButton count={pendingReminderCount} detail="Tareas por completar" isActive={activeReminderSection === "pending"} label="Pendientes" onClick={() => setActiveReminderSection("pending")} />
                  <SectionButton count={completedReminderCount} detail="Historial cerrado" isActive={activeReminderSection === "completed"} label="Completados" onClick={() => setActiveReminderSection("completed")} />
                  <SectionButton count={calendarEvents.length} detail="Eventos programados" isActive={activeReminderSection === "calendar"} label="Calendario" onClick={() => setActiveReminderSection("calendar")} />
                </div>
              </article>

              <div style={{ display: "grid", gap: "12px", minWidth: 0 }}>
                {isReminderFormOpen ? (
                  <article style={cardStyle}>
                    <h3 style={{ margin: 0, fontSize: "12px" }}>Crear recordatorio manual</h3>
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
                          setIsReminderFormOpen(false);
                          setActiveReminderSection("pending");
                        });
                      }} style={{ display: "grid", gap: "8px" }}>
                        <input style={inputStyle} placeholder="Titulo del recordatorio" value={title} onChange={(event) => setTitle(event.target.value)} />
                        <select style={inputStyle} value={targetPetId} onChange={(event) => setTargetPetId(event.target.value as Uuid | "")}>
                          <option value="">Recordatorio para todo el hogar</option>
                          {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                        </select>
                        <input style={inputStyle} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                        <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} placeholder="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} />
                        <div>
                          <Button disabled={isSubmitting} type="submit">Guardar recordatorio</Button>
                        </div>
                      </form>
                    ) : <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Hogar en modo solo lectura. Puedes revisar el calendario, pero no modificar recordatorios.</p> : <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Selecciona primero un hogar.</p>}
                  </article>
                ) : null}

                {activeReminderSection !== "calendar" ? (
                  <article style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "12px" }}>{activeReminderSection === "completed" ? "Completados" : "Pendientes"}</h3>
                      <StatusPill label={`${activeReminders.length}`} tone="neutral" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                      {activeReminders.length ? activeReminders.map((reminder) => (
                        <div key={reminder.id} style={{ ...inputStyle, display: "grid", gap: "5px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "start" }}>
                            <strong style={{ fontSize: "10px" }}>{reminder.title}</strong>
                            <span style={{ color: "#57534e", fontSize: "8px" }}>{reminderTypeLabels[reminder.reminderType]} - {reminderStatusLabels[reminder.status]}</span>
                          </div>
                          <span style={{ color: "#57534e", fontSize: "9px" }}>
                            Vence: {formatDate(reminder.dueAt)}
                            {reminder.petId ? ` - ${petNameById.get(reminder.petId) ?? "Recordatorio de mascota"}` : " - Recordatorio del hogar"}
                          </span>
                          <span style={{ color: "#57534e", fontSize: "9px" }}>{reminder.notes ?? "Sin notas todavia."}</span>
                          {canEdit ? (
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                              {reminder.status !== "completed" ? (
                                <Button disabled={isSubmitting} onClick={() => {
                                  clearMessages();
                                  void runAction(
                                    () => getBrowserRemindersApiClient().completeReminder(reminder.id),
                                    "Recordatorio completado."
                                  );
                                }}>
                                  Completar
                                </Button>
                              ) : null}
                              <input
                                style={{ ...inputStyle, width: "128px" }}
                                type="date"
                                value={snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder)}
                                onChange={(event) => setSnoozeDates((currentDates) => ({ ...currentDates, [reminder.id]: event.target.value }))}
                              />
                              <Button disabled={isSubmitting} onClick={() => {
                                clearMessages();
                                void runAction(
                                  () => getBrowserRemindersApiClient().snoozeReminder(reminder.id, {
                                    dueAt: toIsoDate(snoozeDates[reminder.id] ?? getDefaultSnoozeDate(reminder))
                                  }),
                                  "Recordatorio pospuesto."
                                );
                              }} tone="secondary">
                                Posponer
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )) : <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>No hay recordatorios para este filtro.</p>}
                    </div>
                  </article>
                ) : (
                  <article style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "12px" }}>Calendario</h3>
                      <StatusPill label={`${calendarEvents.length}`} tone="neutral" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                      {calendarEvents.length ? calendarEvents.map((event) => (
                        <div key={event.id} style={{ ...inputStyle, display: "grid", gap: "5px" }}>
                          <strong style={{ fontSize: "10px" }}>{event.title}</strong>
                          <span style={{ color: "#57534e", fontSize: "9px" }}>{formatDate(event.startsAt)}</span>
                          <span style={{ color: "#57534e", fontSize: "9px" }}>{calendarEventStatusLabels[event.status]}</span>
                        </div>
                      )) : <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Todavia no hay eventos de calendario para este filtro.</p>}
                    </div>
                  </article>
                )}
              </div>
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
