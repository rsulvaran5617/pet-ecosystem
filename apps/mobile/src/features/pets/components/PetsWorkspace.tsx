import * as DocumentPicker from "expo-document-picker";
import { petDocumentTypeLabels, petDocumentTypeOrder, petSexLabels } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { PetDocumentType, UpdatePetInput, Uuid } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { getMobilePetsApiClient } from "../../core/services/supabase-mobile";
import { usePetHealthSummary } from "../../health/hooks/usePetHealthSummary";
import { usePetsWorkspace } from "../hooks/usePetsWorkspace";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(28,25,23,0.14)",
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  backgroundColor: "#fffdf8",
  color: "#1c1917"
} as const;

const emptyPetForm: UpdatePetInput = {
  name: "",
  species: "",
  breed: "",
  sex: "unknown",
  birthDate: "",
  notes: ""
};

type PickedDocument = {
  fileName: string;
  mimeType: string | null;
  uri: string;
};

type DocumentFormState = {
  title: string;
  documentType: PetDocumentType;
  selectedDocument: PickedDocument | null;
};

const emptyDocumentForm: DocumentFormState = {
  title: "",
  documentType: "other",
  selectedDocument: null
};

type PetHubPanel = "detalle" | "salud" | "documentos" | "recordatorios";
type PetWorkspaceView = "lista" | "crear" | "editar" | "detalle";

const hubPanelOptions: Array<{ label: string; value: PetHubPanel }> = [
  { label: "Detalle", value: "detalle" },
  { label: "Salud", value: "salud" },
  { label: "Docs", value: "documentos" },
  { label: "Recordatorios", value: "recordatorios" }
];

function Button({
  disabled,
  label,
  onPress,
  tone = "primary"
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.92)",
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(28,25,23,0.14)",
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: disabled ? 0.65 : 1
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : "#1c1917", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  helperText,
  keyboardType,
  onChange,
  placeholder,
  value
}: {
  label: string;
  helperText?: string;
  keyboardType?: "default" | "numeric";
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a8a29e"
        style={inputStyle}
        value={value}
      />
      {helperText ? <Text style={{ color: "#78716c", fontSize: 12, lineHeight: 17 }}>{helperText}</Text> : null}
    </View>
  );
}

function MultilineField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput multiline numberOfLines={4} onChangeText={onChange} style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]} value={value} />
    </View>
  );
}

function ChoiceBar<TValue extends string>({
  onChange,
  options,
  value
}: {
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isActive ? "rgba(15,118,110,0.3)" : "rgba(28,25,23,0.14)",
              backgroundColor: isActive ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.86)",
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: isActive ? "#0f766e" : "#1c1917", fontWeight: "600" }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Notice({ message, tone }: { message: string; tone: "error" | "info" }) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: tone === "error" ? "rgba(127,29,29,0.18)" : "rgba(15,118,110,0.2)",
        backgroundColor: tone === "error" ? "rgba(127,29,29,0.08)" : "rgba(15,118,110,0.1)",
        padding: 14
      }}
    >
      <Text style={{ color: tone === "error" ? "#991b1b" : "#0f766e", fontWeight: "600" }}>{message}</Text>
    </View>
  );
}

