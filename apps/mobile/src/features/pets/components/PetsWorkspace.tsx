import * as DocumentPicker from "expo-document-picker";
import { petDocumentTypeLabels, petDocumentTypeOrder, petSexLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { PetDocumentType, PetSummary, UpdatePetInput, Uuid } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { StatusChip } from "../../core/components/StatusChip";
import { getMobilePetsApiClient } from "../../core/services/supabase-mobile";
import { usePetHealthSummary } from "../../health/hooks/usePetHealthSummary";
import { usePetsWorkspace } from "../hooks/usePetsWorkspace";

const inputStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colorTokens.line,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  backgroundColor: colorTokens.surface,
  color: colorTokens.ink
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

const hubPanelOptions: Array<{ label: string; value: PetHubPanel }> = [
  { label: "Detalle", value: "detalle" },
  { label: "Salud", value: "salud" },
  { label: "Docs", value: "documentos" },
  { label: "Recordatorios", value: "recordatorios" }
];

type PetIconName =
  | "paw"
  | "heart"
  | "file"
  | "bell"
  | "plus"
  | "camera"
  | "shield"
  | "warning"
  | "home"
  | "calendar"
  | "scale"
  | "chevron";

function PetLineIcon({
  color = colorTokens.accentDark,
  name,
  size = 18,
  strokeWidth = 2
}: {
  color?: string;
  name: PetIconName;
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth
  };

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      {name === "paw" ? (
        <>
          <Circle cx="7.5" cy="8" fill={color} r="2.2" />
          <Circle cx="16.5" cy="8" fill={color} r="2.2" />
          <Circle cx="10.5" cy="5" fill={color} r="2" />
          <Circle cx="13.5" cy="5" fill={color} r="2" />
          <Path d="M7.5 16.5c0-3 2.2-5.2 4.5-5.2s4.5 2.2 4.5 5.2c0 1.6-1 2.6-2.4 2.6-.8 0-1.3-.4-2.1-.4s-1.3.4-2.1.4c-1.4 0-2.4-1-2.4-2.6Z" fill={color} />
        </>
      ) : null}
      {name === "heart" ? <Path d="M20.8 8.6c0 5.1-8.8 10.2-8.8 10.2S3.2 13.7 3.2 8.6A4.2 4.2 0 0 1 10 5.3a4.2 4.2 0 0 1 10.8 3.3Z" {...common} /> : null}
      {name === "file" ? (
        <>
          <Path d="M7 3h7l4 4v14H7z" {...common} />
          <Path d="M14 3v5h5M9.5 13h5M9.5 17h5" {...common} />
        </>
      ) : null}
      {name === "bell" ? (
        <>
          <Path d="M18 10a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" {...common} />
          <Path d="M10 20a2.2 2.2 0 0 0 4 0" {...common} />
        </>
      ) : null}
      {name === "plus" ? <Path d="M12 5v14M5 12h14" {...common} /> : null}
      {name === "camera" ? (
        <>
          <Path d="M7 8h2l1.5-2h3L15 8h2a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" {...common} />
          <Circle cx="12" cy="13.2" r="3" {...common} />
        </>
      ) : null}
      {name === "shield" ? <Path d="M12 3 19 6v5.5c0 4-2.8 7.3-7 9.5-4.2-2.2-7-5.5-7-9.5V6zM9 12l2 2 4-4" {...common} /> : null}
      {name === "warning" ? <Path d="m12 4 9 16H3zM12 10v4M12 18h.01" {...common} /> : null}
      {name === "home" ? (
        <>
          <Path d="M4 11.5 12 5l8 6.5" {...common} />
          <Path d="M6.5 10v9h11v-9" {...common} />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <Rect height="15" rx="2" width="16" x="4" y="5" {...common} />
          <Path d="M8 3v4M16 3v4M4 10h16" {...common} />
        </>
      ) : null}
      {name === "scale" ? (
        <>
          <Path d="M6 20h12M12 4v16M7 7h10" {...common} />
          <Path d="m7 7-3 6h6zm10 0-3 6h6z" {...common} />
        </>
      ) : null}
      {name === "chevron" ? <Path d="m9 6 6 6-6 6" {...common} /> : null}
    </Svg>
  );
}

