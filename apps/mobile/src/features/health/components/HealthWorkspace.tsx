import { formatHouseholdPermissions, petConditionStatusLabels, petConditionStatusOrder } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { PetConditionStatus, UpdatePetAllergyInput, UpdatePetConditionInput, UpdatePetVaccineInput } from "@pet/types";
import { useEffect, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

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

function Button({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ borderRadius: 999, backgroundColor: "#0f766e", paddingHorizontal: 16, paddingVertical: 12, opacity: disabled ? 0.65 : 1 }}>
      <Text style={{ color: "#f8fafc", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        backgroundColor: "rgba(15,118,110,0.1)",
        borderColor: "rgba(15,118,110,0.2)",
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6
      }}
    >
      <Text style={{ color: "#0f766e", fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function AddButton({ isActive, label, onPress }: { isActive: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: isActive ? "rgba(15,118,110,0.14)" : "#0f766e",
        borderColor: isActive ? "rgba(15,118,110,0.22)" : "#0f766e",
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6
      }}
    >
      <Text style={{ color: isActive ? "#0f766e" : "#ffffff", fontSize: 11, fontWeight: "800" }}>{label}</Text>
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
        placeholder={placeholder}
        placeholderTextColor="#a8a29e"
        style={[inputStyle, multiline ? { minHeight: 88, textAlignVertical: "top" } : null]}
        value={value}
      />
      {helperText ? <Text style={{ color: "#78716c", fontSize: 12, lineHeight: 17 }}>{helperText}</Text> : null}
    </View>
  );
}

function formatDateLabel(value: string) {
  if (!value) {
    return "Seleccionar fecha";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function DatePickerField({
  helperText,
  isOpen,
  label,
  maxDate,
  onChange,
  onToggle,
  value
}: {
  helperText?: string;
  isOpen: boolean;
  label: string;
  maxDate?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  value: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = value || maxDate || today;

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
            {formatDateLabel(value)}
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
            maxDate={maxDate}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: colorTokens.accent,
                selectedTextColor: "#ffffff"
              }
            }}
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
            <Pressable
              onPress={() => onChange("")}
              style={{ borderTopWidth: 1, borderTopColor: "rgba(28,25,23,0.08)", padding: 12 }}
            >
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
  const [openDatePicker, setOpenDatePicker] = useState<"administeredOn" | "nextDueOn" | "diagnosedOn" | null>(null);
  const [activeHealthSection, setActiveHealthSection] = useState<"vaccine" | "allergy" | "condition">("vaccine");
  const [activeHealthForm, setActiveHealthForm] = useState<"vaccine" | "allergy" | "condition" | null>(null);

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
          <Text
            style={{
              color: colorTokens.accent,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1,
              textTransform: "uppercase"
            }}
          >
            Salud
          </Text>
          <Text style={{ color: colorTokens.ink, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
            {isPetHubMode && selectedPet ? `Salud de ${selectedPet.name}` : "Salud por mascota"}
          </Text>
          <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 16 }}>
            Manten al dia vacunas, alergias y condiciones relevantes para su cuidado.
          </Text>
        </View>
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
              <View style={[cardStyle, { backgroundColor: "#ffffff" }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 15, fontWeight: "900", color: "#1c1917" }}>{selectedPet.name}</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 12 }}>
                      {selectedPet.species}{selectedPet.breed ? ` - ${selectedPet.breed}` : ""} - {canEdit ? "editable" : "solo lectura"}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  {[
                    {
                      count: selectedPetHealthDetail.dashboard.vaccineCount,
                      detail: selectedPetHealthDetail.dashboard.nextVaccineDueDate ? `Proxima: ${selectedPetHealthDetail.dashboard.nextVaccineDueDate}` : "Sin proxima dosis",
                      form: "vaccine" as const,
                      label: "Vacunas"
                    },
                    {
                      count: selectedPetHealthDetail.dashboard.allergyCount,
                      detail: selectedPetHealthDetail.dashboard.allergyNames.join(", ") || "Sin alergias registradas",
                      form: "allergy" as const,
                      label: "Alergias"
                    },
                    {
                      count: selectedPetHealthDetail.dashboard.conditionCount,
                      detail: selectedPetHealthDetail.dashboard.criticalConditionNames.join(", ") || "Sin condiciones criticas",
                      form: "condition" as const,
                      label: "Condiciones"
                    }
                  ].map((item) => {
                    const isActive = activeHealthSection === item.form;
                    const isFormOpen = activeHealthForm === item.form;

                    return (
                      <Pressable
                        key={item.form}
                        onPress={() => {
                          setActiveHealthSection(item.form);
                          setOpenDatePicker(null);
                          setActiveHealthForm((current) => (current === item.form ? current : null));
                        }}
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
                        {canEdit ? (
                          <AddButton
                            isActive={isFormOpen}
                            label={isFormOpen ? "Cerrar" : "+ Agregar"}
                            onPress={() => {
                              setActiveHealthSection(item.form);
                              setOpenDatePicker(null);
                              setActiveHealthForm((current) => (current === item.form ? null : item.form));
                            }}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {activeHealthSection === "vaccine" ? <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Vacunas ({selectedPetHealthDetail.vaccines.length})</Text>
                {canEdit && activeHealthForm === "vaccine" ? (
                  <>
                    <Field label="Nombre de la vacuna" onChange={(value) => setVaccineForm((current) => ({ ...current, name: value }))} value={vaccineForm.name} />
                    <DatePickerField
                      helperText="Fecha en que fue aplicada la vacuna."
                      isOpen={openDatePicker === "administeredOn"}
                      label="Aplicada el"
                      maxDate={new Date().toISOString().slice(0, 10)}
                      onChange={(value) => setVaccineForm((current) => ({ ...current, administeredOn: value }))}
                      onToggle={() => setOpenDatePicker((current) => (current === "administeredOn" ? null : "administeredOn"))}
                      value={vaccineForm.administeredOn}
                    />
                    <DatePickerField
                      helperText="Opcional. Programa la fecha estimada de la siguiente dosis."
                      isOpen={openDatePicker === "nextDueOn"}
                      label="Proxima dosis"
                      onChange={(value) => setVaccineForm((current) => ({ ...current, nextDueOn: value }))}
                      onToggle={() => setOpenDatePicker((current) => (current === "nextDueOn" ? null : "nextDueOn"))}
                      value={vaccineForm.nextDueOn ?? ""}
                    />
                    <Field label="Notas" multiline onChange={(value) => setVaccineForm((current) => ({ ...current, notes: value }))} value={vaccineForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingVaccineId ? "Guardar vacuna" : "Registrar vacuna"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetVaccineInput = { name: vaccineForm.name.trim(), administeredOn: vaccineForm.administeredOn, nextDueOn: vaccineForm.nextDueOn || null, notes: vaccineForm.notes?.trim() || null };
                      const action = editingVaccineId ? () => getMobileHealthApiClient().updatePetVaccine(editingVaccineId, payload) : () => getMobileHealthApiClient().createPetVaccine(selectedPet.id, payload);
                      void runAction(action, editingVaccineId ? "Vacuna actualizada." : "Vacuna registrada.").then(() => { setEditingVaccineId(null); setVaccineForm(emptyVaccineForm); setOpenDatePicker(null); setActiveHealthForm(null); });
                    }} />
                  </>
                ) : !canEdit ? <Text style={{ color: colorTokens.muted }}>Hogar en modo solo lectura.</Text> : null}
                {selectedPetHealthDetail.vaccines.map((vaccine) => (
                  <View key={vaccine.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{vaccine.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>Aplicada: {vaccine.administeredOn} - Proxima dosis: {vaccine.nextDueOn ?? "Sin registro"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{vaccine.notes ?? "Sin notas todavia."}</Text>
                    {canEdit ? <SmallButton label="Editar" onPress={() => { setEditingVaccineId(vaccine.id); setVaccineForm({ name: vaccine.name, administeredOn: vaccine.administeredOn, nextDueOn: vaccine.nextDueOn ?? "", notes: vaccine.notes ?? "" }); setActiveHealthSection("vaccine"); setOpenDatePicker(null); setActiveHealthForm("vaccine"); }} /> : null}
                  </View>
                ))}
              </View> : null}

              {activeHealthSection === "allergy" ? <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Alergias ({selectedPetHealthDetail.allergies.length})</Text>
                {canEdit && activeHealthForm === "allergy" ? (
                  <>
                    <Field label="Alergeno" onChange={(value) => setAllergyForm((current) => ({ ...current, allergen: value }))} value={allergyForm.allergen} />
                    <Field label="Reaccion" onChange={(value) => setAllergyForm((current) => ({ ...current, reaction: value }))} value={allergyForm.reaction ?? ""} />
                    <Field label="Notas" multiline onChange={(value) => setAllergyForm((current) => ({ ...current, notes: value }))} value={allergyForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingAllergyId ? "Guardar alergia" : "Registrar alergia"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetAllergyInput = { allergen: allergyForm.allergen.trim(), reaction: allergyForm.reaction?.trim() || null, notes: allergyForm.notes?.trim() || null };
                      const action = editingAllergyId ? () => getMobileHealthApiClient().updatePetAllergy(editingAllergyId, payload) : () => getMobileHealthApiClient().createPetAllergy(selectedPet.id, payload);
                      void runAction(action, editingAllergyId ? "Alergia actualizada." : "Alergia registrada.").then(() => { setEditingAllergyId(null); setAllergyForm(emptyAllergyForm); setActiveHealthForm(null); });
                    }} />
                  </>
                ) : null}
                {selectedPetHealthDetail.allergies.map((allergy) => (
                  <View key={allergy.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{allergy.allergen}</Text>
                    <Text style={{ color: colorTokens.muted }}>{allergy.reaction ?? "Sin reaccion registrada"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{allergy.notes ?? "Sin notas todavia."}</Text>
                    {canEdit ? <SmallButton label="Editar" onPress={() => { setEditingAllergyId(allergy.id); setAllergyForm({ allergen: allergy.allergen, reaction: allergy.reaction ?? "", notes: allergy.notes ?? "" }); setActiveHealthSection("allergy"); setOpenDatePicker(null); setActiveHealthForm("allergy"); }} /> : null}
                  </View>
                ))}
              </View> : null}

              {activeHealthSection === "condition" ? <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Condiciones ({selectedPetHealthDetail.conditions.length})</Text>
                {canEdit && activeHealthForm === "condition" ? (
                  <>
                    <Field label="Nombre de la condicion" onChange={(value) => setConditionForm((current) => ({ ...current, name: value }))} value={conditionForm.name} />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {petConditionStatusOrder.map((status) => (
                        <Pressable key={status} onPress={() => setConditionForm((current) => ({ ...current, status }))} style={{ borderRadius: 999, borderWidth: 1, borderColor: conditionForm.status === status ? "rgba(15,118,110,0.3)" : "rgba(28,25,23,0.14)", backgroundColor: conditionForm.status === status ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.86)", paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Text style={{ color: conditionForm.status === status ? "#0f766e" : "#1c1917", fontWeight: "600" }}>{petConditionStatusLabels[status]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <DatePickerField
                      helperText="Opcional. Registra la fecha de diagnostico si esta disponible."
                      isOpen={openDatePicker === "diagnosedOn"}
                      label="Diagnosticada el"
                      maxDate={new Date().toISOString().slice(0, 10)}
                      onChange={(value) => setConditionForm((current) => ({ ...current, diagnosedOn: value }))}
                      onToggle={() => setOpenDatePicker((current) => (current === "diagnosedOn" ? null : "diagnosedOn"))}
                      value={conditionForm.diagnosedOn ?? ""}
                    />
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <Text style={{ color: colorTokens.muted, flex: 1 }}>Marcar como critica</Text>
                      <Switch onValueChange={(value) => setConditionForm((current) => ({ ...current, isCritical: value }))} value={Boolean(conditionForm.isCritical)} />
                    </View>
                    <Field label="Notas" multiline onChange={(value) => setConditionForm((current) => ({ ...current, notes: value }))} value={conditionForm.notes ?? ""} />
                    <Button disabled={isSubmitting} label={editingConditionId ? "Guardar condicion" : "Registrar condicion"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetConditionInput = { name: conditionForm.name.trim(), status: conditionForm.status ?? "active", diagnosedOn: conditionForm.diagnosedOn || null, isCritical: Boolean(conditionForm.isCritical), notes: conditionForm.notes?.trim() || null };
                      const action = editingConditionId ? () => getMobileHealthApiClient().updatePetCondition(editingConditionId, payload) : () => getMobileHealthApiClient().createPetCondition(selectedPet.id, payload);
                      void runAction(action, editingConditionId ? "Condicion actualizada." : "Condicion registrada.").then(() => { setEditingConditionId(null); setConditionForm(emptyConditionForm); setOpenDatePicker(null); setActiveHealthForm(null); });
                    }} />
                  </>
                ) : null}
                {selectedPetHealthDetail.conditions.map((condition) => (
                  <View key={condition.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{condition.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>{petConditionStatusLabels[condition.status]}{condition.isCritical ? " - Critica" : ""}</Text>
                    <Text style={{ color: colorTokens.muted }}>Diagnosticada el: {condition.diagnosedOn ?? "Sin registro"}</Text>
                    <Text style={{ color: colorTokens.muted }}>{condition.notes ?? "Sin notas todavia."}</Text>
                    {canEdit ? <SmallButton label="Editar" onPress={() => { setEditingConditionId(condition.id); setConditionForm({ name: condition.name, status: condition.status as PetConditionStatus, diagnosedOn: condition.diagnosedOn ?? "", isCritical: condition.isCritical, notes: condition.notes ?? "" }); setActiveHealthSection("condition"); setOpenDatePicker(null); setActiveHealthForm("condition"); }} /> : null}
                  </View>
                ))}
              </View> : null}
            </>
          ) : (
            <Text style={{ color: colorTokens.muted }}>Selecciona una mascota para revisar su salud.</Text>
          )}
        </View>
      </View>
    </View>
  );
}
