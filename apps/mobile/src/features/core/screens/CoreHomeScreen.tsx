import { coreRoleLabels, formatShortDateLabel, formatShortTimeLabel } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import { providerServiceCategoryLabels } from "@pet/config";
import type {
  AddPaymentMethodInput,
  CoreRole,
  OnboardingTask,
  MarketplaceCategoryHighlight,
  MarketplaceServiceSelection,
  BookingSummary,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpsertAddressInput,
  PetSummary,
  Reminder,
  Uuid
} from "@pet/types";
import { useEffect, useRef, useState, type ElementRef } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { AdoptionDiscoveryWorkspace } from "../../foster/components/AdoptionDiscoveryWorkspace";
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
  confirmPassword: string;
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

type OwnerSectionId = "inicio" | "mascotas" | "buscar" | "reservas" | "mensajes" | "cuenta" | "adopcion";
type PetHubPanel = "detalle" | "salud" | "documentos" | "recordatorios";
type ProviderSectionId = ProviderWorkspaceSection | "mensajes" | "cuenta";
type AuthAccessPanel = "login" | "register" | "verify" | "recover";
type AccountPanelId = "access" | "addresses" | "payments" | "preferences" | "profile" | "roles";
type AccountFocusSection = "petInvitations";
type OwnerHomePet = Pick<PetSummary, "avatarUrl" | "birthDate" | "breed" | "id" | "name" | "species" | "status">;
type OwnerHomeReminder = Pick<Reminder, "dueAt" | "id" | "petId" | "reminderType" | "status" | "title">;
type OwnerHomeBooking = Pick<BookingSummary, "id" | "petName" | "scheduledStartAt" | "serviceName" | "status">;
type OwnerHomeServiceHighlight = Pick<MarketplaceCategoryHighlight, "category" | "providerCount" | "serviceCount">;
type ActiveOwnerPetContext = { householdId: Uuid | null; petId: Uuid | null };

const ownerSections: Array<{ description: string; id: OwnerSectionId; label: string }> = [
  { id: "inicio", label: "Inicio", description: "Lo importante para cuidar a tus mascotas hoy." },
  { id: "mascotas", label: "Mascotas", description: "HOGAR SULVARAN VELASCO" },
  { id: "buscar", label: "Buscar", description: "Explora proveedores aprobados y prepara la reserva desde el contexto de tu hogar." },
  { id: "adopcion", label: "Mascotas que buscan hogar", description: "Conoce mascotas publicadas por familias protectoras." },
  { id: "reservas", label: "Reservas", description: "Historial, detalle, reseñas y soporte por reserva." },
  { id: "mensajes", label: "Mensajes", description: "Conversaciones vinculadas a tus reservas." },
  { id: "cuenta", label: "Cuenta", description: "Perfil, hogar, preferencias y metodos guardados." }
];

const ownerSectionLookup = Object.fromEntries(
  ownerSections.map((section) => [section.id, section])
) as Record<OwnerSectionId, (typeof ownerSections)[number]>;
const ownerBottomSections = ownerSections.filter((section) => section.id !== "adopcion");

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
  confirmPassword: "",
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

function AuthPetIllustration() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "rgba(240,253,250,0.94)",
        borderColor: "rgba(0,151,143,0.18)",
        borderRadius: 28,
        borderWidth: 1,
        height: 148,
        justifyContent: "center",
        overflow: "hidden"
      }}
    >
      <Svg height={132} viewBox="0 0 220 132" width={220}>
        <Circle cx="44" cy="108" fill="#ccfbf1" r="38" />
        <Circle cx="172" cy="112" fill="#ffedd5" r="42" />
        <Path d="M35 88c14-32 53-48 86-33 35 16 58 2 72-15" fill="none" stroke="#99f6e4" strokeLinecap="round" strokeWidth="8" />
        <Circle cx="85" cy="70" fill="#f59e0b" r="24" />
        <Path d="M64 56c-10-18 10-22 18-8M101 48c11-14 27-1 12 12" fill="#fbbf24" />
        <Circle cx="77" cy="68" fill="#111827" r="3" />
        <Circle cx="93" cy="68" fill="#111827" r="3" />
        <Path d="M80 80c6 5 13 5 19 0" fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="3" />
        <Circle cx="145" cy="76" fill="#94a3b8" r="20" />
        <Path d="M127 61c-12-12 2-22 12-8M158 52c12-12 24 2 10 12" fill="#cbd5e1" />
        <Circle cx="139" cy="74" fill="#111827" r="3" />
        <Circle cx="153" cy="74" fill="#111827" r="3" />
        <Path d="M140 86c5 4 11 4 16 0" fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="3" />
        <Circle cx="110" cy="28" fill="#0f766e" r="9" />
        <Circle cx="94" cy="39" fill="#0f766e" r="7" opacity="0.9" />
        <Circle cx="126" cy="39" fill="#0f766e" r="7" opacity="0.9" />
        <Circle cx="102" cy="17" fill="#0f766e" r="6" opacity="0.8" />
        <Circle cx="119" cy="17" fill="#0f766e" r="6" opacity="0.8" />
      </Svg>
    </View>
  );
}

