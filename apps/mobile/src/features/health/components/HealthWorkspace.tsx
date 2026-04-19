import { petConditionStatusLabels, petConditionStatusOrder } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { PetConditionStatus, UpdatePetAllergyInput, UpdatePetConditionInput, UpdatePetVaccineInput } from "@pet/types";
import { useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { getMobileHealthApiClient } from "../../core/services/supabase-mobile";
import { useHealthWorkspace } from "../hooks/useHealthWorkspace";

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
const emptyVaccineForm: UpdatePetVaccineInput = { name: "", administeredOn: "", nextDueOn: "", notes: "" };
const emptyAllergyForm: UpdatePetAllergyInput = { allergen: "", reaction: "", notes: "" };
const emptyConditionForm: UpdatePetConditionInput = { name: "", status: "active", diagnosedOn: "", isCritical: false, notes: "" };

function Button({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ borderRadius: 999, backgroundColor: "#0f766e", paddingHorizontal: 16, paddingVertical: 12, opacity: disabled ? 0.65 : 1 }}>
      <Text style={{ color: "#f8fafc", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, onChange, value, multiline = false }: { label: string; onChange: (value: string) => void; value: string; multiline?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput multiline={multiline} numberOfLines={multiline ? 4 : 1} onChangeText={onChange} style={[inputStyle, multiline ? { minHeight: 88, textAlignVertical: "top" } : null]} value={value} />
    </View>
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
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard eyebrow="EP-04 / Health" title="Simple pet health dashboard" description="Vaccines, allergies and conditions only, inheriting household and pet permissions.">
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Loading health records from Supabase...</Text> : null}

          {householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
            <Pressable key={household.id} onPress={() => void selectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{household.memberCount} member(s) - {household.myPermissions.join(", ")}</Text>
            </Pressable>
          )) : <Text style={{ color: colorTokens.muted }}>Create a household first.</Text>}

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Pets</Text>
            {selectedHousehold ? pets.length ? pets.map((pet) => (
              <Pressable key={pet.id} onPress={() => void selectPet(pet.id)} style={[inputStyle, { backgroundColor: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "#fffdf8", gap: 6 }]}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>{pet.name}</Text>
                <Text style={{ color: colorTokens.muted }}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>No pets in this household yet.</Text> : <Text style={{ color: colorTokens.muted }}>Select a household first.</Text>}
          </View>

          {selectedPet && selectedPetHealthDetail ? (
            <>
              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>{selectedPet.name}</Text>
                <Text style={{ color: colorTokens.muted }}>{selectedPet.species}{selectedPet.breed ? ` - ${selectedPet.breed}` : ""}</Text>
                <Text style={{ color: colorTokens.muted }}>Mode: {canEdit ? "editable" : "read-only"}</Text>
                <Text style={{ color: colorTokens.muted }}>Vaccines: {selectedPetHealthDetail.dashboard.vaccineCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Allergies: {selectedPetHealthDetail.dashboard.allergyCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Conditions: {selectedPetHealthDetail.dashboard.conditionCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Critical: {selectedPetHealthDetail.dashboard.criticalConditionCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Latest vaccine: {selectedPetHealthDetail.dashboard.latestVaccineDate ?? "Not recorded"}</Text>
                <Text style={{ color: colorTokens.muted }}>Next due: {selectedPetHealthDetail.dashboard.nextVaccineDueDate ?? "Not recorded"}</Text>
                <Text style={{ color: colorTokens.muted }}>Allergies: {selectedPetHealthDetail.dashboard.allergyNames.join(", ") || "None"}</Text>
                <Text style={{ color: colorTokens.muted }}>Critical conditions: {selectedPetHealthDetail.dashboard.criticalConditionNames.join(", ") || "None"}</Text>
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Vaccines ({selectedPetHealthDetail.vaccines.length})</Text>
                {canEdit ? (
                  <>
                    <Field label="Vaccine name" onChange={(value) => setVaccineForm((current) => ({ ...current, name: value }))} value={vaccineForm.name} />
                    <Field label="Administered on" onChange={(value) => setVaccineForm((current) => ({ ...current, administeredOn: value }))} value={vaccineForm.administeredOn} />
                    <Field label="Next due on" onChange={(value) => setVaccineForm((current) => ({ ...current, nextDueOn: value }))} value={vaccineForm.nextDueOn ?? ""} />
                    <Field label="Notes" multiline onChange={(value) => setVaccineForm((current) => ({ ...current, notes: value }))} value={vaccineForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingVaccineId ? "Save vaccine" : "Register vaccine"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetVaccineInput = { name: vaccineForm.name.trim(), administeredOn: vaccineForm.administeredOn, nextDueOn: vaccineForm.nextDueOn || null, notes: vaccineForm.notes?.trim() || null };
                      const action = editingVaccineId ? () => getMobileHealthApiClient().updatePetVaccine(editingVaccineId, payload) : () => getMobileHealthApiClient().createPetVaccine(selectedPet.id, payload);
                      void runAction(action, editingVaccineId ? "Vaccine updated." : "Vaccine registered.").then(() => { setEditingVaccineId(null); setVaccineForm(emptyVaccineForm); });
                    }} />
                  </>
                ) : <Text style={{ color: colorTokens.muted }}>Read-only household.</Text>}
                {selectedPetHealthDetail.vaccines.map((vaccine) => (
                  <View key={vaccine.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{vaccine.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>Applied: {vaccine.administeredOn} - Next due: {vaccine.nextDueOn ?? "Not recorded"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{vaccine.notes ?? "No notes yet."}</Text>
                    {canEdit ? <Button label="Edit" onPress={() => { setEditingVaccineId(vaccine.id); setVaccineForm({ name: vaccine.name, administeredOn: vaccine.administeredOn, nextDueOn: vaccine.nextDueOn ?? "", notes: vaccine.notes ?? "" }); }} /> : null}
                  </View>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Allergies ({selectedPetHealthDetail.allergies.length})</Text>
                {canEdit ? (
                  <>
                    <Field label="Allergen" onChange={(value) => setAllergyForm((current) => ({ ...current, allergen: value }))} value={allergyForm.allergen} />
                    <Field label="Reaction" onChange={(value) => setAllergyForm((current) => ({ ...current, reaction: value }))} value={allergyForm.reaction ?? ""} />
                    <Field label="Notes" multiline onChange={(value) => setAllergyForm((current) => ({ ...current, notes: value }))} value={allergyForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingAllergyId ? "Save allergy" : "Register allergy"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetAllergyInput = { allergen: allergyForm.allergen.trim(), reaction: allergyForm.reaction?.trim() || null, notes: allergyForm.notes?.trim() || null };
                      const action = editingAllergyId ? () => getMobileHealthApiClient().updatePetAllergy(editingAllergyId, payload) : () => getMobileHealthApiClient().createPetAllergy(selectedPet.id, payload);
                      void runAction(action, editingAllergyId ? "Allergy updated." : "Allergy registered.").then(() => { setEditingAllergyId(null); setAllergyForm(emptyAllergyForm); });
                    }} />
                  </>
                ) : null}
                {selectedPetHealthDetail.allergies.map((allergy) => (
                  <View key={allergy.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{allergy.allergen}</Text>
                    <Text style={{ color: colorTokens.muted }}>{allergy.reaction ?? "No reaction recorded"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{allergy.notes ?? "No notes yet."}</Text>
                    {canEdit ? <Button label="Edit" onPress={() => { setEditingAllergyId(allergy.id); setAllergyForm({ allergen: allergy.allergen, reaction: allergy.reaction ?? "", notes: allergy.notes ?? "" }); }} /> : null}
                  </View>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Conditions ({selectedPetHealthDetail.conditions.length})</Text>
                {canEdit ? (
                  <>
                    <Field label="Condition name" onChange={(value) => setConditionForm((current) => ({ ...current, name: value }))} value={conditionForm.name} />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {petConditionStatusOrder.map((status) => (
                        <Pressable key={status} onPress={() => setConditionForm((current) => ({ ...current, status }))} style={{ borderRadius: 999, borderWidth: 1, borderColor: conditionForm.status === status ? "rgba(15,118,110,0.3)" : "rgba(28,25,23,0.14)", backgroundColor: conditionForm.status === status ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.86)", paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Text style={{ color: conditionForm.status === status ? "#0f766e" : "#1c1917", fontWeight: "600" }}>{petConditionStatusLabels[status]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Field label="Diagnosed on" onChange={(value) => setConditionForm((current) => ({ ...current, diagnosedOn: value }))} value={conditionForm.diagnosedOn ?? ""} />
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <Text style={{ color: colorTokens.muted, flex: 1 }}>Mark as critical</Text>
                      <Switch onValueChange={(value) => setConditionForm((current) => ({ ...current, isCritical: value }))} value={Boolean(conditionForm.isCritical)} />
                    </View>
                    <Field label="Notes" multiline onChange={(value) => setConditionForm((current) => ({ ...current, notes: value }))} value={conditionForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingConditionId ? "Save condition" : "Register condition"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetConditionInput = { name: conditionForm.name.trim(), status: conditionForm.status ?? "active", diagnosedOn: conditionForm.diagnosedOn || null, isCritical: Boolean(conditionForm.isCritical), notes: conditionForm.notes?.trim() || null };
                      const action = editingConditionId ? () => getMobileHealthApiClient().updatePetCondition(editingConditionId, payload) : () => getMobileHealthApiClient().createPetCondition(selectedPet.id, payload);
                      void runAction(action, editingConditionId ? "Condition updated." : "Condition registered.").then(() => { setEditingConditionId(null); setConditionForm(emptyConditionForm); });
                    }} />
                  </>
                ) : null}
                {selectedPetHealthDetail.conditions.map((condition) => (
                  <View key={condition.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{condition.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>{petConditionStatusLabels[condition.status]}{condition.isCritical ? " - Critical" : ""}</Text>
                    <Text style={{ color: colorTokens.muted }}>Diagnosed on: {condition.diagnosedOn ?? "Not recorded"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{condition.notes ?? "No notes yet."}</Text>
                    {canEdit ? <Button label="Edit" onPress={() => { setEditingConditionId(condition.id); setConditionForm({ name: condition.name, status: condition.status as PetConditionStatus, diagnosedOn: condition.diagnosedOn ?? "", isCritical: condition.isCritical, notes: condition.notes ?? "" }); }} /> : null}
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ color: colorTokens.muted }}>Select a pet to inspect health details.</Text>
          )}
        </View>
      </CoreSectionCard>
    </View>
  );
}
