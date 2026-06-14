import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { petDocumentTypeLabels, petDocumentTypeOrder, petSexLabels, reminderTypeLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { PetDocumentType, PetHealthDashboard, PetSummary, Reminder, UpdatePetInput, Uuid } from "@pet/types";
import { getPetDocumentValidityStatus } from "@pet/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
  isSterilized: null,
  notes: ""
};

type SterilizedFormValue = "unknown" | "yes" | "no";

function toSterilizedFormValue(value: boolean | null | undefined): SterilizedFormValue {
  if (value === true) {
    return "yes";
  }

  if (value === false) {
    return "no";
  }

  return "unknown";
}

function fromSterilizedFormValue(value: SterilizedFormValue) {
  if (value === "yes") {
    return true;
  }

  if (value === "no") {
    return false;
  }

  return null;
}

function formatSterilizedLabel(value: boolean | null) {
  if (value === true) {
    return "Esterilizada";
  }

  if (value === false) {
    return "No esterilizada";
  }

  return "Esterilizacion pendiente";
}

type PickedDocument = {
  fileName: string;
  mimeType: string | null;
  uri: string;
};

type DocumentFormState = {
  expirationWarningDays: number;
  expiresAt: string;
  hasExpiration: boolean;
  issuedAt: string;
  title: string;
  documentType: PetDocumentType;
  selectedDocument: PickedDocument | null;
};

