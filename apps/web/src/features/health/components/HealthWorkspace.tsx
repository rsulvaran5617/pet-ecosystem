"use client";

import { formatHouseholdPermissions, petConditionStatusLabels, petConditionStatusOrder } from "@pet/config";
import type { UpdatePetAllergyInput, UpdatePetConditionInput, UpdatePetVaccineInput } from "@pet/types";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { getBrowserHealthApiClient } from "../../core/services/supabase-browser";
import { useHealthWorkspace } from "../hooks/useHealthWorkspace";

const cardStyle: CSSProperties = {
  borderRadius: "18px",
  background: "rgba(247,242,231,0.78)",
  padding: "14px",
  display: "grid",
  gap: "10px"
};

const inputStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid rgba(28,25,23,0.14)",
  padding: "8px 10px",
  background: "#fffdf8",
  fontSize: "10px"
};

const labelStyle: CSSProperties = {
  fontSize: "8px",
  color: "#78716c",
  letterSpacing: "0.04em",
  textTransform: "uppercase"
};

const emptyVaccineForm: UpdatePetVaccineInput = { name: "", administeredOn: "", nextDueOn: "", notes: "" };
const emptyAllergyForm: UpdatePetAllergyInput = { allergen: "", reaction: "", notes: "" };
const emptyConditionForm: UpdatePetConditionInput = { name: "", status: "active", diagnosedOn: "", isCritical: false, notes: "" };

function ActionButton({
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
      type={type}
      style={{
        borderRadius: "999px",
        border: tone === "primary" ? "none" : "1px solid rgba(28,25,23,0.14)",
        background: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.86)",
        color: tone === "primary" ? "#f8fafc" : "#1c1917",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "10px",
        fontWeight: 700,
        opacity: disabled ? 0.65 : 1,
        padding: "8px 12px"
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "5px" }}>
      {label ? <span style={labelStyle}>{label}</span> : null}
      <input onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} type={type} value={value} />
    </label>
  );
}

function TextArea({
  label,
  onChange,
  placeholder,
  value
}: {
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "5px" }}>
      {label ? <span style={labelStyle}>{label}</span> : null}
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
        value={value}
      />
    </label>
  );
}

function HealthBlock({
  title,
  count,
  children
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <article style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "15px" }}>{title}</h3>
        <StatusPill label={`${count}`} tone="neutral" />
      </div>
      {children}
    </article>
  );
}

function HealthRecord({
  children,
  onEdit
}: {
  children: ReactNode;
  onEdit?: () => void;
}) {
  return (
    <article style={{ ...inputStyle, display: "grid", gap: "5px" }}>
      {children}
      {onEdit ? (
        <div>
          <ActionButton onClick={onEdit} tone="secondary">
            Editar
          </ActionButton>
        </div>
      ) : null}
    </article>
  );
}

