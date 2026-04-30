import { coreMvpBoundaries, coreRoleLabels, coreSupportedPaymentMethodTypes } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type {
  AddPaymentMethodInput,
  CoreRole,
  MarketplaceServiceSelection,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpsertAddressInput,
  Uuid
} from "@pet/types";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

import { CoreSectionCard } from "../components/CoreSectionCard";
import { StatusChip } from "../components/StatusChip";
import { useCoreWorkspace } from "../hooks/useCoreWorkspace";
import { getMobileCoreApiClient, getMobileRecoveryRedirectUrl } from "../services/supabase-mobile";
import { HouseholdsWorkspace } from "../../households/components/HouseholdsWorkspace";
import { PetsWorkspace } from "../../pets/components/PetsWorkspace";
import { HealthWorkspace } from "../../health/components/HealthWorkspace";
import { RemindersWorkspace } from "../../reminders/components/RemindersWorkspace";
import { MarketplaceWorkspace } from "../../marketplace/components/MarketplaceWorkspace";
import { ProvidersWorkspace, type ProviderWorkspaceSection } from "../../providers/components/ProvidersWorkspace";
import { BookingsWorkspace, type BookingHubPanel } from "../../bookings/components/BookingsWorkspace";
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

const ownerSections: Array<{ description: string; id: OwnerSectionId; label: string }> = [
  { id: "inicio", label: "Inicio", description: "Lo importante para cuidar a tus mascotas hoy." },
  { id: "mascotas", label: "Mascotas", description: "Perfiles, salud, documentos y recordatorios." },
  { id: "buscar", label: "Buscar", description: "Proveedores aprobados y servicios disponibles." },
  { id: "reservas", label: "Reservas", description: "Historial, detalle, reseñas y soporte por reserva." },
  { id: "mensajes", label: "Mensajes", description: "Conversaciones vinculadas a tus reservas." },
  { id: "cuenta", label: "Cuenta", description: "Perfil, hogar, preferencias y metodos guardados." }
];

const ownerSectionLookup = Object.fromEntries(
  ownerSections.map((section) => [section.id, section])
) as Record<OwnerSectionId, (typeof ownerSections)[number]>;

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
  borderColor: "rgba(28,25,23,0.14)",
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  backgroundColor: "#fffdf8",
  color: "#1c1917"
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
        backgroundColor: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.92)",
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(28,25,23,0.14)",
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: disabled ? 0.65 : 1
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : "#1c1917", fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  keyboardType,
  label,
  onChange,
  secureTextEntry,
  value
}: {
  keyboardType?: "default" | "email-address" | "numeric";
  label: string;
  onChange: (value: string) => void;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChange}
        secureTextEntry={secureTextEntry}
        style={inputStyle}
        value={value}
      />
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
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colorTokens.muted, flex: 1 }}>{label}</Text>
      <Switch onValueChange={onChange} value={value} />
    </View>
  );
}

function OwnerShellHeader({
  activeRole,
  completedTasks,
  section,
  totalTasks
}: {
  activeRole: CoreRole;
  completedTasks: number;
  section: OwnerSectionId;
  totalTasks: number;
}) {
  const sectionConfig = ownerSectionLookup[section];

  return (
    <View style={{ borderRadius: 24, backgroundColor: "#1c1917", padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: "#99f6e4" }}>
        Propietario
      </Text>
      <Text style={{ fontSize: 30, fontWeight: "700", lineHeight: 34, color: "#f8fafc" }}>{sectionConfig.label}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: "rgba(248,250,252,0.78)" }}>{sectionConfig.description}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatusChip label={`${completedTasks}/${totalTasks} pasos`} tone="active" />
        <StatusChip label={coreRoleLabels[activeRole]} tone="neutral" />
        <StatusChip label="sin cobro real" tone="neutral" />
      </View>
    </View>
  );
}