function formatFileSize(fileSizeBytes: number | null) {
  if (!fileSizeBytes) {
    return "Tamano desconocido";
  }

  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`;
  }

  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PetsWorkspace({
  activePanel = "detalle",
  enabled,
  onContextChange,
  onPanelChange
}: {
  activePanel?: PetHubPanel;
  enabled: boolean;
  onContextChange?: (context: { householdId: Uuid | null; petId: Uuid | null }) => void;
  onPanelChange?: (panel: PetHubPanel) => void;
}) {
  const {
    householdSnapshot,
    pets,
    selectedHouseholdId,
    selectedPetId,
    selectedPetDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    selectHousehold,
    selectPet,
    refresh,
    runAction
  } = usePetsWorkspace(enabled);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [petView, setPetView] = useState<PetWorkspaceView>("lista");
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const canEditSelectedHousehold =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;
  const documentGroups = useMemo(
    () =>
      petDocumentTypeOrder
        .map((documentType) => ({
          documentType,
          documents: selectedPetDetail?.documents.filter((document) => document.documentType === documentType) ?? []
        }))
        .filter((group) => group.documents.length > 0),
    [selectedPetDetail]
  );
  const { summary: selectedPetHealthSummary, isLoading: isHealthSummaryLoading } = usePetHealthSummary(
    selectedPetDetail?.pet.id ?? null,
    enabled
  );

  useEffect(() => {
    onContextChange?.({ householdId: selectedHouseholdId, petId: selectedPetId });
  }, [onContextChange, selectedHouseholdId, selectedPetId]);

  const openCreatePet = () => {
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setPetView("crear");
    onPanelChange?.("detalle");
  };

  const openEditPet = (pet: (typeof pets)[number]) => {
    setEditingPetId(pet.id);
    setPetForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      sex: pet.sex,
      birthDate: pet.birthDate ?? "",
      notes: pet.notes ?? ""
    });
    setPetView("editar");
    onPanelChange?.("detalle");
  };

  const openPetDetail = (petId: Uuid) => {
    void selectPet(petId);
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setPetView("detalle");
    onPanelChange?.("detalle");
  };

  const closePetForm = () => {
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setPetView(selectedPetId ? "detalle" : "lista");
  };

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSectionCard
        eyebrow="Mascotas"
        title="Mascotas del hogar"
        description="Elige una mascota y usa su detalle como punto de entrada a salud, documentos y recordatorios."
      >
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Preparando mascotas, documentos y permisos del hogar...</Text> : null}

          <View style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1c1917" }}>Tus mascotas</Text>
            <Text style={{ color: colorTokens.muted, lineHeight: 21 }}>
              Selecciona una mascota para ver su ficha, registrar cuidado y mantener sus documentos en contexto.
            </Text>
          </View>

          {householdSnapshot?.households.length ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1c1917" }}>Hogar</Text>
              {householdSnapshot.households.map((household) => (
                <Pressable
                  key={household.id}
                  onPress={() => void selectHousehold(household.id)}
                  style={{
                    borderRadius: 16,
                    backgroundColor:
                      household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(255,255,255,0.72)",
                    borderWidth: 1,
                    borderColor:
                      household.id === selectedHouseholdId ? "rgba(15,118,110,0.24)" : "rgba(28,25,23,0.08)",
                    padding: 12,
                    gap: 6
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>{household.name}</Text>
                    <StatusChip
                      label={household.myPermissions.includes("edit") ? "editable" : "solo lectura"}
                      tone={household.myPermissions.includes("edit") ? "active" : "neutral"}
                    />
                  </View>
                  <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s)</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={{ color: colorTokens.muted }}>Primero crea un hogar para empezar a registrar mascotas.</Text>
          )}

          {petView === "crear" || petView === "editar" ? (
          <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>{petView === "editar" ? "Editar mascota" : "Crear mascota"}</Text>
              {selectedHousehold ? (
                <StatusChip
                  label={canEditSelectedHousehold ? "hogar editable" : "hogar solo lectura"}
                  tone={canEditSelectedHousehold ? "active" : "neutral"}
                />
              ) : null}
            </View>
            {selectedHouseholdId ? (
              canEditSelectedHousehold ? (
                <>
                  <Field label="Nombre de la mascota" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, name: value }))} value={petForm.name ?? ""} />
                  <Field label="Especie" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, species: value }))} value={petForm.species ?? ""} />
                  <Field label="Raza" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, breed: value }))} value={petForm.breed ?? ""} />
                  <ChoiceBar
                    onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, sex: value }))}
                    options={[
                      { label: petSexLabels.unknown, value: "unknown" },
                      { label: petSexLabels.female, value: "female" },
                      { label: petSexLabels.male, value: "male" }
                    ]}
                    value={petForm.sex ?? "unknown"}
                  />
                  <Field
                    helperText="Usa el formato ISO que espera el MVP: 2026-05-01."
                    label="Fecha de nacimiento"
                    onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, birthDate: value }))}
                    placeholder="AAAA-MM-DD"
                    value={petForm.birthDate ?? ""}
                  />
                  <MultilineField label="Notas" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, notes: value }))} value={petForm.notes ?? ""} />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      label={petView === "editar" ? "Guardar mascota" : "Guardar mascota"}
                      onPress={() => {
                        clearMessages();

                        const payload = {
                          name: petForm.name.trim(),
                          species: petForm.species.trim(),
                          breed: petForm.breed?.trim() || null,
                          sex: petForm.sex ?? "unknown",
                          birthDate: petForm.birthDate || null,
                          notes: petForm.notes?.trim() || null
                        } satisfies UpdatePetInput;

                        if (editingPetId) {
                          void runAction(
                            () => getMobilePetsApiClient().updatePet(editingPetId, payload),
                            "Mascota actualizada.",
                            false
                          ).then(async (pet) => {
                            setEditingPetId(null);
                            setPetForm(emptyPetForm);
                            await refresh();
                            await selectPet(pet.id);
                            setPetView("detalle");
                          });
                          return;
                        }

                        void runAction(
                          () =>
                            getMobilePetsApiClient().createPet({
                              householdId: selectedHouseholdId,
                              ...payload
                            }),
                          "Mascota creada.",
                          false
                        ).then(async (pet) => {
                          setPetForm(emptyPetForm);
                          await refresh();
                          await selectPet(pet.id);
                          setPetView("detalle");
                        });
                      }}
                    />
                    <Button disabled={isSubmitting} label="Cancelar" onPress={closePetForm} tone="secondary" />
                  </View>
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>
                  Puedes revisar las mascotas de este hogar, pero solo integrantes con `edit` o `admin` pueden modificarlas.
                </Text>
              )
            ) : (
              <Text style={{ color: colorTokens.muted }}>Selecciona un hogar para crear o editar mascotas.</Text>
            )}
          </View>
          ) : null}

          {petView === "lista" ? (
          <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Elige una mascota</Text>
              {selectedHousehold ? <StatusChip label={`${pets.length} mascota(s)`} tone="neutral" /> : null}
            </View>
            {selectedHousehold && canEditSelectedHousehold ? (
              <Button disabled={isSubmitting} label="Agregar mascota" onPress={openCreatePet} />
            ) : null}
            {selectedHousehold ? (
              pets.length ? (
                pets.map((pet) => (
                  <View
                    key={pet.id}
                    style={{
                      borderRadius: 16,
                      backgroundColor: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "rgba(255,255,255,0.78)",
                      borderWidth: 1,
                      borderColor: pet.id === selectedPetId ? "rgba(15,118,110,0.24)" : "rgba(28,25,23,0.08)",
                      padding: 12,
                      gap: 8
                    }}
                  >
                    <Pressable onPress={() => openPetDetail(pet.id)} style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1c1917", flex: 1 }}>{pet.name}</Text>
                        <StatusChip label={pet.id === selectedPetId ? "seleccionada" : `${pet.documentCount} doc(s)`} tone={pet.id === selectedPetId ? "active" : "neutral"} />
                      </View>
                      <Text style={{ color: colorTokens.muted }}>
                        {pet.species}
                        {pet.breed ? `  -  ${pet.breed}` : ""}
                      </Text>
                      <Text style={{ color: colorTokens.muted, fontSize: 13 }}>
                        Toca para abrir su detalle, salud, documentos y recordatorios.
                      </Text>
                    </Pressable>
                    {canEditSelectedHousehold ? (
                      <Button
                        disabled={isSubmitting}
                        label="Editar"
                        onPress={() => openEditPet(pet)}
                        tone="secondary"
                      />
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={[inputStyle, { gap: 6 }]}>
                  <Text style={{ color: "#1c1917", fontWeight: "700" }}>Este hogar todavia no tiene mascotas</Text>
                  <Text style={{ color: colorTokens.muted }}>Crea la primera mascota para habilitar su ficha, documentos, salud y recordatorios.</Text>
                </View>
              )
            ) : (
              <Text style={{ color: colorTokens.muted }}>Selecciona un hogar para listar sus mascotas.</Text>
            )}
          </View>
          ) : null}

          {selectedPetDetail && petView === "detalle" ? (
            <>
              <View style={{ borderRadius: 22, backgroundColor: "#1c1917", padding: 18, gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 28, fontWeight: "700", color: "#f8fafc" }}>{selectedPetDetail.pet.name}</Text>
                    <Text style={{ color: "rgba(248,250,252,0.76)" }}>
                      {selectedPetDetail.pet.species}
                      {selectedPetDetail.pet.breed ? ` - ${selectedPetDetail.pet.breed}` : ""}
                    </Text>
                  </View>
                  <StatusChip label={selectedPetDetail.pet.species} tone="active" />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <StatusChip label={`${selectedPetDetail.documents.length} documento(s)`} tone="neutral" />
                  <StatusChip label={isHealthSummaryLoading ? "salud cargando" : selectedPetHealthSummary ? `${selectedPetHealthSummary.vaccineCount} vacuna(s)` : "sin salud"} tone="neutral" />
                  <StatusChip label={canEditSelectedHousehold ? "editable" : "solo lectura"} tone={canEditSelectedHousehold ? "active" : "neutral"} />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {hubPanelOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => onPanelChange?.(option.value)}
                      style={{
                        borderRadius: 999,
                        backgroundColor: activePanel === option.value ? "rgba(153,246,228,0.2)" : "rgba(255,255,255,0.08)",
                        borderColor: activePanel === option.value ? "rgba(153,246,228,0.4)" : "rgba(255,255,255,0.12)",
                        borderWidth: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 8
                      }}
                    >
                      <Text style={{ color: activePanel === option.value ? "#99f6e4" : "rgba(248,250,252,0.76)", fontWeight: "700" }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    label="Volver a mascotas"
                    onPress={() => {
                      setPetView("lista");
                      onPanelChange?.("detalle");
                    }}
                    tone="secondary"
                  />
                  <Button label="Registrar salud" onPress={() => onPanelChange?.("salud")} tone="secondary" />
                  <Button label="Cargar documento" onPress={() => onPanelChange?.("documentos")} tone="secondary" />
                  <Button label="Crear recordatorio" onPress={() => onPanelChange?.("recordatorios")} tone="secondary" />
                  {canEditSelectedHousehold ? <Button label="Editar" onPress={() => openEditPet(selectedPetDetail.pet)} tone="secondary" /> : null}
                </View>
              </View>

              {activePanel === "detalle" ? (
                <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Ficha de {selectedPetDetail.pet.name}</Text>
                  <Text style={{ color: colorTokens.muted }}>Raza: {selectedPetDetail.pet.breed ?? "No registrada"}</Text>
                  <Text style={{ color: colorTokens.muted }}>Sexo: {petSexLabels[selectedPetDetail.pet.sex]}</Text>
                  <Text style={{ color: colorTokens.muted }}>Fecha de nacimiento: {selectedPetDetail.pet.birthDate ?? "No registrada"}</Text>
                  <Text style={{ color: colorTokens.muted }}>
                    Notas: {selectedPetDetail.pet.notes ?? "Todavia no hay notas para esta mascota."}
                  </Text>
                {isHealthSummaryLoading ? (
                  <Text style={{ color: colorTokens.muted }}>Cargando resumen de salud...</Text>
                ) : selectedPetHealthSummary ? (
                  <>
                    <Text style={{ color: colorTokens.muted }}>
                      Resumen de salud: {selectedPetHealthSummary.vaccineCount} vacuna(s), {selectedPetHealthSummary.allergyCount} alergia(s), {selectedPetHealthSummary.conditionCount} condicion(es)
                    </Text>
                    <Text style={{ color: colorTokens.muted }}>
                      Ultima vacuna: {selectedPetHealthSummary.latestVaccineDate ?? "No registrada"} - Proxima fecha: {selectedPetHealthSummary.nextVaccineDueDate ?? "No registrada"}
                    </Text>
                    <Text style={{ color: colorTokens.muted }}>
                      Alertas: {selectedPetHealthSummary.criticalConditionNames.join(", ") || "Sin condiciones criticas"}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>Aun no hay datos de salud. Usa el panel Salud para registrar vacunas, alergias o condiciones.</Text>
                )}
                </View>
              ) : null}

              {activePanel === "documentos" ? (
              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Documentos de {selectedPetDetail.pet.name}</Text>
                  <StatusChip label={`${selectedPetDetail.documents.length} total`} tone="neutral" />
                </View>
                {canEditSelectedHousehold ? (
                  <>
                    <Field label="Titulo del documento" onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, title: value }))} value={documentForm.title} />
                    <ChoiceBar
                      onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, documentType: value }))}
                      options={petDocumentTypeOrder.map((documentType) => ({
                        label: petDocumentTypeLabels[documentType],
                        value: documentType
                      }))}
                      value={documentForm.documentType}
                    />
                    <Button
                      disabled={isSubmitting}
                      label={documentForm.selectedDocument ? `Seleccionado: ${documentForm.selectedDocument.fileName}` : "Elegir documento"}
                      onPress={() => {
                        void DocumentPicker.getDocumentAsync({
                          multiple: false,
                          copyToCacheDirectory: true,
                          type: "*/*"
                        }).then((result) => {
                          if (result.canceled) {
                            return;
                          }

                          const asset = result.assets[0];

                          if (!asset) {
                            return;
                          }

                          setDocumentForm((currentForm) => ({
                            ...currentForm,
                            selectedDocument: {
                              fileName: asset.name,
                              mimeType: asset.mimeType ?? null,
                              uri: asset.uri
                            }
                          }));
                        });
                      }}
                      tone="secondary"
                    />
                    <Button
                      disabled={isSubmitting}
                      label="Cargar documento"
                      onPress={() => {
                        clearMessages();
                        const selectedDocument = documentForm.selectedDocument;

                        void runAction(
                          async () => {
                            if (!selectedDocument) {
                              throw new Error("Elige un documento antes de cargarlo.");
                            }

                            const response = await fetch(selectedDocument.uri);
                            const fileBytes = await response.arrayBuffer();

                            return getMobilePetsApiClient().uploadPetDocument(selectedPetDetail.pet.id, {
                              title: documentForm.title.trim() || selectedDocument.fileName,
                              documentType: documentForm.documentType,
                              fileName: selectedDocument.fileName,
                              mimeType: selectedDocument.mimeType,
                              fileBytes
                            });
                          },
                          "Documento cargado.",
                          false
                        ).then(async () => {
                          setDocumentForm(emptyDocumentForm);
                          await refresh();
                          await selectPet(selectedPetDetail.pet.id);
                        });
                      }}
                    />
                  </>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>
                    La carga de documentos usa la misma validacion de permisos del hogar que la edicion de mascotas.
                  </Text>
                )}

                {documentGroups.length ? (
                  documentGroups.map((group) => (
                    <View key={group.documentType} style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>
                          {petDocumentTypeLabels[group.documentType]}
                        </Text>
                        <StatusChip label={`${group.documents.length} documento(s)`} tone="neutral" />
                      </View>
                      {group.documents.map((document) => (
                        <View key={document.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 6 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{document.title}</Text>
                            <StatusChip label={formatFileSize(document.fileSizeBytes)} tone="neutral" />
                          </View>
                          <Text style={{ color: colorTokens.muted }}>{document.fileName}</Text>
                          <Text style={{ color: colorTokens.muted }}>{document.mimeType ?? "Tipo de archivo desconocido"}</Text>
                        </View>
                      ))}
                    </View>
                  ))
                ) : (
                  <Text style={{ color: colorTokens.muted }}>Aun no hay documentos. Carga un archivo basico para tenerlo disponible desde la ficha de la mascota.</Text>
                )}
              </View>
              ) : null}
            </>
          ) : petView === "lista" ? (
            <Text style={{ color: colorTokens.muted }}>
              Selecciona una mascota para revisar su ficha resumida y sus documentos basicos.
            </Text>
          ) : null}
        </View>
      </CoreSectionCard>
    </View>
  );
}



