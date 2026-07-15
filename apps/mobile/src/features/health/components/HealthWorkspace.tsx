import { formatHouseholdPermissions, petConditionStatusLabels, petConditionStatusOrder } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { PetConditionStatus, PetDocument, PetVaccine, UpdatePetAllergyInput, UpdatePetConditionInput, UpdatePetVaccineInput } from "@pet/types";
import { getPetDocumentValidityStatus } from "@pet/types";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, Switch, Text, TextInput, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { getMobileHealthApiClient, getMobilePetsApiClient } from "../../core/services/supabase-mobile";
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
const emptyEvidenceForm = { expirationWarningDays: 30, expiresAt: "", hasExpiration: false, issuedAt: "" };

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

function StickerIconButton({
  disabled,
  icon,
  label,
  onPress,
  tone = "secondary"
}: {
  disabled?: boolean;
  icon: "calendar" | "eye";
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
}) {
  const tint = tone === "primary" ? "#ffffff" : colorTokens.accentDark;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: tone === "primary" ? colorTokens.accent : "rgba(15,118,110,0.1)",
        borderColor: "rgba(15,118,110,0.24)",
        borderRadius: 18,
        borderWidth: 1,
        height: 34,
        justifyContent: "center",
        opacity: disabled ? 0.62 : 1,
        width: 34
      }}
    >
      <Svg height={17} viewBox="0 0 24 24" width={17}>
        {icon === "eye" ? (
          <>
            <Path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5Z" fill="none" stroke={tint} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <Circle cx={12} cy={12} fill="none" r={2.6} stroke={tint} strokeWidth={2} />
          </>
        ) : (
          <>
            <Rect fill="none" height={16} rx={3} stroke={tint} strokeWidth={2} width={16} x={4} y={5} />
            <Path d="M8 3v4M16 3v4M4 10h16M8 15h3" stroke={tint} strokeLinecap="round" strokeWidth={2} />
          </>
        )}
      </Svg>
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

