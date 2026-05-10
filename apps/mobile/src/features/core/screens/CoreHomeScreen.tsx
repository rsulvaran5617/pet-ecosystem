import { coreMvpBoundaries, coreRoleLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import { providerServiceCategoryLabels } from "@pet/config";
import type {
  AddPaymentMethodInput,
  CoreRole,
  MarketplaceCategoryHighlight,
  MarketplaceServiceSelection,
  BookingSummary,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpsertAddressInput,
  PetSummary,
  Reminder,
  UserPaymentMethod,
  Uuid
} from "@pet/types";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { CoreSectionCard } from "../components/CoreSectionCard";
import { StatusChip } from "../components/StatusChip";
import { useCoreWorkspace } from "../hooks/useCoreWorkspace";
import { getMobileCoreApiClient, getMobileRecoveryRedirectUrl } from "../services/supabase-mobile";
import { HouseholdsWorkspace } from "../../households/components/HouseholdsWorkspace";
import { PetsWorkspace } from "../../pets/components/PetsWorkspace";
import { usePetsWorkspace } from "../../pets/hooks/usePetsWorkspace";
import { HealthWorkspace } from "../../health/components/HealthWorkspace";
import { RemindersWorkspace } from "../../reminders/components/RemindersWorkspace";
import { useRemindersWorkspace } from "../../reminders/hooks/useRemindersWorkspace";
import { MarketplaceWorkspace } from "../../marketplace/components/MarketplaceWorkspace";
import { useMarketplaceWorkspace } from "../../marketplace/hooks/useMarketplaceWorkspace";
import { ProvidersWorkspace, type ProviderWorkspaceSection } from "../../providers/components/ProvidersWorkspace";
import { BookingsWorkspace, type BookingHubPanel } from "../../bookings/components/BookingsWorkspace";
import { useBookingsWorkspace } from "../../bookings/hooks/useBookingsWorkspace";
import { MessagingWorkspace } from "../../messaging/components/MessagingWorkspace";
import { ReviewsWorkspace } from "../../reviews/components/ReviewsWorkspace";
import { SupportWorkspace } from "../../support/components/SupportWorkspace";

type RegisterFormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: CoreRole;
};

type LoginFormState = {
  email: string;
  password: string;
};

type VerifyFormState = {
  email: string;
  token: string;
};

type RecoverFormState = {
  email: string;
};

type RecoveryPasswordFormState = {
  password: string;
  confirmPassword: string;
};

type PaymentFormState = Omit<AddPaymentMethodInput, "expMonth" | "expYear"> & {
  expMonth: string;
  expYear: string;
};

type OwnerSectionId = "inicio" | "mascotas" | "buscar" | "reservas" | "mensajes" | "cuenta";
type PetHubPanel = "detalle" | "salud" | "documentos" | "recordatorios";
type ProviderSectionId = ProviderWorkspaceSection | "mensajes" | "cuenta";
type OwnerHomePet = Pick<PetSummary, "avatarUrl" | "birthDate" | "breed" | "id" | "name" | "species">;
type OwnerHomeReminder = Pick<Reminder, "dueAt" | "id" | "petId" | "reminderType" | "status" | "title">;
type OwnerHomeBooking = Pick<BookingSummary, "id" | "petName" | "scheduledStartAt" | "serviceName" | "status">;
type OwnerHomePaymentMethod = Pick<UserPaymentMethod, "brand" | "isDefault" | "last4" | "status">;
type OwnerHomeServiceHighlight = Pick<MarketplaceCategoryHighlight, "category" | "providerCount" | "serviceCount">;

const ownerSections: Array<{ description: string; id: OwnerSectionId; label: string }> = [
  { id: "inicio", label: "Inicio", description: "Lo importante para cuidar a tus mascotas hoy." },
  { id: "mascotas", label: "Mascotas", description: "HOGAR SULVARAN VELASCO" },
  { id: "buscar", label: "Buscar", description: "Proveedores aprobados y servicios disponibles." },
  { id: "reservas", label: "Reservas", description: "Historial, detalle, reseñas y soporte por reserva." },
  { id: "mensajes", label: "Mensajes", description: "Conversaciones vinculadas a tus reservas." },
  { id: "cuenta", label: "Cuenta", description: "Perfil, hogar, preferencias y metodos guardados." }
];

const ownerSectionLookup = Object.fromEntries(
  ownerSections.map((section) => [section.id, section])
) as Record<OwnerSectionId, (typeof ownerSections)[number]>;
const ownerBottomSections = ownerSections;

const providerSections: Array<{ description: string; id: ProviderSectionId; label: string }> = [
  { id: "inicio", label: "Inicio", description: "Estado operativo, checklist y reservas que requieren accion." },
  { id: "negocio", label: "Negocio", description: "Organizacion y perfil publico del proveedor." },
  { id: "servicios", label: "Servicios", description: "Servicios activos, publicos y editables." },
  { id: "disponibilidad", label: "Horarios", description: "Bloques de disponibilidad publicados." },
  { id: "reservas", label: "Reservas", description: "Solicitudes entrantes y operacion de servicios." },
  { id: "mensajes", label: "Mensajes", description: "Conversaciones vinculadas a reservas." },
  { id: "estado", label: "Estado", description: "Aprobacion, documentos y visibilidad en marketplace." },
  { id: "cuenta", label: "Cuenta", description: "Perfil, preferencias y cambio de modo." }
];

const providerSectionLookup = Object.fromEntries(
  providerSections.map((section) => [section.id, section])
) as Record<ProviderSectionId, (typeof providerSections)[number]>;

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

const emptyRegisterForm: RegisterFormState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "pet_owner"
};

const emptyLoginForm: LoginFormState = {
  email: "",
  password: ""
};

const emptyVerifyForm: VerifyFormState = {
  email: "",
  token: ""
};

const emptyRecoverForm: RecoverFormState = {
  email: ""
};

const emptyRecoveryPasswordForm: RecoveryPasswordFormState = {
  password: "",
  confirmPassword: ""
};

const emptyProfileForm: UpdateProfileInput = {
  firstName: "",
  lastName: "",
  phone: "",
  avatarUrl: "",
  locale: "es"
};

const emptyPreferenceForm: Required<UpdatePreferencesInput> = {
  marketingOptIn: false,
  reminderEmailOptIn: true,
  reminderPushOptIn: true
};

const emptyAddressForm: UpsertAddressInput = {
  label: "home",
  recipientName: "",
  line1: "",
  line2: "",
  city: "",
  stateRegion: "",
  postalCode: "",
  countryCode: "PA",
  isDefault: true
};

const emptyPaymentForm: PaymentFormState = {
  brand: "visa",
  last4: "",
  expMonth: "",
  expYear: "",
  cardholderName: "",
  isDefault: true
};

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
        backgroundColor: tone === "primary" ? colorTokens.accent : colorTokens.surface,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(0,151,143,0.28)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: disabled ? 0.65 : 1,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontSize: 11, fontWeight: "900", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  helperText,
  keyboardType,
  label,
  onChange,
  placeholder,
  secureTextEntry,
  value
}: {
  helperText?: string;
  keyboardType?: "default" | "email-address" | "numeric";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: "900", color: colorTokens.mutedStrong }}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a8a29e"
        secureTextEntry={secureTextEntry}
        style={inputStyle}
        value={value}
      />
      {helperText ? <Text style={{ color: "#78716c", fontSize: 10, lineHeight: 14 }}>{helperText}</Text> : null}
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
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isActive ? "rgba(0,151,143,0.34)" : colorTokens.line,
              backgroundColor: isActive ? colorTokens.accentSoft : colorTokens.surface,
              paddingHorizontal: 10,
              paddingVertical: 7
            }}
          >
            <Text style={{ color: isActive ? colorTokens.accentDark : colorTokens.ink, fontSize: 10, fontWeight: "900" }}>{option.label}</Text>
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
        borderColor: tone === "error" ? "rgba(239,68,68,0.24)" : "rgba(0,151,143,0.2)",
        backgroundColor: tone === "error" ? colorTokens.dangerSoft : colorTokens.accentSoft,
        padding: 14
      }}
    >
      <Text style={{ color: tone === "error" ? "#991b1b" : colorTokens.accentDark, fontWeight: "700" }}>{message}</Text>
    </View>
  );
}

function SwitchRow({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ color: colorTokens.muted, flex: 1, fontSize: 11, lineHeight: 15 }}>{label}</Text>
      <Switch onValueChange={onChange} value={value} />
    </View>
  );
}

type OwnerIconName =
  | "bag"
  | "briefcase"
  | "calendar"
  | "card"
  | "chat"
  | "chevron"
  | "clock"
  | "close"
  | "heart"
  | "home"
  | "paw"
  | "plus"
  | "search"
  | "shield"
  | "user";

