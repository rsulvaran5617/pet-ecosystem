import * as DocumentPicker from "expo-document-picker";
import {
  bookingStatusLabels,
  providerApprovalDocumentTypeLabels,
  providerApprovalDocumentTypeOrder,
  providerApprovalStatusLabels,
  providerDayOfWeekLabels,
  providerDayOfWeekOrder,
  providerServiceCategoryLabels,
  providerServiceCategoryOrder
} from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type {
  BookingMode,
  CreateProviderAvailabilityRuleInput,
  ProviderApprovalDocumentType,
  ProviderServiceCategory,
  UpdateProviderOrganizationInput,
  UpdateProviderAvailabilityRuleInput,
  UpdateProviderServiceInput,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { getMobileProvidersApiClient } from "../../core/services/supabase-mobile";
import { BookingOperationsTimeline } from "../../bookings/components/BookingOperationsTimeline";
import { useProvidersWorkspace } from "../hooks/useProvidersWorkspace";

LocaleConfig.locales.es = {
  monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  monthNamesShort: ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."],
  dayNames: ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"],
  dayNamesShort: ["Dom.", "Lun.", "Mar.", "Mie.", "Jue.", "Vie.", "Sab."],
  today: "Hoy"
};
LocaleConfig.defaultLocale = "es";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colorTokens.line,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 12,
  backgroundColor: colorTokens.surface,
  color: colorTokens.ink
} as const;

type OrganizationFormState = Required<UpdateProviderOrganizationInput>;
type PublicProfileFormState = {
  headline: string;
  bio: string;
  isPublic: boolean;
};
type ServiceFormState = {
  id?: Uuid;
  name: string;
  category: ProviderServiceCategory;
  shortDescription: string;
  speciesServedText: string;
  durationMinutes: string;
  bookingMode: BookingMode;
  basePrice: string;
  currencyCode: string;
  cancellationWindowHours: string;
  isPublic: boolean;
  isActive: boolean;
};
type DisponibilidadFormState = {
  id?: Uuid;
  serviceId: Uuid | "";
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startsAt: string;
  endsAt: string;
  capacity: string;
  isActive: boolean;
};
type PickedDocument = {
  fileName: string;
  mimeType: string | null;
  uri: string;
};
type DocumentFormState = {
  title: string;
  documentType: ProviderApprovalDocumentType;
  selectedDocument: PickedDocument | null;
};
export type ProviderWorkspaceSection = "inicio" | "negocio" | "servicios" | "disponibilidad" | "reservas" | "estado";
type OrganizationView = "lista" | "crear" | "editar";
type OrganizationListFilter = "all" | "active" | "approved" | "ready";

const emptyOrganizationForm: OrganizationFormState = {
  name: "",
  slug: "",
  city: "",
  countryCode: "PA",
  isPublic: true
};

const emptyPublicProfileForm: PublicProfileFormState = {
  headline: "",
  bio: "",
  isPublic: true
};

const emptyServiceForm: ServiceFormState = {
  name: "",
  category: "walking",
  shortDescription: "",
  speciesServedText: "",
  durationMinutes: "",
  bookingMode: "instant",
  basePrice: "0",
  currencyCode: "USD",
  cancellationWindowHours: "24",
  isPublic: true,
  isActive: true
};

const emptyDisponibilidadForm: DisponibilidadFormState = {
  serviceId: "",
  dayOfWeek: 1,
  startsAt: "09:00",
  endsAt: "17:00",
  capacity: "1",
  isActive: true
};

const emptyDocumentForm: DocumentFormState = {
  title: "",
  documentType: "other",
  selectedDocument: null
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getDayOfWeekFromDateKey(dateKey: string) {
  return parseDateKey(dateKey).getDay() as DisponibilidadFormState["dayOfWeek"];
}

function formatAvailabilityDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("es-PA", {
    day: "numeric",
    month: "long",
    weekday: "long"
  }).format(parseDateKey(dateKey));
}

function getAvailabilityDotColor(rules: Array<{ capacity: number; isActive: boolean }>) {
  const activeRules = rules.filter((rule) => rule.isActive);

  if (!activeRules.length) {
    return "#ef4444";
  }

  const maxCapacity = Math.max(...activeRules.map((rule) => rule.capacity));

  if (maxCapacity === 1) {
    return "#f97316";
  }

  if (maxCapacity <= 2) {
    return "#86efac";
  }

  return colorTokens.accentDark;
}

