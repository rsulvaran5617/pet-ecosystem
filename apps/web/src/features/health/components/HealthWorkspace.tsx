"use client";

import { petConditionStatusLabels, petConditionStatusOrder } from "@pet/config";
import type { UpdatePetAllergyInput, UpdatePetConditionInput, UpdatePetVaccineInput } from "@pet/types";
import type { ReactNode } from "react";
import { useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { getBrowserHealthApiClient } from "../../core/services/supabase-browser";
import { useHealthWorkspace } from "../hooks/useHealthWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

const emptyVaccineForm: UpdatePetVaccineInput = { name: "", administeredOn: "", nextDueOn: "", notes: "" };
const emptyAllergyForm: UpdatePetAllergyInput = { allergen: "", reaction: "", notes: "" };
const emptyConditionForm: UpdatePetConditionInput = { name: "", status: "active", diagnosedOn: "", isCritical: false, notes: "" };

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <strong>{count}</strong>
      </div>
      {children}
    </article>
  );
}

export function HealthWorkspace({ enabled }: { enabled: boolean }) {
  const { householdSnapshot, pets, selectedHouseholdId, selectedPetId, selectedPetHealthDetail, errorMessage, infoMessage, isLoading, isSubmitting, clearMessages, selectHousehold, selectPet, runAction } =
    useHealthWorkspace(enabled);
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
      <CoreSection eyebrow="EP-04 / Health" title="Simple pet health dashboard" description="Vaccines, allergies and conditions only, inheriting household and pet permissions.">
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Loading health records from Supabase...</p>
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
              <h3 style={{ margin: 0 }}>Pets</h3>
              {selectedHousehold ? pets.length ? pets.map((pet) => (
                <button key={pet.id} onClick={() => void selectPet(pet.id)} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer", background: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "#fffdf8" }}>
                  <strong>{pet.name}</strong>
                  <div style={{ color: "#57534e", marginTop: "6px" }}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</div>
                </button>
              )) : <p style={{ margin: 0, color: "#57534e" }}>No pets in this household yet.</p> : <p style={{ margin: 0, color: "#57534e" }}>Select a household first.</p>}
            </article>

            <div style={{ display: "grid", gap: "18px" }}>
              {selectedPet && selectedPetHealthDetail ? (
                <>
                  <article style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{selectedPet.name}</h3>
                        <div style={{ color: "#57534e" }}>{selectedPet.species}{selectedPet.breed ? ` - ${selectedPet.breed}` : ""}</div>
                      </div>
                      <strong>{canEdit ? "editable" : "read-only"}</strong>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px" }}>
                      <div><strong>{selectedPetHealthDetail.dashboard.vaccineCount}</strong><div style={{ color: "#57534e" }}>Vaccines</div></div>
                      <div><strong>{selectedPetHealthDetail.dashboard.allergyCount}</strong><div style={{ color: "#57534e" }}>Allergies</div></div>
                      <div><strong>{selectedPetHealthDetail.dashboard.conditionCount}</strong><div style={{ color: "#57534e" }}>Conditions</div></div>
                      <div><strong>{selectedPetHealthDetail.dashboard.criticalConditionCount}</strong><div style={{ color: "#57534e" }}>Critical</div></div>
                    </div>
                    <div style={{ color: "#57534e" }}>Latest vaccine: {selectedPetHealthDetail.dashboard.latestVaccineDate ?? "Not recorded"}</div>
                    <div style={{ color: "#57534e" }}>Next due: {selectedPetHealthDetail.dashboard.nextVaccineDueDate ?? "Not recorded"}</div>
                    <div style={{ color: "#57534e" }}>Allergies: {selectedPetHealthDetail.dashboard.allergyNames.join(", ") || "None"}</div>
                    <div style={{ color: "#57534e" }}>Critical conditions: {selectedPetHealthDetail.dashboard.criticalConditionNames.join(", ") || "None"}</div>
                  </article>

                  <HealthBlock title="Vaccines" count={selectedPetHealthDetail.vaccines.length}>
                    {canEdit ? (
                      <form onSubmit={(event) => {
                        event.preventDefault();
                        clearMessages();
                        const payload: UpdatePetVaccineInput = { name: vaccineForm.name.trim(), administeredOn: vaccineForm.administeredOn, nextDueOn: vaccineForm.nextDueOn || null, notes: vaccineForm.notes?.trim() || null };
                        const action = editingVaccineId ? () => getBrowserHealthApiClient().updatePetVaccine(editingVaccineId, payload) : () => getBrowserHealthApiClient().createPetVaccine(selectedPet.id, payload);
                        void runAction(action, editingVaccineId ? "Vaccine updated." : "Vaccine registered.").then(() => { setEditingVaccineId(null); setVaccineForm(emptyVaccineForm); });
                      }} style={{ display: "grid", gap: "10px" }}>
                        <input style={inputStyle} placeholder="Vaccine name" value={vaccineForm.name} onChange={(event) => setVaccineForm((current) => ({ ...current, name: event.target.value }))} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <input style={inputStyle} type="date" value={vaccineForm.administeredOn} onChange={(event) => setVaccineForm((current) => ({ ...current, administeredOn: event.target.value }))} />
                          <input style={inputStyle} type="date" value={vaccineForm.nextDueOn ?? ""} onChange={(event) => setVaccineForm((current) => ({ ...current, nextDueOn: event.target.value }))} />
                        </div>
                        <textarea style={inputStyle} rows={3} placeholder="Notes" value={vaccineForm.notes ?? ""} onChange={(event) => setVaccineForm((current) => ({ ...current, notes: event.target.value }))} />
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <button disabled={isSubmitting} type="submit">{editingVaccineId ? "Save vaccine" : "Register vaccine"}</button>
                          {editingVaccineId ? <button disabled={isSubmitting} onClick={() => { setEditingVaccineId(null); setVaccineForm(emptyVaccineForm); }} type="button">Cancel</button> : null}
                        </div>
                      </form>
                    ) : <p style={{ margin: 0, color: "#57534e" }}>Read-only household.</p>}
                    {selectedPetHealthDetail.vaccines.map((vaccine) => (
                      <div key={vaccine.id} style={inputStyle}>
                        <strong>{vaccine.name}</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>Applied: {vaccine.administeredOn} - Next due: {vaccine.nextDueOn ?? "Not recorded"}</div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{vaccine.notes ?? "No notes yet."}</div>
                        {canEdit ? <button style={{ marginTop: "8px" }} type="button" onClick={() => { setEditingVaccineId(vaccine.id); setVaccineForm({ name: vaccine.name, administeredOn: vaccine.administeredOn, nextDueOn: vaccine.nextDueOn ?? "", notes: vaccine.notes ?? "" }); }}>Edit</button> : null}
                      </div>
                    ))}
                  </HealthBlock>

                  <HealthBlock title="Allergies" count={selectedPetHealthDetail.allergies.length}>
                    {canEdit ? (
                      <form onSubmit={(event) => {
                        event.preventDefault();
                        clearMessages();
                        const payload: UpdatePetAllergyInput = { allergen: allergyForm.allergen.trim(), reaction: allergyForm.reaction?.trim() || null, notes: allergyForm.notes?.trim() || null };
                        const action = editingAllergyId ? () => getBrowserHealthApiClient().updatePetAllergy(editingAllergyId, payload) : () => getBrowserHealthApiClient().createPetAllergy(selectedPet.id, payload);
                        void runAction(action, editingAllergyId ? "Allergy updated." : "Allergy registered.").then(() => { setEditingAllergyId(null); setAllergyForm(emptyAllergyForm); });
                      }} style={{ display: "grid", gap: "10px" }}>
                        <input style={inputStyle} placeholder="Allergen" value={allergyForm.allergen} onChange={(event) => setAllergyForm((current) => ({ ...current, allergen: event.target.value }))} />
                        <input style={inputStyle} placeholder="Reaction" value={allergyForm.reaction ?? ""} onChange={(event) => setAllergyForm((current) => ({ ...current, reaction: event.target.value }))} />
                        <textarea style={inputStyle} rows={3} placeholder="Notes" value={allergyForm.notes ?? ""} onChange={(event) => setAllergyForm((current) => ({ ...current, notes: event.target.value }))} />
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <button disabled={isSubmitting} type="submit">{editingAllergyId ? "Save allergy" : "Register allergy"}</button>
                          {editingAllergyId ? <button disabled={isSubmitting} onClick={() => { setEditingAllergyId(null); setAllergyForm(emptyAllergyForm); }} type="button">Cancel</button> : null}
                        </div>
                      </form>
                    ) : null}
                    {selectedPetHealthDetail.allergies.map((allergy) => (
                      <div key={allergy.id} style={inputStyle}>
                        <strong>{allergy.allergen}</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{allergy.reaction ?? "No reaction recorded"}</div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{allergy.notes ?? "No notes yet."}</div>
                        {canEdit ? <button style={{ marginTop: "8px" }} type="button" onClick={() => { setEditingAllergyId(allergy.id); setAllergyForm({ allergen: allergy.allergen, reaction: allergy.reaction ?? "", notes: allergy.notes ?? "" }); }}>Edit</button> : null}
                      </div>
                    ))}
                  </HealthBlock>

                  <HealthBlock title="Conditions" count={selectedPetHealthDetail.conditions.length}>
                    {canEdit ? (
                      <form onSubmit={(event) => {
                        event.preventDefault();
                        clearMessages();
                        const payload: UpdatePetConditionInput = { name: conditionForm.name.trim(), status: conditionForm.status ?? "active", diagnosedOn: conditionForm.diagnosedOn || null, isCritical: Boolean(conditionForm.isCritical), notes: conditionForm.notes?.trim() || null };
                        const action = editingConditionId ? () => getBrowserHealthApiClient().updatePetCondition(editingConditionId, payload) : () => getBrowserHealthApiClient().createPetCondition(selectedPet.id, payload);
                        void runAction(action, editingConditionId ? "Condition updated." : "Condition registered.").then(() => { setEditingConditionId(null); setConditionForm(emptyConditionForm); });
                      }} style={{ display: "grid", gap: "10px" }}>
                        <input style={inputStyle} placeholder="Condition name" value={conditionForm.name} onChange={(event) => setConditionForm((current) => ({ ...current, name: event.target.value }))} />
                        <select style={inputStyle} value={conditionForm.status ?? "active"} onChange={(event) => setConditionForm((current) => ({ ...current, status: event.target.value as typeof current.status }))}>
                          {petConditionStatusOrder.map((status) => <option key={status} value={status}>{petConditionStatusLabels[status]}</option>)}
                        </select>
                        <input style={inputStyle} type="date" value={conditionForm.diagnosedOn ?? ""} onChange={(event) => setConditionForm((current) => ({ ...current, diagnosedOn: event.target.value }))} />
                        <label style={{ color: "#57534e" }}><input checked={Boolean(conditionForm.isCritical)} onChange={(event) => setConditionForm((current) => ({ ...current, isCritical: event.target.checked }))} type="checkbox" /> Mark as critical</label>
                        <textarea style={inputStyle} rows={3} placeholder="Notes" value={conditionForm.notes ?? ""} onChange={(event) => setConditionForm((current) => ({ ...current, notes: event.target.value }))} />
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <button disabled={isSubmitting} type="submit">{editingConditionId ? "Save condition" : "Register condition"}</button>
                          {editingConditionId ? <button disabled={isSubmitting} onClick={() => { setEditingConditionId(null); setConditionForm(emptyConditionForm); }} type="button">Cancel</button> : null}
                        </div>
                      </form>
                    ) : null}
                    {selectedPetHealthDetail.conditions.map((condition) => (
                      <div key={condition.id} style={inputStyle}>
                        <strong>{condition.name}</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{petConditionStatusLabels[condition.status]}{condition.isCritical ? " - Critical" : ""}</div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>Diagnosed on: {condition.diagnosedOn ?? "Not recorded"}</div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{condition.notes ?? "No notes yet."}</div>
                        {canEdit ? <button style={{ marginTop: "8px" }} type="button" onClick={() => { setEditingConditionId(condition.id); setConditionForm({ name: condition.name, status: condition.status, diagnosedOn: condition.diagnosedOn ?? "", isCritical: condition.isCritical, notes: condition.notes ?? "" }); }}>Edit</button> : null}
                      </div>
                    ))}
                  </HealthBlock>
                </>
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>Select a pet to inspect health details.</p>
              )}
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