function OwnerLineIcon({ color, name, size = 24 }: { color: string; name: OwnerIconName; size?: number }) {
  const strokeProps = { fill: "none", stroke: color, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 2.4 };

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      {name === "home" ? (
        <>
          <Path d="M4 11.4 12 5l8 6.4" {...strokeProps} />
          <Path d="M7 10.8V20h10v-9.2" {...strokeProps} />
          <Path d="M10 20v-5h4v5" {...strokeProps} />
        </>
      ) : null}
      {name === "paw" ? (
        <>
          <Circle cx="7.3" cy="9" fill={color} r="2.2" />
          <Circle cx="12" cy="6.8" fill={color} r="2.2" />
          <Circle cx="16.7" cy="9" fill={color} r="2.2" />
          <Path d="M7.8 16.6c.4-3 2.2-5 4.2-5s3.8 2 4.2 5c.2 1.4-.8 2.4-2.1 2l-1.1-.3a3.4 3.4 0 0 0-2 0l-1.1.3c-1.3.4-2.3-.6-2.1-2Z" fill={color} />
        </>
      ) : null}
      {name === "search" ? (
        <>
          <Circle cx="10.5" cy="10.5" r="5.6" {...strokeProps} />
          <Path d="m15 15 4 4" {...strokeProps} />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <Rect height="14" rx="3" width="16" x="4" y="6" {...strokeProps} />
          <Path d="M8 4v4M16 4v4M4 10h16" {...strokeProps} />
        </>
      ) : null}
      {name === "chat" ? (
        <>
          <Path d="M5 6.8c0-1.5 1.2-2.8 2.8-2.8h8.4c1.6 0 2.8 1.3 2.8 2.8v5.4c0 1.5-1.2 2.8-2.8 2.8h-4.7L7 19v-4H7c-1.1 0-2-.9-2-2V6.8Z" {...strokeProps} />
          <Path d="M9 9.5h.1M12 9.5h.1M15 9.5h.1" {...strokeProps} />
        </>
      ) : null}
      {name === "user" ? (
        <>
          <Circle cx="12" cy="8" r="3.5" {...strokeProps} />
          <Path d="M5.5 20c.8-3.4 3.2-5.2 6.5-5.2s5.7 1.8 6.5 5.2" {...strokeProps} />
        </>
      ) : null}
      {name === "card" ? (
        <>
          <Rect height="12" rx="2.4" width="18" x="3" y="6" {...strokeProps} />
          <Path d="M3 10h18M7 14h5" {...strokeProps} />
          <Circle cx="16.8" cy="14" fill={color} r="1.4" />
        </>
      ) : null}
      {name === "close" ? <Path d="m7 7 10 10M17 7 7 17" {...strokeProps} /> : null}
      {name === "chevron" ? <Path d="m9 5 7 7-7 7" {...strokeProps} /> : null}
      {name === "heart" ? (
        <Path d="M12 19s-6-3.6-7.4-7.3C3.5 8.8 5.2 6 8.1 6c1.6 0 2.9.9 3.9 2 1-1.1 2.3-2 3.9-2 2.9 0 4.6 2.8 3.5 5.7C18 15.4 12 19 12 19Z" {...strokeProps} />
      ) : null}
      {name === "bag" ? (
        <>
          <Path d="M7 9V7a5 5 0 0 1 10 0v2" {...strokeProps} />
          <Rect height="12" rx="3" width="16" x="4" y="8" {...strokeProps} />
        </>
      ) : null}
      {name === "briefcase" ? (
        <>
          <Path d="M9 7V5.8C9 4.8 9.8 4 10.8 4h2.4c1 0 1.8.8 1.8 1.8V7" {...strokeProps} />
          <Rect height="12" rx="3" width="18" x="3" y="7" {...strokeProps} />
          <Path d="M3 12h18M10 12v1.4h4V12" {...strokeProps} />
        </>
      ) : null}
      {name === "clock" ? (
        <>
          <Circle cx="12" cy="12" r="8" {...strokeProps} />
          <Path d="M12 7.5V12l3 2" {...strokeProps} />
        </>
      ) : null}
      {name === "shield" ? (
        <Path d="M12 21s7-3.2 7-10V6.5L12 4 5 6.5V11c0 6.8 7 10 7 10Z" {...strokeProps} />
      ) : null}
      {name === "plus" ? <Path d="M12 5v14M5 12h14" {...strokeProps} /> : null}
    </Svg>
  );
}