function formatFileSize(bytes: number | null) {
  if (!bytes) {
    return "Tamano pendiente";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentValidityLabel(document: Pick<PetDocument, "expirationWarningDays" | "expiresAt" | "hasExpiration">) {
  const validity = getPetDocumentValidityStatus(document);

  if (validity.status === "no_expiration") {
    return { label: "Sin vencimiento", tone: "neutral" as const };
  }

  if (validity.status === "missing_expiration_date") {
    return { label: "Fecha pendiente", tone: "warning" as const };
  }

  if (validity.status === "expired") {
    return { label: "Vencido", tone: "danger" as const };
  }

  if (validity.status === "expiring_soon") {
    return { label: validity.daysUntilExpiration === 0 ? "Vence hoy" : `Vence en ${validity.daysUntilExpiration} dias`, tone: "warning" as const };
  }

  return { label: document.expiresAt ? `Vigente hasta ${formatDateLabel(document.expiresAt)}` : "Vigente", tone: "active" as const };
}

function ValidityChip({ label, tone }: { label: string; tone: "active" | "danger" | "neutral" | "warning" }) {
  const palette = {
    active: { backgroundColor: "rgba(15,118,110,0.12)", borderColor: "rgba(15,118,110,0.24)", color: colorTokens.accentDark },
    danger: { backgroundColor: "rgba(254,226,226,0.88)", borderColor: "rgba(220,38,38,0.24)", color: "#991b1b" },
    neutral: { backgroundColor: "rgba(241,245,249,0.92)", borderColor: "rgba(15,23,42,0.08)", color: "#475569" },
    warning: { backgroundColor: "rgba(255,237,213,0.9)", borderColor: "rgba(249,115,22,0.24)", color: "#9a3412" }
  }[tone];

  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: palette.backgroundColor, borderColor: palette.borderColor, borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 }}>
      <Text numberOfLines={1} style={{ color: palette.color, fontSize: 10, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function isImageDocument(document: Pick<PetDocument, "fileName" | "mimeType">) {
  return document.mimeType?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(document.fileName);
}

function normalizeEvidenceText(value: string) {
  return value.trim().toLocaleLowerCase("es-PA");
}

function getVaccineEvidenceDocuments(vaccine: PetVaccine, documents: PetDocument[]) {
  const vaccineName = normalizeEvidenceText(vaccine.name);

  return documents.filter((document) => {
    if (document.documentType !== "vaccination_record") {
      return false;
    }

    const title = normalizeEvidenceText(document.title);
    return title.includes(vaccineName) || title.includes(vaccine.administeredOn);
  });
}

function formatMonthYearLabel(dateKey: string) {
  const [year, month] = dateKey.split("-");

  return month && year ? `${month}/${year}` : dateKey;
}

function shiftDateYear(dateKey: string, deltaYears: number, minDate?: string, maxDate?: string) {
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  date.setFullYear(date.getFullYear() + deltaYears);
  let nextDateKey = date.toISOString().slice(0, 10);

  if (minDate && nextDateKey < minDate) {
    nextDateKey = minDate;
  }

  if (maxDate && nextDateKey > maxDate) {
    nextDateKey = maxDate;
  }

  return nextDateKey;
}

function DatePickerField({
  helperText,
  isOpen,
  label,
  maxDate,
  minDate,
  onChange,
  onToggle,
  value
}: {
  helperText?: string;
  isOpen: boolean;
  label: string;
  maxDate?: string;
  minDate?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  value: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = value || minDate || maxDate || today;
  const [visibleDate, setVisibleDate] = useState(selectedDate);

  useEffect(() => {
    if (isOpen) {
      setVisibleDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

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
          <View style={{ alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(28,25,23,0.08)", flexDirection: "row", gap: 8, justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisibleDate(shiftDateYear(visibleDate, -1, minDate, maxDate))}
              style={{ borderColor: "rgba(0,122,107,0.18)", borderRadius: 999, borderWidth: 1, minWidth: 74, paddingHorizontal: 8, paddingVertical: 5 }}
            >
              <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textAlign: "center" }}>-1 ano</Text>
            </Pressable>
            <Text numberOfLines={1} style={{ color: colorTokens.ink, flex: 1, fontSize: 13, fontWeight: "900", textAlign: "center" }}>
              {formatMonthYearLabel(visibleDate)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisibleDate(shiftDateYear(visibleDate, 1, minDate, maxDate))}
              style={{ borderColor: "rgba(0,122,107,0.18)", borderRadius: 999, borderWidth: 1, minWidth: 74, paddingHorizontal: 8, paddingVertical: 5 }}
            >
              <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textAlign: "center" }}>+1 ano</Text>
            </Pressable>
          </View>
          <Calendar
            current={visibleDate}
            key={`health-${visibleDate.slice(0, 7)}`}
            maxDate={maxDate}
            minDate={minDate}
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
            onMonthChange={(month: { dateString: string }) => setVisibleDate(month.dateString)}
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

function validateVaccineForm(input: UpdatePetVaccineInput) {
  const name = input.name.trim();

  if (!name) {
    return "Escribe el nombre de la vacuna.";
  }

  if (!input.administeredOn) {
    return "Selecciona la fecha en que fue aplicada la vacuna.";
  }

  if (input.nextDueOn && input.nextDueOn < input.administeredOn) {
    return "La proxima dosis no puede ser anterior a la fecha de aplicacion.";
  }

  return null;
}

export function HealthWorkspace({
  contextHouseholdId,
  contextPetId,
  enabled,
  mode = "standalone",
  onActivePetChange
}: {
  contextHouseholdId?: string | null;
  contextPetId?: string | null;
  enabled: boolean;
  mode?: "standalone" | "pet-hub";
  onActivePetChange?: (context: { householdId: string | null; petId: string | null }) => void;
}) {
  const { householdSnapshot, pets, selectedHouseholdId, selectedPetId, selectedPetHealthDetail, errorMessage, infoMessage, isLoading, isSubmitting, clearMessages, selectHousehold, selectPet, runAction } =
    useHealthWorkspace(enabled);
  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [editingAllergyId, setEditingAllergyId] = useState<string | null>(null);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [vaccineForm, setVaccineForm] = useState(emptyVaccineForm);
  const [vaccineFormError, setVaccineFormError] = useState<string | null>(null);
  const [allergyForm, setAllergyForm] = useState(emptyAllergyForm);
  const [conditionForm, setConditionForm] = useState(emptyConditionForm);
  const [openDatePicker, setOpenDatePicker] = useState<"administeredOn" | "nextDueOn" | "diagnosedOn" | null>(null);
  const [activeHealthSection, setActiveHealthSection] = useState<"vaccine" | "allergy" | "condition">("vaccine");
  const [activeHealthForm, setActiveHealthForm] = useState<"vaccine" | "allergy" | "condition" | null>(null);
  const [vaccineEvidenceDocuments, setVaccineEvidenceDocuments] = useState<PetDocument[]>([]);
  const [isLoadingVaccineEvidence, setIsLoadingVaccineEvidence] = useState(false);
  const [evidencePreview, setEvidencePreview] = useState<{ document: PetDocument; signedUrl: string } | null>(null);
  const [evidencePreviewLoadingId, setEvidencePreviewLoadingId] = useState<string | null>(null);
  const [editingEvidenceDocumentId, setEditingEvidenceDocumentId] = useState<string | null>(null);
  const [evidenceDocumentForm, setEvidenceDocumentForm] = useState(emptyEvidenceForm);
  const [openEvidenceDatePicker, setOpenEvidenceDatePicker] = useState<"expiresAt" | "issuedAt" | null>(null);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const canEdit =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;
  const isPetHubMode = mode === "pet-hub";

  const handleSelectHousehold = async (householdId: string) => {
    await selectHousehold(householdId);
    onActivePetChange?.({ householdId, petId: null });
  };

  const handleSelectPet = async (petId: string) => {
    await selectPet(petId);
    onActivePetChange?.({ householdId: selectedHouseholdId, petId });
  };

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

  useEffect(() => {
    let isActive = true;

    async function loadVaccineEvidence() {
      if (!enabled || !selectedPetId) {
        setVaccineEvidenceDocuments([]);
        return;
      }

      setIsLoadingVaccineEvidence(true);

      try {
        const documents = await getMobilePetsApiClient().listPetDocuments(selectedPetId);

        if (isActive) {
          setVaccineEvidenceDocuments(documents.filter((document) => document.documentType === "vaccination_record"));
        }
      } catch {
        if (isActive) {
          setVaccineEvidenceDocuments([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingVaccineEvidence(false);
        }
      }
    }

    void loadVaccineEvidence();

    return () => {
      isActive = false;
    };
  }, [enabled, selectedPetId, selectedPetHealthDetail?.vaccines.length]);

  async function uploadVaccineSticker(vaccine: PetVaccine) {
    clearMessages();

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["image/*", "application/pdf"]
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      return;
    }

    await runAction(
      async () => {
        const response = await fetch(asset.uri);
        const fileBytes = await response.arrayBuffer();

        return getMobilePetsApiClient().uploadPetDocument(vaccine.petId, {
          documentType: "vaccination_record",
          expirationWarningDays: 30,
          expiresAt: vaccine.nextDueOn,
          fileBytes,
          fileName: asset.name,
          hasExpiration: Boolean(vaccine.nextDueOn),
          issuedAt: vaccine.administeredOn,
          mimeType: asset.mimeType ?? null,
          title: `Sticker vacuna - ${vaccine.name} - ${vaccine.administeredOn}`
        });
      },
      "Sticker de vacuna cargado como documento.",
      false
    );

    if (selectedPetId) {
      const documents = await getMobilePetsApiClient().listPetDocuments(selectedPetId);
      setVaccineEvidenceDocuments(documents.filter((document) => document.documentType === "vaccination_record"));
    }
  }

  async function refreshVaccineEvidence() {
    if (!selectedPetId) {
      setVaccineEvidenceDocuments([]);
      return;
    }

    const documents = await getMobilePetsApiClient().listPetDocuments(selectedPetId);
    setVaccineEvidenceDocuments(documents.filter((document) => document.documentType === "vaccination_record"));
  }

  async function openVaccineStickerPreview(document: PetDocument) {
    setEvidencePreviewLoadingId(document.id);

    try {
      const access = await getMobilePetsApiClient().getPetDocumentSignedUrl(document.id);
      const previewDocument = { ...document, mimeType: access.mimeType ?? document.mimeType };

      if (isImageDocument(previewDocument)) {
        setEvidencePreview({ document: previewDocument, signedUrl: access.signedUrl });
        return;
      }

      await Linking.openURL(access.signedUrl);
    } catch {
      Alert.alert("Sticker no disponible", "No se pudo abrir el soporte documental. Intenta nuevamente.");
    } finally {
      setEvidencePreviewLoadingId(null);
    }
  }

  function openEvidenceValidityEditor(document: PetDocument) {
    setEditingEvidenceDocumentId(document.id);
    setEvidenceDocumentForm({
      expirationWarningDays: document.expirationWarningDays,
      expiresAt: document.expiresAt ?? "",
      hasExpiration: document.hasExpiration,
      issuedAt: document.issuedAt ?? ""
    });
    setOpenEvidenceDatePicker(null);
  }

  function closeEvidenceValidityEditor() {
    setEditingEvidenceDocumentId(null);
    setEvidenceDocumentForm(emptyEvidenceForm);
    setOpenEvidenceDatePicker(null);
  }

  function saveEvidenceValidity(document: PetDocument) {
    clearMessages();

    void runAction(
      async () => {
        if (evidenceDocumentForm.hasExpiration && !evidenceDocumentForm.expiresAt) {
          throw new Error("Indica la fecha de vencimiento del sticker.");
        }

        if (evidenceDocumentForm.issuedAt && evidenceDocumentForm.expiresAt && evidenceDocumentForm.expiresAt < evidenceDocumentForm.issuedAt) {
          throw new Error("La fecha de vencimiento no puede ser anterior a la fecha de emision.");
        }

        return getMobilePetsApiClient().updatePetDocument(document.id, {
          documentType: "vaccination_record",
          expirationWarningDays: evidenceDocumentForm.expirationWarningDays,
          expiresAt: evidenceDocumentForm.hasExpiration ? evidenceDocumentForm.expiresAt : null,
          hasExpiration: evidenceDocumentForm.hasExpiration,
          issuedAt: evidenceDocumentForm.issuedAt || null,
          title: document.title
        });
      },
      "Vigencia del sticker actualizada.",
      false
    ).then(async () => {
      closeEvidenceValidityEditor();
      await refreshVaccineEvidence();
    });
  }

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
            <Pressable key={household.id} onPress={() => void handleSelectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}</Text>
            </Pressable>
          )) : !isPetHubMode ? <Text style={{ color: colorTokens.muted }}>Crea primero un hogar.</Text> : null}

          {!isPetHubMode ? <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Mascotas</Text>
            {selectedHousehold ? pets.length ? pets.map((pet) => (
              <Pressable key={pet.id} onPress={() => void handleSelectPet(pet.id)} style={[inputStyle, { backgroundColor: pet.id === selectedPetId ? "rgba(15,118,110,0.08)" : "#fffdf8", gap: 6 }]}>
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
                              if (item.form === "vaccine") {
                                setVaccineFormError(null);
                              }
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
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Vacunas ({selectedPetHealthDetail.vaccines.length})</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 15 }}>
                      Registra aplicacion, proxima dosis y soporte documental cuando lo tengas.
                    </Text>
                  </View>
                  {canEdit && activeHealthForm !== "vaccine" ? (
                    <AddButton
                      isActive={false}
                      label={selectedPetHealthDetail.vaccines.length ? "+ Vacuna" : "Registrar"}
                      onPress={() => {
                        setEditingVaccineId(null);
                        setVaccineForm(emptyVaccineForm);
                        setVaccineFormError(null);
                        setOpenDatePicker(null);
                        setActiveHealthForm("vaccine");
                      }}
                    />
                  ) : null}
                </View>
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
                      minDate={vaccineForm.administeredOn || undefined}
                      onChange={(value) => setVaccineForm((current) => ({ ...current, nextDueOn: value }))}
                      onToggle={() => setOpenDatePicker((current) => (current === "nextDueOn" ? null : "nextDueOn"))}
                      value={vaccineForm.nextDueOn ?? ""}
                    />
                    <Field label="Notas" multiline onChange={(value) => setVaccineForm((current) => ({ ...current, notes: value }))} value={vaccineForm.notes ?? ""} />
                    {vaccineFormError ? (
                      <View style={{ borderRadius: 14, backgroundColor: "rgba(254,226,226,0.74)", borderColor: "rgba(220,38,38,0.18)", borderWidth: 1, padding: 10 }}>
                        <Text style={{ color: "#991b1b", fontSize: 12, fontWeight: "800", lineHeight: 17 }}>{vaccineFormError}</Text>
                      </View>
                    ) : null}
                    <Button disabled={isSubmitting} label={editingVaccineId ? "Guardar vacuna" : "Registrar vacuna"} onPress={() => {
                      clearMessages();
                      const payload: UpdatePetVaccineInput = { name: vaccineForm.name.trim(), administeredOn: vaccineForm.administeredOn, nextDueOn: vaccineForm.nextDueOn || null, notes: vaccineForm.notes?.trim() || null };
                      const validationMessage = validateVaccineForm(payload);

                      if (validationMessage) {
                        setVaccineFormError(validationMessage);
                        return;
                      }

                      setVaccineFormError(null);
                      const action = editingVaccineId ? () => getMobileHealthApiClient().updatePetVaccine(editingVaccineId, payload) : () => getMobileHealthApiClient().createPetVaccine(selectedPet.id, payload);
                      void runAction(action, editingVaccineId ? "Vacuna actualizada." : "Vacuna registrada.").then(() => { setEditingVaccineId(null); setVaccineForm(emptyVaccineForm); setOpenDatePicker(null); setActiveHealthForm(null); });
                    }} />
                  </>
                ) : !canEdit ? <Text style={{ color: colorTokens.muted }}>Hogar en modo solo lectura.</Text> : null}
                {selectedPetHealthDetail.vaccines.length === 0 && activeHealthForm !== "vaccine" ? (
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(15,118,110,0.08)", borderColor: "rgba(15,118,110,0.14)", borderWidth: 1, padding: 12, gap: 5 }}>
                    <Text style={{ color: colorTokens.accentDark, fontSize: 13, fontWeight: "900" }}>Aun no hay vacunas registradas</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>
                      Empieza por la fecha de aplicacion. La proxima dosis puede quedar vacia si no la conoces.
                    </Text>
                  </View>
                ) : null}
                {selectedPetHealthDetail.vaccines.map((vaccine) => {
                  const evidenceDocuments = getVaccineEvidenceDocuments(vaccine, vaccineEvidenceDocuments);
                  const primaryEvidenceDocument = evidenceDocuments[0] ?? null;
                  const validityBadge = primaryEvidenceDocument ? getDocumentValidityLabel(primaryEvidenceDocument) : null;
                  const isEditingThisEvidence = Boolean(primaryEvidenceDocument && editingEvidenceDocumentId === primaryEvidenceDocument.id);

                  return (
                    <View key={vaccine.id} style={[inputStyle, { gap: 8 }]}>
                      <View style={{ gap: 3 }}>
                        <Text style={{ fontWeight: "800", color: "#1c1917", fontSize: 13 }}>{vaccine.name}</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                          Aplicada: {vaccine.administeredOn} - Proxima dosis: {vaccine.nextDueOn ?? "Sin registro"}
                        </Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{vaccine.notes ?? "Sin notas todavia."}</Text>
                      </View>
                      <View style={{ borderRadius: 14, backgroundColor: evidenceDocuments.length ? "rgba(15,118,110,0.08)" : "rgba(250,250,249,0.88)", padding: 9, gap: 7 }}>
                        <View style={{ alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" }}>
                          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                            <Text style={{ color: "#0f766e", fontSize: 11, fontWeight: "900" }}>Sticker / soporte documental</Text>
                            <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                              Evidencia documental; no modifica fechas clinicas.
                            </Text>
                          </View>
                          {validityBadge ? <ValidityChip label={validityBadge.label} tone={validityBadge.tone} /> : null}
                        </View>
                        {isLoadingVaccineEvidence ? (
                          <Text style={{ color: colorTokens.muted, fontSize: 11 }}>Consultando documentos...</Text>
                        ) : evidenceDocuments.length ? (
                          <>
                            <View style={{ borderRadius: 12, backgroundColor: "rgba(255,255,255,0.72)", padding: 8, gap: 3 }}>
                              <Text numberOfLines={1} style={{ color: "#1c1917", fontSize: 11, fontWeight: "800" }}>
                                {primaryEvidenceDocument?.title ?? "Sticker cargado"}
                              </Text>
                              <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>
                                {primaryEvidenceDocument?.fileName ?? "Archivo del sticker"}
                              </Text>
                              {primaryEvidenceDocument ? (
                                <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>
                                  {formatFileSize(primaryEvidenceDocument.fileSizeBytes)} - {primaryEvidenceDocument.mimeType ?? "Tipo pendiente"}
                                </Text>
                              ) : null}
                              {evidenceDocuments.length > 1 ? (
                                <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "800" }}>
                                  {evidenceDocuments.length - 1} soporte(s) adicional(es) asociado(s).
                                </Text>
                              ) : null}
                            </View>
                            {primaryEvidenceDocument ? (
                              <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                <StickerIconButton
                                  disabled={evidencePreviewLoadingId === primaryEvidenceDocument.id}
                                  icon="eye"
                                  label="Ver sticker de vacuna"
                                  onPress={() => {
                                    void openVaccineStickerPreview(primaryEvidenceDocument);
                                  }}
                                  tone="primary"
                                />
                                {canEdit ? (
                                  <StickerIconButton
                                    disabled={isSubmitting}
                                    icon="calendar"
                                    label="Editar vigencia del sticker"
                                    onPress={() => openEvidenceValidityEditor(primaryEvidenceDocument)}
                                  />
                                ) : null}
                                {evidencePreviewLoadingId === primaryEvidenceDocument.id ? <ActivityIndicator color={colorTokens.accentDark} size="small" /> : null}
                              </View>
                            ) : null}
                            {primaryEvidenceDocument && isEditingThisEvidence ? (
                              <View style={{ borderRadius: 14, backgroundColor: "#ffffff", padding: 10, gap: 8 }}>
                                <Text style={{ color: "#1c1917", fontSize: 11, fontWeight: "900" }}>Vigencia del sticker</Text>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                  {[
                                    { label: "Sin vencimiento", value: false },
                                    { label: "Tiene vencimiento", value: true }
                                  ].map((option) => {
                                    const isSelected = evidenceDocumentForm.hasExpiration === option.value;

                                    return (
                                      <Pressable
                                        key={option.label}
                                        accessibilityRole="button"
                                        onPress={() =>
                                          setEvidenceDocumentForm((current) => ({
                                            ...current,
                                            expiresAt: option.value ? current.expiresAt : "",
                                            hasExpiration: option.value
                                          }))
                                        }
                                        style={{
                                          backgroundColor: isSelected ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.86)",
                                          borderColor: isSelected ? "rgba(15,118,110,0.28)" : "rgba(15,23,42,0.1)",
                                          borderRadius: 999,
                                          borderWidth: 1,
                                          paddingHorizontal: 10,
                                          paddingVertical: 7
                                        }}
                                      >
                                        <Text style={{ color: isSelected ? colorTokens.accentDark : colorTokens.ink, fontSize: 10, fontWeight: "900" }}>{option.label}</Text>
                                      </Pressable>
                                    );
                                  })}
                                </View>
                                <DatePickerField
                                  helperText="Fecha documental del sticker o cartilla."
                                  isOpen={openEvidenceDatePicker === "issuedAt"}
                                  label="Fecha de emision"
                                  maxDate={new Date().toISOString().slice(0, 10)}
                                  onChange={(value) => setEvidenceDocumentForm((current) => ({ ...current, issuedAt: value }))}
                                  onToggle={() => setOpenEvidenceDatePicker((current) => (current === "issuedAt" ? null : "issuedAt"))}
                                  value={evidenceDocumentForm.issuedAt}
                                />
                                {evidenceDocumentForm.hasExpiration ? (
                                  <DatePickerField
                                    helperText="Vigencia documental del soporte. No cambia la proxima dosis clinica."
                                    isOpen={openEvidenceDatePicker === "expiresAt"}
                                    onChange={(value) => setEvidenceDocumentForm((current) => ({ ...current, expiresAt: value }))}
                                    onToggle={() => setOpenEvidenceDatePicker((current) => (current === "expiresAt" ? null : "expiresAt"))}
                                    label="Fecha de vencimiento"
                                    value={evidenceDocumentForm.expiresAt}
                                  />
                                ) : null}
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                  <SmallButton label="Guardar vigencia" onPress={() => saveEvidenceValidity(primaryEvidenceDocument)} />
                                  <SmallButton label="Cerrar" onPress={closeEvidenceValidityEditor} />
                                </View>
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 15 }}>
                            Sin sticker cargado para esta vacuna.
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {canEdit ? (
                          <>
                            <SmallButton label="Editar" onPress={() => { setEditingVaccineId(vaccine.id); setVaccineForm({ name: vaccine.name, administeredOn: vaccine.administeredOn, nextDueOn: vaccine.nextDueOn ?? "", notes: vaccine.notes ?? "" }); setVaccineFormError(null); setActiveHealthSection("vaccine"); setOpenDatePicker(null); setActiveHealthForm("vaccine"); }} />
                            <SmallButton label="Cargar sticker" onPress={() => { void uploadVaccineSticker(vaccine); }} />
                          </>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
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
      <Modal
        animationType="fade"
        onRequestClose={() => setEvidencePreview(null)}
        transparent
        visible={Boolean(evidencePreview)}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(15,23,42,0.62)",
            flex: 1,
            justifyContent: "center",
            padding: 18
          }}
        >
          <View style={{ backgroundColor: "#ffffff", borderRadius: 22, gap: 12, maxHeight: "88%", padding: 14, width: "100%" }}>
            <View style={{ flexDirection: "row", gap: 10, justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
                  Sticker de vacuna
                </Text>
                <Text style={{ color: colorTokens.ink, fontSize: 16, fontWeight: "900" }}>{evidencePreview?.document.title}</Text>
                {evidencePreview ? (
                  <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                    {getDocumentValidityLabel(evidencePreview.document).label}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel="Cerrar visualizador de sticker"
                accessibilityRole="button"
                onPress={() => setEvidencePreview(null)}
                style={{
                  alignItems: "center",
                  borderColor: "rgba(15,118,110,0.24)",
                  borderRadius: 999,
                  borderWidth: 1,
                  height: 34,
                  justifyContent: "center",
                  width: 34
                }}
              >
                <Text style={{ color: colorTokens.accentDark, fontSize: 16, fontWeight: "900" }}>X</Text>
              </Pressable>
            </View>

            {evidencePreview ? (
              <View style={{ backgroundColor: "rgba(241,245,249,0.9)", borderRadius: 18, height: 420, overflow: "hidden" }}>
                <Image resizeMode="contain" source={{ uri: evidencePreview.signedUrl }} style={{ height: "100%", width: "100%" }} />
              </View>
            ) : null}

            {evidencePreview ? (
              <View style={{ gap: 3 }}>
                <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 11 }}>{evidencePreview.document.fileName}</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                  {formatFileSize(evidencePreview.document.fileSizeBytes)} - {evidencePreview.document.mimeType ?? "Tipo de archivo desconocido"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
