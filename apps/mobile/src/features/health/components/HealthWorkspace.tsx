import { formatHouseholdPermissions, petConditionStatusLabels, petConditionStatusOrder } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { PetConditionStatus, UpdatePetAllergyInput, UpdatePetConditionInput, UpdatePetVaccineInput } from "@pet/types";
import { useEffect, useState } from "react";
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

export function HealthWorkspace({
  contextHouseholdId,
  contextPetId,
  enabled,
  mode = "standalone"
}: {
  contextHouseholdId?: string | null;
  contextPetId?: string | null;
  enabled: boolean;
  mode?: "standalone" | "pet-hub";
}) {
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
  const isPetHubMode = mode === "pet-hub";

  useEffect(() => {
    if (!enabled || !contextHouseholdId || contextHouseholdId === selectedHouseholdId) {
      return;
    }

    void selectHousehold(contextHouseholdId);
  }, [contextHouseholdId, enabled, selectHousehold, selectedHouseholdId]);

  useEffect(() => {
    if (!enabled || !contextPetId || contextPetId === selectedPetId || !pets.some((pet) => pet.id === contextPetId)) {
      return;
    }

    void selectPet(contextPetId);
  }, [contextPetId, enabled, pets, selectPet, selectedPetId]);

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="Salud"
        title={isPetHubMode && selectedPet ? `Salud de ${selectedPet.name}` : "Salud por mascota"}
        description="Registra vacunas, alergias y condiciones basicas de cada mascota."
      >
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Preparando el expediente de salud...</Text> : null}

          {!isPetHubMode && householdSnapshot?.households.length ? householdSnapshot.households.map((household) => (
            <Pressable key={household.id} onPress={() => void selectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</Text>
            </Pressable>
          )) : !isPetHubMode ? <Text style={{ color: colorTokens.muted }}>Crea primero un hogar.</Text> : null}

          {!isPetHubMode ? <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Mascotas</Text>
            {selectedHousehold ? pets.length ? pets.map((pet) => (
              <Pressable key={pet.id} onPress={() => void selectPet(pet.id)} style={[inputStyle, { backgroundColor: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "#fffdf8", gap: 6 }]}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>{pet.name}</Text>
                <Text style={{ color: colorTokens.muted }}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</Text>
              </Pressable>
            )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay mascotas en este hogar.</Text> : <Text style={{ color: colorTokens.muted }}>Selecciona primero un hogar.</Text>}
          </View> : null}

          {selectedPet && selectedPetHealthDetail ? (
            <>
              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>{selectedPet.name}</Text>
                <Text style={{ color: colorTokens.muted }}>{selectedPet.species}{selectedPet.breed ? ` - ${selectedPet.breed}` : ""}</Text>
                <Text style={{ color: colorTokens.muted }}>Modo: {canEdit ? "editable" : "solo lectura"}</Text>
                <Text style={{ color: colorTokens.muted }}>Vacunas: {selectedPetHealthDetail.dashboard.vaccineCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Alergias: {selectedPetHealthDetail.dashboard.allergyCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Condiciones: {selectedPetHealthDetail.dashboard.conditionCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Criticas: {selectedPetHealthDetail.dashboard.criticalConditionCount}</Text>
                <Text style={{ color: colorTokens.muted }}>Ultima vacuna: {selectedPetHealthDetail.dashboard.latestVaccineDate ?? "Sin registro"}</Text>
                <Text style={{ color: colorTokens.muted }}>Proxima dosis: {selectedPetHealthDetail.dashboard.nextVaccineDueDate ?? "Sin registro"}</Text>
                <Text style={{ color: colorTokens.muted }}>Alergias: {selectedPetHealthDetail.dashboard.allergyNames.join(", ") || "Ninguna"}</Text>
                <Text style={{ color: colorTokens.muted }}>Condiciones criticas: {selectedPetHealthDetail.dashboard.criticalConditionNames.join(", ") || "Ninguna"}</Text>
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Vacunas ({selectedPetHealthDetail.vaccines.length})</Text>
                {canEdit ? (
                  <>
                    <Field label="Nombre de la vacuna" onChange={(value) => setVaccineForm((current) => ({ ...current, name: value }))} value={vaccineForm.name} />
                    <Field label="Aplicada el" onChange={(value) => setVaccineForm((current) => ({ ...current, administeredOn: value }))} value={vaccineForm.administeredOn} />
                    <Field label="Proxima dosis" onChange={(value) => setVaccineForm((current) => ({ ...current, nextDueOn: value }))} value={vaccineForm.nextDueOn ?? ""} />
                    <Field label="Notas" multiline onChange={(value) => setVaccineForm((current) => ({ ...current, notes: value }))} value={vaccineForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingVaccineId ? "Guardar vacuna" : "Registrar vacuna"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetVaccineInput = { name: vaccineForm.name.trim(), administeredOn: vaccineForm.administeredOn, nextDueOn: vaccineForm.nextDueOn || null, notes: vaccineForm.notes?.trim() || null };
                      const action = editingVaccineId ? () => getMobileHealthApiClient().updatePetVaccine(editingVaccineId, payload) : () => getMobileHealthApiClient().createPetVaccine(selectedPet.id, payload);
                      void runAction(action, editingVaccineId ? "Vacuna actualizada." : "Vacuna registrada.").then(() => { setEditingVaccineId(null); setVaccineForm(emptyVaccineForm); });
                    }} />
                  </>
                ) : <Text style={{ color: colorTokens.muted }}>Hogar en modo solo lectura.</Text>}
                {selectedPetHealthDetail.vaccines.map((vaccine) => (
                  <View key={vaccine.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{vaccine.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>Aplicada: {vaccine.administeredOn} - Proxima dosis: {vaccine.nextDueOn ?? "Sin registro"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{vaccine.notes ?? "Sin notas todavia."}</Text>
                    {canEdit ? <Button label="Editar" onPress={() => { setEditingVaccineId(vaccine.id); setVaccineForm({ name: vaccine.name, administeredOn: vaccine.administeredOn, nextDueOn: vaccine.nextDueOn ?? "", notes: vaccine.notes ?? "" }); }} /> : null}
                  </View>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Alergias ({selectedPetHealthDetail.allergies.length})</Text>
                {canEdit ? (
                  <>
                    <Field label="Alergeno" onChange={(value) => setAllergyForm((current) => ({ ...current, allergen: value }))} value={allergyForm.allergen} />
                    <Field label="Reaccion" onChange={(value) => setAllergyForm((current) => ({ ...current, reaction: value }))} value={allergyForm.reaction ?? ""} />
                    <Field label="Notas" multiline onChange={(value) => setAllergyForm((current) => ({ ...current, notes: value }))} value={allergyForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingAllergyId ? "Guardar alergia" : "Registrar alergia"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetAllergyInput = { allergen: allergyForm.allergen.trim(), reaction: allergyForm.reaction?.trim() || null, notes: allergyForm.notes?.trim() || null };
                      const action = editingAllergyId ? () => getMobileHealthApiClient().updatePetAllergy(editingAllergyId, payload) : () => getMobileHealthApiClient().createPetAllergy(selectedPet.id, payload);
                      void runAction(action, editingAllergyId ? "Alergia actualizada." : "Alergia registrada.").then(() => { setEditingAllergyId(null); setAllergyForm(emptyAllergyForm); });
                    }} />
                  </>
                ) : null}
                {selectedPetHealthDetail.allergies.map((allergy) => (
                  <View key={allergy.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{allergy.allergen}</Text>
                    <Text style={{ color: colorTokens.muted }}>{allergy.reaction ?? "Sin reaccion registrada"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{allergy.notes ?? "Sin notas todavia."}</Text>
                    {canEdit ? <Button label="Editar" onPress={() => { setEditingAllergyId(allergy.id); setAllergyForm({ allergen: allergy.allergen, reaction: allergy.reaction ?? "", notes: allergy.notes ?? "" }); }} /> : null}
                  </View>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Condiciones ({selectedPetHealthDetail.conditions.length})</Text>
                {canEdit ? (
                  <>
                    <Field label="Nombre de la condicion" onChange={(value) => setConditionForm((current) => ({ ...current, name: value }))} value={conditionForm.name} />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {petConditionStatusOrder.map((status) => (
                        <Pressable key={status} onPress={() => setConditionForm((current) => ({ ...current, status }))} style={{ borderRadius: 999, borderWidth: 1, borderColor: conditionForm.status === status ? "rgba(15,118,110,0.3)" : "rgba(28,25,23,0.14)", backgroundColor: conditionForm.status === status ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.86)", paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Text style={{ color: conditionForm.status === status ? "#0f766e" : "#1c1917", fontWeight: "600" }}>{petConditionStatusLabels[status]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Field label="Diagnosticada el" onChange={(value) => setConditionForm((current) => ({ ...current, diagnosedOn: value }))} value={conditionForm.diagnosedOn ?? ""} />
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <Text style={{ color: colorTokens.muted, flex: 1 }}>Marcar como critica</Text>
                      <Switch onValueChange={(value) => setConditionForm((current) => ({ ...current, isCritical: value }))} value={Boolean(conditionForm.isCritical)} />
                    </View>
                    <Field label="Notas" multiline onChange={(value) => setConditionForm((current) => ({ ...current, notes: value }))} value={conditionForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingConditionId ? "Guardar condicion" : "Registrar condicion"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetConditionInput = { name: conditionForm.name.trim(), status: conditionForm.status ?? "active", diagnosedOn: conditionForm.diagnosedOn || null, isCritical: Boolean(conditionForm.isCritical), notes: conditionForm.notes?.trim() || null };
                      const action = editingConditionId ? () => getMobileHealthApiClient().updatePetCondition(editingConditionId, payload) : () => getMobileHealthApiClient().createPetCondition(selectedPet.id, payload);
                      void runAction(action, editingConditionId ? "Condicion actualizada." : "Condicion registrada.").then(() => { setEditingConditionId(null); setConditionForm(emptyConditionForm); });
                    }} />
                  </>
                ) : null}
                {selectedPetHealthDetail.conditions.map((condition) => (
                  <View key={condition.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{condition.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>{petConditionStatusLabels[condition.status]}{condition.isCritical ? " - Critica" : ""}</Text>
                    <Text style={{ color: colorTokens.muted }}>Diagnosticada el: {condition.diagnosedOn ?? "Sin registro"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{condition.notes ?? "Sin notas todavia."}</Text>
                    {canEdit ? <Button label="Editar" onPress={() => { setEditingConditionId(condition.id); setConditionForm({ name: condition.name, status: condition.status as PetConditionStatus, diagnosedOn: condition.diagnosedOn ?? "", isCritical: condition.isCritical, notes: condition.notes ?? "" }); }} /> : null}
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ color: colorTokens.muted }}>Selecciona una mascota para revisar su salud.</Text>
          )}
        </View>
      </CoreSectionCard>
    </View>
  );
}