function ProviderShellHeader({
  section
}: {
  section: ProviderSectionId;
}) {
  const sectionConfig = providerSectionLookup[section];

  return (
    <View style={{ borderRadius: 24, backgroundColor: "#134e4a", padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: "#ccfbf1" }}>
        Proveedor
      </Text>
      <Text style={{ fontSize: 30, fontWeight: "700", lineHeight: 34, color: "#f8fafc" }}>{sectionConfig.label}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: "rgba(248,250,252,0.82)" }}>{sectionConfig.description}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatusChip label="modo proveedor" tone="active" />
        <StatusChip label="operacion MVP" tone="neutral" />
        <StatusChip label="sin cobro real" tone="neutral" />
      </View>
    </View>
  );
}

function OwnerHome({
  activeRole,
  completedTasks,
  onNavigate,
  totalTasks
}: {
  activeRole: CoreRole;
  completedTasks: number;
  onNavigate: (section: OwnerSectionId) => void;
  totalTasks: number;
}) {
  const cards: Array<{ action: string; description: string; section: OwnerSectionId; title: string }> = [
    {
      action: "Ver mascotas",
      description: "Perfiles, salud, documentos y recordatorios desde un solo lugar.",
      section: "mascotas",
      title: "Cuidado de mascotas"
    },
    {
      action: "Buscar servicios",
      description: "Encuentra proveedores aprobados y prepara una reserva.",
      section: "buscar",
      title: "Servicios"
    },
    {
      action: "Ver reservas",
      description: "Sigue estados, mensajes, reseñas y soporte por reserva.",
      section: "reservas",
      title: "Reservas"
    },
    {
      action: "Abrir cuenta",
      description: "Perfil, hogares, direcciones, preferencias y metodos guardados.",
      section: "cuenta",
      title: "Cuenta"
    }
  ];

  return (
    <View style={{ gap: 14 }}>
      <View style={{ borderRadius: 24, backgroundColor: "rgba(255,255,255,0.92)", padding: 18, gap: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", color: "#0f766e" }}>Inicio</Text>
        <Text style={{ fontSize: 28, fontWeight: "700", lineHeight: 32, color: "#1c1917" }}>Tu dia con tus mascotas</Text>
        <Text style={{ color: colorTokens.muted, lineHeight: 22 }}>
          Accede rapido a cuidado, servicios, reservas y mensajes desde una entrada pensada para propietarios.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <StatusChip label={`${completedTasks}/${totalTasks} pasos de cuenta`} tone="active" />
          <StatusChip label={coreRoleLabels[activeRole]} tone="neutral" />
          <StatusChip label="metodos guardados" tone="neutral" />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ color: "#44403c", fontSize: 16, fontWeight: "700" }}>Que puedes resolver ahora</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Mascota destacada", text: "Abre Mascotas para ver perfiles y documentos.", section: "mascotas" as const },
            { label: "Salud resumida", text: "Vacunas, alergias y condiciones viven junto al perfil.", section: "mascotas" as const },
            { label: "Recordatorios", text: "Consulta pendientes y completa o pospone tareas.", section: "mascotas" as const },
            { label: "Reserva activa", text: "Sigue estado, soporte y reseña desde Reservas.", section: "reservas" as const },
            { label: "Mensajes", text: "Continua conversaciones vinculadas a reservas.", section: "mensajes" as const },
            { label: "Servicios", text: "Busca proveedores aprobados para reservar.", section: "buscar" as const }
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => onNavigate(item.section)}
              style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", flexBasis: "47%", flexGrow: 1, minWidth: 156, padding: 14, gap: 6 }}
            >
              <Text style={{ color: "#1c1917", fontWeight: "700" }}>{item.label}</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 13, lineHeight: 18 }}>{item.text}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {cards.map((card) => (
        <View key={card.title} style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>{card.title}</Text>
          <Text style={{ color: colorTokens.muted, lineHeight: 21 }}>{card.description}</Text>
          <Button label={card.action} onPress={() => onNavigate(card.section)} tone="secondary" />
        </View>
      ))}
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
  const [preferenceForm, setPreferenceForm] = useState(emptyPreferenceForm);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
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
  const completedTasks = snapshot?.onboardingTasks.filter((task) => task.status === "completed").length ?? 0;
  const isProviderMode = activeRole === "provider" && hasProviderRole;
  const isAccountSectionActive = isProviderMode ? activeProviderSection === "cuenta" : activeOwnerSection === "cuenta";

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f2e7" }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color="#0f766e" />
          <Text style={{ color: "#57534e" }}>Preparando tu experiencia...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f2e7" }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {authState.isAuthenticated && snapshot ? (
          isProviderMode ? (
            <ProviderShellHeader section={activeProviderSection} />
          ) : (
          <OwnerShellHeader
            activeRole={activeRole}
            completedTasks={completedTasks}
            section={activeOwnerSection}
            totalTasks={snapshot.onboardingTasks.length}
          />
          )
        ) : (
          <View style={{ borderRadius: 28, backgroundColor: "#1c1917", padding: 24, gap: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: "#99f6e4" }}>
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
        {!configError && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}
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
            <View style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.92)", padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Configuracion de cuenta</Text>
              <Text style={{ color: colorTokens.muted, lineHeight: 21 }}>
                {isProviderMode
                  ? "Aqui viven perfil, preferencias, direcciones, metodos guardados y cambio de rol. La gestion de hogares queda en el modo propietario."
                  : "Aqui viven perfil, preferencias, hogares, direcciones, metodos guardados y cambio de rol. El flujo principal de cuidado queda en las otras pestanas."}
              </Text>
            </View>

            <CoreSectionCard
              eyebrow="Acceso"
              title="Sesion y verificacion"
              description="Estado actual de tu sesion, correo y recuperacion de acceso."
            >
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <StatusChip label={snapshot.verification.status} tone={snapshot.verification.status === "verified" ? "active" : "pending"} />
                  <StatusChip label={snapshot.verification.channel} tone="neutral" />
                  <StatusChip label={snapshot.profile.email} tone="neutral" />
                </View>
                <Text style={{ color: colorTokens.muted, lineHeight: 22 }}>
                  Recuperacion habilitada para {snapshot.recovery.maskedDestination}
                </Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
              eyebrow="Onboarding"
              title="Ruta actual de activacion"
              description="Pasos basicos de cuenta antes de operar el resto de la app."
            >
              <View style={{ gap: 10 }}>
                {snapshot.onboardingTasks.map((task) => (
                  <View key={task.id} style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>{task.title}</Text>
                      <StatusChip label={task.status} tone={task.status === "completed" ? "active" : "pending"} />
                    </View>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: "#57534e" }}>{task.description}</Text>
                  </View>
                ))}
              </View>
            </CoreSectionCard>

            <CoreSectionCard
              eyebrow="Perfil"
              title="Perfil persistido y preferencias"
              description="Datos personales y preferencias de comunicacion de tu cuenta."
            >
              <View style={{ gap: 12 }}>
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
                  label="URL del avatar"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, avatarUrl: value }))}
                  value={profileForm.avatarUrl ?? ""}
                />
                <Field
                  label="Configuracion regional"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, locale: value }))}
                  value={profileForm.locale ?? "es"}
                />
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
                    );
                  }}
                />
                <SwitchRow
                  label="Acepta marketing"
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
              title="Cambio basico de rol"
              description="Aqui solo estan disponibles los contextos de propietario y proveedor."
            >
              <View style={{ gap: 10 }}>
                {snapshot.roles.map((role) => (
                  <View
                    key={role.id}
                    style={{
                      borderRadius: 18,
                      backgroundColor: role.isActive ? "rgba(15,118,110,0.08)" : "rgba(28,25,23,0.04)",
                      padding: 14,
                      gap: 8
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>{coreRoleLabels[role.role]}</Text>
                      <StatusChip label={role.isActive ? "activo" : "disponible"} tone={role.isActive ? "active" : "neutral"} />
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
              title="Ubicaciones del usuario"
              description="Las direcciones pertenecen al usuario y no se convierten en registros del hogar."
            >
              <View style={{ gap: 12 }}>
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
                  label="Linea 1"
                  onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, line1: value }))}
                  value={addressForm.line1}
                />
                <Field
                  label="Linea 2"
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
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    label={addressForm.id ? "Actualizar direccion" : "Guardar direccion"}
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
                      });
                    }}
                  />
                  {addressForm.id ? (
                    <Button disabled={isSubmitting} label="Cancelar edicion" onPress={() => setAddressForm(emptyAddressForm)} tone="secondary" />
                  ) : null}
                </View>
                {snapshot.addresses.map((address) => (
                  <View key={address.id} style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>{address.recipientName}</Text>
                      <StatusChip label={address.isDefault ? "predeterminada" : address.label} tone={address.isDefault ? "active" : "neutral"} />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</Text>
                    <Text style={{ color: colorTokens.muted }}>
                      {address.city}, {address.stateRegion} {address.postalCode}, {address.countryCode}
                    </Text>
                    <Button
                      disabled={isSubmitting}
                      label="Editar"
                      onPress={() =>
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
                        })
                      }
                      tone="secondary"
                    />
                  </View>
                ))}
              </View>
            </CoreSectionCard>

            {!isProviderMode ? (
              <CoreSectionCard
                eyebrow="Metodos de pago"
                title="Solo tarjetas guardadas"
                description={`Compatibles en el core MVP: ${coreSupportedPaymentMethodTypes.join(", ")}.`}
              >
                <View style={{ gap: 12 }}>
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
                    label="Ultimos 4"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, last4: value }))}
                    value={paymentForm.last4}
                  />
                  <Field
                    keyboardType="numeric"
                    label="Mes de vencimiento"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expMonth: value }))}
                    value={paymentForm.expMonth}
                  />
                  <Field
                    keyboardType="numeric"
                    label="Ano de vencimiento"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expYear: value }))}
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
                    <View key={paymentMethod.id} style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>
                          {paymentMethod.brand.toUpperCase()} terminada en {paymentMethod.last4}
                        </Text>
                        <StatusChip
                          label={paymentMethod.isDefault ? "predeterminada" : paymentMethod.status}
                          tone={paymentMethod.isDefault ? "active" : "neutral"}
                        />
                      </View>
                      <Text style={{ color: colorTokens.muted }}>
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
            ) : (
              <CoreSectionCard
                eyebrow="Pagos"
                title="Pagos reales fuera del MVP"
                description="Las tarjetas guardadas pertenecen al modo propietario como referencia para reservas. Payouts, liquidaciones y facturacion del proveedor no forman parte del MVP actual."
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <StatusChip label="payment-ready" tone="neutral" />
                  <StatusChip label="sin cobro real" tone="neutral" />
                  <StatusChip label="payouts fuera de alcance" tone="pending" />
                </View>
              </CoreSectionCard>
            )}

            {!isProviderMode ? <HouseholdsWorkspace enabled /> : null}
          </>
        ) : null}

        {authState.isAuthenticated && snapshot && !isProviderMode && activeOwnerSection === "inicio" ? (
          <OwnerHome
            activeRole={activeRole}
            completedTasks={completedTasks}
            onNavigate={setActiveOwnerSection}
            totalTasks={snapshot.onboardingTasks.length}
          />
        ) : null}
        {authState.isAuthenticated && !isProviderMode && activeOwnerSection === "mascotas" ? (
          <>
            <PetsWorkspace
              activePanel={activePetHubPanel}
              enabled
              onContextChange={setPetHubContext}
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
                enabled
                focusedBookingId={focusedBookingId ?? bookingHubContext.bookingId}
                focusVersion={chatFocusVersion}
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
          <MessagingWorkspace enabled focusedBookingId={focusedBookingId} focusVersion={chatFocusVersion} />
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
          <MessagingWorkspace enabled focusedBookingId={focusedBookingId} focusVersion={chatFocusVersion} />
        ) : null}
      </ScrollView>
      {authState.isAuthenticated ? (
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.96)",
            borderTopColor: "rgba(28,25,23,0.12)",
            borderTopWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 4,
            paddingVertical: 8
          }}
        >
          {(isProviderMode ? providerSections : ownerSections).map((section) => {
            const isActive = isProviderMode ? activeProviderSection === section.id : activeOwnerSection === section.id;

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
                  borderRadius: 14,
                  backgroundColor: isActive ? "rgba(15,118,110,0.12)" : "transparent",
                  flex: 1,
                  minWidth: 0,
                  paddingHorizontal: 2,
                  paddingVertical: 9
                }}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    color: isActive ? "#0f766e" : "#57534e",
                    fontSize: 11,
                    fontWeight: isActive ? "700" : "600",
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