function AuthWelcomeHero({
  activePanel,
  onChange
}: {
  activePanel: AuthAccessPanel;
  onChange: (panel: AuthAccessPanel) => void;
}) {
  return (
    <View style={{ backgroundColor: colorTokens.surface, borderRadius: 30, gap: 16, padding: 18, ...visualTokens.mobile.shadow }}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colorTokens.accentSoft,
            borderRadius: 999,
            height: 58,
            justifyContent: "center",
            width: 58
          }}
        >
          <OwnerLineIcon color={colorTokens.accentDark} name="paw" size={32} />
        </View>
        <Text style={{ color: colorTokens.accentDark, fontSize: 17, fontWeight: "900" }}>Pet Ecosystem</Text>
      </View>
      <AuthPetIllustration />
      <View style={{ alignItems: "center", gap: 7 }}>
        <Text style={{ color: colorTokens.ink, fontSize: 23, fontWeight: "900", lineHeight: 28, textAlign: "center" }}>
          Bienvenido a Pet Ecosystem
        </Text>
        <Text style={{ color: colorTokens.muted, fontSize: 13, lineHeight: 19, maxWidth: 260, textAlign: "center" }}>
          Todo lo que tu mascota necesita, en un solo lugar.
        </Text>
      </View>
      <View style={{ gap: 9 }}>
        <Button label="Iniciar sesion" onPress={() => onChange("login")} tone={activePanel === "login" ? "primary" : "secondary"} />
        <Button label="Registrarse" onPress={() => onChange("register")} tone={activePanel === "register" ? "primary" : "secondary"} />
      </View>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center" }}>
        {(["login", "register", "verify", "recover"] as AuthAccessPanel[]).map((panel) => (
          <View
            key={panel}
            style={{
              backgroundColor: panel === activePanel ? colorTokens.accent : colorTokens.line,
              borderRadius: 999,
              height: 6,
              width: panel === activePanel ? 20 : 6
            }}
          />
        ))}
      </View>
    </View>
  );
}

function AuthFlowProgress({ activePanel }: { activePanel: AuthAccessPanel }) {
  const steps: Array<{ label: string; panel: AuthAccessPanel }> = [
    { label: "Acceso", panel: "login" },
    { label: "Cuenta", panel: "register" },
    { label: "Codigo", panel: "verify" },
    { label: "Recuperar", panel: "recover" }
  ];

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
      {steps.map((step, index) => {
        const isActive = step.panel === activePanel;

        return (
          <View
            key={step.panel}
            style={{
              alignItems: "center",
              backgroundColor: isActive ? colorTokens.accentSoft : "#f8fafc",
              borderColor: isActive ? "rgba(0,151,143,0.32)" : colorTokens.line,
              borderRadius: 999,
              borderWidth: 1,
              flexDirection: "row",
              gap: 6,
              paddingHorizontal: 9,
              paddingVertical: 7
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: isActive ? colorTokens.accent : colorTokens.surface,
                borderRadius: 999,
                height: 18,
                justifyContent: "center",
                width: 18
              }}
            >
              <Text style={{ color: isActive ? "#ffffff" : colorTokens.mutedStrong, fontSize: 9, fontWeight: "900" }}>
                {index + 1}
              </Text>
            </View>
            <Text style={{ color: isActive ? colorTokens.accentDark : colorTokens.mutedStrong, fontSize: 10, fontWeight: "900" }}>
              {step.label}
            </Text>
          </View>
        );
      })}
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

  return formatShortDateLabel(value);
}