function getPetAgeLabel(birthDate: string | null) {
  if (!birthDate) {
    return "Edad pendiente";
  }

  const birth = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(birth.getTime())) {
    return "Edad pendiente";
  }

  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();

  if (today.getDate() < birth.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} ${years === 1 ? "ano" : "anos"}`;
  }

  return `${Math.max(months, 0)} ${months === 1 ? "mes" : "meses"}`;
}

function formatShortDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha pendiente";
  }

  return date.toLocaleDateString("es-PA", { day: "numeric", month: "short" });
}

function formatActivityDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha pendiente";
  }

  return date.toLocaleDateString("es-PA", { day: "numeric", month: "short" }) + " · " +
    date.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit" });
}

function getServiceHighlightTone(category: OwnerHomeServiceHighlight["category"], index: number) {
  if (category === "veterinary" || category === "sitting") return "accent";
  if (category === "walking" || category === "daycare") return "warning";
  if (category === "boarding" || category === "grooming") return "purple";
  return (["accent", "blue", "purple", "warning"] as const)[index % 4];
}

function getServiceHighlightIcon(category: OwnerHomeServiceHighlight["category"]): OwnerIconName {
  if (category === "veterinary") return "plus";
  if (category === "boarding" || category === "grooming") return "bag";
  if (category === "walking" || category === "sitting") return "user";
  return "paw";
}

function OwnerShellHeader({
  section
}: {
  section: OwnerSectionId;
}) {
  const sectionConfig = ownerSectionLookup[section];
  const isPetsSection = section === "mascotas";
  const isSearchSection = section === "buscar";
  const isBookingsSection = section === "reservas";
  const isMessagesSection = section === "mensajes";
  const isAccountSection = section === "cuenta";
  const hasGreenHeader = isPetsSection || isSearchSection || isBookingsSection || isMessagesSection || isAccountSection;
  const isCompactHeader = isSearchSection || isBookingsSection || isMessagesSection || isAccountSection;

  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: hasGreenHeader ? colorTokens.accentDark : colorTokens.surface,
        padding: 20,
        gap: 8,
        ...visualTokens.mobile.shadow
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text
            style={{
              color: hasGreenHeader ? "#ffffff" : colorTokens.ink,
              fontSize: isCompactHeader ? 18 : 30,
              fontWeight: "800",
              lineHeight: isCompactHeader ? 22 : 34
            }}
          >
            {sectionConfig.label}
          </Text>
          <Text
            style={{
              color: hasGreenHeader ? "rgba(255,255,255,0.9)" : colorTokens.muted,
              fontSize: hasGreenHeader ? 9 : 15,
              fontWeight: hasGreenHeader ? "800" : "400",
              lineHeight: hasGreenHeader ? 12 : 22
            }}
          >
            {sectionConfig.description}
          </Text>
          {isPetsSection ? (
            <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 10, lineHeight: 13 }}>
              Todo lo que necesitas para su bienestar.
            </Text>
          ) : null}
        </View>
        <StatusChip label="Propietario" tone="active" />
      </View>
    </View>
  );
}

function ProviderShellHeader({
  ownerName,
  section
}: {
  ownerName: string;
  section: ProviderSectionId;
}) {
  const sectionConfig = providerSectionLookup[section];
  const isAccountSection = section === "cuenta";
  const isHomeSection = section === "inicio";
  const isBusinessSection = section === "negocio";
  const isServicesSection = section === "servicios";
  const isAvailabilitySection = section === "disponibilidad";
  const hasGreenHeader = isAccountSection || isHomeSection || isBusinessSection || isServicesSection || isAvailabilitySection;

  return (
    <View style={{ borderRadius: 28, backgroundColor: hasGreenHeader ? colorTokens.accentDark : colorTokens.surface, padding: 20, gap: 10, ...visualTokens.mobile.shadow }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ fontSize: hasGreenHeader ? 18 : 30, fontWeight: "800", lineHeight: hasGreenHeader ? 22 : 34, color: hasGreenHeader ? "#ffffff" : colorTokens.ink }}>{sectionConfig.label}</Text>
          <Text style={{ fontSize: hasGreenHeader ? 9 : 15, fontWeight: hasGreenHeader ? "800" : "400", lineHeight: hasGreenHeader ? 12 : 22, color: hasGreenHeader ? "rgba(255,255,255,0.9)" : colorTokens.muted }}>{sectionConfig.description}</Text>
        </View>
        <StatusChip label="Proveedor" tone="active" />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {hasGreenHeader ? (
          <View style={{ borderColor: "rgba(255,255,255,0.28)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>{ownerName}</Text>
          </View>
        ) : (
          <StatusChip label={ownerName} tone="neutral" />
        )}
      </View>
    </View>
  );
}

function OwnerHome({
  bookings,
  householdName,
  onNavigate,
  onSelectPet,
  pets,
  paymentMethods,
  reminders,
  serviceHighlights,
  roleSwitchConfirmed
}: {
  bookings: OwnerHomeBooking[];
  householdName: string;
  onNavigate: (section: OwnerSectionId) => void;
  onSelectPet: (petId: Uuid) => void;
  pets: OwnerHomePet[];
  paymentMethods: OwnerHomePaymentMethod[];
  reminders: OwnerHomeReminder[];
  serviceHighlights: OwnerHomeServiceHighlight[];
  roleSwitchConfirmed?: boolean;
}) {
  const toneStyles = {
    accent: { backgroundColor: colorTokens.accentSoft, color: colorTokens.accentDark },
    blue: { backgroundColor: colorTokens.blueSoft, color: colorTokens.blue },
    purple: { backgroundColor: colorTokens.purpleSoft, color: colorTokens.purple },
    warning: { backgroundColor: colorTokens.warningSoft, color: colorTokens.warning }
  } as const;
  const petTones = ["accent", "blue", "purple", "warning"] as const;
  const pendingReminders = reminders
    .filter((reminder) => reminder.status === "pending")
    .sort((firstReminder, secondReminder) => new Date(firstReminder.dueAt).getTime() - new Date(secondReminder.dueAt).getTime());
  const completedVaccineCount = reminders.filter(
    (reminder) => reminder.reminderType === "vaccine" && reminder.status === "completed"
  ).length;
  const nextReminder = pendingReminders[0] ?? null;
  const nextReminderPetName = nextReminder?.petId ? pets.find((pet) => pet.id === nextReminder.petId)?.name : null;
  const nextReminderTitle = nextReminder
    ? `${nextReminder.title}${nextReminderPetName ? ` de ${nextReminderPetName}` : ""}`
    : "Sin pendientes";
  const now = Date.now();
  const nextBooking =
    bookings
      .filter((booking) => booking.status !== "cancelled" && new Date(booking.scheduledStartAt).getTime() >= now)
      .sort((firstBooking, secondBooking) => new Date(firstBooking.scheduledStartAt).getTime() - new Date(secondBooking.scheduledStartAt).getTime())[0] ??
    bookings
      .filter((booking) => booking.status !== "cancelled")
      .sort((firstBooking, secondBooking) => new Date(secondBooking.scheduledStartAt).getTime() - new Date(firstBooking.scheduledStartAt).getTime())[0] ??
    null;
  const defaultPaymentMethod = paymentMethods.find((paymentMethod) => paymentMethod.isDefault) ?? paymentMethods[0] ?? null;
  const hasActivePaymentMethod = paymentMethods.some((paymentMethod) => paymentMethod.status === "active");
  const paymentBannerTitle = hasActivePaymentMethod ? "Metodos guardados listos" : "Agrega un metodo guardado";
  const paymentBannerSubtitle = defaultPaymentMethod
    ? `${defaultPaymentMethod.brand.toUpperCase()} terminada en ${defaultPaymentMethod.last4}`
    : "para futuras reservas.";

  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          backgroundColor: colorTokens.accent,
          borderRadius: 28,
          padding: 20,
          gap: 16,
          ...visualTokens.mobile.shadow
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
            <Text style={{ color: "rgba(255,255,255,0.84)", fontSize: 14, lineHeight: 19 }}>Hola, Ramón 👋</Text>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              style={{ color: "#ffffff", flexShrink: 1, fontSize: 25, fontWeight: "800", lineHeight: 29, textAlign: "left" }}
            >
              {householdName}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 18 }}>¡Que bueno verte de nuevo!</Text>
          </View>
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
              borderColor: "rgba(255,255,255,0.34)",
              borderRadius: 999,
              borderWidth: 1,
              flexDirection: "row",
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 9
            }}
          >
            <OwnerLineIcon color="#ffffff" name="user" size={20} />
            <View style={{ gap: 1 }}>
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800", lineHeight: 16 }}>Propietario</Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 10, fontWeight: "700", lineHeight: 12 }}>Hogar principal</Text>
            </View>
            {roleSwitchConfirmed ? (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.24)",
                  borderRadius: 999,
                  height: 21,
                  justifyContent: "center",
                  width: 21
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900" }}>✓</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <Text style={{ color: colorTokens.ink, fontSize: 14, fontWeight: "800" }}>Mis mascotas</Text>
          <Pressable onPress={() => onNavigate("mascotas")}>
            <Text style={{ color: colorTokens.mutedStrong, fontSize: 11, fontWeight: "700" }}>Ver todas ›</Text>
          </Pressable>
        </View>
        {pets.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 10, paddingRight: 6 }}>
              {pets.map((pet, index) => {
                const toneStyle = toneStyles[petTones[index % petTones.length]];
                const petInitial = pet.name.trim().slice(0, 1).toUpperCase() || "M";

                return (
                  <Pressable
                    key={pet.id}
                    onPress={() => onSelectPet(pet.id)}
                    style={{
                      alignItems: "center",
                      backgroundColor: colorTokens.surface,
                      borderColor: colorTokens.line,
                      borderRadius: 18,
                      borderWidth: 1,
                      flexDirection: "row",
                      gap: 9,
                      padding: 10,
                      width: 194,
                      ...visualTokens.mobile.softShadow
                    }}
                  >
                    <View
                      style={{
                        alignItems: "center",
                        backgroundColor: toneStyle.backgroundColor,
                        borderRadius: 999,
                        height: 46,
                        justifyContent: "center",
                        width: 46
                      }}
                    >
                      {pet.avatarUrl ? (
                        <Image source={{ uri: pet.avatarUrl }} style={{ borderRadius: 23, height: 46, width: 46 }} />
                      ) : (
                        <Text style={{ color: toneStyle.color, fontSize: 18, fontWeight: "900" }}>{petInitial}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        style={{ color: colorTokens.ink, flexShrink: 1, fontSize: 14, fontWeight: "800", lineHeight: 17 }}
                      >
                        {pet.name}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 16 }}>
                        {pet.breed ?? pet.species}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colorTokens.mutedStrong, fontSize: 12, lineHeight: 16 }}>
                        {getPetAgeLabel(pet.birthDate)}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colorTokens.accentSoft, borderRadius: 999, padding: 6 }}>
                      <OwnerLineIcon color={colorTokens.accentDark} name="heart" size={16} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <Pressable
            onPress={() => onNavigate("mascotas")}
            style={{
              backgroundColor: colorTokens.surface,
              borderColor: colorTokens.line,
              borderRadius: 18,
              borderWidth: 1,
              padding: 14,
              ...visualTokens.mobile.softShadow
            }}
          >
            <Text style={{ color: colorTokens.ink, fontSize: 16, fontWeight: "800" }}>Agrega tu primera mascota</Text>
            <Text style={{ color: colorTokens.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }}>
              Cuando registres mascotas del hogar, apareceran aqui.
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ borderRadius: 22, backgroundColor: colorTokens.surface, padding: 14, gap: 12, ...visualTokens.mobile.shadow }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: colorTokens.accentSoft,
                borderRadius: 12,
                height: 28,
                justifyContent: "center",
                width: 28
              }}
            >
              <OwnerLineIcon color={colorTokens.accentDark} name="calendar" size={17} />
            </View>
            <Text style={{ color: colorTokens.ink, flex: 1, fontSize: 13, fontWeight: "800" }}>Tu proxima actividad</Text>
          </View>
          <OwnerLineIcon color={colorTokens.muted} name="chevron" size={18} />
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: "#e0f2ef",
              borderColor: "rgba(0,151,143,0.12)",
              borderRadius: 999,
              borderWidth: 1,
              height: 66,
              justifyContent: "center",
              width: 66
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: colorTokens.surface,
                borderRadius: 999,
                height: 50,
                justifyContent: "center",
                width: 50
              }}
            >
              <OwnerLineIcon color={colorTokens.accentDark} name="paw" size={25} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: colorTokens.accentSoft,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3
              }}
            >
              <Text style={{ color: colorTokens.accentDark, fontSize: 8, fontWeight: "800" }}>
                {nextBooking ? nextBooking.status : "Sin reserva"}
              </Text>
            </View>
            <Text numberOfLines={1} style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "800", lineHeight: 16 }}>
              {nextBooking?.serviceName ?? "Sin actividad programada"}
            </Text>
            <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 9, lineHeight: 13 }}>
              {nextBooking ? formatActivityDateTime(nextBooking.scheduledStartAt) : "Busca servicios para crear una reserva"}
            </Text>
            <Text numberOfLines={1} style={{ color: colorTokens.mutedStrong, fontSize: 9, fontWeight: "700", lineHeight: 13 }}>
              {nextBooking?.petName ?? "Mascota pendiente"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => onNavigate("reservas")}
          style={{
            alignSelf: "flex-end",
            backgroundColor: colorTokens.accent,
            borderRadius: 12,
            minWidth: 118,
            paddingHorizontal: 16,
            paddingVertical: 9,
            ...visualTokens.mobile.softShadow
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800", textAlign: "center" }}>Ver detalles</Text>
        </Pressable>
      </View>

      <View style={{ borderRadius: 22, backgroundColor: colorTokens.surface, padding: 14, gap: 9, ...visualTokens.mobile.shadow }}>
        <Text style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "800" }}>Salud y recordatorios</Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
          <View style={{ backgroundColor: colorTokens.accentSoft, borderRadius: 999, padding: 12 }}>
            <OwnerLineIcon color={colorTokens.accentDark} name="paw" size={20} />
          </View>
          <View style={{ flex: 1, flexDirection: "row", gap: 9 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colorTokens.accentDark, fontSize: 19, fontWeight: "900", lineHeight: 21 }}>{completedVaccineCount}</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 8, lineHeight: 11 }}>Vacunas al dia</Text>
              <Text style={{ color: colorTokens.accentDark, fontSize: 8, fontWeight: "800", lineHeight: 11 }}>
                {completedVaccineCount > 0 ? "¡Bien hecho!" : "Sin vacunas cerradas"}
              </Text>
            </View>
            <View style={{ backgroundColor: colorTokens.line, width: 1 }} />
            <View style={{ flex: 1.1, gap: 2 }}>
              <Text style={{ color: colorTokens.warning, fontSize: 19, fontWeight: "900", lineHeight: 21 }}>{pendingReminders.length}</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 8, lineHeight: 11 }}>Recordatorio pendiente</Text>
              <Text numberOfLines={1} style={{ color: colorTokens.mutedStrong, fontSize: 8, fontWeight: "700", lineHeight: 11 }}>
                {nextReminder ? `${nextReminderTitle} · ${formatShortDateTime(nextReminder.dueAt)}` : "Todo al dia"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <Text style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "800" }}>Servicios destacados</Text>
          <Pressable onPress={() => onNavigate("buscar")}>
            <Text style={{ color: colorTokens.mutedStrong, fontSize: 10, fontWeight: "700" }}>Ver mas ›</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 12, paddingRight: 6 }}>
            {serviceHighlights.length ? serviceHighlights.slice(0, 6).map((item, index) => {
              const tone = getServiceHighlightTone(item.category, index);
              const icon = getServiceHighlightIcon(item.category);
              const toneStyle = toneStyles[tone];

              return (
                <Pressable
                  key={item.category}
                  onPress={() => onNavigate("buscar")}
                  style={{
                    backgroundColor: colorTokens.surface,
                    borderColor: colorTokens.line,
                    borderRadius: 18,
                    borderWidth: 1,
                    overflow: "hidden",
                    width: 128,
                    ...visualTokens.mobile.softShadow
                  }}
                >
                  <View style={{ alignItems: "center", backgroundColor: toneStyle.backgroundColor, height: 62, justifyContent: "center" }}>
                    <OwnerLineIcon color={toneStyle.color} name={icon} size={22} />
                  </View>
                  <View style={{ padding: 9, gap: 3 }}>
                    <View style={{ alignSelf: "flex-start", backgroundColor: toneStyle.backgroundColor, borderRadius: 999, padding: 5 }}>
                      <OwnerLineIcon color={toneStyle.color} name={icon} size={11} />
                    </View>
                    <Text style={{ color: colorTokens.ink, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>
                      {providerServiceCategoryLabels[item.category]}
                    </Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 8, lineHeight: 11 }}>
                      {item.serviceCount} servicio(s)
                    </Text>
                  </View>
                </Pressable>
              );
            }) : (
              <Pressable
                onPress={() => onNavigate("buscar")}
                style={{
                  backgroundColor: colorTokens.surface,
                  borderColor: colorTokens.line,
                  borderRadius: 18,
                  borderWidth: 1,
                  padding: 12,
                  width: 168,
                  ...visualTokens.mobile.softShadow
                }}
              >
                <Text style={{ color: colorTokens.ink, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>Sin servicios publicados</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 8, lineHeight: 11, marginTop: 3 }}>
                  Busca proveedores cuando haya catalogo disponible.
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>

      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(230,247,245,0.72)",
          borderColor: "rgba(0,151,143,0.24)",
          borderRadius: 16,
          borderWidth: 1,
          flexDirection: "row",
          gap: 9,
          paddingHorizontal: 11,
          paddingVertical: 10
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#d1fae5",
            borderRadius: 12,
            height: 30,
            justifyContent: "center",
            width: 30
          }}
        >
          <OwnerLineIcon color={colorTokens.success} name="card" size={17} />
        </View>
        <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colorTokens.ink, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>
            {paymentBannerTitle}
          </Text>
          <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 8, lineHeight: 11 }}>
            {paymentBannerSubtitle}
          </Text>
        </View>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colorTokens.surface,
            borderRadius: 10,
            height: 34,
            justifyContent: "center",
            transform: [{ rotate: "-8deg" }],
            width: 46,
            ...visualTokens.mobile.softShadow
          }}
        >
          <OwnerLineIcon color={colorTokens.accentDark} name="card" size={20} />
        </View>
        <Pressable
          accessibilityLabel="Cerrar aviso"
          style={{ alignItems: "center", height: 24, justifyContent: "center", width: 18 }}
        >
          <OwnerLineIcon color={colorTokens.muted} name="close" size={14} />
        </Pressable>
      </View>
    </View>
  );
}

export function CoreHomeScreen() {
  const {
    authState,
    snapshot,
    configError,
    errorMessage,
    infoMessage,
    isLoading,
    isRecoverySession,
    isSubmitting,
    clearMessages,
    clearRecoverySession,
    refresh,
    runAction
  } = useCoreWorkspace();
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [verifyForm, setVerifyForm] = useState(emptyVerifyForm);
  const [recoverForm, setRecoverForm] = useState(emptyRecoverForm);
  const [recoveryPasswordForm, setRecoveryPasswordForm] = useState(emptyRecoveryPasswordForm);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [isProfileFormVisible, setIsProfileFormVisible] = useState(false);
  const [preferenceForm, setPreferenceForm] = useState(emptyPreferenceForm);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [isAddressFormVisible, setIsAddressFormVisible] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [marketplaceSelection, setMarketplaceSelection] = useState<MarketplaceServiceSelection | null>(null);
  const [focusedBookingId, setFocusedBookingId] = useState<Uuid | null>(null);
  const [chatFocusVersion, setChatFocusVersion] = useState(0);
  const [focusedReviewBookingId, setFocusedReviewBookingId] = useState<Uuid | null>(null);
  const [reviewFocusVersion, setReviewFocusVersion] = useState(0);
  const [focusedSupportBookingId, setFocusedSupportBookingId] = useState<Uuid | null>(null);
  const [supportFocusVersion, setSupportFocusVersion] = useState(0);
  const [activeOwnerSection, setActiveOwnerSection] = useState<OwnerSectionId>("inicio");
  const [activeProviderSection, setActiveProviderSection] = useState<ProviderSectionId>("inicio");
  const [activePetHubPanel, setActivePetHubPanel] = useState<PetHubPanel>("detalle");
  const [petHubContext, setPetHubContext] = useState<{ householdId: Uuid | null; petId: Uuid | null }>({
    householdId: null,
    petId: null
  });
  const [pendingPetHubPetId, setPendingPetHubPetId] = useState<Uuid | null>(null);
  const [activeBookingHubPanel, setActiveBookingHubPanel] = useState<BookingHubPanel>("detalle");
  const [bookingHubContext, setBookingHubContext] = useState<{ bookingId: Uuid | null }>({
    bookingId: null
  });

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setProfileForm({
      firstName: snapshot.profile.firstName,
      lastName: snapshot.profile.lastName,
      phone: snapshot.profile.phone ?? "",
      avatarUrl: snapshot.profile.avatarUrl ?? "",
      locale: snapshot.profile.locale
    });
    setPreferenceForm({
      marketingOptIn: snapshot.preferences.marketingOptIn,
      reminderEmailOptIn: snapshot.preferences.reminderEmailOptIn,
      reminderPushOptIn: snapshot.preferences.reminderPushOptIn
    });
    setRecoverForm({ email: snapshot.profile.email });
    setVerifyForm((currentForm) => ({ ...currentForm, email: currentForm.email || snapshot.profile.email }));
  }, [snapshot]);

  const hasProviderRole = snapshot?.roles.some((role) => role.role === "provider") ?? false;
  const activeRole = snapshot?.roles.find((role) => role.isActive)?.role ?? "pet_owner";
  const isProviderMode = activeRole === "provider" && hasProviderRole;
  const isRoleSwitchInfoMessage = infoMessage?.startsWith("Rol activo cambiado a ") ?? false;
  const petsWorkspace = usePetsWorkspace(authState.isAuthenticated && !isProviderMode);
  const remindersWorkspace = useRemindersWorkspace(authState.isAuthenticated && !isProviderMode);
  const bookingsWorkspace = useBookingsWorkspace(authState.isAuthenticated && !isProviderMode, null);
  const marketplaceWorkspace = useMarketplaceWorkspace(authState.isAuthenticated && !isProviderMode);
  const selectedHouseholdSummary =
    petsWorkspace.householdSnapshot?.households.find((household) => household.id === petsWorkspace.selectedHouseholdId) ??
    petsWorkspace.householdSnapshot?.households[0] ??
    null;
  const defaultHouseholdName =
    selectedHouseholdSummary?.name ?? "Hogar principal";
  const accountOnboardingTasks =
    snapshot?.onboardingTasks.filter((task) => !isProviderMode || task.id !== "add_payment_method") ?? [];
  const isAccountSectionActive = isProviderMode ? activeProviderSection === "cuenta" : activeOwnerSection === "cuenta";

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colorTokens.canvas }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color={colorTokens.accent} />
          <Text style={{ color: colorTokens.muted }}>Preparando tu experiencia...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorTokens.canvas }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding: visualTokens.mobile.screenPadding, gap: 20 }}>
        {authState.isAuthenticated && snapshot ? (
          isProviderMode ? (
            <ProviderShellHeader
              ownerName={`${snapshot.profile.firstName} ${snapshot.profile.lastName}`.trim() || snapshot.profile.email}
              section={activeProviderSection}
            />
          ) : activeOwnerSection === "inicio" ? null : (
          <OwnerShellHeader
            section={activeOwnerSection}
          />
          )
        ) : (
          <View style={{ borderRadius: 28, backgroundColor: colorTokens.admin, padding: 24, gap: 14, ...visualTokens.mobile.shadow }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#99f6e4" }}>
              Bienvenido
            </Text>
            <Text style={{ fontSize: 34, fontWeight: "700", lineHeight: 38, color: "#f8fafc" }}>
              Cuidado y servicios para tus mascotas
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 24, color: "rgba(248,250,252,0.8)" }}>
              Crea tu cuenta o inicia sesion para gestionar mascotas, reservas y mensajes.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <StatusChip label="acceso pendiente" tone="pending" />
              <StatusChip label={coreMvpBoundaries.paymentCaptureInCore ? "cobro activo" : "sin cobro real"} tone="neutral" />
            </View>
          </View>
        )}

        {configError ? <Notice message={configError} tone="error" /> : null}
        {!configError && errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
        {!configError && infoMessage && !isRoleSwitchInfoMessage ? <Notice message={infoMessage} tone="info" /> : null}
        {isRecoverySession ? (
          <Notice
            message="Se detecto una sesion de recuperacion. Define una nueva contrasena abajo para completar el acceso."
            tone="info"
          />
        ) : null}

        {!configError && isRecoverySession ? (
          <CoreSectionCard
            eyebrow="Sesion de recuperacion"
            title="Define una nueva contrasena"
            description="Tu sesion de recuperacion ya fue validada. Guarda aqui la nueva contrasena para completar el acceso."
          >
            <View style={{ gap: 12 }}>
              <Field
                label="Nueva contrasena"
                onChange={(value) => setRecoveryPasswordForm((currentForm) => ({ ...currentForm, password: value }))}
                secureTextEntry
                value={recoveryPasswordForm.password}
              />
              <Field
                label="Confirmar nueva contrasena"
                onChange={(value) =>
                  setRecoveryPasswordForm((currentForm) => ({ ...currentForm, confirmPassword: value }))
                }
                secureTextEntry
                value={recoveryPasswordForm.confirmPassword}
              />
                <Button
                  disabled={isSubmitting}
                  label="Actualizar contrasena"
                  onPress={() => {
                    clearMessages();
                    const recoveryEmail = authState.email ?? recoverForm.email;
                    void runAction(
                      async () => {
                        if (!recoveryPasswordForm.password) {
                          throw new Error("Se requiere una nueva contrasena.");
                        }

                      if (recoveryPasswordForm.password !== recoveryPasswordForm.confirmPassword) {
                        throw new Error("Las contrasenas de recuperacion deben coincidir.");
                      }

                        await getMobileCoreApiClient().completeRecovery({
                          password: recoveryPasswordForm.password
                        });

                        await getMobileCoreApiClient().logout();
                      },
                      "Contrasena actualizada. Inicia sesion con la nueva contrasena.",
                      false
                    ).then(() => {
                      clearRecoverySession();
                      setRecoveryPasswordForm(emptyRecoveryPasswordForm);
                      setLoginForm((currentForm) => ({ ...currentForm, email: recoveryEmail, password: "" }));
                      setRecoverForm({ email: recoveryEmail });
                    });
                  }}
                />
              </View>
            </CoreSectionCard>
        ) : null}

        {!authState.isAuthenticated ? (
          <>
            <CoreSectionCard
              eyebrow="Registro"
              title="Crear cuenta"
              description="Completa tus datos para empezar a cuidar a tus mascotas desde la app."
            >
              <View style={{ gap: 12 }}>
                <Field
                  keyboardType="email-address"
                  label="Email"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, email: value }))}
                  value={registerForm.email}
                />
                <Field
                  label="Contrasena"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, password: value }))}
                  secureTextEntry
                  value={registerForm.password}
                />
                <Field
                  label="Nombre"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, firstName: value }))}
                  value={registerForm.firstName}
                />
                <Field
                  label="Apellido"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, lastName: value }))}
                  value={registerForm.lastName}
                />
                <ChoiceBar
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, role: value }))}
                  options={[
                    { label: coreRoleLabels.pet_owner, value: "pet_owner" },
                    { label: coreRoleLabels.provider, value: "provider" }
                  ]}
                  value={registerForm.role}
                />
                <Button
                  disabled={isSubmitting}
                  label="Crear cuenta"
                  onPress={() => {
                    clearMessages();
                    setVerifyForm((currentForm) => ({ ...currentForm, email: registerForm.email }));
                    setRecoverForm({ email: registerForm.email });
                    void runAction(
                      () =>
                        getMobileCoreApiClient().register({
                          email: registerForm.email,
                          password: registerForm.password,
                          firstName: registerForm.firstName,
                          lastName: registerForm.lastName,
                          requestedRoles: [registerForm.role]
                        }),
                      "Registro enviado. Completa la verificacion por correo si tu cuenta lo requiere."
                    );
                  }}
                />
              </View>
            </CoreSectionCard>

            <CoreSectionCard
              eyebrow="Acceso"
              title="Inicio de sesion, verificacion y recuperacion"
              description="Usa tu correo para entrar, verificar tu cuenta o recuperar el acceso."
            >
              <View style={{ gap: 12 }}>
                <Field
                  keyboardType="email-address"
                  label="Correo de acceso"
                  onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, email: value }))}
                  value={loginForm.email}
                />
                <Field
                  label="Contrasena de acceso"
                  onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, password: value }))}
                  secureTextEntry
                  value={loginForm.password}
                />
                <Button
                  disabled={isSubmitting}
                  label="Iniciar sesion"
                  onPress={() => {
                    clearMessages();
                    setVerifyForm((currentForm) => ({ ...currentForm, email: loginForm.email }));
                    setRecoverForm({ email: loginForm.email });
                    void runAction(
                      () =>
                        getMobileCoreApiClient().login({
                          email: loginForm.email,
                          password: loginForm.password
                        }),
                      "Sesion autenticada."
                    );
                  }}
                />
                <Field
                  keyboardType="email-address"
                  label="Correo de verificacion"
                  onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, email: value }))}
                  value={verifyForm.email}
                />
                <Field
                  label="Codigo OTP de 6 digitos"
                  onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                  value={verifyForm.token}
                />
                <Button
                  disabled={isSubmitting}
                  label="Verificar OTP"
                  onPress={() => {
                    clearMessages();
                    void runAction(
                      () =>
                        getMobileCoreApiClient().verifyOtp({
                          email: verifyForm.email,
                          token: verifyForm.token
                        }),
                      "Verificacion de correo completada."
                    );
                  }}
                  tone="secondary"
                />
                <Field
                  keyboardType="email-address"
                  label="Correo de recuperacion"
                  onChange={(value) => setRecoverForm({ email: value })}
                  value={recoverForm.email}
                />
                <Button
                  disabled={isSubmitting}
                  label="Enviar correo de recuperacion"
                  onPress={() => {
                    clearMessages();
                    void runAction(
                      () =>
                        getMobileCoreApiClient().recoverAccess({
                          email: recoverForm.email,
                          redirectTo: getMobileRecoveryRedirectUrl()
                        }),
                      "Correo de recuperacion solicitado.",
                      false
                    );
                  }}
                  tone="secondary"
                />
              </View>
            </CoreSectionCard>
          </>
        ) : null}

        {authState.isAuthenticated && snapshot && isAccountSectionActive ? (
          <>
            <View style={{ borderRadius: 18, backgroundColor: colorTokens.accentDark, padding: 14, gap: 5, ...visualTokens.mobile.shadow }}>
              <Text style={{ fontSize: 15, lineHeight: 19, fontWeight: "900", color: "#ffffff" }}>Tu cuenta</Text>
              <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 10, fontWeight: "700", lineHeight: 14 }}>
                {isProviderMode
                  ? "Gestiona tu perfil, preferencias y modo de uso."
                  : "Gestiona perfil, hogar, direcciones y metodos guardados."}
              </Text>
            </View>

            <CoreSectionCard
              eyebrow="Acceso"
              title="Inicio de sesion"
              description="Correo, estado de cuenta y opciones de acceso."
            >
              <View style={{ gap: 9 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                  <StatusChip label={snapshot.verification.status === "verified" ? "Verificado" : "Por verificar"} tone={snapshot.verification.status === "verified" ? "active" : "pending"} />
                  <StatusChip label={snapshot.verification.channel === "email" ? "Correo" : snapshot.verification.channel} tone="neutral" />
                  <StatusChip label={snapshot.profile.email} tone="neutral" />
                </View>
                <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                  Recuperacion disponible en {snapshot.recovery.maskedDestination}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} label="Actualizar" onPress={() => void refresh()} tone="secondary" />
                  <Button
                    disabled={isSubmitting}
                    label="Cerrar sesion"
                    onPress={() => {
                      void runAction(() => getMobileCoreApiClient().logout(), "Sesion cerrada.");
                    }}
                    tone="secondary"
                  />
                </View>
              </View>
            </CoreSectionCard>

            <CoreSectionCard
              eyebrow="Pendientes"
              title="Pasos de cuenta"
              description={
                isProviderMode
                  ? "Completa lo necesario para operar como proveedor."
                  : "Completa lo necesario para usar mejor la app."
              }
            >
              <View style={{ gap: 8 }}>
                {accountOnboardingTasks.map((task) => (
                  <View key={task.id} style={{ borderRadius: 14, backgroundColor: "rgba(247,242,231,0.84)", padding: 10, gap: 6 }}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: task.status === "completed" ? colorTokens.accentDark : "rgba(249,115,22,0.14)",
                          borderColor: task.status === "completed" ? "rgba(0,122,107,0.22)" : "rgba(249,115,22,0.28)",
                          borderRadius: 999,
                          borderWidth: 1,
                          height: 24,
                          justifyContent: "center",
                          width: 24
                        }}
                      >
                        <Text style={{ color: task.status === "completed" ? "#ffffff" : "#c2410c", fontSize: 13, fontWeight: "900", lineHeight: 15 }}>
                          {task.status === "completed" ? "✓" : "!"}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", lineHeight: 16 }}>{task.title}</Text>
                        <Text style={{ fontSize: 10, lineHeight: 14, color: "#57534e" }}>{task.description}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </CoreSectionCard>

            <CoreSectionCard
              eyebrow="Perfil"
              title="Datos personales"
              description="Informacion basica y preferencias de comunicacion."
            >
              <View style={{ gap: 9 }}>
                <View style={{ borderRadius: 16, backgroundColor: "rgba(247,242,231,0.84)", padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <View
                      style={{
                        alignItems: "center",
                        backgroundColor: "rgba(0,122,107,0.1)",
                        borderRadius: 14,
                        height: 44,
                        justifyContent: "center",
                        width: 44
                      }}
                    >
                      <Text style={{ color: colorTokens.accentDark, fontSize: 12, fontWeight: "900" }}>
                        {`${snapshot.profile.firstName?.[0] ?? ""}${snapshot.profile.lastName?.[0] ?? ""}`.toUpperCase() || "U"}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: "#1c1917", fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
                        {`${snapshot.profile.firstName} ${snapshot.profile.lastName}`.trim() || "Usuario"}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                        {snapshot.profile.email}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                        {snapshot.profile.phone || "Telefono pendiente"} · {snapshot.profile.locale || "es"}
                      </Text>
                    </View>
                    <Pressable
                      disabled={isSubmitting}
                      onPress={() => setIsProfileFormVisible((current) => !current)}
                      style={{
                        alignItems: "center",
                        backgroundColor: colorTokens.surface,
                        borderColor: "rgba(0,151,143,0.22)",
                        borderRadius: 999,
                        borderWidth: 1,
                        height: 34,
                        justifyContent: "center",
                        opacity: isSubmitting ? 0.6 : 1,
                        width: 34
                      }}
                    >
                      <OwnerLineIcon color={colorTokens.accentDark} name={isProfileFormVisible ? "close" : "user"} size={17} />
                    </Pressable>
                  </View>
                </View>

                {isProfileFormVisible ? (
                  <>
                    <Field
                      label="Nombre"
                      onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, firstName: value }))}
                      value={profileForm.firstName ?? ""}
                    />
                    <Field
                      label="Apellido"
                      onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, lastName: value }))}
                      value={profileForm.lastName ?? ""}
                    />
                    <Field
                      label="Telefono"
                      onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, phone: value }))}
                      value={profileForm.phone ?? ""}
                    />
                    <Field
                      label="Foto de perfil (URL)"
                      onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, avatarUrl: value }))}
                      value={profileForm.avatarUrl ?? ""}
                    />
                    <Field
                      label="Idioma"
                      onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, locale: value }))}
                      value={profileForm.locale ?? "es"}
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Button
                        disabled={isSubmitting}
                        label="Guardar perfil"
                        onPress={() => {
                          clearMessages();
                          void runAction(
                            () =>
                              getMobileCoreApiClient().updateProfile({
                                firstName: profileForm.firstName?.trim(),
                                lastName: profileForm.lastName?.trim(),
                                phone: profileForm.phone?.trim() || null,
                                avatarUrl: profileForm.avatarUrl?.trim() || null,
                                locale: profileForm.locale?.trim()
                              }),
                            "Perfil actualizado."
                          ).then(() => {
                            setIsProfileFormVisible(false);
                          });
                        }}
                      />
                      <Button
                        disabled={isSubmitting}
                        label="Cancelar"
                        onPress={() => {
                          setProfileForm({
                            firstName: snapshot.profile.firstName,
                            lastName: snapshot.profile.lastName,
                            phone: snapshot.profile.phone ?? "",
                            avatarUrl: snapshot.profile.avatarUrl ?? "",
                            locale: snapshot.profile.locale
                          });
                          setIsProfileFormVisible(false);
                        }}
                        tone="secondary"
                      />
                    </View>
                  </>
                ) : null}
                <SwitchRow
                  label="Recibir novedades"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, marketingOptIn: value }))}
                  value={preferenceForm.marketingOptIn}
                />
                <SwitchRow
                  label="Recordatorios por correo"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, reminderEmailOptIn: value }))}
                  value={preferenceForm.reminderEmailOptIn}
                />
                <SwitchRow
                  label="Recordatorios push"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, reminderPushOptIn: value }))}
                  value={preferenceForm.reminderPushOptIn}
                />
                <Button
                  disabled={isSubmitting}
                  label="Guardar preferencias"
                  onPress={() => {
                    clearMessages();
                    void runAction(
                      () =>
                        getMobileCoreApiClient().updatePreferences({
                          marketingOptIn: preferenceForm.marketingOptIn,
                          reminderEmailOptIn: preferenceForm.reminderEmailOptIn,
                          reminderPushOptIn: preferenceForm.reminderPushOptIn
                        }),
                      "Preferencias actualizadas."
                    );
                  }}
                  tone="secondary"
                />
              </View>
            </CoreSectionCard>

            <CoreSectionCard
              eyebrow="Roles"
              title="Modo de uso"
              description="Cambia entre propietario y proveedor cuando lo necesites."
            >
              <View style={{ gap: 8 }}>
                {snapshot.roles.map((role) => (
                  <View
                    key={role.id}
                    style={{
                      borderRadius: 14,
                      backgroundColor: role.isActive ? "rgba(15,118,110,0.08)" : "rgba(28,25,23,0.04)",
                      padding: 10,
                      gap: 6
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", flex: 1 }}>{coreRoleLabels[role.role]}</Text>
                      <StatusChip label={role.isActive ? "En uso" : "Disponible"} tone={role.isActive ? "active" : "neutral"} />
                    </View>
                    {!role.isActive ? (
                      <Button
                        disabled={isSubmitting}
                        label={`Activar ${coreRoleLabels[role.role]}`}
                        onPress={() => {
                          clearMessages();
                          void runAction(
                            () => getMobileCoreApiClient().switchRole({ role: role.role }),
                            `Rol activo cambiado a ${coreRoleLabels[role.role]}.`
                          );
                        }}
                        tone="secondary"
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            </CoreSectionCard>

            <CoreSectionCard
              eyebrow="Direcciones"
              title="Direcciones"
              description="Lugares guardados para reservas, visitas o entregas."
            >
              <View style={{ gap: 9 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <Text style={{ color: colorTokens.muted, flex: 1, fontSize: 11, fontWeight: "800" }}>
                    {snapshot.addresses.length ? `${snapshot.addresses.length} direccion(es) guardada(s)` : "Aun no hay direcciones guardadas"}
                  </Text>
                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => {
                      setAddressForm(emptyAddressForm);
                      setIsAddressFormVisible(true);
                    }}
                    style={{
                      alignItems: "center",
                      backgroundColor: colorTokens.accentDark,
                      borderRadius: 999,
                      height: 34,
                      justifyContent: "center",
                      opacity: isSubmitting ? 0.6 : 1,
                      width: 34
                    }}
                  >
                    <OwnerLineIcon color="#ffffff" name="plus" size={17} />
                  </Pressable>
                </View>
                {snapshot.addresses.map((address) => (
                  <View key={address.id} style={{ borderRadius: 14, backgroundColor: "rgba(247,242,231,0.84)", padding: 10, gap: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", flex: 1 }}>{address.recipientName}</Text>
                      <StatusChip label={address.isDefault ? "predeterminada" : address.label} tone={address.isDefault ? "active" : "neutral"} />
                    </View>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 15 }}>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 15 }}>
                      {address.city}, {address.stateRegion} {address.postalCode}, {address.countryCode}
                    </Text>
                    <Button
                      disabled={isSubmitting}
                      label="Editar"
                      onPress={() => {
                        setAddressForm({
                          id: address.id,
                          label: address.label,
                          recipientName: address.recipientName,
                          line1: address.line1,
                          line2: address.line2 ?? "",
                          city: address.city,
                          stateRegion: address.stateRegion,
                          postalCode: address.postalCode,
                          countryCode: address.countryCode,
                          isDefault: address.isDefault
                        });
                        setIsAddressFormVisible(true);
                      }}
                      tone="secondary"
                    />
                  </View>
                ))}
                {isAddressFormVisible ? (
                  <>
                    <ChoiceBar
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, label: value }))}
                      options={[
                        { label: "Casa", value: "home" },
                        { label: "Trabajo", value: "work" },
                        { label: "Otro", value: "other" }
                      ]}
                      value={addressForm.label}
                    />
                    <Field
                      label="Destinatario"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, recipientName: value }))}
                      value={addressForm.recipientName}
                    />
                    <Field
                      label="Direccion"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, line1: value }))}
                      value={addressForm.line1}
                    />
                    <Field
                      label="Apto, referencia u otro"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, line2: value }))}
                      value={addressForm.line2 ?? ""}
                    />
                    <Field
                      label="Ciudad"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, city: value }))}
                      value={addressForm.city}
                    />
                    <Field
                      label="Provincia / region"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, stateRegion: value }))}
                      value={addressForm.stateRegion}
                    />
                    <Field
                      label="Codigo postal"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, postalCode: value }))}
                      value={addressForm.postalCode}
                    />
                    <Field
                      label="Codigo de pais"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, countryCode: value }))}
                      value={addressForm.countryCode}
                    />
                    <SwitchRow
                      label="Marcar como direccion predeterminada"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                      value={Boolean(addressForm.isDefault)}
                    />
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        disabled={isSubmitting}
                        label={addressForm.id ? "Actualizar" : "Guardar"}
                        onPress={() => {
                          clearMessages();
                          void runAction(
                            () =>
                              getMobileCoreApiClient().upsertAddress({
                                ...addressForm,
                                recipientName: addressForm.recipientName.trim(),
                                line1: addressForm.line1.trim(),
                                line2: addressForm.line2?.trim() || null,
                                city: addressForm.city.trim(),
                                stateRegion: addressForm.stateRegion.trim(),
                                postalCode: addressForm.postalCode.trim(),
                                countryCode: addressForm.countryCode.trim()
                              }),
                            addressForm.id ? "Direccion actualizada." : "Direccion guardada."
                          ).then(() => {
                            setAddressForm(emptyAddressForm);
                            setIsAddressFormVisible(false);
                          });
                        }}
                      />
                      <Button
                        disabled={isSubmitting}
                        label="Cancelar"
                        onPress={() => {
                          setAddressForm(emptyAddressForm);
                          setIsAddressFormVisible(false);
                        }}
                        tone="secondary"
                      />
                    </View>
                  </>
                ) : null}
              </View>
            </CoreSectionCard>

            {!isProviderMode ? (
              <CoreSectionCard
                eyebrow="Pagos"
                title="Tarjetas guardadas"
                description="Guarda una tarjeta para usarla en futuras reservas."
              >
                <View style={{ gap: 9 }}>
                  <ChoiceBar
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, brand: value }))}
                    options={[
                      { label: "Visa", value: "visa" },
                      { label: "Mastercard", value: "mastercard" },
                      { label: "Amex", value: "amex" }
                    ]}
                    value={paymentForm.brand}
                  />
                  <Field
                    label="Ultimos 4 digitos"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, last4: value }))}
                    value={paymentForm.last4}
                  />
                  <Field
                    keyboardType="numeric"
                    helperText="Usa dos digitos, por ejemplo 05."
                    label="Mes de vencimiento"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expMonth: value }))}
                    placeholder="MM"
                    value={paymentForm.expMonth}
                  />
                  <Field
                    keyboardType="numeric"
                    helperText="Usa cuatro digitos, por ejemplo 2028."
                    label="Ano de vencimiento"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expYear: value }))}
                    placeholder="AAAA"
                    value={paymentForm.expYear}
                  />
                  <Field
                    label="Titular"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, cardholderName: value }))}
                    value={paymentForm.cardholderName}
                  />
                  <SwitchRow
                    label="Marcar como metodo de pago predeterminado"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                    value={Boolean(paymentForm.isDefault)}
                  />
                  <Button
                    disabled={isSubmitting}
                    label="Guardar tarjeta"
                    onPress={() => {
                      clearMessages();
                      void runAction(
                        () =>
                          getMobileCoreApiClient().addPaymentMethod({
                            brand: paymentForm.brand,
                            last4: paymentForm.last4.trim(),
                            expMonth: Number(paymentForm.expMonth),
                            expYear: Number(paymentForm.expYear),
                            cardholderName: paymentForm.cardholderName.trim(),
                            isDefault: paymentForm.isDefault
                          }),
                        "Metodo de pago guardado."
                      ).then(() => {
                        setPaymentForm(emptyPaymentForm);
                      });
                    }}
                  />
                  {snapshot.paymentMethods.map((paymentMethod) => (
                    <View key={paymentMethod.id} style={{ borderRadius: 14, backgroundColor: "rgba(247,242,231,0.84)", padding: 10, gap: 6 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", flex: 1 }}>
                          {paymentMethod.brand.toUpperCase()} terminada en {paymentMethod.last4}
                        </Text>
                        <StatusChip
                          label={paymentMethod.isDefault ? "predeterminada" : paymentMethod.status}
                          tone={paymentMethod.isDefault ? "active" : "neutral"}
                        />
                      </View>
                      <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 15 }}>
                        {paymentMethod.cardholderName} - vence {paymentMethod.expMonth}/{paymentMethod.expYear}
                      </Text>
                      {!paymentMethod.isDefault ? (
                        <Button
                          disabled={isSubmitting}
                          label="Marcar como predeterminada"
                          onPress={() => {
                            clearMessages();
                            void runAction(
                              () => getMobileCoreApiClient().setDefaultPaymentMethod(paymentMethod.id),
                              `Metodo de pago predeterminado actualizado a ${paymentMethod.brand.toUpperCase()} ${paymentMethod.last4}.`
                            );
                          }}
                          tone="secondary"
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              </CoreSectionCard>
            ) : null}

            {!isProviderMode ? <HouseholdsWorkspace enabled /> : null}
          </>
        ) : null}

        {authState.isAuthenticated && snapshot && !isProviderMode && activeOwnerSection === "inicio" ? (
          <OwnerHome
            bookings={bookingsWorkspace.bookings}
            householdName={defaultHouseholdName}
            onNavigate={setActiveOwnerSection}
            onSelectPet={(petId) => {
              setPendingPetHubPetId(petId);
              setPetHubContext({ householdId: petsWorkspace.selectedHouseholdId, petId });
              setActivePetHubPanel("detalle");
              setActiveOwnerSection("mascotas");
            }}
            pets={petsWorkspace.pets}
            paymentMethods={snapshot.paymentMethods}
            reminders={remindersWorkspace.reminders}
            serviceHighlights={marketplaceWorkspace.homeSnapshot?.categoryHighlights ?? []}
            roleSwitchConfirmed={isRoleSwitchInfoMessage}
          />
        ) : null}
        {authState.isAuthenticated && !isProviderMode && activeOwnerSection === "mascotas" ? (
          <>
            <PetsWorkspace
              activePanel={activePetHubPanel}
              contextPetId={pendingPetHubPetId}
              enabled
              onContextChange={(context) => {
                setPetHubContext(context);

                if (pendingPetHubPetId && context.petId === pendingPetHubPetId) {
                  setPendingPetHubPetId(null);
                }
              }}
              onPanelChange={setActivePetHubPanel}
            />
            {activePetHubPanel === "salud" ? (
              <HealthWorkspace
                contextHouseholdId={petHubContext.householdId}
                contextPetId={petHubContext.petId}
                enabled
                mode="pet-hub"
              />
            ) : null}
            {activePetHubPanel === "recordatorios" ? (
              <RemindersWorkspace
                contextHouseholdId={petHubContext.householdId}
                contextPetId={petHubContext.petId}
                enabled
                mode="pet-hub"
              />
            ) : null}
          </>
        ) : null}
        {!authState.isAuthenticated ? <MarketplaceWorkspace enabled /> : null}
        {authState.isAuthenticated && !isProviderMode && activeOwnerSection === "buscar" ? (
          <MarketplaceWorkspace
            enabled
            onSelectBookingService={(selection) => {
              setMarketplaceSelection(selection);
              setActiveBookingHubPanel("detalle");
              setActiveOwnerSection("reservas");
            }}
          />
        ) : null}
        {authState.isAuthenticated && !isProviderMode && activeOwnerSection === "reservas" ? (
          <>
            <BookingsWorkspace
              activePanel={activeBookingHubPanel}
              enabled
              marketplaceSelection={marketplaceSelection}
              onClearMarketplaceSelection={() => setMarketplaceSelection(null)}
              onBookingContextChange={setBookingHubContext}
              onPanelChange={setActiveBookingHubPanel}
              onOpenChatForBooking={(bookingId) => {
                setFocusedBookingId(bookingId);
                setChatFocusVersion(Date.now());
                setActiveBookingHubPanel("chat");
              }}
              onOpenReviewForBooking={(bookingId) => {
                setFocusedReviewBookingId(bookingId);
                setReviewFocusVersion(Date.now());
                setActiveBookingHubPanel("review");
              }}
              onOpenSupportForBooking={(bookingId) => {
                setFocusedSupportBookingId(bookingId);
                setSupportFocusVersion(Date.now());
                setActiveBookingHubPanel("soporte");
              }}
            />
            {activeBookingHubPanel === "chat" ? (
              <MessagingWorkspace
                currentUserId={authState.userId ?? null}
                enabled
                focusedBookingId={focusedBookingId ?? bookingHubContext.bookingId}
                focusVersion={chatFocusVersion}
                viewerRole="owner"
              />
            ) : null}
            {activeBookingHubPanel === "review" ? (
              <ReviewsWorkspace
                enabled
                focusedBookingId={focusedReviewBookingId ?? bookingHubContext.bookingId}
                focusVersion={reviewFocusVersion}
              />
            ) : null}
            {activeBookingHubPanel === "soporte" ? (
              <SupportWorkspace
                enabled
                focusedBookingId={focusedSupportBookingId ?? bookingHubContext.bookingId}
                focusVersion={supportFocusVersion}
              />
            ) : null}
          </>
        ) : null}
        {authState.isAuthenticated && !isProviderMode && activeOwnerSection === "mensajes" ? (
          <MessagingWorkspace currentUserId={authState.userId ?? null} enabled focusedBookingId={null} focusVersion={0} viewerRole="owner" />
        ) : null}
        {authState.isAuthenticated && snapshot && isProviderMode && activeProviderSection !== "mensajes" && activeProviderSection !== "cuenta" ? (
          <ProvidersWorkspace
            activeSection={activeProviderSection}
            enabled
            hasProviderRole={hasProviderRole}
            providerRoleActive={activeRole === "provider"}
          />
        ) : null}
        {authState.isAuthenticated && isProviderMode && activeProviderSection === "mensajes" ? (
          <MessagingWorkspace currentUserId={authState.userId ?? null} enabled focusedBookingId={null} focusVersion={0} viewerRole="provider" />
        ) : null}
      </ScrollView>
      {authState.isAuthenticated ? (
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.98)",
            borderTopColor: colorTokens.line,
            borderTopWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 4,
            paddingTop: 7,
            paddingBottom: 8,
            ...visualTokens.mobile.softShadow
          }}
        >
          {(isProviderMode ? providerSections : ownerBottomSections).map((section) => {
            const isActive = isProviderMode ? activeProviderSection === section.id : activeOwnerSection === section.id;
            const ownerNavIcon =
              section.id === "inicio"
                ? "home"
                : section.id === "mascotas"
                  ? "paw"
                  : section.id === "buscar"
                    ? "search"
                    : section.id === "reservas"
                      ? "calendar"
                      : section.id === "mensajes"
                        ? "chat"
                        : "user";
            const providerNavIcon: OwnerIconName =
              section.id === "inicio"
                ? "home"
                : section.id === "negocio"
                  ? "briefcase"
                  : section.id === "servicios"
                    ? "bag"
                    : section.id === "disponibilidad"
                      ? "clock"
                      : section.id === "reservas"
                        ? "calendar"
                        : section.id === "mensajes"
                          ? "chat"
                          : section.id === "estado"
                            ? "shield"
                            : "user";

            return (
              <Pressable
                key={section.id}
                onPress={() => {
                  if (isProviderMode) {
                    setActiveProviderSection(section.id as ProviderSectionId);
                    return;
                  }

                  setActiveOwnerSection(section.id as OwnerSectionId);
                }}
                style={{
                  alignItems: "center",
                  borderRadius: 18,
                  backgroundColor: isActive ? "rgba(230,247,245,0.86)" : "transparent",
                  flex: 1,
                  gap: 5,
                  minWidth: 0,
                  paddingHorizontal: 1,
                  paddingVertical: 7
                }}
              >
                {!isProviderMode ? (
                  <View>
                    <OwnerLineIcon color={isActive ? colorTokens.accentDark : colorTokens.muted} name={ownerNavIcon} size={21} />
                    {section.id === "mensajes" ? (
                      <View
                        style={{
                          backgroundColor: "#f43f5e",
                          borderColor: colorTokens.surface,
                          borderRadius: 999,
                          borderWidth: 1.5,
                          height: 10,
                          position: "absolute",
                          right: -2,
                          top: -1,
                          width: 10
                        }}
                      />
                    ) : null}
                  </View>
                ) : (
                  <OwnerLineIcon color={isActive ? colorTokens.accentDark : colorTokens.muted} name={providerNavIcon} size={20} />
                )}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    color: isActive ? colorTokens.accentDark : colorTokens.muted,
                    fontSize: isProviderMode ? 9 : 10,
                    fontWeight: isActive ? "800" : "600",
                    minWidth: 0,
                    textAlign: "center"
                  }}
                >
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </SafeAreaView>
  );
}