export function HealthWorkspace({ enabled }: { enabled: boolean }) {
  const {
    householdSnapshot,
    pets,
    selectedHouseholdId,
    selectedPetId,
    selectedPetHealthDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    selectHousehold,
    selectPet,
    runAction
  } = useHealthWorkspace(enabled);
  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [editingAllergyId, setEditingAllergyId] = useState<string | null>(null);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [vaccineForm, setVaccineForm] = useState(emptyVaccineForm);
  const [allergyForm, setAllergyForm] = useState(emptyAllergyForm);
  const [conditionForm, setConditionForm] = useState(emptyConditionForm);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const canEdit =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-04 / Salud"
        title="Panel simple de salud por mascota"
        description="Solo vacunas, alergias y condiciones, heredando los permisos del hogar y de la mascota."
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando registros de salud desde Supabase...</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>Hogares</h3>
                {selectedHousehold ? (
                  <StatusPill label={canEdit ? "editable" : "solo lectura"} tone={canEdit ? "active" : "neutral"} />
                ) : null}
              </div>
              {householdSnapshot?.households.length ? (
                <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
                  {householdSnapshot.households.map((household) => {
                    const isActive = household.id === selectedHouseholdId;

                    return (
                      <button
                        key={household.id}
                        onClick={() => void selectHousehold(household.id)}
                        style={{
                          minWidth: "190px",
                          ...inputStyle,
                          background: isActive ? "rgba(15,118,110,0.1)" : "#fffdf8",
                          border: isActive ? "1px solid rgba(15,118,110,0.32)" : inputStyle.border,
                          cursor: "pointer",
                          display: "grid",
                          gap: "5px",
                          textAlign: "left"
                        }}
                        type="button"
                      >
                        <strong style={{ fontSize: "10px" }}>{household.name}</strong>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>
                          {household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Crea primero un hogar.</p>
              )}
            </article>

            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px" }}>Mascotas</h3>
                  <p style={{ margin: "2px 0 0", color: "#57534e", fontSize: "10px" }}>
                    Selecciona una mascota para mantener su salud base.
                  </p>
                </div>
                {selectedHousehold ? <StatusPill label={`${pets.length} mascota(s)`} tone="neutral" /> : null}
              </div>
              <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px", scrollSnapType: "x proximity" }}>
                {selectedHousehold ? (
                  pets.length ? (
                    pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => void selectPet(pet.id)}
                        style={{
                          minWidth: "190px",
                          scrollSnapAlign: "start",
                          ...inputStyle,
                          background: pet.id === selectedPetId ? "rgba(15,118,110,0.1)" : "#fffdf8",
                          border: pet.id === selectedPetId ? "1px solid rgba(15,118,110,0.32)" : inputStyle.border,
                          cursor: "pointer",
                          display: "grid",
                          gridTemplateColumns: "36px 1fr",
                          gap: "10px",
                          textAlign: "left"
                        }}
                        type="button"
                      >
                        <span
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "14px",
                            background: pet.id === selectedPetId ? "#0f766e" : "rgba(15,118,110,0.12)",
                            color: pet.id === selectedPetId ? "#ffffff" : "#0f766e",
                            display: "grid",
                            fontSize: "13px",
                            fontWeight: 800,
                            placeItems: "center"
                          }}
                        >
                          {pet.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span style={{ display: "grid", gap: "4px" }}>
                          <strong style={{ fontSize: "11px" }}>{pet.name}</strong>
                          <span style={{ color: "#57534e", fontSize: "9px" }}>
                            {pet.species}
                            {pet.breed ? ` - ${pet.breed}` : ""}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Todavia no hay mascotas en este hogar.</p>
                  )
                ) : (
                  <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Selecciona primero un hogar.</p>
                )}
              </div>
            </article>

            {selectedPet && selectedPetHealthDetail ? (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 0.75fr) minmax(420px, 1.25fr)", gap: "12px", alignItems: "start" }}>
                <article style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px" }}>{selectedPet.name}</h3>
                      <p style={{ color: "#57534e", fontSize: "10px", margin: "2px 0 0" }}>
                        {selectedPet.species}
                        {selectedPet.breed ? ` - ${selectedPet.breed}` : ""}
                      </p>
                    </div>
                    <StatusPill label={canEdit ? "editable" : "solo lectura"} tone={canEdit ? "active" : "neutral"} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                    <div style={inputStyle}>
                      <strong style={{ fontSize: "15px" }}>{selectedPetHealthDetail.dashboard.vaccineCount}</strong>
                      <div style={{ color: "#57534e", fontSize: "9px" }}>Vacunas</div>
                    </div>
                    <div style={inputStyle}>
                      <strong style={{ fontSize: "15px" }}>{selectedPetHealthDetail.dashboard.allergyCount}</strong>
                      <div style={{ color: "#57534e", fontSize: "9px" }}>Alergias</div>
                    </div>
                    <div style={inputStyle}>
                      <strong style={{ fontSize: "15px" }}>{selectedPetHealthDetail.dashboard.conditionCount}</strong>
                      <div style={{ color: "#57534e", fontSize: "9px" }}>Condiciones</div>
                    </div>
                    <div style={inputStyle}>
                      <strong style={{ fontSize: "15px" }}>{selectedPetHealthDetail.dashboard.criticalConditionCount}</strong>
                      <div style={{ color: "#57534e", fontSize: "9px" }}>Criticas</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "5px", color: "#57534e", fontSize: "10px", lineHeight: 1.45 }}>
                    <span>Ultima vacuna: {selectedPetHealthDetail.dashboard.latestVaccineDate ?? "Sin registro"}</span>
                    <span>Proxima dosis: {selectedPetHealthDetail.dashboard.nextVaccineDueDate ?? "Sin registro"}</span>
                    <span>Alergias: {selectedPetHealthDetail.dashboard.allergyNames.join(", ") || "Ninguna"}</span>
                    <span>Condiciones criticas: {selectedPetHealthDetail.dashboard.criticalConditionNames.join(", ") || "Ninguna"}</span>
                  </div>
                </article>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(210px, 1fr))", gap: "12px", alignItems: "start" }}>
                  <HealthBlock title="Vacunas" count={selectedPetHealthDetail.vaccines.length}>
                    {canEdit ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          clearMessages();
                          const payload: UpdatePetVaccineInput = {
                            name: vaccineForm.name.trim(),
                            administeredOn: vaccineForm.administeredOn,
                            nextDueOn: vaccineForm.nextDueOn || null,
                            notes: vaccineForm.notes?.trim() || null
                          };
                          const action = editingVaccineId
                            ? () => getBrowserHealthApiClient().updatePetVaccine(editingVaccineId, payload)
                            : () => getBrowserHealthApiClient().createPetVaccine(selectedPet.id, payload);
                          void runAction(action, editingVaccineId ? "Vacuna actualizada." : "Vacuna registrada.").then(() => {
                            setEditingVaccineId(null);
                            setVaccineForm(emptyVaccineForm);
                          });
                        }}
                        style={{ display: "grid", gap: "8px" }}
                      >
                        <Field label="Vacuna" onChange={(value) => setVaccineForm((current) => ({ ...current, name: value }))} placeholder="Nombre de la vacuna" value={vaccineForm.name} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <Field label="Aplicada" onChange={(value) => setVaccineForm((current) => ({ ...current, administeredOn: value }))} type="date" value={vaccineForm.administeredOn} />
                          <Field label="Proxima" onChange={(value) => setVaccineForm((current) => ({ ...current, nextDueOn: value }))} type="date" value={vaccineForm.nextDueOn ?? ""} />
                        </div>
                        <TextArea onChange={(value) => setVaccineForm((current) => ({ ...current, notes: value }))} placeholder="Notas" value={vaccineForm.notes ?? ""} />
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <ActionButton disabled={isSubmitting} type="submit">
                            {editingVaccineId ? "Guardar" : "Registrar"}
                          </ActionButton>
                          {editingVaccineId ? (
                            <ActionButton
                              disabled={isSubmitting}
                              onClick={() => {
                                setEditingVaccineId(null);
                                setVaccineForm(emptyVaccineForm);
                              }}
                              tone="secondary"
                            >
                              Cancelar
                            </ActionButton>
                          ) : null}
                        </div>
                      </form>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Hogar en modo solo lectura.</p>
                    )}
                    {selectedPetHealthDetail.vaccines.map((vaccine) => (
                      <HealthRecord
                        key={vaccine.id}
                        onEdit={
                          canEdit
                            ? () => {
                                setEditingVaccineId(vaccine.id);
                                setVaccineForm({
                                  name: vaccine.name,
                                  administeredOn: vaccine.administeredOn,
                                  nextDueOn: vaccine.nextDueOn ?? "",
                                  notes: vaccine.notes ?? ""
                                });
                              }
                            : undefined
                        }
                      >
                        <strong style={{ fontSize: "10px" }}>{vaccine.name}</strong>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>
                          Aplicada: {vaccine.administeredOn} - Proxima: {vaccine.nextDueOn ?? "Sin registro"}
                        </span>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>{vaccine.notes ?? "Sin notas todavia."}</span>
                      </HealthRecord>
                    ))}
                  </HealthBlock>

                  <HealthBlock title="Alergias" count={selectedPetHealthDetail.allergies.length}>
                    {canEdit ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          clearMessages();
                          const payload: UpdatePetAllergyInput = {
                            allergen: allergyForm.allergen.trim(),
                            reaction: allergyForm.reaction?.trim() || null,
                            notes: allergyForm.notes?.trim() || null
                          };
                          const action = editingAllergyId
                            ? () => getBrowserHealthApiClient().updatePetAllergy(editingAllergyId, payload)
                            : () => getBrowserHealthApiClient().createPetAllergy(selectedPet.id, payload);
                          void runAction(action, editingAllergyId ? "Alergia actualizada." : "Alergia registrada.").then(() => {
                            setEditingAllergyId(null);
                            setAllergyForm(emptyAllergyForm);
                          });
                        }}
                        style={{ display: "grid", gap: "8px" }}
                      >
                        <Field onChange={(value) => setAllergyForm((current) => ({ ...current, allergen: value }))} placeholder="Alergeno" value={allergyForm.allergen} />
                        <Field onChange={(value) => setAllergyForm((current) => ({ ...current, reaction: value }))} placeholder="Reaccion" value={allergyForm.reaction ?? ""} />
                        <TextArea onChange={(value) => setAllergyForm((current) => ({ ...current, notes: value }))} placeholder="Notas" value={allergyForm.notes ?? ""} />
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <ActionButton disabled={isSubmitting} type="submit">
                            {editingAllergyId ? "Guardar" : "Registrar"}
                          </ActionButton>
                          {editingAllergyId ? (
                            <ActionButton
                              disabled={isSubmitting}
                              onClick={() => {
                                setEditingAllergyId(null);
                                setAllergyForm(emptyAllergyForm);
                              }}
                              tone="secondary"
                            >
                              Cancelar
                            </ActionButton>
                          ) : null}
                        </div>
                      </form>
                    ) : null}
                    {selectedPetHealthDetail.allergies.map((allergy) => (
                      <HealthRecord
                        key={allergy.id}
                        onEdit={
                          canEdit
                            ? () => {
                                setEditingAllergyId(allergy.id);
                                setAllergyForm({
                                  allergen: allergy.allergen,
                                  reaction: allergy.reaction ?? "",
                                  notes: allergy.notes ?? ""
                                });
                              }
                            : undefined
                        }
                      >
                        <strong style={{ fontSize: "10px" }}>{allergy.allergen}</strong>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>{allergy.reaction ?? "Sin reaccion registrada"}</span>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>{allergy.notes ?? "Sin notas todavia."}</span>
                      </HealthRecord>
                    ))}
                  </HealthBlock>

                  <HealthBlock title="Condiciones" count={selectedPetHealthDetail.conditions.length}>
                    {canEdit ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          clearMessages();
                          const payload: UpdatePetConditionInput = {
                            name: conditionForm.name.trim(),
                            status: conditionForm.status ?? "active",
                            diagnosedOn: conditionForm.diagnosedOn || null,
                            isCritical: Boolean(conditionForm.isCritical),
                            notes: conditionForm.notes?.trim() || null
                          };
                          const action = editingConditionId
                            ? () => getBrowserHealthApiClient().updatePetCondition(editingConditionId, payload)
                            : () => getBrowserHealthApiClient().createPetCondition(selectedPet.id, payload);
                          void runAction(action, editingConditionId ? "Condicion actualizada." : "Condicion registrada.").then(() => {
                            setEditingConditionId(null);
                            setConditionForm(emptyConditionForm);
                          });
                        }}
                        style={{ display: "grid", gap: "8px" }}
                      >
                        <Field onChange={(value) => setConditionForm((current) => ({ ...current, name: value }))} placeholder="Nombre de la condicion" value={conditionForm.name} />
                        <select style={inputStyle} value={conditionForm.status ?? "active"} onChange={(event) => setConditionForm((current) => ({ ...current, status: event.target.value as typeof current.status }))}>
                          {petConditionStatusOrder.map((status) => (
                            <option key={status} value={status}>
                              {petConditionStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                        <Field onChange={(value) => setConditionForm((current) => ({ ...current, diagnosedOn: value }))} type="date" value={conditionForm.diagnosedOn ?? ""} />
                        <label style={{ color: "#57534e", fontSize: "10px" }}>
                          <input checked={Boolean(conditionForm.isCritical)} onChange={(event) => setConditionForm((current) => ({ ...current, isCritical: event.target.checked }))} type="checkbox" /> Marcar como critica
                        </label>
                        <TextArea onChange={(value) => setConditionForm((current) => ({ ...current, notes: value }))} placeholder="Notas" value={conditionForm.notes ?? ""} />
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <ActionButton disabled={isSubmitting} type="submit">
                            {editingConditionId ? "Guardar" : "Registrar"}
                          </ActionButton>
                          {editingConditionId ? (
                            <ActionButton
                              disabled={isSubmitting}
                              onClick={() => {
                                setEditingConditionId(null);
                                setConditionForm(emptyConditionForm);
                              }}
                              tone="secondary"
                            >
                              Cancelar
                            </ActionButton>
                          ) : null}
                        </div>
                      </form>
                    ) : null}
                    {selectedPetHealthDetail.conditions.map((condition) => (
                      <HealthRecord
                        key={condition.id}
                        onEdit={
                          canEdit
                            ? () => {
                                setEditingConditionId(condition.id);
                                setConditionForm({
                                  name: condition.name,
                                  status: condition.status,
                                  diagnosedOn: condition.diagnosedOn ?? "",
                                  isCritical: condition.isCritical,
                                  notes: condition.notes ?? ""
                                });
                              }
                            : undefined
                        }
                      >
                        <strong style={{ fontSize: "10px" }}>{condition.name}</strong>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>
                          {petConditionStatusLabels[condition.status]}
                          {condition.isCritical ? " - Critica" : ""}
                        </span>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>
                          Diagnosticada el: {condition.diagnosedOn ?? "Sin registro"}
                        </span>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>{condition.notes ?? "Sin notas todavia."}</span>
                      </HealthRecord>
                    ))}
                  </HealthBlock>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Selecciona una mascota para revisar su salud.</p>
            )}
          </div>
        )}
      </CoreSection>
    </div>
  );
}