function ActiveOwnerPetBanner({
  pet,
  onChange
}: {
  pet: Pick<PetSummary, "avatarUrl" | "name" | "species">;
  onChange: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Mascota activa ${pet.name}. Cambiar mascota`}
      accessibilityRole="button"
      onPress={onChange}
      style={{
        alignItems: "center",
        backgroundColor: "rgba(240,253,250,0.92)",
        borderColor: "rgba(15,118,110,0.2)",
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: "row",
        gap: 10,
        padding: 10,
        ...visualTokens.mobile.softShadow
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#ffffff",
          borderRadius: 999,
          height: 34,
          justifyContent: "center",
          overflow: "hidden",
          width: 34
        }}
      >
        {pet.avatarUrl ? (
          <Image source={{ uri: pet.avatarUrl }} style={{ height: 34, width: 34 }} />
        ) : (
          <OwnerLineIcon color={colorTokens.accentDark} name="paw" size={18} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
          Mascota activa
        </Text>
        <Text numberOfLines={1} style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900" }}>
          {pet.name}
        </Text>
      </View>
      <View style={{ borderColor: "rgba(15,118,110,0.24)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 }}>
        <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>Cambiar</Text>
      </View>
    </Pressable>
  );
}

function formatActivityDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha pendiente";
  }

  return `${formatShortDateLabel(value)} · ${formatShortTimeLabel(value)}`;
}

function getOwnerBookingStatusLabel(status: OwnerHomeBooking["status"]) {
  if (status === "pending_approval") {
    return "Pendiente de aprobacion";
  }

  if (status === "confirmed") {
    return "Confirmada";
  }

  if (status === "completed") {
    return "Completada";
  }

  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Reserva";
}

function getOwnerReminderTitle(title: string) {
  return title
    .replace(/^Vaccine due:/i, "Vacuna pendiente:")
    .replace(
      /^Automatic reminder generated from the vaccine due date\.$/i,
      "Recordatorio creado automaticamente por la vacuna."
    );
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
  onOpenAdoption,
  onOpenReminders,
  onSelectPet,
  ownerFirstName,
  pets,
  reminders,
  serviceHighlights
}: {
  bookings: OwnerHomeBooking[];
  householdName: string;
  onNavigate: (section: OwnerSectionId) => void;
  onOpenAdoption: () => void;
  onOpenReminders: (petId: Uuid | null) => void;
  onSelectPet: (petId: Uuid) => void;
  ownerFirstName: string;
  pets: OwnerHomePet[];
  reminders: OwnerHomeReminder[];
  serviceHighlights: OwnerHomeServiceHighlight[];
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
    ? `${getOwnerReminderTitle(nextReminder.title)}${nextReminderPetName ? ` de ${nextReminderPetName}` : ""}`
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
  const greetingName = ownerFirstName.trim();
  const primaryAction = !pets.length
    ? {
        eyebrow: "Primer paso",
        title: "Registra tu primera mascota",
        description: "Crea su perfil para activar documentos, salud, recordatorios y reservas.",
        cta: "Agregar mascota",
        icon: "paw" as OwnerIconName,
        tone: "accent" as const,
        onPress: () => onNavigate("mascotas")
      }
    : nextBooking
      ? {
          eyebrow: getOwnerBookingStatusLabel(nextBooking.status),
          title: nextBooking.serviceName,
          description: `${formatActivityDateTime(nextBooking.scheduledStartAt)}${nextBooking.petName ? ` - ${nextBooking.petName}` : ""}`,
          cta: "Ver reserva",
          icon: "calendar" as OwnerIconName,
          tone: nextBooking.status === "pending_approval" ? ("warning" as const) : ("accent" as const),
          onPress: () => onNavigate("reservas")
        }
      : nextReminder
        ? {
            eyebrow: "Recordatorio pendiente",
            title: nextReminderTitle,
            description: formatShortDateTime(nextReminder.dueAt),
            cta: "Ver recordatorios",
            icon: "calendar" as OwnerIconName,
            tone: "warning" as const,
            onPress: () => onOpenReminders(nextReminder.petId)
          }
        : {
            eyebrow: "Todo listo",
            title: "Explora servicios para tus mascotas",
            description: "Busca proveedores aprobados cuando necesites apoyo.",
            cta: "Buscar servicios",
            icon: "search" as OwnerIconName,
            tone: "accent" as const,
            onPress: () => onNavigate("buscar")
          };
  const primaryToneStyle = toneStyles[primaryAction.tone];

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
            <Text style={{ color: "rgba(255,255,255,0.84)", fontSize: 14, lineHeight: 19 }}>
              {greetingName ? `Hola, ${greetingName}` : "Hola"}
            </Text>
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
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel={`Siguiente paso: ${primaryAction.title}`}
        accessibilityRole="button"
        onPress={primaryAction.onPress}
        style={{
          backgroundColor: primaryToneStyle.backgroundColor,
          borderColor: "rgba(15,118,110,0.18)",
          borderRadius: 22,
          borderWidth: 1,
          flexDirection: "row",
          gap: 12,
          padding: 14,
          ...visualTokens.mobile.shadow
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: colorTokens.surface,
            borderRadius: 999,
            height: 48,
            justifyContent: "center",
            width: 48
          }}
        >
          <OwnerLineIcon color={primaryToneStyle.color} name={primaryAction.icon} size={24} />
        </View>
        <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
          <Text style={{ color: primaryToneStyle.color, fontSize: 10, fontWeight: "900", letterSpacing: 0.2, textTransform: "uppercase" }}>
            {primaryAction.eyebrow}
          </Text>
          <Text numberOfLines={2} style={{ color: colorTokens.ink, fontSize: 17, fontWeight: "900", lineHeight: 21 }}>
            {primaryAction.title}
          </Text>
          <Text numberOfLines={2} style={{ color: colorTokens.mutedStrong, fontSize: 12, lineHeight: 17 }}>
            {primaryAction.description}
          </Text>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: primaryAction.tone === "warning" ? colorTokens.warning : colorTokens.accent,
              borderRadius: 999,
              marginTop: 4,
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>{primaryAction.cta}</Text>
          </View>
        </View>
      </Pressable>

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
                      {pet.status === "in_memory" ? (
                        <Text numberOfLines={1} style={{ color: "#7c3aed", fontSize: 10, fontWeight: "900", lineHeight: 14 }}>
                          En memoria
                        </Text>
                      ) : null}
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

      <Pressable
        accessibilityLabel="Ver mascotas que buscan hogar"
        accessibilityRole="button"
        onPress={onOpenAdoption}
        style={{
          alignItems: "center",
          backgroundColor: colorTokens.surface,
          borderColor: "rgba(15,118,110,0.18)",
          borderRadius: 18,
          borderWidth: 1,
          flexDirection: "row",
          gap: 10,
          padding: 12,
          ...visualTokens.mobile.softShadow
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: colorTokens.accentSoft,
            borderRadius: 15,
            height: 36,
            justifyContent: "center",
            width: 36
          }}
        >
          <OwnerLineIcon color={colorTokens.accentDark} name="heart" size={19} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900" }}>Mascotas que buscan hogar</Text>
          <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
            Conoce mascotas publicadas por familias protectoras.
          </Text>
        </View>
        <View style={{ backgroundColor: colorTokens.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "900" }}>Ver publicaciones</Text>
        </View>
      </Pressable>
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
  const mainScrollViewRef = useRef<ElementRef<typeof ScrollView> | null>(null);
  const accountHouseholdsYRef = useRef(0);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [verifyForm, setVerifyForm] = useState(emptyVerifyForm);
  const [recoverForm, setRecoverForm] = useState(emptyRecoverForm);
  const [recoveryPasswordForm, setRecoveryPasswordForm] = useState(emptyRecoveryPasswordForm);
  const [authAccessPanel, setAuthAccessPanel] = useState<AuthAccessPanel>("login");
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [activeAccountPanel, setActiveAccountPanel] = useState<AccountPanelId>("access");
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
  const [accountFocusSection, setAccountFocusSection] = useState<AccountFocusSection | null>(null);
  const [activeProviderSection, setActiveProviderSection] = useState<ProviderSectionId>("inicio");
  const [activePetHubPanel, setActivePetHubPanel] = useState<PetHubPanel>("detalle");
  const [petHubContext, setPetHubContext] = useState<{ householdId: Uuid | null; petId: Uuid | null }>({
    householdId: null,
    petId: null
  });
  const [activeOwnerPetContext, setActiveOwnerPetContext] = useState<ActiveOwnerPetContext>({
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
  const assignedAccountRoles = snapshot?.roles.map((role) => role.role) ?? [];
  const missingAccountRoles = (["pet_owner", "provider"] as CoreRole[]).filter((role) => !assignedAccountRoles.includes(role));
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
  const ownerHouseholdCount = petsWorkspace.householdSnapshot?.households.length ?? 0;
  const ownerNeedsHouseholdSetup =
    authState.isAuthenticated &&
    Boolean(snapshot) &&
    !isProviderMode &&
    !petsWorkspace.isLoading &&
    ownerHouseholdCount === 0;
  const ownerNeedsFirstPetSetup =
    authState.isAuthenticated &&
    Boolean(snapshot) &&
    !isProviderMode &&
    !petsWorkspace.isLoading &&
    ownerHouseholdCount > 0 &&
    petsWorkspace.pets.length === 0;
  const setActiveOwnerPetFromSelection = (context: ActiveOwnerPetContext) => {
    setActiveOwnerPetContext(context);
    setPetHubContext(context);
  };
  const activeOwnerPetContextId = pendingPetHubPetId ?? activeOwnerPetContext.petId ?? petHubContext.petId ?? petsWorkspace.selectedPetId ?? null;
  const activeOwnerPet =
    petsWorkspace.pets.find((pet) => pet.id === activeOwnerPetContextId) ??
    null;
  const activeOwnerPetContextForModules: ActiveOwnerPetContext = activeOwnerPet
    ? { householdId: activeOwnerPet.householdId, petId: activeOwnerPet.id }
    : { householdId: activeOwnerPetContext.householdId, petId: activeOwnerPetContextId };

  const handlePetTransferAccepted = async (context: { householdId: Uuid; petId: Uuid }) => {
    setPendingPetHubPetId(context.petId);
    setActiveOwnerPetFromSelection(context);
    setActivePetHubPanel("detalle");
    setActiveOwnerSection("mascotas");
    await petsWorkspace.selectHousehold(context.householdId);
    setPendingPetHubPetId(context.petId);
    setActiveOwnerPetFromSelection(context);
  };

  useEffect(() => {
    if (activeOwnerSection !== "cuenta" || accountFocusSection !== "petInvitations") {
      return;
    }

    const timer = setTimeout(() => {
      mainScrollViewRef.current?.scrollTo({
        y: Math.max(accountHouseholdsYRef.current - 16, 0),
        animated: true
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [accountFocusSection, activeOwnerSection]);

  useEffect(() => {
    if (activeOwnerSection !== "cuenta" && accountFocusSection) {
      setAccountFocusSection(null);
    }
  }, [accountFocusSection, activeOwnerSection]);

  const openAccountPanel = (panel: AccountPanelId) => {
    setActiveAccountPanel(panel);

    if (panel === "profile") {
      setIsProfileFormVisible(true);
    }

    if (panel === "addresses" && snapshot && snapshot.addresses.length === 0) {
      setAddressForm(emptyAddressForm);
      setIsAddressFormVisible(true);
    }
  };

  const handleAccountTaskPress = (task: OnboardingTask) => {
    if (!snapshot) {
      return;
    }

    if (task.id === "create_account") {
      openAccountPanel("access");
      return;
    }

    if (task.id === "verify_contact") {
      openAccountPanel("access");

      if (snapshot.verification.status !== "verified") {
        clearMessages();
        void runAction(
          () => getMobileCoreApiClient().resendVerification({ email: snapshot.profile.email }),
          "Enviamos un nuevo codigo de verificacion a tu correo.",
          false
        );
      }

      return;
    }

    if (task.id === "complete_profile") {
      openAccountPanel("profile");
      return;
    }

    if (task.id === "select_role") {
      openAccountPanel("roles");
      return;
    }

    if (task.id === "set_preferences") {
      openAccountPanel("preferences");
      return;
    }

    if (task.id === "add_address") {
      openAccountPanel("addresses");
      return;
    }

    if (task.id === "add_payment_method") {
      if (isProviderMode) {
        Alert.alert("No disponible en este modo", "Los metodos guardados se gestionan desde el modo Propietario de mascota.");
        return;
      }

      openAccountPanel("payments");
    }
  };

  useEffect(() => {
    if (!authState.isAuthenticated || isProviderMode) {
      if (activeOwnerPetContext.petId || activeOwnerPetContext.householdId) {
        setActiveOwnerPetContext({ householdId: null, petId: null });
      }
      return;
    }

    if (!activeOwnerPetContext.petId || petsWorkspace.isLoading) {
      return;
    }

    const matchingPet = petsWorkspace.pets.find((pet) => pet.id === activeOwnerPetContext.petId);

    if (!matchingPet) {
      setActiveOwnerPetContext({ householdId: null, petId: null });
      setPetHubContext((currentContext) =>
        currentContext.petId === activeOwnerPetContext.petId ? { householdId: null, petId: null } : currentContext
      );
      return;
    }

    if (matchingPet.householdId !== activeOwnerPetContext.householdId) {
      setActiveOwnerPetContext({ householdId: matchingPet.householdId, petId: matchingPet.id });
    }
  }, [
    activeOwnerPetContext.householdId,
    activeOwnerPetContext.petId,
    authState.isAuthenticated,
    isProviderMode,
    petsWorkspace.isLoading,
    petsWorkspace.pets
  ]);

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
      <ScrollView ref={mainScrollViewRef} contentContainerStyle={{ padding: visualTokens.mobile.screenPadding, gap: 20 }}>
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
          <AuthWelcomeHero activePanel={authAccessPanel} onChange={setAuthAccessPanel} />
        )}

        {configError ? <Notice message={configError} tone="error" /> : null}
        {!configError && errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
        {!configError && infoMessage && !isRoleSwitchInfoMessage ? <Notice message={infoMessage} tone="info" /> : null}
        {authState.isAuthenticated &&
        snapshot &&
        !isProviderMode &&
        !ownerNeedsHouseholdSetup &&
        !ownerNeedsFirstPetSetup &&
        activeOwnerSection !== "mascotas" &&
        activeOwnerPet ? (
          <ActiveOwnerPetBanner
            pet={activeOwnerPet}
            onChange={() => {
              setActivePetHubPanel("detalle");
              setActiveOwnerSection("mascotas");
            }}
          />
        ) : null}
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
              eyebrow="Acceso guiado"
              title={
                authAccessPanel === "login"
                  ? "Iniciar sesion"
                  : authAccessPanel === "register"
                    ? "Crear cuenta"
                    : authAccessPanel === "verify"
                      ? "Verificar correo"
                      : "Recuperar contrasena"
              }
              description={
                authAccessPanel === "login"
                  ? "Continua con tu correo y contrasena."
                  : authAccessPanel === "register"
                    ? "Ingresa tus datos para empezar a cuidar a tus mascotas."
                    : authAccessPanel === "verify"
                      ? "Ingresa el codigo que enviamos a tu correo."
                      : "Solicita un enlace seguro para definir una nueva contrasena."
              }
            >
              <View style={{ gap: 12 }}>
                <AuthFlowProgress activePanel={authAccessPanel} />

                {authAccessPanel === "login" ? (
                  <>
                    <Field
                      keyboardType="email-address"
                      label="Correo"
                      onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, email: value }))}
                      placeholder="tu@email.com"
                      value={loginForm.email}
                    />
                    <Field
                      label="Contrasena"
                      onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, password: value }))}
                      placeholder="Ingresa tu contrasena"
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
                          undefined,
                          false
                        );
                      }}
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Button label="Crear cuenta" onPress={() => setAuthAccessPanel("register")} tone="secondary" />
                      <Button label="Olvidaste tu contrasena?" onPress={() => setAuthAccessPanel("recover")} tone="secondary" />
                    </View>
                  </>
                ) : null}

                {authAccessPanel === "register" ? (
                  <>
                    <Field
                      keyboardType="email-address"
                      label="Correo electronico"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, email: value }))}
                      placeholder="ejemplo@correo.com"
                      value={registerForm.email}
                    />
                    <Field
                      label="Contrasena"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, password: value }))}
                      placeholder="Crea una contrasena"
                      secureTextEntry
                      value={registerForm.password}
                    />
                    <Field
                      label="Confirmar contrasena"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, confirmPassword: value }))}
                      placeholder="Repite tu contrasena"
                      secureTextEntry
                      value={registerForm.confirmPassword}
                    />
                    <Field
                      label="Nombre"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, firstName: value }))}
                      placeholder="Tu nombre"
                      value={registerForm.firstName}
                    />
                    <Field
                      label="Apellido"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, lastName: value }))}
                      placeholder="Tu apellido"
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
                          async () => {
                            if (registerForm.password !== registerForm.confirmPassword) {
                              throw new Error("Las contrasenas deben coincidir.");
                            }

                            await getMobileCoreApiClient().register({
                              email: registerForm.email,
                              password: registerForm.password,
                              firstName: registerForm.firstName,
                              lastName: registerForm.lastName,
                              requestedRoles: [registerForm.role]
                            });
                          },
                          "Registro enviado. Revisa tu correo e ingresa el codigo para verificar tu cuenta.",
                          false
                        ).then(() => setAuthAccessPanel("verify"));
                      }}
                    />
                    <Button label="Ya tengo cuenta" onPress={() => setAuthAccessPanel("login")} tone="secondary" />
                  </>
                ) : null}

                {authAccessPanel === "verify" ? (
                  <>
                    <Field
                      keyboardType="email-address"
                      label="Correo de verificacion"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, email: value }))}
                      value={verifyForm.email}
                    />
                    <Field
                      label="Codigo de 6 digitos"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                      value={verifyForm.token}
                    />
                    <Button
                      disabled={isSubmitting}
                      label="Verificar codigo"
                      onPress={() => {
                        clearMessages();
                        void runAction(
                          () =>
                            getMobileCoreApiClient().verifyOtp({
                              email: verifyForm.email,
                              token: verifyForm.token
                            }),
                          "Verificacion de correo completada. Ya puedes iniciar sesion."
                        ).then(() => setAuthAccessPanel("login"));
                      }}
                    />
                    <Button
                      disabled={isSubmitting}
                      label="Reenviar codigo"
                      onPress={() => {
                        clearMessages();
                        void runAction(
                          () =>
                            getMobileCoreApiClient().resendVerification({
                              email: verifyForm.email
                            }),
                          "Codigo solicitado. Revisa tu correo y espera unos minutos antes de pedir otro.",
                          false
                        );
                      }}
                      tone="secondary"
                    />
                  </>
                ) : null}

                {authAccessPanel === "recover" ? (
                  <>
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
                          "Correo de recuperacion solicitado. Revisa tu bandeja y evita pedir varios enlaces seguidos.",
                          false
                        );
                      }}
                    />
                    <Button label="Volver a inicio de sesion" onPress={() => setAuthAccessPanel("login")} tone="secondary" />
                  </>
                ) : null}
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
                {accountOnboardingTasks.map((task) => {
                  const isCompleted = task.status === "completed";

                  return (
                    <Pressable
                      accessibilityLabel={`${task.title}. ${isCompleted ? "Listo" : "Pendiente"}`}
                      accessibilityRole="button"
                      key={task.id}
                      onPress={() => handleAccountTaskPress(task)}
                      style={{
                        borderRadius: 14,
                        backgroundColor: isCompleted ? "rgba(240,253,250,0.88)" : "#ffffff",
                        borderColor: isCompleted ? "rgba(20,184,166,0.22)" : "rgba(15,118,110,0.2)",
                        borderWidth: 1,
                        padding: 10,
                        gap: 6
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: isCompleted ? colorTokens.accentDark : "rgba(249,115,22,0.14)",
                          borderColor: isCompleted ? "rgba(0,122,107,0.22)" : "rgba(249,115,22,0.28)",
                          borderRadius: 999,
                          borderWidth: 1,
                          height: 24,
                          justifyContent: "center",
                          width: 24
                        }}
                      >
                        <Text style={{ color: isCompleted ? "#ffffff" : "#c2410c", fontSize: 9, fontWeight: "900", lineHeight: 15 }}>
                          {isCompleted ? "OK" : "!"}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", lineHeight: 16 }}>{task.title}</Text>
                        <Text style={{ fontSize: 10, lineHeight: 14, color: "#57534e" }}>
                          {task.id === "add_payment_method"
                            ? "Referencia para reservas. Sin cobro real en piloto."
                            : task.description}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <StatusChip label={isCompleted ? "Listo" : "Pendiente"} tone={isCompleted ? "active" : "pending"} />
                        <Text style={{ color: colorTokens.accentDark, fontSize: 14, fontWeight: "900" }}>{">"}</Text>
                      </View>
                    </View>
                  </Pressable>
                  );
                })}
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
                      onPress={() => {
                        const shouldCloseProfile = isProfileFormVisible || activeAccountPanel === "profile";
                        setIsProfileFormVisible(!shouldCloseProfile);
                        setActiveAccountPanel(shouldCloseProfile ? "access" : "profile");
                      }}
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
                      <OwnerLineIcon color={colorTokens.accentDark} name={isProfileFormVisible || activeAccountPanel === "profile" ? "close" : "user"} size={17} />
                    </Pressable>
                  </View>
                </View>

                {isProfileFormVisible || activeAccountPanel === "profile" ? (
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
                            setActiveAccountPanel("access");
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
                          setActiveAccountPanel("access");
                        }}
                        tone="secondary"
                      />
                    </View>
                  </>
                ) : null}
                <View style={{ borderRadius: 14, backgroundColor: "rgba(240,253,250,0.68)", padding: 10, gap: 7 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Preferencias</Text>
                      <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                        Recordatorios y comunicacion de la app.
                      </Text>
                    </View>
                    <Button
                      disabled={isSubmitting}
                      label={activeAccountPanel === "preferences" ? "Ocultar" : "Abrir"}
                      onPress={() => setActiveAccountPanel((current) => current === "preferences" ? "profile" : "preferences")}
                      tone="secondary"
                    />
                  </View>

                  {activeAccountPanel === "preferences" ? (
                    <>
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
                    </>
                  ) : null}
                </View>
              </View>
            </CoreSectionCard>

            <CoreSectionCard
              eyebrow="Roles"
              title="Modo de uso"
              description="Revisa tu rol activo y los modos disponibles para esta cuenta."
            >
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    backgroundColor: "rgba(15,118,110,0.08)",
                    borderColor: "rgba(15,118,110,0.18)",
                    borderRadius: 14,
                    borderWidth: 1,
                    padding: 10,
                    gap: 4
                  }}
                >
                  <Text style={{ color: "#0f766e", fontSize: 10, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" }}>
                    Rol activo
                  </Text>
                  <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                    {coreRoleLabels[activeRole]}
                  </Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                    Solo veras las opciones y tareas correspondientes al modo activo.
                  </Text>
                </View>

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
                    <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                      {role.role === "provider"
                        ? "Modo para gestionar negocios, servicios, horarios y reservas entrantes."
                        : "Modo para gestionar hogar, mascotas, busqueda de servicios y reservas."}
                    </Text>
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

                {missingAccountRoles.length ? (
                  <View
                    style={{
                      backgroundColor: "rgba(255,247,237,0.84)",
                      borderColor: "rgba(249,115,22,0.22)",
                      borderRadius: 14,
                      borderWidth: 1,
                      padding: 10,
                      gap: 5
                    }}
                  >
                    <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
                      Necesitas agregar otro rol?
                    </Text>
                    <Text style={{ color: "#57534e", fontSize: 10, lineHeight: 15 }}>
                      Esta cuenta aun no tiene {missingAccountRoles.map((role) => coreRoleLabels[role]).join(" ni ")}. Para el piloto, solicita al equipo interno que habilite el rol antes de usar ese modo.
                    </Text>
                  </View>
                ) : null}
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

            {!isProviderMode ? (
              <View
                onLayout={(event) => {
                  accountHouseholdsYRef.current = event.nativeEvent.layout.y;
                }}
              >
                <HouseholdsWorkspace
                  enabled
                  focusSection={accountFocusSection}
                  onHouseholdCreated={petsWorkspace.refresh}
                  onPetTransferAccepted={handlePetTransferAccepted}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {ownerNeedsHouseholdSetup && !isAccountSectionActive ? (
          <>
            <View style={{ borderRadius: 22, backgroundColor: colorTokens.accentDark, padding: 16, gap: 6, ...visualTokens.mobile.shadow }}>
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", lineHeight: 20 }}>Primero crea tu hogar familiar</Text>
              <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 11, fontWeight: "700", lineHeight: 16 }}>
                Este es el espacio donde organizaras tus mascotas, reservas y recordatorios. Despues podras registrar tu primera mascota.
              </Text>
            </View>
            <HouseholdsWorkspace
              enabled
              onHouseholdCreated={async () => {
                await petsWorkspace.refresh();
                setActiveOwnerSection("inicio");
              }}
              presentation="ownerOnboarding"
            />
          </>
        ) : null}

        {ownerNeedsFirstPetSetup && !isAccountSectionActive ? (
          <>
            <View style={{ borderRadius: 22, backgroundColor: colorTokens.accentDark, padding: 16, gap: 6, ...visualTokens.mobile.shadow }}>
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", lineHeight: 20 }}>Ahora registra tu primera mascota</Text>
              <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 11, fontWeight: "700", lineHeight: 16 }}>
                Tu hogar ya esta listo. Agrega a tu mascota para activar su perfil, salud, documentos y recordatorios.
              </Text>
            </View>
            <PetsWorkspace
              enabled
              onContextChange={setActiveOwnerPetFromSelection}
              onPanelChange={setActivePetHubPanel}
              onPetCreated={async (context) => {
                setPendingPetHubPetId(context.petId);
                setActiveOwnerPetFromSelection(context);
                await petsWorkspace.refresh();
                setPendingPetHubPetId(context.petId);
                setActiveOwnerPetFromSelection(context);
                setActivePetHubPanel("detalle");
                setActiveOwnerSection("mascotas");
              }}
              ownerReminders={remindersWorkspace.reminders}
              presentation="firstPetOnboarding"
            />
          </>
        ) : null}

        {authState.isAuthenticated && snapshot && !isProviderMode && !ownerNeedsHouseholdSetup && !ownerNeedsFirstPetSetup && activeOwnerSection === "inicio" ? (
          <OwnerHome
            bookings={bookingsWorkspace.bookings}
            householdName={defaultHouseholdName}
            onNavigate={setActiveOwnerSection}
            onOpenAdoption={() => {
              setActiveOwnerSection("adopcion");
            }}
            onOpenReminders={(petId) => {
              if (petId) {
                const reminderPet = petsWorkspace.pets.find((pet) => pet.id === petId);

                if (reminderPet) {
                  setPendingPetHubPetId(petId);
                  setActiveOwnerPetFromSelection({ householdId: reminderPet.householdId, petId });
                }
              }

              setActivePetHubPanel("recordatorios");
              setActiveOwnerSection("mascotas");
            }}
            onSelectPet={(petId) => {
              setPendingPetHubPetId(petId);
              setActiveOwnerPetFromSelection({ householdId: petsWorkspace.selectedHouseholdId, petId });
              setActivePetHubPanel("detalle");
              setActiveOwnerSection("mascotas");
            }}
            ownerFirstName={snapshot.profile.firstName}
            pets={petsWorkspace.pets}
            reminders={remindersWorkspace.reminders}
            serviceHighlights={marketplaceWorkspace.homeSnapshot?.categoryHighlights ?? []}
          />
        ) : null}
        {authState.isAuthenticated && !isProviderMode && !ownerNeedsHouseholdSetup && !ownerNeedsFirstPetSetup && activeOwnerSection === "mascotas" ? (
          <>
            <PetsWorkspace
              activePanel={activePetHubPanel}
              contextPetId={activeOwnerPetContextId}
              enabled
              ownerReminders={remindersWorkspace.reminders}
              onContextChange={(context) => {
                setActiveOwnerPetFromSelection(context);

                if (pendingPetHubPetId && context.petId === pendingPetHubPetId) {
                  setPendingPetHubPetId(null);
                }
              }}
              onOpenMarketplace={() => setActiveOwnerSection("buscar")}
              onPanelChange={setActivePetHubPanel}
            />
            {activePetHubPanel === "salud" ? (
              <HealthWorkspace
                contextHouseholdId={activeOwnerPetContextForModules.householdId}
                contextPetId={activeOwnerPetContextForModules.petId}
                enabled
                mode="pet-hub"
                onActivePetChange={setActiveOwnerPetFromSelection}
              />
            ) : null}
            {activePetHubPanel === "recordatorios" ? (
              <RemindersWorkspace
                contextHouseholdId={activeOwnerPetContextForModules.householdId}
                contextPetId={activeOwnerPetContextForModules.petId}
                enabled
                mode="pet-hub"
                onActivePetChange={setActiveOwnerPetFromSelection}
                onRemindersChanged={remindersWorkspace.refresh}
              />
            ) : null}
          </>
        ) : null}
        {authState.isAuthenticated && !isProviderMode && !ownerNeedsHouseholdSetup && !ownerNeedsFirstPetSetup && activeOwnerSection === "buscar" ? (
          <MarketplaceWorkspace
            activePetContext={activeOwnerPetContextForModules}
            enabled
            onActivePetChange={setActiveOwnerPetFromSelection}
            onSelectBookingService={(selection) => {
              const nextSelection = {
                ...selection,
                householdId: selection.householdId ?? activeOwnerPetContextForModules.householdId,
                petId: selection.petId ?? activeOwnerPetContextForModules.petId
              };
              setMarketplaceSelection(nextSelection);
              if (nextSelection.petId) {
                setActiveOwnerPetFromSelection({ householdId: nextSelection.householdId, petId: nextSelection.petId });
              }
              setActiveBookingHubPanel("detalle");
              setActiveOwnerSection("reservas");
            }}
          />
        ) : null}
        {authState.isAuthenticated && !isProviderMode && !ownerNeedsHouseholdSetup && !ownerNeedsFirstPetSetup && activeOwnerSection === "adopcion" ? (
          <AdoptionDiscoveryWorkspace
            enabled
            onBackHome={() => setActiveOwnerSection("inicio")}
            onOpenPetInvitations={() => {
              setAccountFocusSection("petInvitations");
              setActiveOwnerSection("cuenta");
            }}
          />
        ) : null}
        {authState.isAuthenticated && !isProviderMode && !ownerNeedsHouseholdSetup && !ownerNeedsFirstPetSetup && activeOwnerSection === "reservas" ? (
          <>
            <BookingsWorkspace
              activePanel={activeBookingHubPanel}
              activePetContext={activeOwnerPetContextForModules}
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
              onActivePetChange={setActiveOwnerPetFromSelection}
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
        {authState.isAuthenticated && !isProviderMode && !ownerNeedsHouseholdSetup && !ownerNeedsFirstPetSetup && activeOwnerSection === "mensajes" ? (
          <MessagingWorkspace currentUserId={authState.userId ?? null} enabled focusedBookingId={null} focusVersion={chatFocusVersion} viewerRole="owner" />
        ) : null}
        {authState.isAuthenticated && snapshot && isProviderMode && activeProviderSection !== "mensajes" && activeProviderSection !== "cuenta" ? (
          <ProvidersWorkspace
            activeSection={activeProviderSection}
            enabled
            hasProviderRole={hasProviderRole}
            onNavigateSection={setActiveProviderSection}
            providerRoleActive={activeRole === "provider"}
          />
        ) : null}
        {authState.isAuthenticated && isProviderMode && activeProviderSection === "mensajes" ? (
          <MessagingWorkspace currentUserId={authState.userId ?? null} enabled focusedBookingId={null} focusVersion={chatFocusVersion} viewerRole="provider" />
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
                    if (section.id === "mensajes") {
                      setFocusedBookingId(null);
                      setChatFocusVersion((currentVersion) => currentVersion + 1);
                    }
                    return;
                  }

                  setActiveOwnerSection(section.id as OwnerSectionId);
                  if (section.id === "reservas") {
                    void bookingsWorkspace.refresh();
                  }
                  if (section.id === "mensajes") {
                    setFocusedBookingId(null);
                    setChatFocusVersion((currentVersion) => currentVersion + 1);
                  }
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