const emptyDocumentForm: DocumentFormState = {
  expirationWarningDays: 30,
  expiresAt: "",
  hasExpiration: false,
  issuedAt: "",
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

function formatMonthYearLabel(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("es-PA", {
    month: "long",
    year: "numeric"
  });
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

function BirthDatePickerField({
  isOpen,
  label = "Fecha de nacimiento",
  onChange,
  onToggle,
  value,
  maxDate
}: {
  isOpen: boolean;
  label?: string;
  maxDate?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  value: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = value || today;
  const selectedDateLabel = value ? formatShortDate(value) : "Seleccionar fecha";
  const [visibleDate, setVisibleDate] = useState(selectedDate);

  useEffect(() => {
    if (isOpen) {
      setVisibleDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
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
          <View style={{ borderBottomWidth: 1, borderBottomColor: "rgba(15,23,42,0.06)", flexDirection: "row", gap: 8, justifyContent: "space-between", padding: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisibleDate(shiftDateYear(visibleDate, -1, undefined, maxDate))}
              style={{ borderColor: "rgba(0,122,107,0.18)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }}
            >
              <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>Año anterior</Text>
            </Pressable>
            <Text style={{ color: colorTokens.ink, flex: 1, fontSize: 12, fontWeight: "900", textAlign: "center" }}>
              {formatMonthYearLabel(visibleDate)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisibleDate(shiftDateYear(visibleDate, 1, undefined, maxDate))}
              style={{ borderColor: "rgba(0,122,107,0.18)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }}
            >
              <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>Año siguiente</Text>
            </Pressable>
          </View>
          <Calendar
            current={visibleDate}
            key={`birth-${visibleDate.slice(0, 7)}`}
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

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDaysUntilDate(date: string) {
  const today = new Date(`${getTodayDateKey()}T00:00:00`);
  const targetDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  return Math.ceil((targetDate.getTime() - today.getTime()) / 86_400_000);
}

function getVaccineSummaryStatus(summary: PetHealthDashboard | null | undefined) {
  if (!summary || summary.vaccineCount === 0) {
    return {
      detail: "Sin registro",
      value: "Sin registro"
    };
  }

  if (!summary.nextVaccineDueDate) {
    return {
      detail: summary.latestVaccineDate ? `Ultima: ${formatShortDate(summary.latestVaccineDate)}. Falta proxima dosis.` : "Falta proxima dosis",
      value: "Revisar"
    };
  }

  const daysUntilDue = getDaysUntilDate(summary.nextVaccineDueDate);

  if (daysUntilDue === null) {
    return {
      detail: `Proxima: ${summary.nextVaccineDueDate}`,
      value: "Revisar"
    };
  }

  if (daysUntilDue < 0) {
    return {
      detail: `Vencio: ${formatShortDate(summary.nextVaccineDueDate)}`,
      value: "Vencida"
    };
  }

  if (daysUntilDue <= 30) {
    return {
      detail: `Proxima: ${formatShortDate(summary.nextVaccineDueDate)}`,
      value: "Por vencer"
    };
  }

  return {
    detail: `Proxima: ${formatShortDate(summary.nextVaccineDueDate)}`,
    value: "Al dia"
  };
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

function getDocumentValidityBadge(document: { expirationWarningDays: number; expiresAt: string | null; hasExpiration: boolean }) {
  const validity = getPetDocumentValidityStatus(document);

  if (validity.status === "no_expiration") {
    return { label: "Sin vencimiento", tone: "neutral" as const };
  }

  if (validity.status === "missing_expiration_date") {
    return { label: "Fecha pendiente", tone: "pending" as const };
  }

  if (validity.status === "expired") {
    return { label: document.expiresAt ? `Vencido ${formatShortDate(document.expiresAt)}` : "Vencido", tone: "pending" as const };
  }

  if (validity.status === "expiring_soon") {
    return { label: validity.daysUntilExpiration === 0 ? "Vence hoy" : `Vence en ${validity.daysUntilExpiration} dias`, tone: "pending" as const };
  }

  return { label: document.expiresAt ? `Vigente hasta ${formatShortDate(document.expiresAt)}` : "Vigente", tone: "active" as const };
}

function getDocumentAttentionText(document: { expirationWarningDays: number; expiresAt: string | null; hasExpiration: boolean; title: string }) {
  const validity = getPetDocumentValidityStatus(document);

  if (validity.status === "expired") {
    return `${document.title} vencio el ${formatShortDate(document.expiresAt)}.`;
  }

  if (validity.status === "expiring_soon") {
    return validity.daysUntilExpiration === 0
      ? `${document.title} vence hoy.`
      : `${document.title} vence en ${validity.daysUntilExpiration} dias.`;
  }

  if (validity.status === "missing_expiration_date") {
    return `${document.title} tiene vencimiento sin fecha registrada.`;
  }

  return null;
}

export function PetsWorkspace({
  activePanel = "detalle",
  contextPetId,
  enabled,
  ownerReminders = [],
  onContextChange,
  onPanelChange
}: {
  activePanel?: PetHubPanel;
  contextPetId?: Uuid | null;
  enabled: boolean;
  ownerReminders?: Pick<Reminder, "dueAt" | "id" | "petId" | "reminderType" | "status" | "title">[];
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
    selectPet,
    refresh,
    runAction
  } = usePetsWorkspace(enabled);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [petView, setPetView] = useState<PetWorkspaceView>("lista");
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);
  const [editingDocumentId, setEditingDocumentId] = useState<Uuid | null>(null);
  const [activeDocumentType, setActiveDocumentType] = useState<PetDocumentType>(petDocumentTypeOrder[0]);
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
  const [openDocumentDatePicker, setOpenDocumentDatePicker] = useState<"expiresAt" | "issuedAt" | null>(null);
  const [isBirthDatePickerOpen, setIsBirthDatePickerOpen] = useState(false);
  const [petMemoryConfirmationId, setPetMemoryConfirmationId] = useState<Uuid | null>(null);
  const pendingContextPetIdRef = useRef<Uuid | null>(null);
  const onContextChangeRef = useRef(onContextChange);
  const lastReportedContextRef = useRef<{ householdId: Uuid | null; petId: Uuid | null }>({ householdId: null, petId: null });
  const manualContextChangeRef = useRef(false);

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
  const selectedPetPendingReminders = useMemo(
    () =>
      ownerReminders
        .filter((reminder) => reminder.petId === selectedPetDetail?.pet.id && reminder.status === "pending")
        .sort((firstReminder, secondReminder) => new Date(firstReminder.dueAt).getTime() - new Date(secondReminder.dueAt).getTime())
        .slice(0, 3),
    [ownerReminders, selectedPetDetail?.pet.id]
  );

  useEffect(() => {
    onContextChangeRef.current = onContextChange;
  }, [onContextChange]);

  useEffect(() => {
    const lastReportedContext = lastReportedContextRef.current;
    const contextPetExists = contextPetId ? pets.some((pet) => pet.id === contextPetId) : false;

    if (contextPetExists && selectedPetId !== contextPetId && !manualContextChangeRef.current) {
      return;
    }

    if (lastReportedContext.householdId === selectedHouseholdId && lastReportedContext.petId === selectedPetId) {
      return;
    }

    manualContextChangeRef.current = false;
    lastReportedContextRef.current = { householdId: selectedHouseholdId, petId: selectedPetId };
    onContextChangeRef.current?.({ householdId: selectedHouseholdId, petId: selectedPetId });
  }, [contextPetId, pets, selectedHouseholdId, selectedPetId]);

  useEffect(() => {
    if (!enabled || !contextPetId || !pets.some((pet) => pet.id === contextPetId)) {
      pendingContextPetIdRef.current = null;
      return;
    }

    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setIsBirthDatePickerOpen(false);
    setIsDocumentFormOpen(false);
    setPetView("detalle");
    onPanelChange?.("detalle");

    const isSelectedContextLoaded = selectedPetId === contextPetId && selectedPetDetail?.pet.id === contextPetId;

    if (isSelectedContextLoaded) {
      pendingContextPetIdRef.current = null;
      return;
    }

    if (pendingContextPetIdRef.current !== contextPetId) {
      pendingContextPetIdRef.current = contextPetId;
      void selectPet(contextPetId).finally(() => {
        if (pendingContextPetIdRef.current === contextPetId) {
          pendingContextPetIdRef.current = null;
        }
      });
    }
  }, [contextPetId, enabled, pets, selectedPetDetail?.pet.id, selectedPetId]);

  const openCreatePet = () => {
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setIsBirthDatePickerOpen(false);
    setPetMemoryConfirmationId(null);
    setPetView("crear");
    onPanelChange?.("detalle");
  };

  const openEditPet = (pet: (typeof pets)[number]) => {
    setEditingPetId(pet.id);
    setPetMemoryConfirmationId(null);
    setPetForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      sex: pet.sex,
      birthDate: pet.birthDate ?? "",
      isSterilized: pet.isSterilized,
      notes: pet.notes ?? ""
    });
    setIsBirthDatePickerOpen(false);
    setPetView("editar");
    onPanelChange?.("detalle");
  };

  const selectActivePet = async (petId: Uuid) => {
    manualContextChangeRef.current = true;
    await selectPet(petId);
  };

  const openPetDetail = (petId: Uuid) => {
    void selectActivePet(petId);
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
    setPetMemoryConfirmationId(null);
    setPetView(selectedPetId ? "detalle" : "lista");
  };

  const closeDocumentForm = () => {
    setDocumentForm(emptyDocumentForm);
    setEditingDocumentId(null);
    setIsDocumentFormOpen(false);
    setOpenDocumentDatePicker(null);
  };

  const openDocumentValidityEditor = (document: (typeof selectedDocuments)[number]) => {
    setActiveDocumentType(document.documentType);
    setEditingDocumentId(document.id);
    setDocumentForm({
      documentType: document.documentType,
      expirationWarningDays: document.expirationWarningDays,
      expiresAt: document.expiresAt ?? "",
      hasExpiration: document.hasExpiration,
      issuedAt: document.issuedAt ?? "",
      selectedDocument: null,
      title: document.title
    });
    setOpenDocumentDatePicker(null);
    setIsDocumentFormOpen(true);
  };

  const selectedPet = selectedPetDetail?.pet ?? pets.find((pet) => pet.id === selectedPetId) ?? null;
  const selectedDocuments = selectedPetDetail?.documents ?? [];
  const isSelectedPetInMemory = selectedPet?.status === "in_memory";
  const contextPetIsMissing = Boolean(contextPetId) && !isLoading && !pets.some((pet) => pet.id === contextPetId);
  const contextPetIsLoading =
    Boolean(contextPetId) &&
    !contextPetIsMissing &&
    (isLoading || pendingContextPetIdRef.current === contextPetId || (selectedPetId === contextPetId && selectedPetDetail?.pet.id !== contextPetId));

  useEffect(() => {
    if (!enabled || isLoading || !contextPetId || pets.some((pet) => pet.id === contextPetId)) {
      return;
    }

    pendingContextPetIdRef.current = null;
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setIsBirthDatePickerOpen(false);
    setIsDocumentFormOpen(false);
    setPetMemoryConfirmationId(null);
    setPetView(selectedPetId ? "detalle" : "lista");
    onPanelChange?.("detalle");
    onContextChangeRef.current?.({ householdId: selectedHouseholdId, petId: selectedPetId ?? null });
  }, [contextPetId, enabled, isLoading, pets, selectedHouseholdId, selectedPetId, onPanelChange]);

  useEffect(() => {
    if (!isSelectedPetInMemory || activePanel !== "recordatorios") {
      return;
    }

    setPetView("detalle");
    onPanelChange?.("detalle");
  }, [activePanel, isSelectedPetInMemory, onPanelChange]);

  const updatePetMemoryStatus = (petId: Uuid, status: "active" | "in_memory") => {
    clearMessages();
    void runAction(
      () =>
        getMobilePetsApiClient().setPetMemoryStatus(petId, {
          status
        }),
      status === "in_memory" ? "Mascota marcada En memoria. Su historial queda conservado." : "Mascota reactivada.",
      false
    ).then(async () => {
      setPetMemoryConfirmationId(null);
      await refresh();
      await selectActivePet(petId);
    });
  };
  const uploadPickedPetAvatar = (petId: Uuid, asset: { fileName?: string | null; mimeType?: string | null; uri: string }) => {
    clearMessages();
    void runAction(
      async () => {
        const response = await fetch(asset.uri);
        const fileBytes = await response.arrayBuffer();

        return getMobilePetsApiClient().uploadPetAvatar(petId, {
          fileName: asset.fileName ?? `pet-avatar-${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? "image/jpeg",
          fileBytes
        });
      },
      "Foto de mascota actualizada.",
      false
    ).then(async () => {
      await refresh();
      await selectActivePet(petId);
    });
  };

  const choosePetAvatarFromGallery = (petId: Uuid) => {
    void ImagePicker.requestMediaLibraryPermissionsAsync().then((permission) => {
      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tus fotos para elegir una imagen de la mascota.");
        return;
      }

      void ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82
      }).then((result) => {
        const asset = result.assets?.[0];

        if (result.canceled || !asset) {
          return;
        }

        uploadPickedPetAvatar(petId, asset);
      });
    });
  };

  const takePetAvatarPhoto = (petId: Uuid) => {
    void ImagePicker.requestCameraPermissionsAsync().then((permission) => {
      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Necesitamos permiso de camara para tomar la foto de la mascota desde la app.");
        return;
      }

      void ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82
      }).then((result) => {
        const asset = result.assets?.[0];

        if (result.canceled || !asset) {
          return;
        }

        uploadPickedPetAvatar(petId, asset);
      });
    });
  };

  const uploadPetAvatar = (petId: Uuid) => {
    Alert.alert("Foto de mascota", "Elige como quieres actualizar la foto.", [
      { text: "Tomar foto", onPress: () => takePetAvatarPhoto(petId) },
      { text: "Galeria", onPress: () => choosePetAvatarFromGallery(petId) },
      { style: "cancel", text: "Cancelar" }
    ]);
  };
  const selectedPetAge = selectedPet ? formatPetAge(selectedPet.birthDate) : "Edad pendiente";
  const selectedPetHome = selectedHousehold?.name ?? "Hogar principal";
  const selectedPetBreed = selectedPet ? getPetDescription(selectedPet) : "Mascota";
  const vaccineSummaryStatus = getVaccineSummaryStatus(selectedPetHealthSummary);
  const allergyCount = selectedPetHealthSummary?.allergyCount ?? 0;
  const conditionCount = selectedPetHealthSummary?.conditionCount ?? 0;
  const latestDocuments = selectedDocuments.slice(0, 3);
  const activeDocumentGroup = documentGroups.find((group) => group.documentType === activeDocumentType) ?? {
    documentType: activeDocumentType,
    documents: []
  };
  const documentAttentionItems = selectedDocuments
    .map((document) => ({
      document,
      text: getDocumentAttentionText(document),
      validity: getPetDocumentValidityStatus(document)
    }))
    .filter((item) => item.text)
    .sort((left, right) => {
      const priority = {
        expired: 0,
        expiring_soon: 1,
        missing_expiration_date: 2,
        no_expiration: 3,
        valid: 4
      } as const;

      return priority[left.validity.status] - priority[right.validity.status];
    });

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
        {contextPetIsLoading ? (
          <Notice message="Estamos abriendo la mascota seleccionada y conservando el contexto del hogar." tone="info" />
        ) : null}
        {contextPetIsMissing ? (
          <Notice
            message="La mascota seleccionada desde otra seccion ya no esta disponible en este hogar. Elige una mascota de la lista para continuar."
            tone="error"
          />
        ) : null}

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
                    {pet.avatarUrl ? (
                      <Image source={{ uri: pet.avatarUrl }} style={{ borderRadius: 24, height: 48, width: 48 }} />
                    ) : (
                      <Text style={{ color: isSelected ? "#0f766e" : "#475569", fontSize: 18, fontWeight: "900" }}>
                        {getPetInitial(pet.name)}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text numberOfLines={1} style={{ color: "#111827", fontSize: 14, fontWeight: "900" }}>{pet.name}</Text>
                    <Text numberOfLines={1} style={{ color: "#0f766e", fontSize: 11, fontWeight: "700" }}>{getPetDescription(pet)}</Text>
                    <Text numberOfLines={1} style={{ color: "#64748b", fontSize: 11 }}>{formatPetAge(pet.birthDate)}</Text>
                    {pet.status === "in_memory" ? <Text style={{ color: "#7c3aed", fontSize: 9, fontWeight: "900" }}>En memoria</Text> : null}
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

        {!householdSnapshot?.households.length ? (
          <Text style={{ color: colorTokens.muted }}>Primero crea un hogar para empezar a registrar mascotas.</Text>
        ) : null}

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
            const isOperationalMemoryPanel = isSelectedPetInMemory && option.value === "recordatorios";

            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  if (isOperationalMemoryPanel) {
                    clearMessages();
                    setPetMemoryConfirmationId(null);
                    setPetView("detalle");
                    onPanelChange?.("detalle");
                    return;
                  }

                  setPetView("detalle");
                  onPanelChange?.(option.value);
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderBottomWidth: isActive ? 2 : 0,
                  borderBottomColor: "#0f9f8f",
                  gap: 4,
                  opacity: isOperationalMemoryPanel ? 0.55 : 1,
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
                  <ChoiceBar<SterilizedFormValue>
                    onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, isSterilized: fromSterilizedFormValue(value) }))}
                    options={[
                      { label: "Sin indicar", value: "unknown" },
                      { label: "Esterilizada", value: "yes" },
                      { label: "No esterilizada", value: "no" }
                    ]}
                    value={toSterilizedFormValue(petForm.isSterilized)}
                  />
                  <BirthDatePickerField
                    isOpen={isBirthDatePickerOpen}
                    maxDate={new Date().toISOString().slice(0, 10)}
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
                          isSterilized: petForm.isSterilized ?? null,
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
                            await selectActivePet(pet.id);
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
                          await selectActivePet(pet.id);
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
                          borderColor: isSelectedPetInMemory ? "rgba(124,58,237,0.24)" : "rgba(20,184,166,0.18)",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {selectedPetDetail.pet.avatarUrl ? (
                          <Image
                            source={{ uri: selectedPetDetail.pet.avatarUrl }}
                            style={{ borderRadius: 51, height: 102, width: 102 }}
                          />
                        ) : (
                          <Text style={{ color: "#0f766e", fontSize: 42, fontWeight: "900" }}>{getPetInitial(selectedPetDetail.pet.name)}</Text>
                        )}
                      </View>
                      {canEditSelectedHousehold ? (
                        <Pressable
                          onPress={() => uploadPetAvatar(selectedPetDetail.pet.id)}
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
                        {isSelectedPetInMemory ? (
                          <View
                            style={{
                              borderRadius: 999,
                              backgroundColor: "rgba(124,58,237,0.12)",
                              paddingHorizontal: 7,
                              paddingVertical: 4
                            }}
                          >
                            <Text style={{ color: "#6d28d9", fontSize: 10, fontWeight: "900" }}>En memoria</Text>
                          </View>
                        ) : null}
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
                    <StatusChip label={formatSterilizedLabel(selectedPetDetail.pet.isSterilized)} tone={selectedPetDetail.pet.isSterilized ? "active" : "neutral"} />
                    <StatusChip label={selectedPetDetail.pet.species} tone="active" />
                    <StatusChip label={canEditSelectedHousehold ? "editable" : "solo lectura"} tone={canEditSelectedHousehold ? "active" : "neutral"} />
                    {canEditSelectedHousehold ? (
                      <Pressable
                        onPress={() => openEditPet(selectedPetDetail.pet)}
                        style={{ borderColor: "rgba(15,118,110,0.18)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 }}
                      >
                        <Text style={{ color: "#0f766e", fontSize: 10, fontWeight: "900" }}>Editar datos</Text>
                      </Pressable>
                    ) : null}
                    {canEditSelectedHousehold ? (
                      <Pressable
                        disabled={isSubmitting}
                        onPress={() => {
                          if (isSelectedPetInMemory) {
                            updatePetMemoryStatus(selectedPetDetail.pet.id, "active");
                            return;
                          }

                          setPetMemoryConfirmationId(selectedPetDetail.pet.id);
                        }}
                        style={{
                          borderColor: isSelectedPetInMemory ? "rgba(15,118,110,0.18)" : "rgba(124,58,237,0.22)",
                          borderRadius: 999,
                          borderWidth: 1,
                          opacity: isSubmitting ? 0.65 : 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5
                        }}
                      >
                        <Text style={{ color: isSelectedPetInMemory ? "#0f766e" : "#6d28d9", fontSize: 10, fontWeight: "900" }}>
                          {isSelectedPetInMemory ? "Reactivar" : "Marcar En memoria"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {petMemoryConfirmationId === selectedPetDetail.pet.id ? (
                    <View
                      style={{
                        borderColor: "rgba(124,58,237,0.18)",
                        borderRadius: 16,
                        borderWidth: 1,
                        backgroundColor: "rgba(124,58,237,0.08)",
                        gap: 10,
                        padding: 12
                      }}
                    >
                      <Text style={{ color: "#4c1d95", fontSize: 13, fontWeight: "900" }}>Confirmar estado En memoria</Text>
                      <Text style={{ color: "#5b21b6", fontSize: 11, fontWeight: "700", lineHeight: 16 }}>
                        Esta accion coloca a {selectedPetDetail.pet.name} en un lugar especial del hogar, dedicado a nuestros companeros que ya no estan con nosotros. Su perfil, documentos, salud e historial se conservaran con cuidado, y no aparecera en nuevas reservas.
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Pressable
                          disabled={isSubmitting}
                          onPress={() => updatePetMemoryStatus(selectedPetDetail.pet.id, "in_memory")}
                          style={{
                            backgroundColor: "#6d28d9",
                            borderRadius: 999,
                            opacity: isSubmitting ? 0.65 : 1,
                            paddingHorizontal: 12,
                            paddingVertical: 8
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>Confirmar En memoria</Text>
                        </Pressable>
                        <Pressable
                          disabled={isSubmitting}
                          onPress={() => setPetMemoryConfirmationId(null)}
                          style={{
                            backgroundColor: "#ffffff",
                            borderColor: "rgba(124,58,237,0.18)",
                            borderRadius: 999,
                            borderWidth: 1,
                            opacity: isSubmitting ? 0.65 : 1,
                            paddingHorizontal: 12,
                            paddingVertical: 8
                          }}
                        >
                          <Text style={{ color: "#5b21b6", fontSize: 11, fontWeight: "900" }}>Cancelar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                  {isSelectedPetInMemory ? (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.18)", borderWidth: 1, gap: 8, padding: 12 }}>
                      <Text style={{ color: "#4c1d95", fontSize: 12, fontWeight: "900" }}>
                        Modo recuerdo del hogar
                      </Text>
                      <Text style={{ color: "#5b21b6", fontSize: 11, fontWeight: "800", lineHeight: 16 }}>
                        Este perfil queda en un espacio especial. Conserva documentos, salud e historial, pero no aparecera en nuevas reservas ni en recordatorios operativos.
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {["Historial conservado", "Reservas bloqueadas", "Recordatorios pausados"].map((label) => (
                          <View
                            key={label}
                            style={{
                              borderRadius: 999,
                              backgroundColor: "rgba(255,255,255,0.72)",
                              borderColor: "rgba(124,58,237,0.16)",
                              borderWidth: 1,
                              paddingHorizontal: 8,
                              paddingVertical: 5
                            }}
                          >
                            <Text style={{ color: "#5b21b6", fontSize: 9, fontWeight: "900" }}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  {selectedPetDetail.pet.notes ? (
                    <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 17 }}>{selectedPetDetail.pet.notes}</Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    ...(isSelectedPetInMemory ? [] : [{ icon: "heart" as const, label: "Registrar salud", onPress: () => onPanelChange?.("salud"), tint: "#0f9f8f" }]),
                    { icon: "file" as const, label: "Cargar documento", onPress: () => onPanelChange?.("documentos"), tint: "#2563eb" },
                    ...(isSelectedPetInMemory ? [] : [{ icon: "bell" as const, label: "Crear recordatorio", onPress: () => onPanelChange?.("recordatorios"), tint: "#f97316" }])
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
                        value: isHealthSummaryLoading ? "Cargando" : vaccineSummaryStatus.value,
                        detail: isHealthSummaryLoading ? "Validando vigencia" : vaccineSummaryStatus.detail
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
                  <View style={{ gap: 8 }}>
                    {isSelectedPetInMemory ? (
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
                          <Text style={{ color: "#111827", fontSize: 12, fontWeight: "900" }}>Recordatorios pausados</Text>
                          <Text style={{ color: "#64748b", fontSize: 10 }}>
                            El historial se conserva, pero no se crean tareas operativas para esta mascota.
                          </Text>
                        </View>
                      </View>
                    ) : selectedPetPendingReminders.length ? (
                      selectedPetPendingReminders.map((reminder) => (
                        <Pressable
                          key={reminder.id}
                          onPress={() => onPanelChange?.("recordatorios")}
                          style={{
                            alignItems: "center",
                            backgroundColor: "rgba(255,247,237,0.78)",
                            borderColor: "rgba(249,115,22,0.16)",
                            borderRadius: 14,
                            borderWidth: 1,
                            flexDirection: "row",
                            gap: 10,
                            padding: 10
                          }}
                        >
                          <View
                            style={{
                              alignItems: "center",
                              backgroundColor: "rgba(249,115,22,0.12)",
                              borderRadius: 12,
                              height: 34,
                              justifyContent: "center",
                              width: 34
                            }}
                          >
                            <PetLineIcon color="#f97316" name="calendar" size={16} />
                          </View>
                          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                            <Text numberOfLines={1} style={{ color: "#111827", fontSize: 12, fontWeight: "900" }}>
                              {reminder.title}
                            </Text>
                            <Text numberOfLines={1} style={{ color: "#64748b", fontSize: 10 }}>
                              {reminderTypeLabels[reminder.reminderType]} - {formatShortDate(reminder.dueAt)}
                            </Text>
                          </View>
                          <PetLineIcon color="#94a3b8" name="chevron" size={14} />
                        </Pressable>
                      ))
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            height: 34,
                            width: 34,
                            borderRadius: 12,
                            backgroundColor: "rgba(15,118,110,0.1)",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <PetLineIcon color="#0f766e" name="calendar" size={16} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: "#111827", fontSize: 12, fontWeight: "900" }}>Sin recordatorios pendientes</Text>
                          <Text style={{ color: "#64748b", fontSize: 10 }}>
                            Crea un recordatorio para {selectedPetDetail.pet.name} cuando necesites seguimiento.
                          </Text>
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
                          <Text style={{ color: "#0f766e", fontSize: 10, fontWeight: "900" }}>Crear</Text>
                        </Pressable>
                      </View>
                    )}
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
                <View style={{ borderRadius: 16, backgroundColor: documentAttentionItems.length ? "rgba(255,247,237,0.92)" : "rgba(240,253,250,0.92)", padding: 10, gap: 6 }}>
                  <Text style={{ color: "#111827", fontSize: 12, fontWeight: "900" }}>Documentos que requieren atencion</Text>
                  {documentAttentionItems.length ? (
                    documentAttentionItems.slice(0, 3).map((item) => (
                      <View key={item.document.id} style={{ gap: 2 }}>
                        <Text style={{ color: "#7c2d12", fontSize: 11, fontWeight: "800" }}>{item.text}</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10 }}>{petDocumentTypeLabels[item.document.documentType]}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "800" }}>Todos los documentos estan al dia.</Text>
                  )}
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
                              setEditingDocumentId(null);
                              setOpenDocumentDatePicker(null);
                              setDocumentForm({ ...emptyDocumentForm, documentType: group.documentType });
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
                        {editingDocumentId ? "Editar vigencia" : "Nuevo documento"} - {petDocumentTypeLabels[documentForm.documentType]}
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
                      <View style={{ borderRadius: 14, backgroundColor: "#ffffff", padding: 10, gap: 8 }}>
                        <Text style={{ color: "#1c1917", fontSize: 11, fontWeight: "900" }}>Vigencia del documento</Text>
                        <ChoiceBar<"no" | "yes">
                          onChange={(value) =>
                            setDocumentForm((currentForm) => ({
                              ...currentForm,
                              expiresAt: value === "yes" ? currentForm.expiresAt : "",
                              hasExpiration: value === "yes"
                            }))
                          }
                          options={[
                            { label: "Sin vencimiento", value: "no" },
                            { label: "Tiene vencimiento", value: "yes" }
                          ]}
                          value={documentForm.hasExpiration ? "yes" : "no"}
                        />
                        <BirthDatePickerField
                          isOpen={openDocumentDatePicker === "issuedAt"}
                          label="Fecha de emision"
                          onChange={(value) => {
                            setDocumentForm((currentForm) => ({ ...currentForm, issuedAt: value }));
                            setOpenDocumentDatePicker(null);
                          }}
                          onToggle={() => setOpenDocumentDatePicker((currentValue) => (currentValue === "issuedAt" ? null : "issuedAt"))}
                          value={documentForm.issuedAt}
                        />
                        {documentForm.hasExpiration ? (
                          <>
                            <BirthDatePickerField
                              isOpen={openDocumentDatePicker === "expiresAt"}
                              label="Fecha de vencimiento"
                              onChange={(value) => {
                                setDocumentForm((currentForm) => ({ ...currentForm, expiresAt: value }));
                                setOpenDocumentDatePicker(null);
                              }}
                              onToggle={() => setOpenDocumentDatePicker((currentValue) => (currentValue === "expiresAt" ? null : "expiresAt"))}
                              value={documentForm.expiresAt}
                            />
                            <ChoiceBar<"7" | "15" | "30" | "60" | "90">
                              onChange={(value) =>
                                setDocumentForm((currentForm) => ({ ...currentForm, expirationWarningDays: Number(value) }))
                              }
                              options={(["7", "15", "30", "60", "90"] as const).map((days) => ({ label: `${days} dias`, value: days }))}
                              value={String(documentForm.expirationWarningDays) as "7" | "15" | "30" | "60" | "90"}
                            />
                          </>
                        ) : null}
                      </View>
                    {!editingDocumentId && documentForm.selectedDocument ? (
                      <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 11 }}>
                        Archivo: {documentForm.selectedDocument.fileName}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {!editingDocumentId ? (
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
                      ) : null}
                      <CompactActionButton
                        disabled={isSubmitting}
                        label={editingDocumentId ? "Guardar vigencia" : "Cargar documento"}
                        onPress={() => {
                          clearMessages();
                          const selectedDocument = documentForm.selectedDocument;

                          void runAction(
                            async () => {
                              if (!documentForm.title.trim()) {
                                throw new Error("Indica un titulo para el documento.");
                              }

                              if (documentForm.hasExpiration && !documentForm.expiresAt) {
                                throw new Error("Indica la fecha de vencimiento del documento.");
                              }

                              if (documentForm.issuedAt && documentForm.expiresAt && documentForm.expiresAt < documentForm.issuedAt) {
                                throw new Error("La fecha de vencimiento no puede ser anterior a la fecha de emision.");
                              }

                              if (editingDocumentId) {
                                return getMobilePetsApiClient().updatePetDocument(editingDocumentId, {
                                  documentType: documentForm.documentType,
                                  expirationWarningDays: documentForm.expirationWarningDays,
                                  expiresAt: documentForm.hasExpiration ? documentForm.expiresAt : null,
                                  hasExpiration: documentForm.hasExpiration,
                                  issuedAt: documentForm.issuedAt || null,
                                  title: documentForm.title.trim()
                                });
                              }

                              if (!selectedDocument) {
                                throw new Error("Elige un documento antes de cargarlo.");
                              }

                              const response = await fetch(selectedDocument.uri);
                              const fileBytes = await response.arrayBuffer();

                              return getMobilePetsApiClient().uploadPetDocument(selectedPetDetail.pet.id, {
                                title: documentForm.title.trim() || selectedDocument.fileName,
                                documentType: documentForm.documentType,
                                expirationWarningDays: documentForm.expirationWarningDays,
                                expiresAt: documentForm.hasExpiration ? documentForm.expiresAt : null,
                                fileName: selectedDocument.fileName,
                                hasExpiration: documentForm.hasExpiration,
                                issuedAt: documentForm.issuedAt || null,
                                mimeType: selectedDocument.mimeType,
                                fileBytes
                              });
                            },
                            editingDocumentId ? "Vigencia actualizada." : "Documento cargado.",
                            false
                          ).then(async () => {
                            closeDocumentForm();
                            await refresh();
                            await selectActivePet(selectedPetDetail.pet.id);
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
                    activeDocumentGroup.documents.map((document, index) => {
                      const validityBadge = getDocumentValidityBadge(document);

                      return (
                        <View key={document.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 10, gap: 4 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#1c1917", flex: 1 }}>{document.title}</Text>
                            <StatusChip label={validityBadge.label} tone={validityBadge.tone} />
                          </View>
                          <Text numberOfLines={1} style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "800" }}>
                            {getDocumentStatus(document.documentType, index)} - {document.hasExpiration ? `Aviso ${document.expirationWarningDays} dias antes` : "No genera alerta"}
                          </Text>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>{document.fileName}</Text>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>{formatFileSize(document.fileSizeBytes)}</Text>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>{document.mimeType ?? "Tipo de archivo desconocido"}</Text>
                          {canEditSelectedHousehold ? (
                            <View style={{ alignItems: "flex-start", paddingTop: 3 }}>
                              <CompactActionButton
                                disabled={isSubmitting}
                                label="Editar vigencia"
                                onPress={() => openDocumentValidityEditor(document)}
                                tone="secondary"
                              />
                            </View>
                          ) : null}
                        </View>
                      );
                    })
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