function Button({
  disabled,
  labelSize = 14,
  label,
  onPress,
  tone = "primary"
}: {
  disabled?: boolean;
  labelSize?: number;
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
        backgroundColor: tone === "primary" ? colorTokens.accent : colorTokens.surface,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(0,151,143,0.26)",
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: disabled ? 0.65 : 1,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontSize: labelSize, fontWeight: "800", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function CompactActionButton({
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
        alignSelf: "flex-start",
        borderRadius: 999,
        backgroundColor: tone === "primary" ? colorTokens.accent : "rgba(15,118,110,0.1)",
        borderColor: "rgba(15,118,110,0.22)",
        borderWidth: 1,
        opacity: disabled ? 0.65 : 1,
        paddingHorizontal: 12,
        paddingVertical: 8
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: tone === "primary" ? "#ffffff" : colorTokens.accentDark,
          fontSize: 11,
          fontWeight: "900",
          textAlign: "center"
        }}
      >
        {label}
      </Text>
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

function BirthDatePickerField({
  isOpen,
  onChange,
  onToggle,
  value
}: {
  isOpen: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  value: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = value || today;
  const selectedDateLabel = value ? formatShortDate(value) : "Seleccionar fecha";

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>Fecha de nacimiento</Text>
      <Pressable
        onPress={onToggle}
        style={{
          ...inputStyle,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <View style={{ gap: 2 }}>
          <Text style={{ color: value ? colorTokens.ink : "#a8a29e", fontSize: 15, fontWeight: value ? "700" : "500" }}>
            {selectedDateLabel}
          </Text>
          <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
            {value || "Elige una fecha en el calendario"}
          </Text>
        </View>
        <PetLineIcon color={colorTokens.accentDark} name="calendar" size={18} />
      </Pressable>
      {isOpen ? (
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.08)",
            backgroundColor: "#ffffff",
            overflow: "hidden",
            ...visualTokens.mobile.softShadow
          }}
        >
          <Calendar
            current={selectedDate}
            maxDate={today}
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
              style={{
                borderTopWidth: 1,
                borderTopColor: "rgba(15,23,42,0.06)",
                padding: 12
              }}
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

function getPetInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function getPetDescription(pet: PetSummary) {
  return pet.breed || pet.species || "Mascota";
}

function formatPetAge(birthDate: string | null) {
  if (!birthDate) {
    return "Edad pendiente";
  }

  const birthday = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(birthday.getTime())) {
    return "Edad pendiente";
  }

  const today = new Date();
  let years = today.getFullYear() - birthday.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());

  if (!hasBirthdayPassed) {
    years -= 1;
  }

  if (years <= 0) {
    return "Menos de 1 ano";
  }

  return `${years} ano${years === 1 ? "" : "s"}`;
}

function formatShortDate(date: string | null) {
  if (!date) {
    return "No registrado";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getDocumentStatus(documentType: PetDocumentType, index: number) {
  if (documentType === "vaccination_record" || documentType === "medical_record") {
    return index === 0 ? "Actualizado" : "Revisar";
  }

  if (documentType === "insurance") {
    return "Activo";
  }

  return "Guardado";
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
  const [activeDocumentType, setActiveDocumentType] = useState<PetDocumentType>(petDocumentTypeOrder[0]);
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
  const [isBirthDatePickerOpen, setIsBirthDatePickerOpen] = useState(false);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const canEditSelectedHousehold =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;
  const documentGroups = useMemo(
    () =>
      petDocumentTypeOrder
        .map((documentType) => ({
          documentType,
          documents: selectedPetDetail?.documents.filter((document) => document.documentType === documentType) ?? []
        })),
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
    setIsBirthDatePickerOpen(false);
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
    setIsBirthDatePickerOpen(false);
    setPetView("editar");
    onPanelChange?.("detalle");
  };

  const openPetDetail = (petId: Uuid) => {
    void selectPet(petId);
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setIsBirthDatePickerOpen(false);
    setIsDocumentFormOpen(false);
    setPetView("detalle");
    onPanelChange?.("detalle");
  };

  const closePetForm = () => {
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setIsBirthDatePickerOpen(false);
    setPetView(selectedPetId ? "detalle" : "lista");
  };

  const selectedPet = selectedPetDetail?.pet ?? pets.find((pet) => pet.id === selectedPetId) ?? null;
  const selectedDocuments = selectedPetDetail?.documents ?? [];
  const selectedPetAge = selectedPet ? formatPetAge(selectedPet.birthDate) : "Edad pendiente";
  const selectedPetHome = selectedHousehold?.name ?? "Hogar principal";
  const selectedPetBreed = selectedPet ? getPetDescription(selectedPet) : "Mascota";
  const vaccineCount = selectedPetHealthSummary?.vaccineCount ?? 0;
  const allergyCount = selectedPetHealthSummary?.allergyCount ?? 0;
  const conditionCount = selectedPetHealthSummary?.conditionCount ?? 0;
  const latestDocuments = selectedDocuments.slice(0, 3);
  const activeDocumentGroup = documentGroups.find((group) => group.documentType === activeDocumentType) ?? {
    documentType: activeDocumentType,
    documents: []
  };

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <View style={{ gap: 14 }}>
        <View style={{ gap: 2, paddingHorizontal: 2 }}>
          <Text style={{ color: "#111827", fontSize: 24, fontWeight: "900" }}>Mis mascotas</Text>
        </View>

        {isLoading ? <Text style={{ color: colorTokens.muted }}>Preparando mascotas, documentos y permisos del hogar...</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 10, paddingRight: 4 }}>
            {pets.map((pet) => {
              const isSelected = pet.id === selectedPetId;

              return (
                <Pressable
                  key={pet.id}
                  onPress={() => openPetDetail(pet.id)}
                  style={{
                    width: isSelected ? 172 : 136,
                    minHeight: 76,
                    borderRadius: 16,
                    backgroundColor: "#ffffff",
                    borderColor: isSelected ? "rgba(20,184,166,0.46)" : "rgba(15,23,42,0.08)",
                    borderWidth: 1,
                    padding: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    ...visualTokens.mobile.softShadow
                  }}
                >
                  <View
                    style={{
                      height: 48,
                      width: 48,
                      borderRadius: 24,
                      backgroundColor: isSelected ? "rgba(20,184,166,0.14)" : "rgba(241,245,249,0.92)",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Text style={{ color: isSelected ? "#0f766e" : "#475569", fontSize: 18, fontWeight: "900" }}>
                      {getPetInitial(pet.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text numberOfLines={1} style={{ color: "#111827", fontSize: 14, fontWeight: "900" }}>{pet.name}</Text>
                    <Text numberOfLines={1} style={{ color: "#0f766e", fontSize: 11, fontWeight: "700" }}>{getPetDescription(pet)}</Text>
                    <Text numberOfLines={1} style={{ color: "#64748b", fontSize: 11 }}>{formatPetAge(pet.birthDate)}</Text>
                  </View>
                  {isSelected ? (
                    <View
                      style={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        height: 18,
                        width: 18,
                        borderRadius: 9,
                        backgroundColor: "#0f9f8f",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>v</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            {selectedHousehold && canEditSelectedHousehold ? (
              <Pressable
                onPress={openCreatePet}
                style={{
                  width: 88,
                  minHeight: 76,
                  borderRadius: 16,
                  borderColor: "rgba(15,23,42,0.09)",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  backgroundColor: "rgba(255,255,255,0.86)",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: 10
                }}
              >
                <View
                  style={{
                    height: 28,
                    width: 28,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(15,23,42,0.2)",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <PetLineIcon color="#64748b" name="plus" size={15} />
                </View>
                <Text style={{ color: "#475569", fontSize: 10, fontWeight: "700", textAlign: "center" }}>Agregar mascota</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        {householdSnapshot?.households.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8, paddingRight: 4 }}>
              {householdSnapshot.households.map((household) => (
                <Pressable
                  key={household.id}
                  onPress={() => void selectHousehold(household.id)}
                  style={{
                    borderRadius: 999,
                    backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.78)",
                    borderColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.25)" : "rgba(15,23,42,0.08)",
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 7
                  }}
                >
                  <Text style={{ color: household.id === selectedHouseholdId ? "#0f766e" : "#64748b", fontSize: 12, fontWeight: "800" }}>
                    {household.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={{ color: colorTokens.muted }}>Primero crea un hogar para empezar a registrar mascotas.</Text>
        )}

        <View
          style={{
            borderRadius: 16,
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.06)",
            flexDirection: "row",
            overflow: "hidden",
            ...visualTokens.mobile.softShadow
          }}
        >
          {hubPanelOptions.map((option) => {
            const isActive = activePanel === option.value;
            const iconName: PetIconName =
              option.value === "detalle" ? "paw" : option.value === "salud" ? "heart" : option.value === "documentos" ? "file" : "bell";

            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setPetView("detalle");
                  onPanelChange?.(option.value);
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderBottomWidth: isActive ? 2 : 0,
                  borderBottomColor: "#0f9f8f",
                  gap: 4,
                  paddingVertical: 12
                }}
              >
                <PetLineIcon color={isActive ? "#0f9f8f" : "#64748b"} name={iconName} size={16} />
                <Text style={{ color: isActive ? "#0f766e" : "#64748b", fontSize: 11, fontWeight: "800" }}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {petView === "crear" || petView === "editar" ? (
          <View style={{ borderRadius: 18, backgroundColor: "#ffffff", padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{petView === "editar" ? "Editar mascota" : "Crear mascota"}</Text>
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
                  <BirthDatePickerField
                    isOpen={isBirthDatePickerOpen}
                    onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, birthDate: value }))}
                    onToggle={() => setIsBirthDatePickerOpen((currentValue) => !currentValue)}
                    value={petForm.birthDate ?? ""}
                  />
                  <MultilineField label="Notas" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, notes: value }))} value={petForm.notes ?? ""} />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      labelSize={12}
                      label="Guardar mascota"
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
                            setIsBirthDatePickerOpen(false);
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
                          setIsBirthDatePickerOpen(false);
                          await refresh();
                          await selectPet(pet.id);
                          setPetView("detalle");
                        });
                      }}
                    />
                    <Button disabled={isSubmitting} label="Cancelar" labelSize={12} onPress={closePetForm} tone="secondary" />
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

        {!selectedPet && petView !== "crear" ? (
          <View style={{ borderRadius: 18, backgroundColor: "#ffffff", padding: 16, gap: 8, ...visualTokens.mobile.softShadow }}>
            <Text style={{ color: "#111827", fontSize: 17, fontWeight: "900" }}>Este hogar todavia no tiene mascotas</Text>
            <Text style={{ color: colorTokens.muted, lineHeight: 19 }}>Crea la primera mascota para habilitar su ficha, documentos, salud y recordatorios.</Text>
            {selectedHousehold && canEditSelectedHousehold ? <Button disabled={isSubmitting} label="Agregar mascota" onPress={openCreatePet} /> : null}
          </View>
        ) : null}

        {selectedPetDetail && petView === "detalle" ? (
          <>
            {activePanel === "detalle" ? (
              <>
                <View
                  style={{
                    borderRadius: 18,
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "rgba(15,23,42,0.06)",
                    padding: 16,
                    gap: 14,
                    ...visualTokens.mobile.softShadow
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                    <View>
                      <View
                        style={{
                          height: 102,
                          width: 102,
                          borderRadius: 51,
                          backgroundColor: "rgba(20,184,166,0.12)",
                          borderWidth: 3,
                          borderColor: "rgba(20,184,166,0.18)",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Text style={{ color: "#0f766e", fontSize: 42, fontWeight: "900" }}>{getPetInitial(selectedPetDetail.pet.name)}</Text>
                      </View>
                      {canEditSelectedHousehold ? (
                        <Pressable
                          onPress={() => openEditPet(selectedPetDetail.pet)}
                          style={{
                            position: "absolute",
                            right: 0,
                            bottom: 2,
                            height: 32,
                            width: 32,
                            borderRadius: 16,
                            backgroundColor: "#ffffff",
                            alignItems: "center",
                            justifyContent: "center",
                            ...visualTokens.mobile.softShadow
                          }}
                        >
                          <PetLineIcon color="#64748b" name="camera" size={15} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Text numberOfLines={1} style={{ color: "#111827", flexShrink: 1, fontSize: 24, fontWeight: "900" }}>
                          {selectedPetDetail.pet.name}
                        </Text>
                        <View
                          style={{
                            borderRadius: 999,
                            backgroundColor: "rgba(20,184,166,0.12)",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingHorizontal: 7,
                            paddingVertical: 4
                          }}
                        >
                          <PetLineIcon color="#0f766e" name="shield" size={11} strokeWidth={2.4} />
                          <Text style={{ color: "#0f766e", fontSize: 10, fontWeight: "900" }}>Verificado</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={{ color: "#64748b", fontSize: 13, fontWeight: "700" }}>{selectedPetBreed}</Text>
                      <View style={{ gap: 8 }}>
                        {[
                          { icon: "calendar" as const, label: selectedPetAge, meta: formatShortDate(selectedPetDetail.pet.birthDate) },
                          { icon: "scale" as const, label: `${selectedDocuments.length} doc(s)`, meta: "Documentos" },
                          { icon: "home" as const, label: "Hogar", meta: selectedPetHome }
                        ].map((item) => (
                          <View key={item.icon} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <PetLineIcon color="#64748b" name={item.icon} size={14} />
                            <Text numberOfLines={1} style={{ color: "#111827", flex: 1, fontSize: 12, fontWeight: "800" }}>{item.label}</Text>
                            <Text numberOfLines={1} style={{ color: "#64748b", flex: 1, fontSize: 10 }}>{item.meta}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <StatusChip label={petSexLabels[selectedPetDetail.pet.sex]} tone="neutral" />
                    <StatusChip label={selectedPetDetail.pet.species} tone="active" />
                    <StatusChip label={canEditSelectedHousehold ? "editable" : "solo lectura"} tone={canEditSelectedHousehold ? "active" : "neutral"} />
                  </View>
                  {selectedPetDetail.pet.notes ? (
                    <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 17 }}>{selectedPetDetail.pet.notes}</Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    { icon: "heart" as const, label: "Registrar salud", onPress: () => onPanelChange?.("salud"), tint: "#0f9f8f" },
                    { icon: "file" as const, label: "Cargar documento", onPress: () => onPanelChange?.("documentos"), tint: "#2563eb" },
                    { icon: "bell" as const, label: "Crear recordatorio", onPress: () => onPanelChange?.("recordatorios"), tint: "#f97316" }
                  ].map((action) => (
                    <Pressable
                      key={action.label}
                      onPress={action.onPress}
                      style={{
                        flex: 1,
                        minHeight: 78,
                        borderRadius: 14,
                        backgroundColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        padding: 10,
                        ...visualTokens.mobile.softShadow
                      }}
                    >
                      <View
                        style={{
                          height: 32,
                          width: 32,
                          borderRadius: 12,
                          backgroundColor: `${action.tint}18`,
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <PetLineIcon color={action.tint} name={action.icon} size={17} />
                      </View>
                      <Text style={{ color: "#111827", fontSize: 11, fontWeight: "900", textAlign: "center" }}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={{ borderRadius: 18, backgroundColor: "#ffffff", padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <PetLineIcon color="#0f766e" name="heart" size={17} />
                      <Text style={{ color: "#111827", fontSize: 15, fontWeight: "900" }}>Salud de {selectedPetDetail.pet.name}</Text>
                    </View>
                    <Pressable onPress={() => onPanelChange?.("salud")}>
                      <Text style={{ color: "#475569", fontSize: 11, fontWeight: "800" }}>Ver detalle</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    {[
                      {
                        icon: "shield" as const,
                        title: "Vacunas",
                        value: isHealthSummaryLoading ? "Cargando" : vaccineCount ? "Al dia" : "Pendiente",
                        detail: selectedPetHealthSummary?.latestVaccineDate ? `Ultima: ${formatShortDate(selectedPetHealthSummary.latestVaccineDate)}` : "Sin registro"
                      },
                      {
                        icon: "warning" as const,
                        title: "Alergias",
                        value: allergyCount ? selectedPetHealthSummary?.allergyNames.slice(0, 2).join(", ") || `${allergyCount}` : "Ninguna",
                        detail: allergyCount ? "Revisar controles" : "Sin alertas"
                      },
                      {
                        icon: "heart" as const,
                        title: "Condiciones",
                        value: conditionCount ? `${conditionCount} activa(s)` : "Ninguna",
                        detail: selectedPetHealthSummary?.criticalConditionNames.join(", ") || "Todo bien"
                      }
                    ].map((item, index) => (
                      <View
                        key={item.title}
                        style={{
                          flex: 1,
                          borderLeftWidth: index === 0 ? 0 : 1,
                          borderLeftColor: "rgba(15,23,42,0.08)",
                          gap: 4,
                          paddingHorizontal: index === 0 ? 0 : 10
                        }}
                      >
                        <PetLineIcon color={index === 1 ? "#f59e0b" : index === 2 ? "#7c3aed" : "#0f766e"} name={item.icon} size={16} />
                        <Text style={{ color: "#111827", fontSize: 11, fontWeight: "900" }}>{item.title}</Text>
                        <Text numberOfLines={1} style={{ color: index === 1 ? "#92400e" : "#0f766e", fontSize: 11, fontWeight: "800" }}>{item.value}</Text>
                        <Text numberOfLines={1} style={{ color: "#64748b", fontSize: 9 }}>{item.detail}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={{ borderRadius: 18, backgroundColor: "#ffffff", padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <PetLineIcon color="#0f766e" name="file" size={17} />
                      <Text style={{ color: "#111827", fontSize: 15, fontWeight: "900" }}>Documentos</Text>
                    </View>
                    <Pressable onPress={() => onPanelChange?.("documentos")}>
                      <Text style={{ color: "#475569", fontSize: 11, fontWeight: "800" }}>Ver todos</Text>
                    </Pressable>
                  </View>
                  {latestDocuments.length ? (
                    latestDocuments.map((document, index) => (
                      <Pressable
                        key={document.id}
                        onPress={() => onPanelChange?.("documentos")}
                        style={{
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: "rgba(15,23,42,0.06)",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          paddingTop: index === 0 ? 0 : 10
                        }}
                      >
                        <View
                          style={{
                            height: 32,
                            width: 32,
                            borderRadius: 11,
                            backgroundColor: index === 0 ? "rgba(20,184,166,0.12)" : index === 1 ? "rgba(37,99,235,0.12)" : "rgba(124,58,237,0.12)",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <PetLineIcon color={index === 0 ? "#0f766e" : index === 1 ? "#2563eb" : "#7c3aed"} name="file" size={15} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text numberOfLines={1} style={{ color: "#111827", fontSize: 12, fontWeight: "900" }}>{document.title}</Text>
                          <Text numberOfLines={1} style={{ color: "#64748b", fontSize: 10 }}>
                            {petDocumentTypeLabels[document.documentType]} - {formatFileSize(document.fileSizeBytes)}
                          </Text>
                        </View>
                        <StatusChip label={getDocumentStatus(document.documentType, index)} tone={index === 1 ? "pending" : "active"} />
                        <PetLineIcon color="#94a3b8" name="chevron" size={14} />
                      </Pressable>
                    ))
                  ) : (
                    <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>Aun no hay documentos. Carga un archivo basico para tenerlo disponible desde la ficha.</Text>
                  )}
                </View>

                <View style={{ borderRadius: 18, backgroundColor: "#ffffff", padding: 14, gap: 10, ...visualTokens.mobile.softShadow }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <PetLineIcon color="#64748b" name="bell" size={17} />
                      <Text style={{ color: "#111827", fontSize: 15, fontWeight: "900" }}>Proximos recordatorios</Text>
                    </View>
                    <Pressable onPress={() => onPanelChange?.("recordatorios")}>
                      <Text style={{ color: "#475569", fontSize: 11, fontWeight: "800" }}>Ver todos</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        height: 34,
                        width: 34,
                        borderRadius: 12,
                        backgroundColor: "rgba(249,115,22,0.12)",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <PetLineIcon color="#f97316" name="calendar" size={16} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: "#111827", fontSize: 12, fontWeight: "900" }}>Recordatorios de {selectedPetDetail.pet.name}</Text>
                      <Text style={{ color: "#64748b", fontSize: 10 }}>Gestiona vacunas, controles y tareas desde su panel.</Text>
                    </View>
                    <Pressable
                      onPress={() => onPanelChange?.("recordatorios")}
                      style={{
                        borderRadius: 999,
                        backgroundColor: "rgba(15,118,110,0.1)",
                        paddingHorizontal: 10,
                        paddingVertical: 7
                      }}
                    >
                      <Text style={{ color: "#0f766e", fontSize: 10, fontWeight: "900" }}>Ver detalles</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}

            {activePanel === "documentos" ? (
              <View style={{ borderRadius: 18, backgroundColor: "#ffffff", padding: 14, gap: 9, ...visualTokens.mobile.softShadow }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#111827", flex: 1 }}>Documentos de {selectedPetDetail.pet.name}</Text>
                  <StatusChip label={`${selectedPetDetail.documents.length} total`} tone="neutral" />
                </View>
                <View style={{ gap: 8 }}>
                  {documentGroups.map((group) => {
                    const isActive = activeDocumentType === group.documentType;
                    const isFormOpen = isDocumentFormOpen && documentForm.documentType === group.documentType;

                    return (
                      <Pressable
                        key={group.documentType}
                        onPress={() => {
                          setActiveDocumentType(group.documentType);
                          setIsDocumentFormOpen(false);
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
                          <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>
                            {petDocumentTypeLabels[group.documentType]}
                          </Text>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>
                            {group.documents.length} documento(s)
                          </Text>
                        </View>
                        {canEditSelectedHousehold ? (
                          <CompactActionButton
                            disabled={isSubmitting}
                            label={isFormOpen ? "Cerrar" : "+ Agregar"}
                            onPress={() => {
                              setActiveDocumentType(group.documentType);
                              setDocumentForm((currentForm) => ({ ...currentForm, documentType: group.documentType }));
                              setIsDocumentFormOpen((currentValue) => !(currentValue && documentForm.documentType === group.documentType));
                            }}
                            tone={isFormOpen ? "secondary" : "primary"}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {canEditSelectedHousehold && isDocumentFormOpen ? (
                  <>
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(247,250,252,0.92)", padding: 10, gap: 8 }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>
                        Nuevo documento - {petDocumentTypeLabels[documentForm.documentType]}
                      </Text>
                      <Field label="Titulo del documento" onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, title: value }))} value={documentForm.title} />
                      <ChoiceBar
                        onChange={(value) => {
                          setActiveDocumentType(value);
                          setDocumentForm((currentForm) => ({ ...currentForm, documentType: value }));
                        }}
                        options={petDocumentTypeOrder.map((documentType) => ({
                          label: petDocumentTypeLabels[documentType],
                          value: documentType
                        }))}
                        value={documentForm.documentType}
                      />
                    {documentForm.selectedDocument ? (
                      <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 11 }}>
                        Archivo: {documentForm.selectedDocument.fileName}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <CompactActionButton
                        disabled={isSubmitting}
                        label="Elegir documento"
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
                      <CompactActionButton
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
                            setIsDocumentFormOpen(false);
                            await refresh();
                            await selectPet(selectedPetDetail.pet.id);
                          });
                        }}
                      />
                    </View>
                    </View>
                  </>
                ) : (
                  !canEditSelectedHousehold ? <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>
                    La carga de documentos usa la misma validacion de permisos del hogar que la edicion de mascotas.
                  </Text> : null
                )}

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#1c1917" }}>
                    {petDocumentTypeLabels[activeDocumentGroup.documentType]} ({activeDocumentGroup.documents.length})
                  </Text>
                  {activeDocumentGroup.documents.length ? (
                    activeDocumentGroup.documents.map((document, index) => (
                        <View key={document.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 10, gap: 4 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#1c1917", flex: 1 }}>{document.title}</Text>
                            <StatusChip label={getDocumentStatus(document.documentType, index)} tone={index === 1 ? "pending" : "active"} />
                          </View>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>{document.fileName}</Text>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>{formatFileSize(document.fileSizeBytes)}</Text>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>{document.mimeType ?? "Tipo de archivo desconocido"}</Text>
                        </View>
                    ))
                  ) : (
                    <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>
                      Aun no hay documentos de este tipo. Usa + Agregar para cargar el primero.
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}