function normalizeSpeciesServed(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((segment) => segment.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatFileSize(fileSizeBytes: number) {
  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`;
  }

  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function displayBookingValue(value: string, fallback: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue || normalizedValue.startsWith("unknown")) {
    return fallback;
  }

  return value;
}

function getProviderInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function validateAvailabilityRuleForm(form: DisponibilidadFormState) {
  const capacity = Number(form.capacity);

  if (!form.serviceId) {
    return "Selecciona un servicio para configurar horarios.";
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    return "La capacidad debe ser mayor que cero.";
  }

  if (form.startsAt >= form.endsAt) {
    return "La hora final debe ser posterior a la hora inicial.";
  }

  return null;
}

function buildAvailabilityRulePayload(form: DisponibilidadFormState) {
  const validationError = validateAvailabilityRuleForm(form);

  if (validationError) {
    throw new Error(validationError);
  }

  return {
    serviceId: form.serviceId,
    dayOfWeek: form.dayOfWeek,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    capacity: Number(form.capacity),
    isActive: form.isActive
  };
}

function BookingInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2, width: "100%" }}>
      <Text style={{ color: "#78716c", fontSize: 9, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: "#1c1917", fontSize: 11, lineHeight: 15 }}>{value}</Text>
    </View>
  );
}

function Button({ disabled, label, onPress, tone = "primary" }: { disabled?: boolean; label: string; onPress: () => void; tone?: "primary" | "secondary" }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: tone === "primary" ? colorTokens.accent : colorTokens.surface,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(0,151,143,0.26)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: disabled ? 0.65 : 1,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontSize: 11, fontWeight: "900", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function Field({
  helperText,
  inputRef,
  keyboardType = "default",
  label,
  onChange,
  placeholder,
  value
}: {
  helperText?: string;
  inputRef?: Ref<TextInput>;
  keyboardType?: "default" | "numeric";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: "900", textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        ref={inputRef}
        keyboardType={keyboardType}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a8a29e"
        style={inputStyle}
        value={value}
      />
      {helperText ? <Text style={{ color: "#78716c", fontSize: 10, lineHeight: 14 }}>{helperText}</Text> : null}
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
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: "900", textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput multiline numberOfLines={4} onChangeText={onChange} style={[inputStyle, { minHeight: 82, textAlignVertical: "top" }]} value={value} />
    </View>
  );
}

function ChoiceBar<TValue extends string | number>({
  onChange,
  options,
  value
}: {
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isActive ? "rgba(15,118,110,0.3)" : "rgba(28,25,23,0.14)",
              backgroundColor: isActive ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.86)",
              paddingHorizontal: 10,
              paddingVertical: 7
            }}
          >
            <Text style={{ color: isActive ? "#0f766e" : "#1c1917", fontSize: 10, fontWeight: "900" }}>{option.label}</Text>
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
        padding: 10
      }}
    >
      <Text style={{ color: tone === "error" ? "#991b1b" : "#0f766e", fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{message}</Text>
    </View>
  );
}

export function ProvidersWorkspace({
  activeSection = "inicio",
  enabled,
  hasProviderRole,
  providerRoleActive
}: {
  activeSection?: ProviderWorkspaceSection;
  enabled: boolean;
  hasProviderRole: boolean;
  providerRoleActive: boolean;
}) {
  const {
    organizations,
    selectedOrganizationId,
    selectedOrganizationDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    providerBookings,
    selectedProviderBookingDetail,
    clearMessages,
    selectOrganization,
    openProviderBookingDetail,
    approveProviderBooking,
    rejectProviderBooking,
    completeProviderBooking,
    refresh,
    runAction
  } = useProvidersWorkspace(enabled && hasProviderRole);
  const [organizationView, setOrganizationView] = useState<OrganizationView>("lista");
  const [organizationListFilter, setOrganizationListFilter] = useState<OrganizationListFilter>("all");
  const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
  const [publicProfileForm, setPublicProfileForm] = useState(emptyPublicProfileForm);
  const [isPublicProfileFormVisible, setIsPublicProfileFormVisible] = useState(false);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [isServiceFormVisible, setIsServiceFormVisible] = useState(false);
  const serviceNameInputRef = useRef<TextInput>(null);
  const [availabilityForm, setDisponibilidadForm] = useState(emptyDisponibilidadForm);
  const [isAvailabilityFormVisible, setIsAvailabilityFormVisible] = useState(false);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState(toDateKey(new Date()));
  const [selectedAvailabilityDay, setSelectedAvailabilityDay] = useState<DisponibilidadFormState["dayOfWeek"]>(
    getDayOfWeekFromDateKey(toDateKey(new Date()))
  );
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);

  useEffect(() => {
    if (!selectedOrganizationDetail) {
      return;
    }

    setOrganizationForm({
      name: selectedOrganizationDetail.organization.name,
      slug: selectedOrganizationDetail.organization.slug,
      city: selectedOrganizationDetail.organization.city,
      countryCode: selectedOrganizationDetail.organization.countryCode,
      isPublic: selectedOrganizationDetail.organization.isPublic
    });
    setPublicProfileForm({
      headline: selectedOrganizationDetail.publicProfile?.headline ?? "",
      bio: selectedOrganizationDetail.publicProfile?.bio ?? "",
      isPublic: selectedOrganizationDetail.publicProfile?.isPublic ?? true
    });
    setIsPublicProfileFormVisible(false);
    setServiceForm(emptyServiceForm);
    setIsServiceFormVisible(false);
    setDisponibilidadForm({
      ...emptyDisponibilidadForm,
      serviceId: selectedOrganizationDetail.services[0]?.id ?? ""
    });
    setIsAvailabilityFormVisible(false);
    setDocumentForm(emptyDocumentForm);
  }, [selectedOrganizationDetail]);

  const selectedOrganization = selectedOrganizationDetail?.organization ?? null;
  const selectedPublicProfile = selectedOrganizationDetail?.publicProfile ?? null;
  const selectedServicios = selectedOrganizationDetail?.services ?? [];
  const uploadProviderAvatar = (organizationId: Uuid) => {
    void DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: "image/*"
    }).then((result) => {
      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) {
        return;
      }

      clearMessages();
      void runAction(
        async () => {
          const response = await fetch(asset.uri);
          const fileBytes = await response.arrayBuffer();

          return getMobileProvidersApiClient().uploadProviderAvatar(organizationId, {
            fileName: asset.name,
            mimeType: asset.mimeType ?? null,
            fileBytes
          });
        },
        "Foto publica actualizada."
      ).then(async () => {
        await refresh(organizationId);
      });
    });
  };
  const filteredOrganizations = useMemo(
    () =>
      organizations.filter((organization) => {
        if (organizationListFilter === "active") {
          return organization.isPublic;
        }

        if (organizationListFilter === "approved") {
          return organization.approvalStatus === "approved";
        }

        if (organizationListFilter === "ready") {
          return organization.isPublic && organization.approvalStatus === "approved";
        }

        return true;
      }),
    [organizationListFilter, organizations]
  );
  const emptyAvailabilityFormForSelectedService = useMemo(
    () => ({
      ...emptyDisponibilidadForm,
      serviceId: selectedServicios[0]?.id ?? ""
    }),
    [selectedServicios]
  );
  const selectedAvailabilityRules = selectedOrganizationDetail?.availabilityRules ?? [];
  const selectedDocuments = selectedOrganizationDetail?.approvalDocuments ?? [];
  const selectedDayAvailabilityRules = selectedAvailabilityRules
    .filter((rule) => rule.dayOfWeek === selectedAvailabilityDay)
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const availabilityMarkedDates = useMemo(() => {
    const today = parseDateKey(toDateKey(new Date()));
    const marks: Record<
      string,
      {
        dotColor?: string;
        marked?: boolean;
        selected?: boolean;
        selectedColor?: string;
        selectedTextColor?: string;
      }
    > = {};

    for (let dayOffset = -35; dayOffset <= 120; dayOffset += 1) {
      const date = addDays(today, dayOffset);
      const dateKey = toDateKey(date);
      const dayRules = selectedAvailabilityRules.filter((rule) => rule.dayOfWeek === date.getDay());

      if (dayRules.length) {
        marks[dateKey] = {
          dotColor: getAvailabilityDotColor(dayRules),
          marked: true
        };
      }
    }

    marks[selectedAvailabilityDate] = {
      ...(marks[selectedAvailabilityDate] ?? {}),
      selected: true,
      selectedColor: colorTokens.accentDark,
      selectedTextColor: "#ffffff"
    };

    return marks;
  }, [selectedAvailabilityDate, selectedAvailabilityRules]);
  const pendingProviderBookings = providerBookings.filter((booking) => booking.status === "pending_approval");
  const confirmedProviderBookings = providerBookings.filter((booking) => booking.status === "confirmed");
  const completedProviderBookings = providerBookings.filter((booking) => booking.status === "completed");
  const cancelledProviderBookings = providerBookings.filter((booking) => booking.status === "cancelled");
  const publicProviderServices = selectedServicios.filter((service) => service.isPublic);
  const activeProviderServices = selectedServicios.filter((service) => service.isActive);
  const actionableProviderBookings = providerBookings.filter((booking) => booking.status === "pending_approval" || booking.status === "confirmed");
  const todayProviderBookings = providerBookings.filter((booking) => {
    const scheduledAt = new Date(booking.scheduledStartAt);
    const today = new Date();
    return (
      scheduledAt.getFullYear() === today.getFullYear() &&
      scheduledAt.getMonth() === today.getMonth() &&
      scheduledAt.getDate() === today.getDate()
    );
  });
  const dashboardProviderBookings = useMemo(
    () =>
      [...providerBookings]
        .sort((first, second) => new Date(first.scheduledStartAt).getTime() - new Date(second.scheduledStartAt).getTime())
        .slice(0, activeSection === "inicio" ? 3 : 6),
    [activeSection, providerBookings]
  );
  const hasPublishedService = selectedServicios.some((service) => service.isPublic && service.isActive);
  const isMarketplaceVisible =
    selectedOrganization?.approvalStatus === "approved" &&
    Boolean(selectedOrganization?.isPublic) &&
    Boolean(selectedPublicProfile?.isPublic) &&
    hasPublishedService;
  const publicationSteps = useMemo(
    () => [
      { title: "Negocio", detail: "Perfil publico", done: Boolean(selectedPublicProfile) },
      { title: "Servicios", detail: "Oferta activa", done: selectedServicios.length > 0 },
      { title: "Horarios", detail: "Cupos definidos", done: selectedAvailabilityRules.length > 0 },
      { title: "Documentos", detail: "Soporte cargado", done: selectedDocuments.length > 0 }
    ],
    [selectedAvailabilityRules.length, selectedDocuments.length, selectedPublicProfile, selectedServicios.length]
  );
  const missingPublicationSteps = publicationSteps.filter((step) => !step.done).length;
  const recommendedProviderBooking = pendingProviderBookings[0] ?? confirmedProviderBookings[0] ?? dashboardProviderBookings[0] ?? null;
  const showHome = activeSection === "inicio";
  const showOrganization = activeSection === "negocio";
  const showApproval = activeSection === "inicio" || activeSection === "estado";
  const showBookings = activeSection === "inicio" || activeSection === "reservas";
  const showProfile = false;
  const showServices = activeSection === "servicios";
  const showAvailability = activeSection === "disponibilidad";
  const showDocuments = activeSection === "estado";

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 14 }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSectionCard
        eyebrow="Proveedor"
        title={showHome ? "Panel operativo" : "Consola operativa"}
        description={
          showHome
            ? "Resumen operativo del negocio activo."
            : "Gestiona negocio, servicios, horarios y reservas."
        }
      >
        {!hasProviderRole ? (
          <Text style={{ color: colorTokens.muted }}>
            Este espacio permanece bloqueado hasta que el usuario tenga el rol de proveedor provisionado en core.
          </Text>
        ) : (
          <View style={{ gap: 9 }}>
            {!providerRoleActive ? (
              <Notice
                message="Este espacio funciona con cualquier rol de proveedor provisionado, pero cambiar el rol activo a proveedor mantiene la sesion alineada con este contexto."
                tone="info"
              />
            ) : null}

            {showHome ? (
              <View style={{ borderRadius: 18, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900", lineHeight: 17 }}>Resumen de hoy</Text>
                    <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                      {selectedOrganization ? selectedOrganization.name : "Selecciona o crea un negocio para operar"}
                    </Text>
                  </View>
                  <StatusChip label={isMarketplaceVisible ? "Visible" : "No visible"} tone={isMarketplaceVisible ? "active" : "pending"} />
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { label: "Hoy", value: todayProviderBookings.length, tone: todayProviderBookings.length ? "#007a6b" : "#78716c" },
                    { label: "Pendientes", value: pendingProviderBookings.length, tone: pendingProviderBookings.length ? "#f97316" : "#78716c" },
                    { label: "En curso", value: confirmedProviderBookings.length, tone: confirmedProviderBookings.length ? "#007a6b" : "#78716c" },
                    { label: "Servicios", value: selectedServicios.length, tone: selectedServicios.length ? "#007a6b" : "#78716c" }
                  ].map((metric) => (
                    <View
                      key={metric.label}
                      style={{
                        width: "48%",
                        minWidth: 124,
                        flexGrow: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "rgba(148,163,184,0.18)",
                        backgroundColor: "rgba(248,250,252,0.92)",
                        padding: 10,
                        gap: 5
                      }}
                    >
                      <Text style={{ color: metric.tone, fontSize: 20, fontWeight: "900", lineHeight: 22 }}>{metric.value}</Text>
                      <Text style={{ color: "#1c1917", fontSize: 10, fontWeight: "800", lineHeight: 13 }}>{metric.label}</Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    borderRadius: 16,
                    backgroundColor: pendingProviderBookings.length ? "rgba(249,115,22,0.1)" : "rgba(0,122,107,0.08)",
                    borderWidth: 1,
                    borderColor: pendingProviderBookings.length ? "rgba(249,115,22,0.18)" : "rgba(0,122,107,0.16)",
                    padding: 12,
                    gap: 8
                  }}
                >
                  <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                    {pendingProviderBookings.length
                      ? "Solicitudes por aprobar"
                      : confirmedProviderBookings.length
                        ? "Reservas listas para operar"
                        : isMarketplaceVisible
                          ? "Operacion al dia"
                          : "Completa tu publicacion"}
                  </Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                    {pendingProviderBookings.length
                      ? `${pendingProviderBookings.length} reserva(s) esperan respuesta del proveedor.`
                      : confirmedProviderBookings.length
                        ? `${confirmedProviderBookings.length} reserva(s) confirmadas requieren seguimiento operativo.`
                        : isMarketplaceVisible
                          ? "No hay acciones urgentes. Las nuevas reservas apareceran debajo."
                          : "Revisa negocio, servicios, horarios y documentos para aparecer en marketplace."}
                  </Text>
                  {recommendedProviderBooking ? (
                    <View style={{ alignItems: "flex-start" }}>
                      <Button disabled={isSubmitting} label="Ver siguiente detalle" onPress={() => void openProviderBookingDetail(recommendedProviderBooking.id)} />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {showOrganization ? (
            <View style={{ borderRadius: 18, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#1c1917", lineHeight: 17 }}>
                    {organizationView === "lista" ? "Negocio activo" : organizationView === "crear" ? "Crear negocio" : "Editar negocio"}
                  </Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                    Identidad, visibilidad y datos base del proveedor.
                  </Text>
                </View>
                <StatusChip label={`${organizations.length} total`} tone="neutral" />
              </View>

              {organizationView === "lista" ? (
                <>
                  {isLoading && !organizations.length && !selectedOrganizationDetail ? (
                    <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 15 }}>Preparando tus negocios de proveedor...</Text>
                  ) : selectedOrganization ? (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 10 }}>
                      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        <View
                          style={{
                            alignItems: "center",
                            backgroundColor: "rgba(0,122,107,0.1)",
                            borderColor: "rgba(0,122,107,0.18)",
                            borderRadius: 14,
                            borderWidth: 1,
                            height: 48,
                            justifyContent: "center",
                            width: 48
                        }}
                      >
                          {(selectedPublicProfile?.avatarUrl ?? selectedOrganization.avatarUrl) ? (
                            <Image
                              source={{ uri: selectedPublicProfile?.avatarUrl ?? selectedOrganization.avatarUrl ?? "" }}
                              style={{ borderRadius: 14, height: 48, width: 48 }}
                            />
                          ) : (
                            <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>{getProviderInitials(selectedOrganization.name)}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                          <Text numberOfLines={2} style={{ color: "#1c1917", fontSize: 9, fontWeight: "900", lineHeight: 12 }}>
                            {selectedOrganization.name}
                          </Text>
                          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 9, lineHeight: 12 }}>
                            {selectedOrganization.city} · {selectedOrganization.slug}
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            <StatusChip
                              label={providerApprovalStatusLabels[selectedOrganization.approvalStatus]}
                              tone={
                                selectedOrganization.approvalStatus === "approved"
                                  ? "active"
                                  : selectedOrganization.approvalStatus === "rejected"
                                    ? "neutral"
                                    : "pending"
                              }
                            />
                            <View
                              style={{
                                backgroundColor: "rgba(255,255,255,0.88)",
                                borderColor: "rgba(28,25,23,0.08)",
                                borderWidth: 1,
                                borderRadius: 999,
                                paddingHorizontal: 10,
                                paddingVertical: 6
                              }}
                            >
                              <Text style={{ color: isMarketplaceVisible ? "#007a6b" : "#44403c", fontSize: 12, fontWeight: "700" }}>
                                {isMarketplaceVisible ? "visible" : "no visible"}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Pressable
                          accessibilityLabel="Editar negocio"
                          disabled={isSubmitting}
                          onPress={() => {
                            setOrganizationView("editar");
                          }}
                          style={{
                            alignItems: "center",
                            backgroundColor: colorTokens.accentDark,
                            borderColor: colorTokens.accentDark,
                            borderRadius: 999,
                            borderWidth: 1,
                            height: 34,
                            justifyContent: "center",
                            opacity: isSubmitting ? 0.65 : 1,
                            width: 34
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900" }}>✎</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.84)", padding: 12, gap: 10 }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Todavia no hay negocios</Text>
                      <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 15 }}>
                        Crea el primer negocio para completar perfil, servicios, disponibilidad y revision administrativa.
                      </Text>
                      <Button
                        disabled={isSubmitting}
                        label="Crear negocio"
                        onPress={() => {
                          clearMessages();
                          setOrganizationForm(emptyOrganizationForm);
                          setOrganizationView("crear");
                        }}
                      />
                    </View>
                  )}

                  {selectedOrganization ? (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>Perfil publico</Text>
                          <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>Como aparece en marketplace.</Text>
                        </View>
                        <StatusChip label={publicProfileForm.isPublic ? "Publico" : "Oculto"} tone={publicProfileForm.isPublic ? "active" : "neutral"} />
                      </View>
                      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        <View
                          style={{
                            alignItems: "center",
                            backgroundColor: "rgba(0,122,107,0.1)",
                            borderColor: "rgba(0,122,107,0.18)",
                            borderRadius: 14,
                            borderWidth: 1,
                            height: 42,
                            justifyContent: "center",
                            width: 42
                          }}
                        >
                          {selectedPublicProfile?.avatarUrl ? (
                            <Image
                              source={{ uri: selectedPublicProfile.avatarUrl }}
                              style={{ borderRadius: 21, height: 42, width: 42 }}
                            />
                          ) : (
                            <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>
                              {getProviderInitials(publicProfileForm.headline || selectedOrganization.name)}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ color: "#1c1917", fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
                            {publicProfileForm.headline || selectedOrganization.name}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel={selectedPublicProfile ? "Cambiar foto publica" : "Crear perfil publico antes de cargar foto"}
                          onPress={() => {
                            if (selectedPublicProfile) {
                              uploadProviderAvatar(selectedOrganization.id);
                              return;
                            }

                            setIsPublicProfileFormVisible(true);
                          }}
                          style={{
                            alignItems: "center",
                            backgroundColor: selectedPublicProfile ? "rgba(15,118,110,0.12)" : "rgba(120,113,108,0.12)",
                            borderColor: selectedPublicProfile ? "rgba(15,118,110,0.22)" : "rgba(120,113,108,0.18)",
                            borderRadius: 999,
                            borderWidth: 1,
                            height: 32,
                            justifyContent: "center",
                            paddingHorizontal: 10
                          }}
                        >
                          <Text style={{ color: selectedPublicProfile ? "#0f766e" : colorTokens.muted, fontSize: 10, fontWeight: "900" }}>Foto</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="Editar perfil publico"
                          onPress={() => setIsPublicProfileFormVisible((current) => !current)}
                          style={{
                            alignItems: "center",
                            backgroundColor: colorTokens.accentDark,
                            borderRadius: 999,
                            height: 32,
                            justifyContent: "center",
                            width: 32
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900" }}>✎</Text>
                        </Pressable>
                      </View>

                      {isPublicProfileFormVisible ? (
                        <>
                          <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                            <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Contenido</Text>
                            <Field label="Titular" onChange={(value) => setPublicProfileForm((current) => ({ ...current, headline: value }))} value={publicProfileForm.headline} />
                            <MultilineField label="Descripcion" onChange={(value) => setPublicProfileForm((current) => ({ ...current, bio: value }))} value={publicProfileForm.bio} />
                          </View>

                          <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                            <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Imagen y estado</Text>
                            <Button
                              disabled={isSubmitting || !selectedPublicProfile}
                              label={selectedPublicProfile ? "Cambiar foto publica" : "Guarda el perfil antes de cargar foto"}
                              onPress={() => uploadProviderAvatar(selectedOrganization.id)}
                              tone="secondary"
                            />
                            <ChoiceBar
                              onChange={(value) => setPublicProfileForm((current) => ({ ...current, isPublic: value === "public" }))}
                              options={[
                                { label: "Publico", value: "public" },
                                { label: "Oculto", value: "hidden" }
                              ]}
                              value={publicProfileForm.isPublic ? "public" : "hidden"}
                            />
                          </View>

                          <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            <Button
                              disabled={isSubmitting}
                              label="Guardar"
                              onPress={() => {
                                clearMessages();
                                void runAction(
                                  () =>
                                    getMobileProvidersApiClient().upsertProviderPublicProfile(selectedOrganization.id, {
                                      headline: publicProfileForm.headline.trim(),
                                      bio: publicProfileForm.bio.trim(),
                                      isPublic: publicProfileForm.isPublic
                                    }),
                                  "Perfil publico guardado."
                                ).then(async () => {
                                  await refresh(selectedOrganization.id);
                                  setIsPublicProfileFormVisible(false);
                                });
                              }}
                            />
                            <Button disabled={isSubmitting} label="Cerrar" onPress={() => setIsPublicProfileFormVisible(false)} tone="secondary" />
                          </View>
                        </>
                      ) : null}
                    </View>
                  ) : null}

                  {selectedOrganization ? (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>Publicacion</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "800" }}>
                          {missingPublicationSteps ? `${missingPublicationSteps} pendiente(s)` : "Completa"}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {publicationSteps.map((step) => (
                          <View
                            key={step.title}
                            style={{
                              width: "48%",
                              minWidth: 124,
                              flexGrow: 1,
                              borderRadius: 12,
                              backgroundColor: step.done ? "rgba(0,122,107,0.07)" : "rgba(255,255,255,0.8)",
                              borderColor: step.done ? "rgba(0,122,107,0.18)" : "rgba(148,163,184,0.2)",
                              borderWidth: 1,
                              padding: 9,
                              gap: 4
                            }}
                          >
                            <Text style={{ color: step.done ? "#007a6b" : colorTokens.muted, fontSize: 11, fontWeight: "900" }}>
                              {step.done ? "Listo" : "Pendiente"}
                            </Text>
                            <Text style={{ color: "#1c1917", fontSize: 10, fontWeight: "800", lineHeight: 13 }}>{step.title}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {organizations.length > 1 ? (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Cambiar negocio</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 9, fontWeight: "800" }}>{filteredOrganizations.length}/{organizations.length}</Text>
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {[
                          { icon: "◎", label: "Todos", value: "all" as const },
                          { icon: "◉", label: "Activos", value: "active" as const },
                          { icon: "✓", label: "Aprobados", value: "approved" as const },
                          { icon: "★", label: "Listos", value: "ready" as const }
                        ].map((filter) => {
                          const isSelected = organizationListFilter === filter.value;

                          return (
                            <Pressable
                              key={filter.value}
                              onPress={() => setOrganizationListFilter(filter.value)}
                              style={{
                                alignItems: "center",
                                backgroundColor: isSelected ? colorTokens.accentDark : "rgba(248,250,252,0.92)",
                                borderColor: isSelected ? colorTokens.accentDark : "rgba(28,25,23,0.08)",
                                borderRadius: 999,
                                borderWidth: 1,
                                flexDirection: "row",
                                gap: 4,
                                paddingHorizontal: 9,
                                paddingVertical: 7
                              }}
                            >
                              <Text style={{ color: isSelected ? "#ffffff" : colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>
                                {filter.icon}
                              </Text>
                              <Text style={{ color: isSelected ? "#ffffff" : "#1c1917", fontSize: 9, fontWeight: "900" }}>
                                {filter.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {filteredOrganizations.length ? (
                        filteredOrganizations.map((organization) => (
                        <Pressable
                          key={organization.id}
                          onPress={() => {
                            if (organization.id !== selectedOrganizationId) {
                              void selectOrganization(organization.id);
                            }
                          }}
                          style={{
                            borderRadius: 14,
                            backgroundColor:
                              organization.id === selectedOrganizationId ? "rgba(15,118,110,0.08)" : "rgba(248,250,252,0.9)",
                            borderWidth: 1,
                            borderColor:
                              organization.id === selectedOrganizationId ? "rgba(15,118,110,0.22)" : "rgba(28,25,23,0.08)",
                            padding: 10,
                            gap: 8
                          }}
                        >
                          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                            <View
                              style={{
                                alignItems: "center",
                                backgroundColor: organization.id === selectedOrganizationId ? "#ccfbf1" : "rgba(0,151,143,0.08)",
                                borderRadius: 12,
                                height: 40,
                                justifyContent: "center",
                                width: 40
                              }}
                            >
                              {organization.avatarUrl ? (
                                <Image source={{ uri: organization.avatarUrl }} style={{ borderRadius: 12, height: 40, width: 40 }} />
                              ) : (
                                <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>{getProviderInitials(organization.name)}</Text>
                              )}
                            </View>
                            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                              <Text numberOfLines={1} style={{ color: "#1c1917", fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
                                {organization.name}
                              </Text>
                              <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 9, lineHeight: 12 }}>{organization.city}</Text>
                              <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 9, fontWeight: "700", lineHeight: 12 }}>
                                {organization.isPublic ? "Activo" : "Privado"} · {providerApprovalStatusLabels[organization.approvalStatus]}
                              </Text>
                            </View>
                            <Text style={{ color: organization.id === selectedOrganizationId ? colorTokens.accentDark : colorTokens.muted, fontSize: 16, fontWeight: "900" }}>
                              {organization.id === selectedOrganizationId ? "✓" : "›"}
                            </Text>
                          </View>
                        </Pressable>
                        ))
                      ) : (
                        <View style={{ borderRadius: 14, backgroundColor: "rgba(248,250,252,0.92)", borderColor: "rgba(28,25,23,0.08)", borderWidth: 1, padding: 10 }}>
                          <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                            No hay negocios para este filtro.
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}

                  {organizations.length ? (
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        disabled={isSubmitting}
                        label="Crear negocio"
                        onPress={() => {
                          clearMessages();
                          setOrganizationForm(emptyOrganizationForm);
                          setOrganizationView("crear");
                        }}
                      />
                      <Button disabled={isSubmitting} label="Actualizar" onPress={() => void refresh(selectedOrganizationId)} tone="secondary" />
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: "rgba(0,122,107,0.1)",
                          borderColor: "rgba(0,122,107,0.18)",
                          borderRadius: 14,
                          borderWidth: 1,
                          height: 46,
                          justifyContent: "center",
                          width: 46
                        }}
                      >
                        <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>
                          {getProviderInitials(organizationForm.name || selectedOrganization?.name || "Negocio")}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
                          {organizationView === "crear" ? "Nuevo negocio" : "Datos del negocio"}
                        </Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                          La publicacion depende de aprobacion administrativa.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Identidad</Text>
                    <Field label="Nombre del negocio" onChange={(value) => setOrganizationForm((current) => ({ ...current, name: value }))} value={organizationForm.name} />
                    <Field label="Slug" onChange={(value) => setOrganizationForm((current) => ({ ...current, slug: value }))} value={organizationForm.slug} />
                  </View>

                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Ubicacion</Text>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <View style={{ flex: 1, minWidth: 150 }}>
                        <Field label="Ciudad" onChange={(value) => setOrganizationForm((current) => ({ ...current, city: value }))} value={organizationForm.city} />
                      </View>
                      <View style={{ width: 108 }}>
                        <Field label="Pais" onChange={(value) => setOrganizationForm((current) => ({ ...current, countryCode: value }))} value={organizationForm.countryCode} />
                      </View>
                    </View>
                  </View>

                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Visibilidad</Text>
                    <ChoiceBar
                      onChange={(value) => setOrganizationForm((current) => ({ ...current, isPublic: value === "public" }))}
                      options={[
                        { label: "Publico al aprobarse", value: "public" },
                        { label: "Privado", value: "private" }
                      ]}
                      value={organizationForm.isPublic ? "public" : "private"}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting || (organizationView === "editar" && !selectedOrganization)}
                      label={organizationView === "crear" ? "Crear" : "Guardar"}
                      onPress={() => {
                        clearMessages();
                        const payload = {
                          name: organizationForm.name.trim(),
                          slug: organizationForm.slug.trim().toLowerCase(),
                          city: organizationForm.city.trim(),
                          countryCode: organizationForm.countryCode.trim().toUpperCase(),
                          isPublic: organizationForm.isPublic
                        } satisfies UpdateProviderOrganizationInput;

                        if (organizationView === "editar" && selectedOrganization) {
                          void runAction(
                            () => getMobileProvidersApiClient().updateProviderOrganization(selectedOrganization.id, payload),
                            "Organizacion de proveedor actualizada."
                          ).then(async () => {
                            await refresh(selectedOrganization.id);
                            setOrganizationView("lista");
                          });
                          return;
                        }

                        void runAction(
                          () => getMobileProvidersApiClient().createProviderOrganization(payload),
                          "Organizacion de proveedor creada."
                        ).then(async (organization) => {
                          await refresh(organization.id);
                          setOrganizationView("lista");
                        });
                      }}
                    />
                    <Button
                      disabled={isSubmitting}
                      label={organizationView === "crear" ? "Cancelar" : "Volver"}
                      onPress={() => {
                        clearMessages();
                        if (selectedOrganizationDetail) {
                          setOrganizationForm({
                            name: selectedOrganizationDetail.organization.name,
                            slug: selectedOrganizationDetail.organization.slug,
                            city: selectedOrganizationDetail.organization.city,
                            countryCode: selectedOrganizationDetail.organization.countryCode,
                            isPublic: selectedOrganizationDetail.organization.isPublic
                          });
                        } else {
                          setOrganizationForm(emptyOrganizationForm);
                        }
                        setOrganizationView("lista");
                      }}
                      tone="secondary"
                    />
                  </View>
                </>
              )}
            </View>
            ) : null}

            {showApproval ? (
            <View style={{ borderRadius: 18, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#1c1917", lineHeight: 17 }}>Estado de publicacion</Text>
                  <Text style={{ fontSize: 10, color: colorTokens.muted, lineHeight: 14 }}>Secuencia para aparecer en marketplace</Text>
                </View>
                {selectedOrganization ? (
                  <StatusChip label={isMarketplaceVisible ? "Visible" : "No visible"} tone={isMarketplaceVisible ? "active" : "pending"} />
                ) : (
                  <StatusChip label="Sin negocio" tone="neutral" />
                )}
              </View>
              {selectedOrganization ? (
                <>
                  <View
                    style={{
                      borderRadius: 16,
                      backgroundColor: isMarketplaceVisible ? "rgba(0,122,107,0.1)" : "rgba(249,115,22,0.1)",
                      borderWidth: 1,
                      borderColor: isMarketplaceVisible ? "rgba(0,122,107,0.18)" : "rgba(249,115,22,0.18)",
                      padding: 12,
                      gap: 8
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: "#1c1917", lineHeight: 18 }}>
                          {isMarketplaceVisible ? "Visible en marketplace" : "No visible en marketplace"}
                        </Text>
                        <Text style={{ fontSize: 10, color: colorTokens.muted, lineHeight: 14 }}>
                          {isMarketplaceVisible
                            ? "Tu negocio cumple los pasos principales para recibir reservas."
                            : missingPublicationSteps
                              ? `Faltan ${missingPublicationSteps} paso(s) para publicar tu negocio.`
                              : "El checklist esta listo; falta aprobacion o visibilidad publica."}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isMarketplaceVisible ? "#007a6b" : "#f97316"
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900" }}>{isMarketplaceVisible ? "✓" : "!"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {publicationSteps.map((step, index) => (
                      <View
                        key={step.title}
                        style={{
                          width: "48%",
                          minWidth: 124,
                          flexGrow: 1,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: step.done ? "rgba(0,122,107,0.2)" : "rgba(148,163,184,0.22)",
                          backgroundColor: step.done ? "rgba(0,122,107,0.06)" : "rgba(248,250,252,0.9)",
                          padding: 10,
                          gap: 6
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: colorTokens.muted }}>{index + 1}</Text>
                          <Text style={{ color: step.done ? "#007a6b" : "#94a3b8", fontSize: 14, fontWeight: "900" }}>
                            {step.done ? "✓" : "•"}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: "#1c1917", lineHeight: 15 }}>{step.title}</Text>
                        <Text style={{ fontSize: 9, color: colorTokens.muted, lineHeight: 12 }}>{step.detail}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ borderRadius: 14, backgroundColor: "rgba(247,242,231,0.74)", padding: 10, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <Text style={{ fontSize: 10, color: colorTokens.muted, flex: 1 }}>Aprobacion</Text>
                      <StatusChip
                        label={providerApprovalStatusLabels[selectedOrganization.approvalStatus]}
                        tone={
                          selectedOrganization.approvalStatus === "approved"
                            ? "active"
                            : selectedOrganization.approvalStatus === "rejected"
                              ? "neutral"
                              : "pending"
                        }
                      />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <Text style={{ fontSize: 10, color: colorTokens.muted, flex: 1 }}>Visibilidad</Text>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: "#1c1917" }}>
                        {selectedOrganization.isPublic ? "Publico al aprobarse" : "Privado"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <Text style={{ fontSize: 10, color: colorTokens.muted, flex: 1 }}>Marketplace</Text>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: isMarketplaceVisible ? "#007a6b" : colorTokens.muted }}>
                        {isMarketplaceVisible ? "Visible en exploracion" : "Oculto por ahora"}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: 11, color: colorTokens.muted, lineHeight: 16 }}>
                  Crea o selecciona una organizacion para revisar el estado de aprobacion y publicacion.
                </Text>
              )}
            </View>
            ) : null}

            {showBookings ? (
            <View style={{ borderRadius: 18, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#1c1917", lineHeight: 17 }}>Reservas entrantes</Text>
                  <Text style={{ fontSize: 10, color: colorTokens.muted, lineHeight: 14 }}>Resumen operativo y acceso al detalle</Text>
                </View>
                <StatusChip label={`${providerBookings.length} total`} tone={providerBookings.length ? "active" : "neutral"} />
              </View>
              {selectedOrganization ? (
                <>
                  <View
                    style={{
                      borderRadius: 16,
                      backgroundColor: actionableProviderBookings.length ? "rgba(0,122,107,0.1)" : "rgba(247,242,231,0.74)",
                      borderWidth: 1,
                      borderColor: actionableProviderBookings.length ? "rgba(0,122,107,0.18)" : "rgba(28,25,23,0.08)",
                      padding: 12,
                      gap: 8
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: "#1c1917", lineHeight: 18 }}>
                          {actionableProviderBookings.length ? "Atencion operativa" : "Sin acciones urgentes"}
                        </Text>
                        <Text style={{ fontSize: 10, color: colorTokens.muted, lineHeight: 14 }}>
                          {actionableProviderBookings.length
                            ? `${actionableProviderBookings.length} reserva(s) requieren seguimiento.`
                            : "Las reservas pendientes y confirmadas apareceran aqui."}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: actionableProviderBookings.length ? "#007a6b" : "#d6d3d1"
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900" }}>{actionableProviderBookings.length || "0"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { label: "Pendientes", value: pendingProviderBookings.length, tone: pendingProviderBookings.length ? "pending" : "neutral" },
                      { label: "Confirmadas", value: confirmedProviderBookings.length, tone: confirmedProviderBookings.length ? "active" : "neutral" },
                      { label: "Completadas", value: completedProviderBookings.length, tone: completedProviderBookings.length ? "active" : "neutral" },
                      { label: "Canceladas", value: cancelledProviderBookings.length, tone: "neutral" }
                    ].map((metric) => (
                      <View
                        key={metric.label}
                        style={{
                          width: "48%",
                          minWidth: 124,
                          flexGrow: 1,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "rgba(148,163,184,0.18)",
                          backgroundColor: "rgba(248,250,252,0.9)",
                          padding: 10,
                          gap: 6
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: "900", color: metric.value ? "#007a6b" : "#78716c", lineHeight: 21 }}>
                          {metric.value}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: "#1c1917", lineHeight: 13 }}>{metric.label}</Text>
                      </View>
                    ))}
                  </View>

                  {dashboardProviderBookings.length ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colorTokens.muted, textTransform: "uppercase" }}>
                        Proximas reservas
                      </Text>
                      {dashboardProviderBookings.map((booking) => (
                        <View
                          key={booking.id}
                          style={{
                            borderRadius: 15,
                            borderWidth: 1,
                            borderColor: "rgba(28,25,23,0.08)",
                            backgroundColor: "rgba(255,255,255,0.86)",
                            padding: 11,
                            gap: 9,
                            width: "100%"
                          }}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <View style={{ flex: 1, gap: 3 }}>
                              <Text style={{ fontSize: 13, fontWeight: "800", color: "#1c1917", lineHeight: 17 }} numberOfLines={1}>
                                {displayBookingValue(booking.serviceName, "Servicio no disponible")}
                              </Text>
                              <Text style={{ fontSize: 10, color: colorTokens.muted, lineHeight: 14 }} numberOfLines={1}>
                                {displayBookingValue(booking.petName, "Mascota no disponible")} - {displayBookingValue(booking.customerDisplayName, "Cliente no disponible")}
                              </Text>
                            </View>
                            <StatusChip
                              label={bookingStatusLabels[booking.status]}
                              tone={booking.status === "pending_approval" ? "pending" : booking.status === "cancelled" ? "neutral" : "active"}
                            />
                          </View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ fontSize: 10, color: colorTokens.muted, lineHeight: 13 }}>{formatDateTime(booking.scheduledStartAt)}</Text>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: "#1c1917", lineHeight: 13 }}>
                                {formatMoney(booking.totalPriceCents, booking.currencyCode)}
                              </Text>
                            </View>
                            <Button disabled={isSubmitting} label="Detalle" onPress={() => void openProviderBookingDetail(booking.id)} tone="secondary" />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: colorTokens.muted, lineHeight: 16 }}>
                      Todavia no existen reservas para esta organizacion. Cuando se reserve un servicio publico aprobado, aqui apareceran solicitudes y reservas confirmadas.
                    </Text>
                  )}

                  {selectedProviderBookingDetail ? (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.82)", padding: 14, gap: 12, width: "100%" }}>
                      <View style={{ gap: 8, width: "100%" }}>
                        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1c1917", lineHeight: 22 }}>Detalle de la reserva</Text>
                        <StatusChip
                          label={bookingStatusLabels[selectedProviderBookingDetail.booking.status]}
                          tone={
                            selectedProviderBookingDetail.booking.status === "pending_approval"
                              ? "pending"
                              : selectedProviderBookingDetail.booking.status === "cancelled"
                                ? "neutral"
                                : "active"
                          }
                        />
                      </View>
                      <View style={{ gap: 10, width: "100%" }}>
                        <BookingInfoRow label="Hogar" value={displayBookingValue(selectedProviderBookingDetail.booking.householdName, "Hogar no disponible")} />
                        <BookingInfoRow label="Cliente" value={displayBookingValue(selectedProviderBookingDetail.booking.customerDisplayName, "Cliente no disponible")} />
                        <BookingInfoRow
                          label="Mascota y horario"
                          value={`${displayBookingValue(selectedProviderBookingDetail.booking.petName, "Mascota no disponible")} - ${formatDateTime(selectedProviderBookingDetail.booking.scheduledStartAt)}`}
                        />
                        <BookingInfoRow
                          label="Metodo de pago"
                          value={
                            selectedProviderBookingDetail.paymentMethodSummary
                              ? `${selectedProviderBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedProviderBookingDetail.paymentMethodSummary.last4}`
                              : "Sin metodo de pago guardado vinculado"
                          }
                        />
                      </View>
                      {selectedProviderBookingDetail.booking.status === "pending_approval" ||
                      selectedProviderBookingDetail.booking.status === "confirmed" ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" }}>
                          {selectedProviderBookingDetail.booking.status === "pending_approval" ? (
                            <>
                              <Button disabled={isSubmitting} label="Aprobar" onPress={() => void approveProviderBooking(selectedProviderBookingDetail.booking.id)} />
                              <Button
                                disabled={isSubmitting}
                                label="Rechazar"
                                onPress={() => void rejectProviderBooking(selectedProviderBookingDetail.booking.id, "Solicitud de reserva rechazada por el proveedor")}
                                tone="secondary"
                              />
                            </>
                          ) : null}
                          {selectedProviderBookingDetail.booking.status === "confirmed" ? (
                            <Button disabled={isSubmitting} label="Marcar completada" onPress={() => void completeProviderBooking(selectedProviderBookingDetail.booking.id)} />
                          ) : null}
                        </View>
                      ) : null}
                      <View style={{ gap: 8, width: "100%" }}>
                        <Text style={{ color: "#78716c", fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>Historial</Text>
                        {selectedProviderBookingDetail.statusHistory.map((change) => (
                          <View key={change.id} style={{ borderRadius: 14, backgroundColor: "#fffdf8", borderColor: "rgba(28,25,23,0.1)", borderWidth: 1, padding: 12, gap: 6, width: "100%" }}>
                            <Text style={{ fontWeight: "700", color: "#1c1917", lineHeight: 20 }}>{bookingStatusLabels[change.toStatus]}</Text>
                            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>{formatDateTime(change.createdAt)}</Text>
                            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>{change.changeReason ?? "Sin razon adicional registrada."}</Text>
                          </View>
                        ))}
                      </View>
                      <BookingOperationsTimeline
                        bookingId={selectedProviderBookingDetail.booking.id}
                        bookingStatus={selectedProviderBookingDetail.booking.status}
                        context="provider"
                        enabled={selectedProviderBookingDetail.booking.status === "confirmed"}
                      />
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showProfile ? (
            <View style={{ borderRadius: 18, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#1c1917", lineHeight: 17 }}>Perfil publico</Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                    Presentacion visible para dueños en marketplace.
                  </Text>
                </View>
                <StatusChip label={publicProfileForm.isPublic ? "Publico" : "Oculto"} tone={publicProfileForm.isPublic ? "active" : "neutral"} />
              </View>
              {selectedOrganization ? (
                <>
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: "rgba(0,122,107,0.1)",
                          borderColor: "rgba(0,122,107,0.18)",
                          borderRadius: 14,
                          borderWidth: 1,
                          height: 46,
                          justifyContent: "center",
                          width: 46
                        }}
                      >
                        {selectedPublicProfile?.avatarUrl ? (
                          <Image
                            source={{ uri: selectedPublicProfile.avatarUrl }}
                            style={{ borderRadius: 23, height: 46, width: 46 }}
                          />
                        ) : (
                          <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>
                            {getProviderInitials(publicProfileForm.headline || selectedOrganization.name)}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
                          {publicProfileForm.headline || selectedOrganization.name}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel={selectedPublicProfile ? "Cambiar foto publica" : "Crear perfil publico antes de cargar foto"}
                        onPress={() => {
                          if (selectedPublicProfile) {
                            uploadProviderAvatar(selectedOrganization.id);
                            return;
                          }

                          setIsPublicProfileFormVisible(true);
                        }}
                        style={{
                          alignItems: "center",
                          backgroundColor: selectedPublicProfile ? "rgba(15,118,110,0.12)" : "rgba(120,113,108,0.12)",
                          borderColor: selectedPublicProfile ? "rgba(15,118,110,0.22)" : "rgba(120,113,108,0.18)",
                          borderRadius: 999,
                          borderWidth: 1,
                          height: 34,
                          justifyContent: "center",
                          paddingHorizontal: 11
                        }}
                      >
                        <Text style={{ color: selectedPublicProfile ? "#0f766e" : colorTokens.muted, fontSize: 10, fontWeight: "900" }}>Foto</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Editar perfil publico"
                        onPress={() => setIsPublicProfileFormVisible((current) => !current)}
                        style={{
                          alignItems: "center",
                          backgroundColor: colorTokens.accentDark,
                          borderRadius: 999,
                          height: 34,
                          justifyContent: "center",
                          width: 34
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900" }}>✎</Text>
                      </Pressable>
                    </View>
                  </View>

                  {isPublicProfileFormVisible ? (
                    <>
                      <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Contenido</Text>
                        <Field label="Titular" onChange={(value) => setPublicProfileForm((current) => ({ ...current, headline: value }))} value={publicProfileForm.headline} />
                        <MultilineField label="Descripcion" onChange={(value) => setPublicProfileForm((current) => ({ ...current, bio: value }))} value={publicProfileForm.bio} />
                      </View>

                      <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Imagen y estado</Text>
                        <Button
                          disabled={isSubmitting || !selectedPublicProfile}
                          label={selectedPublicProfile ? "Cambiar foto publica" : "Guarda el perfil antes de cargar foto"}
                          onPress={() => uploadProviderAvatar(selectedOrganization.id)}
                          tone="secondary"
                        />
                        <ChoiceBar
                          onChange={(value) => setPublicProfileForm((current) => ({ ...current, isPublic: value === "public" }))}
                          options={[
                            { label: "Publico", value: "public" },
                            { label: "Oculto", value: "hidden" }
                          ]}
                          value={publicProfileForm.isPublic ? "public" : "hidden"}
                        />
                      </View>

                      <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Button
                          disabled={isSubmitting}
                          label="Guardar"
                          onPress={() => {
                            clearMessages();
                            void runAction(
                              () =>
                                getMobileProvidersApiClient().upsertProviderPublicProfile(selectedOrganization.id, {
                                  headline: publicProfileForm.headline.trim(),
                                  bio: publicProfileForm.bio.trim(),
                                  isPublic: publicProfileForm.isPublic
                                }),
                              "Perfil publico guardado."
                            ).then(async () => {
                              await refresh(selectedOrganization.id);
                              setIsPublicProfileFormVisible(false);
                            });
                          }}
                        />
                        <Button disabled={isSubmitting} label="Cerrar" onPress={() => setIsPublicProfileFormVisible(false)} tone="secondary" />
                      </View>
                    </>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showServices ? (
            <View style={{ borderRadius: 18, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
              {selectedOrganization ? (
                <>
                  <View
                    style={{
                      borderRadius: 14,
                      backgroundColor: colorTokens.accentDark,
                      borderColor: "rgba(255,255,255,0.16)",
                      borderWidth: 1,
                      padding: 10,
                      gap: 3
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 8, fontWeight: "900", textTransform: "uppercase" }}>Negocio seleccionado</Text>
                    <Text numberOfLines={2} style={{ color: "#ffffff", fontSize: 10, fontWeight: "900", lineHeight: 13 }}>
                      {selectedOrganization.name}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { label: "Publicos", value: publicProviderServices.length },
                      { label: "Activos", value: activeProviderServices.length },
                      { label: "Ocultos", value: selectedServicios.length - publicProviderServices.length }
                    ].map((metric) => (
                      <View
                        key={metric.label}
                        style={{
                          flex: 1,
                          minWidth: 88,
                          borderRadius: 14,
                          borderColor: "rgba(148,163,184,0.18)",
                          borderWidth: 1,
                          backgroundColor: "rgba(248,250,252,0.92)",
                          padding: 10,
                          gap: 4
                        }}
                      >
                        <Text style={{ color: metric.value ? "#007a6b" : "#78716c", fontSize: 17, fontWeight: "900", lineHeight: 20 }}>
                          {metric.value}
                        </Text>
                        <Text style={{ color: "#1c1917", fontSize: 9, fontWeight: "800", lineHeight: 12 }}>{metric.label}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Catalogo</Text>
                      <Pressable
                        disabled={isSubmitting}
                        onPress={() => {
                          clearMessages();
                          setServiceForm(emptyServiceForm);
                          setIsServiceFormVisible(true);
                          setTimeout(() => serviceNameInputRef.current?.focus(), 120);
                        }}
                        style={({ pressed }) => ({
                          alignItems: "center",
                          backgroundColor: pressed ? "#00695d" : colorTokens.accentDark,
                          borderRadius: 18,
                          height: 36,
                          justifyContent: "center",
                          opacity: isSubmitting ? 0.5 : 1,
                          width: 36
                        })}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", lineHeight: 22 }}>+</Text>
                      </Pressable>
                    </View>

                    {selectedServicios.length ? (
                      selectedServicios.map((service) => (
                        <View
                          key={service.id}
                          style={{
                            borderRadius: 16,
                            backgroundColor: "rgba(255,255,255,0.86)",
                            borderColor: "rgba(28,25,23,0.08)",
                            borderWidth: 1,
                            padding: 12,
                            gap: 9
                          }}
                        >
                          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                            <View
                              style={{
                                alignItems: "center",
                                backgroundColor: service.isActive ? "rgba(0,122,107,0.1)" : "rgba(95,102,117,0.08)",
                                borderRadius: 13,
                                height: 44,
                                justifyContent: "center",
                                width: 44
                              }}
                            >
                              <Text style={{ color: service.isActive ? colorTokens.accentDark : colorTokens.mutedStrong, fontSize: 11, fontWeight: "900" }}>
                                {getProviderInitials(service.name)}
                              </Text>
                            </View>
                            <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", lineHeight: 16 }}>
                                {service.name}
                              </Text>
                              <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 13 }}>
                                {providerServiceCategoryLabels[service.category]} · {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"} · {formatMoney(service.basePriceCents, service.currencyCode)}
                              </Text>
                            </View>
                          </View>
                          <Text numberOfLines={2} style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                            {service.shortDescription ?? "Todavia no hay descripcion."}
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            <StatusChip label={service.isPublic ? "Publico" : "Oculto"} tone={service.isPublic ? "active" : "neutral"} />
                            <StatusChip label={service.isActive ? "Activo" : "Inactivo"} tone={service.isActive ? "active" : "neutral"} />
                            <StatusChip label={service.bookingMode === "instant" ? "Inmediata" : "Con aprobacion"} tone="neutral" />
                          </View>
                          <View style={{ alignItems: "flex-start" }}>
                            <Button
                              disabled={isSubmitting}
                              label="Editar"
                              onPress={() => {
                                setServiceForm({
                                  id: service.id,
                                  name: service.name,
                                  category: service.category,
                                  shortDescription: service.shortDescription ?? "",
                                  speciesServedText: service.speciesServed.join(", "),
                                  durationMinutes: service.durationMinutes?.toString() ?? "",
                                  bookingMode: service.bookingMode,
                                  basePrice: (service.basePriceCents / 100).toFixed(2),
                                  currencyCode: service.currencyCode,
                                  cancellationWindowHours: service.cancellationWindowHours.toString(),
                                  isPublic: service.isPublic,
                                  isActive: service.isActive
                                });
                                setIsServiceFormVisible(true);
                              }}
                              tone="secondary"
                            />
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 8 }}>
                        <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Todavia no hay servicios</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                          Usa el boton + para crear el primer servicio visible para reservas.
                        </Text>
                      </View>
                    )}
                  </View>

                  {isServiceFormVisible ? (
                  <>
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: "rgba(0,122,107,0.1)",
                          borderColor: "rgba(0,122,107,0.18)",
                          borderRadius: 14,
                          borderWidth: 1,
                          height: 46,
                          justifyContent: "center",
                          width: 46
                        }}
                      >
                        <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>
                          {getProviderInitials(serviceForm.name || "Servicio")}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
                          {serviceForm.id ? "Editando servicio" : "Nuevo servicio"}
                        </Text>
                        <Text numberOfLines={2} style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                          Define que vendes, como se reserva y si aparece en marketplace.
                        </Text>
                      </View>
                      <StatusChip label={serviceForm.isPublic ? "Publico" : "Oculto"} tone={serviceForm.isPublic ? "active" : "neutral"} />
                    </View>
                  </View>

                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Informacion basica</Text>
                    <Field inputRef={serviceNameInputRef} label="Nombre del servicio" onChange={(value) => setServiceForm((current) => ({ ...current, name: value }))} value={serviceForm.name} />
                    <ChoiceBar
                      onChange={(value) => setServiceForm((current) => ({ ...current, category: value }))}
                      options={providerServiceCategoryOrder.map((category) => ({
                        label: providerServiceCategoryLabels[category],
                        value: category
                      }))}
                      value={serviceForm.category}
                    />
                    <MultilineField label="Descripcion corta" onChange={(value) => setServiceForm((current) => ({ ...current, shortDescription: value }))} value={serviceForm.shortDescription} />
                  </View>

                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Condiciones</Text>
                    <Field label="Especies atendidas" onChange={(value) => setServiceForm((current) => ({ ...current, speciesServedText: value }))} value={serviceForm.speciesServedText} />
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <View style={{ flex: 1, minWidth: 116 }}>
                        <Field keyboardType="numeric" label="Duracion (min)" onChange={(value) => setServiceForm((current) => ({ ...current, durationMinutes: value }))} value={serviceForm.durationMinutes} />
                      </View>
                      <View style={{ flex: 1, minWidth: 116 }}>
                        <Field keyboardType="numeric" label="Precio USD" onChange={(value) => setServiceForm((current) => ({ ...current, basePrice: value }))} value={serviceForm.basePrice} />
                      </View>
                    </View>
                  </View>

                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", padding: 12, gap: 9, borderColor: "rgba(28,25,23,0.08)", borderWidth: 1 }}>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>Reserva y estado</Text>
                    <Field keyboardType="numeric" label="Cancelacion (hrs)" onChange={(value) => setServiceForm((current) => ({ ...current, cancellationWindowHours: value }))} value={serviceForm.cancellationWindowHours} />
                    <ChoiceBar
                      onChange={(value) => setServiceForm((current) => ({ ...current, bookingMode: value }))}
                      options={[
                        { label: "Inmediata", value: "instant" },
                        { label: "Con aprobacion", value: "approval_required" }
                      ]}
                      value={serviceForm.bookingMode}
                    />
                    <ChoiceBar
                      onChange={(value) => setServiceForm((current) => ({ ...current, isPublic: value === "public" }))}
                      options={[
                        { label: "Publico", value: "public" },
                        { label: "Oculto", value: "hidden" }
                      ]}
                      value={serviceForm.isPublic ? "public" : "hidden"}
                    />
                    <ChoiceBar
                      onChange={(value) => setServiceForm((current) => ({ ...current, isActive: value === "active" }))}
                      options={[
                        { label: "Activo", value: "active" },
                        { label: "Inactivo", value: "inactive" }
                      ]}
                      value={serviceForm.isActive ? "active" : "inactive"}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      label={serviceForm.id ? "Guardar" : "Crear"}
                      onPress={() => {
                        clearMessages();
                        const payload = {
                          name: serviceForm.name.trim(),
                          category: serviceForm.category,
                          shortDescription: serviceForm.shortDescription.trim() || null,
                          speciesServed: normalizeSpeciesServed(serviceForm.speciesServedText),
                          durationMinutes: serviceForm.durationMinutes ? Number(serviceForm.durationMinutes) : null,
                          bookingMode: serviceForm.bookingMode,
                          basePriceCents: Math.max(0, Math.round(Number(serviceForm.basePrice || "0") * 100)),
                          currencyCode: serviceForm.currencyCode.trim().toUpperCase() || "USD",
                          cancellationWindowHours: Number(serviceForm.cancellationWindowHours || "24"),
                          isPublic: serviceForm.isPublic,
                          isActive: serviceForm.isActive
                        } satisfies UpdateProviderServiceInput;

                        if (serviceForm.id) {
                          void runAction(
                            () => getMobileProvidersApiClient().updateProviderService(serviceForm.id!, payload),
                            "Servicio del proveedor actualizado."
                          ).then(async () => {
                            setServiceForm(emptyServiceForm);
                            setIsServiceFormVisible(false);
                            await refresh(selectedOrganization.id);
                          });
                          return;
                        }

                        void runAction(
                          () =>
                            getMobileProvidersApiClient().createProviderService({
                              organizationId: selectedOrganization.id,
                              ...payload
                            }),
                          "Servicio del proveedor creado."
                        ).then(async () => {
                          setServiceForm(emptyServiceForm);
                          setIsServiceFormVisible(false);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                    />
                    <Button
                      disabled={isSubmitting}
                      label="Cancelar"
                      onPress={() => {
                        setServiceForm(emptyServiceForm);
                        setIsServiceFormVisible(false);
                      }}
                      tone="secondary"
                    />
                  </View>
                  </>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showAvailability ? (
            <View style={{ borderRadius: 18, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.softShadow }}>
              <View
                style={{
                  backgroundColor: colorTokens.accentDark,
                  borderRadius: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  padding: 10
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#ffffff", lineHeight: 15 }}>Horarios</Text>
                  <Text style={{ color: "rgba(255,255,255,0.84)", fontSize: 9, lineHeight: 12 }}>
                    {selectedOrganization ? selectedOrganization.name : "Disponibilidad y cupos por servicio."}
                  </Text>
                </View>
                <View style={{ backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>{selectedAvailabilityRules.length} regla(s)</Text>
                </View>
              </View>
              {selectedOrganization ? (
                selectedServicios.length ? (
                <>
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)", borderColor: "rgba(28,25,23,0.08)", borderWidth: 1, padding: 12, gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900", lineHeight: 17 }}>Semana operativa</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>Selecciona un dia para ver horarios configurados.</Text>
                      </View>
                      <Pressable
                        disabled={isSubmitting}
                        onPress={() => {
                          clearMessages();
                          setDisponibilidadForm({
                            ...emptyAvailabilityFormForSelectedService,
                            dayOfWeek: selectedAvailabilityDay
                          });
                          setIsAvailabilityFormVisible(true);
                        }}
                        style={({ pressed }) => ({
                          alignItems: "center",
                          backgroundColor: pressed ? "#00695d" : colorTokens.accentDark,
                          borderRadius: 18,
                          height: 36,
                          justifyContent: "center",
                          opacity: isSubmitting ? 0.5 : 1,
                          width: 36
                        })}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", lineHeight: 22 }}>+</Text>
                      </Pressable>
                    </View>

                    <View
                      style={{
                        borderColor: "rgba(15,23,42,0.08)",
                        borderRadius: 16,
                        borderWidth: 1,
                        overflow: "hidden"
                      }}
                    >
                      <Calendar
                        current={selectedAvailabilityDate}
                        markedDates={availabilityMarkedDates}
                        onDayPress={(day: { dateString: string }) => {
                          setSelectedAvailabilityDate(day.dateString);
                          setSelectedAvailabilityDay(getDayOfWeekFromDateKey(day.dateString));
                        }}
                        theme={{
                          arrowColor: colorTokens.accentDark,
                          calendarBackground: "#ffffff",
                          dayTextColor: "#1c1917",
                          monthTextColor: "#1c1917",
                          selectedDayBackgroundColor: colorTokens.accentDark,
                          selectedDayTextColor: "#ffffff",
                          textDayFontSize: 12,
                          textDayHeaderFontSize: 9,
                          textMonthFontSize: 14,
                          todayTextColor: colorTokens.accentDark
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
                        {formatAvailabilityDateLabel(selectedAvailabilityDate)}
                      </Text>
                      <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>Ver agenda semanal</Text>
                    </View>

                    {selectedDayAvailabilityRules.length ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {selectedDayAvailabilityRules.map((rule) => {
                          const service = selectedServicios.find((candidate) => candidate.id === rule.serviceId);
                          const isLastCup = rule.capacity === 1;
                          const slotTone = !rule.isActive ? "closed" : isLastCup ? "last" : rule.capacity <= 2 ? "low" : "open";
                          const slotStyle =
                            slotTone === "closed"
                              ? { backgroundColor: "rgba(254,226,226,0.68)", borderColor: "rgba(248,113,113,0.32)", color: "#b91c1c", badge: "Inactivo" }
                              : slotTone === "last"
                                ? { backgroundColor: "rgba(255,247,237,0.96)", borderColor: "rgba(249,115,22,0.36)", color: "#f97316", badge: "Ultimo cupo" }
                                : slotTone === "low"
                                  ? { backgroundColor: "rgba(240,253,244,0.86)", borderColor: "rgba(134,239,172,0.34)", color: "#15803d", badge: `${rule.capacity} cupos` }
                                  : { backgroundColor: "rgba(236,253,245,0.96)", borderColor: "rgba(0,122,107,0.34)", color: "#007a6b", badge: `${rule.capacity} cupos disponibles` };

                          return (
                            <View
                              key={rule.id}
                              style={{
                                width: "48%",
                                minWidth: 132,
                                flexGrow: 1,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: slotStyle.borderColor,
                                backgroundColor: slotStyle.backgroundColor,
                                padding: 10,
                                gap: 6
                              }}
                            >
                              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 15 }}>
                                {rule.startsAt.slice(0, 5)} - {rule.endsAt.slice(0, 5)}
                              </Text>
                              <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 9, lineHeight: 12 }}>
                                {service?.name ?? "Servicio no disponible"}
                              </Text>
                              <Text style={{ color: slotStyle.color, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>{slotStyle.badge}</Text>
                              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                                <Button
                                  disabled={isSubmitting}
                                  label="Editar"
                                  onPress={() => {
                                    setDisponibilidadForm({
                                      id: rule.id,
                                      serviceId: rule.serviceId,
                                      dayOfWeek: rule.dayOfWeek,
                                      startsAt: rule.startsAt,
                                      endsAt: rule.endsAt,
                                      capacity: String(rule.capacity),
                                      isActive: rule.isActive
                                    });
                                    setIsAvailabilityFormVisible(true);
                                  }}
                                  tone="secondary"
                                />
                                <Button
                                  disabled={isSubmitting}
                                  label={rule.isActive ? "Pausar" : "Activar"}
                                  onPress={() => {
                                    clearMessages();
                                    void runAction(
                                      () => getMobileProvidersApiClient().setProviderAvailabilityRuleActive(rule.id, !rule.isActive),
                                      rule.isActive ? "Horario desactivado." : "Horario activado."
                                    ).then(async () => {
                                      await refresh(selectedOrganization?.id);
                                    });
                                  }}
                                  tone="secondary"
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={{ borderRadius: 14, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 6 }}>
                        <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Sin horarios este dia</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>Usa el boton + para crear una franja con capacidad.</Text>
                      </View>
                    )}

                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <StatusChip label="3+ cupos" tone="active" />
                      <StatusChip label="1-2 cupos" tone="active" />
                      <StatusChip label="Ultimo cupo" tone="pending" />
                      <StatusChip label="Inactivo" tone="neutral" />
                    </View>
                  </View>

                  {isAvailabilityFormVisible ? (
                  <>
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.74)", padding: 12, gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: "rgba(0,122,107,0.1)",
                          borderRadius: 14,
                          height: 46,
                          justifyContent: "center",
                          width: 46
                        }}
                      >
                        <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>HR</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
                          {availabilityForm.id ? "Editar horario" : "Crear horario"}
                        </Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>Define servicio, dia, hora y capacidad.</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>Servicio</Text>
                  <ChoiceBar
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, serviceId: value }))}
                    options={selectedServicios.map((service) => ({
                      label: service.name,
                      value: service.id
                    }))}
                    value={availabilityForm.serviceId || selectedServicios[0]?.id || ""}
                  />
                  <ChoiceBar
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, dayOfWeek: value }))}
                    options={providerDayOfWeekOrder.map((dayOfWeek) => ({
                      label: providerDayOfWeekLabels[dayOfWeek],
                      value: dayOfWeek
                    }))}
                    value={availabilityForm.dayOfWeek}
                  />
                  <Field
                    helperText="Hora local en formato 24 horas."
                    label="Empieza a"
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, startsAt: value }))}
                    placeholder="HH:mm"
                    value={availabilityForm.startsAt}
                  />
                  <Field
                    helperText="Debe ser posterior a la hora de inicio."
                    label="Termina a"
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, endsAt: value }))}
                    placeholder="HH:mm"
                    value={availabilityForm.endsAt}
                  />
                  <Field
                    helperText="Numero maximo de reservas que puedes tomar en esta franja."
                    keyboardType="numeric"
                    label="Capacidad"
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, capacity: value }))}
                    value={availabilityForm.capacity}
                  />
                  <ChoiceBar
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, isActive: value === "active" }))}
                    options={[
                      { label: "Activo", value: "active" },
                      { label: "Inactivo", value: "inactive" }
                    ]}
                    value={availabilityForm.isActive ? "active" : "inactive"}
                  />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      label={availabilityForm.id ? "Guardar" : "Crear"}
                      onPress={() => {
                        clearMessages();

                        if (availabilityForm.id) {
                          const payload = buildAvailabilityRulePayload(availabilityForm) satisfies UpdateProviderAvailabilityRuleInput;
                          void runAction(
                            () =>
                              getMobileProvidersApiClient().updateProviderAvailabilityRule(availabilityForm.id!, payload),
                            "Horario actualizado."
                          ).then(async () => {
                            setDisponibilidadForm(emptyAvailabilityFormForSelectedService);
                            setIsAvailabilityFormVisible(false);
                            await refresh(selectedOrganization.id);
                          });
                          return;
                        }

                        const payload = {
                          organizationId: selectedOrganization.id,
                          ...buildAvailabilityRulePayload(availabilityForm)
                        } satisfies CreateProviderAvailabilityRuleInput;
                        void runAction(
                          () => getMobileProvidersApiClient().createProviderAvailabilityRule(payload),
                          "Horario guardado."
                        ).then(async () => {
                          setDisponibilidadForm(emptyAvailabilityFormForSelectedService);
                          setIsAvailabilityFormVisible(false);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                    />
                    <Button
                      disabled={isSubmitting}
                      label="Cancelar"
                      onPress={() => {
                        setDisponibilidadForm(emptyAvailabilityFormForSelectedService);
                        setIsAvailabilityFormVisible(false);
                      }}
                      tone="secondary"
                    />
                  </View>
                  </>
                  ) : null}
                </>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>Primero crea un servicio para configurar horarios.</Text>
                )
              ) : (
                <Text style={{ color: colorTokens.muted }}>Crea o selecciona tu negocio para configurar disponibilidad.</Text>
              )}
            </View>
            ) : null}

            {showDocuments ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Documentos de aprobacion</Text>
                <StatusChip label={`${selectedDocuments.length} cargados`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <Field label="Titulo del documento" onChange={(value) => setDocumentForm((current) => ({ ...current, title: value }))} value={documentForm.title} />
                  <ChoiceBar
                    onChange={(value) => setDocumentForm((current) => ({ ...current, documentType: value }))}
                    options={providerApprovalDocumentTypeOrder.map((documentType) => ({
                      label: providerApprovalDocumentTypeLabels[documentType],
                      value: documentType
                    }))}
                    value={documentForm.documentType}
                  />
                  <Button
                    disabled={isSubmitting}
                    label={documentForm.selectedDocument ? `Seleccionado: ${documentForm.selectedDocument.fileName}` : "Elegir documento de aprobacion"}
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

                        setDocumentForm((current) => ({
                          ...current,
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
                    label="Cargar documento de aprobacion"
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

                          return getMobileProvidersApiClient().uploadProviderApprovalDocument(selectedOrganization.id, {
                            title: documentForm.title.trim() || selectedDocument.fileName,
                            documentType: documentForm.documentType,
                            fileName: selectedDocument.fileName,
                            mimeType: selectedDocument.mimeType,
                            fileBytes
                          });
                        },
                        "Documento de aprobacion cargado."
                      ).then(async () => {
                        setDocumentForm(emptyDocumentForm);
                        await refresh(selectedOrganization.id);
                      });
                    }}
                  />
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showDocuments && selectedDocuments.length ? (
              <View style={{ gap: 8 }}>
                {selectedDocuments.map((document) => (
                  <View key={document.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{document.title}</Text>
                      <StatusChip label={providerApprovalDocumentTypeLabels[document.documentType]} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>{document.fileName}</Text>
                    <Text style={{ color: colorTokens.muted }}>
                      {document.mimeType ?? "Tipo de archivo desconocido"} - {formatFileSize(document.fileSizeBytes)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </CoreSectionCard>
    </View>
  );
}






