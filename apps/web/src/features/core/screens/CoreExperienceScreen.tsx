"use client";

import { coreMvpBoundaries, coreRoleLabels, coreSupportedPaymentMethodTypes } from "@pet/config";
import { colorTokens, spacingTokens } from "@pet/ui";
import type {
  AddPaymentMethodInput,
  AddressLabel,
  CoreRole,
  MarketplaceServiceSelection,
  PaymentMethodBrand,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpsertAddressInput,
  Uuid
} from "@pet/types";
import { useEffect, useState } from "react";

import { CoreSection } from "../components/CoreSection";
import { StatusPill } from "../components/StatusPill";
import { useCoreWorkspace } from "../hooks/useCoreWorkspace";
import { getBrowserCoreApiClient, getBrowserRecoveryRedirectUrl } from "../services/supabase-browser";
import { HouseholdsWorkspace } from "../../households/components/HouseholdsWorkspace";
import { PetsWorkspace } from "../../pets/components/PetsWorkspace";
import { HealthWorkspace } from "../../health/components/HealthWorkspace";
import { RemindersWorkspace } from "../../reminders/components/RemindersWorkspace";
import { MarketplaceWorkspace } from "../../marketplace/components/MarketplaceWorkspace";
import { ProvidersWorkspace } from "../../providers/components/ProvidersWorkspace";
import { BookingsWorkspace } from "../../bookings/components/BookingsWorkspace";
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

const fieldLabelStyle = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#78716c"
};

const controlStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(28, 25, 23, 0.14)",
  padding: "12px 14px",
  fontSize: "15px",
  background: "#fffdf8"
};

function Button({
  children,
  disabled,
  onClick,
  tone = "primary",
  type = "button"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type}
      style={{
        borderRadius: "999px",
        border: tone === "primary" ? "none" : "1px solid rgba(28, 25, 23, 0.14)",
        background: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.82)",
        color: tone === "primary" ? "#f8fafc" : "#1c1917",
        padding: "12px 18px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "number" | "password" | "text";
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
        style={controlStyle}
      />
    </label>
  );
}

function SelectField<TValue extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select onChange={(event) => onChange(event.target.value as TValue)} value={value} style={controlStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckField({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", gap: "10px", alignItems: "center", color: "#44403c" }}>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function Notice({ message, tone }: { message: string; tone: "error" | "info" }) {
  const palette =
    tone === "error"
      ? { background: "rgba(127,29,29,0.08)", border: "rgba(127,29,29,0.18)", color: "#991b1b" }
      : { background: "rgba(15,118,110,0.1)", border: "rgba(15,118,110,0.2)", color: "#0f766e" };

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        padding: "14px 16px",
        fontWeight: 600
      }}
    >
      {message}
    </div>
  );
}

function getRoleTone(role: CoreRole, isActive: boolean) {
  if (isActive) {
    return "active" as const;
  }

  return role === "provider" ? ("pending" as const) : ("neutral" as const);
}

export function CoreExperienceScreen() {
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

  const completedTasks = snapshot?.onboardingTasks.filter((task) => task.status === "completed").length ?? 0;
  const activeRole = snapshot?.roles.find((role) => role.isActive)?.role ?? "pet_owner";
  const hasProviderRole = snapshot?.roles.some((role) => role.role === "provider") ?? false;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(15, 118, 110, 0.18), transparent 32%), linear-gradient(180deg, #f7f2e7 0%, #efe5d0 100%)",
        color: colorTokens.ink,
        padding: `${spacingTokens.xl + 16}px ${spacingTokens.lg}px ${spacingTokens.xl * 2}px`
      }}
    >
      <section style={{ width: "min(1180px, 100%)", margin: "0 auto", display: "grid", gap: "24px" }}>
        <header
          style={{
            borderRadius: "28px",
            padding: "36px",
            background: "rgba(28, 25, 23, 0.92)",
            color: "#f8fafc",
            boxShadow: "0 24px 64px rgba(28, 25, 23, 0.2)",
            display: "grid",
            gap: "16px"
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#99f6e4" }}>
            EP-01 / Core
          </p>
          <h1 style={{ margin: 0, fontSize: "48px", lineHeight: 1 }}>Autenticacion real con Supabase y perfil base persistido</h1>
          <p style={{ margin: 0, maxWidth: "780px", lineHeight: 1.7, color: "rgba(248, 250, 252, 0.82)" }}>
            Esta superficie se mantiene dentro del core: onboarding, registro, inicio de sesion, verificacion, recuperacion, perfil,
            preferencias, direcciones, cambio de rol y tarjetas guardadas.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <StatusPill
              tone={snapshot ? "active" : "pending"}
              label={snapshot ? `${completedTasks}/${snapshot.onboardingTasks.length} pasos core listos` : "auth pendiente"}
            />
            <StatusPill tone="neutral" label={`rol activo: ${coreRoleLabels[activeRole]}`} />
            <StatusPill
              tone={coreMvpBoundaries.paymentCaptureInCore ? "pending" : "active"}
              label={coreMvpBoundaries.paymentCaptureInCore ? "cobro dentro del core" : "solo metodos guardados"}
            />
            {authState.isAuthenticated && authState.email ? <StatusPill tone="neutral" label={authState.email} /> : null}
          </div>
          {authState.isAuthenticated ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Actualizar
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  void runAction(() => getBrowserCoreApiClient().logout(), "Sesion cerrada.", false);
                }}
                tone="secondary"
              >
                Cerrar sesion
              </Button>
            </div>
          ) : null}
        </header>

        {configError ? <Notice message={configError} tone="error" /> : null}
        {!configError && errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
        {!configError && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}
        {isRecoverySession ? (
          <Notice
            message="Supabase detecto una sesion de recuperacion. Define una nueva contrasena para completar el flujo de acceso."
            tone="info"
          />
        ) : null}

        {!configError && isRecoverySession ? (
          <CoreSection
            eyebrow="Sesion de recuperacion"
            title="Define una nueva contrasena"
            description="Supabase ya valido el enlace de recuperacion para esta sesion. Guarda aqui la nueva contrasena para completar la recuperacion de acceso."
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                clearMessages();
                void runAction(
                  async () => {
                    if (!recoveryPasswordForm.password) {
                      throw new Error("Se requiere una nueva contrasena.");
                    }

                    if (recoveryPasswordForm.password !== recoveryPasswordForm.confirmPassword) {
                      throw new Error("Las contrasenas de recuperacion deben coincidir.");
                    }

                    await getBrowserCoreApiClient().completeRecovery({
                      password: recoveryPasswordForm.password
                    });
                  },
                  "Contrasena actualizada. Flujo de recuperacion completado."
                ).then(() => {
                  clearRecoverySession();
                  setRecoveryPasswordForm(emptyRecoveryPasswordForm);
                });
              }}
              style={{ display: "grid", gap: "14px" }}
            >
              <Field
                label="Nueva contrasena"
                onChange={(value) => setRecoveryPasswordForm((currentForm) => ({ ...currentForm, password: value }))}
                type="password"
                value={recoveryPasswordForm.password}
              />
              <Field
                label="Confirmar nueva contrasena"
                onChange={(value) =>
                  setRecoveryPasswordForm((currentForm) => ({ ...currentForm, confirmPassword: value }))
                }
                type="password"
                value={recoveryPasswordForm.confirmPassword}
              />
              <Button disabled={isSubmitting} type="submit">
                Actualizar contrasena
              </Button>
            </form>
          </CoreSection>
        ) : null}

        {isLoading ? (
          <CoreSection
            eyebrow="Cargando"
            title="Conectando el espacio core"
            description="Resolviendo la sesion actual de Supabase y los registros persistidos del core."
          >
            <p style={{ margin: 0, color: "#57534e" }}>Cargando autenticacion, perfil, roles, direcciones y metodos de pago...</p>
          </CoreSection>
        ) : null}

        {!isLoading && !authState.isAuthenticated ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px"
            }}
          >
            <CoreSection
              eyebrow="Registro"
              title="Crear identidad base"
              description="Supabase Auth crea la cuenta y la metadata inicializa el perfil y el rol base del core."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  setVerifyForm((currentForm) => ({ ...currentForm, email: registerForm.email }));
                  setRecoverForm({ email: registerForm.email });
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().register({
                        email: registerForm.email,
                        password: registerForm.password,
                        firstName: registerForm.firstName,
                        lastName: registerForm.lastName,
                        requestedRoles: [registerForm.role],
                        emailRedirectTo: getBrowserRecoveryRedirectUrl()
                      }),
                    "Registro enviado. Completa la verificacion por correo si tu proyecto de Supabase lo requiere."
                  );
                }}
                style={{ display: "grid", gap: "14px" }}
              >
                <Field
                  label="Email"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, email: value }))}
                  type="email"
                  value={registerForm.email}
                />
                <Field
                  label="Contrasena"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, password: value }))}
                  type="password"
                  value={registerForm.password}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                </div>
                <SelectField
                  label="Rol inicial"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, role: value }))}
                  options={[
                    { label: coreRoleLabels.pet_owner, value: "pet_owner" },
                    { label: coreRoleLabels.provider, value: "provider" }
                  ]}
                  value={registerForm.role}
                />
                <Button disabled={isSubmitting} type="submit">
                  Crear cuenta
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Acceso"
              title="Usar acceso existente"
              description="El inicio de sesion por contrasena se delega en Supabase Auth y luego rehidrata los datos persistidos del core."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  setVerifyForm((currentForm) => ({ ...currentForm, email: loginForm.email }));
                  setRecoverForm({ email: loginForm.email });
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().login({
                        email: loginForm.email,
                        password: loginForm.password
                      }),
                    "Sesion autenticada."
                  );
                }}
                style={{ display: "grid", gap: "14px" }}
              >
                <Field
                  label="Email"
                  onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, email: value }))}
                  type="email"
                  value={loginForm.email}
                />
                <Field
                  label="Contrasena"
                  onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, password: value }))}
                  type="password"
                  value={loginForm.password}
                />
                <Button disabled={isSubmitting} type="submit">
                  Iniciar sesion
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Verification"
              title="Confirmar correo con OTP"
              description="Enter the manual code from the Supabase signup email when Confirm email is enabled for MVP core."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().verifyOtp({
                        email: verifyForm.email,
                        token: verifyForm.token
                      }),
                    "Verificacion de correo completada."
                  );
                }}
                style={{ display: "grid", gap: "14px" }}
              >
                <Field
                  label="Email"
                  onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, email: value }))}
                  type="email"
                  value={verifyForm.email}
                />
                <Field
                  label="Codigo OTP de 6 digitos"
                  onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                  value={verifyForm.token}
                />
                <Button disabled={isSubmitting} type="submit">
                  Verificar OTP
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Recuperacion"
              title="Trigger access recovery"
              description="Supabase Auth sends the recovery email. This stays inside core and does not touch payments."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().recoverAccess({
                        email: recoverForm.email,
                        redirectTo: getBrowserRecoveryRedirectUrl()
                      }),
                    "Correo de recuperacion solicitado.",
                    false
                  );
                }}
                style={{ display: "grid", gap: "14px" }}
              >
                <Field
                  label="Email"
                  onChange={(value) => setRecoverForm({ email: value })}
                  type="email"
                  value={recoverForm.email}
                />
                <Button disabled={isSubmitting} type="submit">
                  Enviar correo de recuperacion
                </Button>
              </form>
            </CoreSection>
          </div>
        ) : null}

        {!isLoading && authState.isAuthenticated && snapshot ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px"
            }}
          >
            <CoreSection
              eyebrow="Onboarding"
              title="Ruta de activacion actual"
              description="These task states are computed from the real auth session and persisted core records."
            >
              <div style={{ display: "grid", gap: "12px" }}>
                {snapshot.onboardingTasks.map((task) => (
                  <article
                    key={task.id}
                    style={{
                      display: "grid",
                      gap: "8px",
                      borderRadius: "18px",
                      padding: "16px",
                      background: "rgba(247, 242, 231, 0.72)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
                      <strong>{task.title}</strong>
                      <StatusPill tone={task.status === "completed" ? "active" : "pending"} label={task.status} />
                    </div>
                    <span style={{ color: "#57534e", lineHeight: 1.6 }}>{task.description}</span>
                  </article>
                ))}
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Access"
              title="Verification and recovery"
              description="La verificacion usa el OTP manual de correo cuando Confirm email esta activo y la recuperacion pasa por Auth."
            >
              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <StatusPill
                    tone={snapshot.verification.status === "verified" ? "active" : "pending"}
                    label={snapshot.verification.status}
                  />
                  <StatusPill tone="neutral" label={snapshot.verification.channel} />
                  <StatusPill tone="neutral" label={snapshot.profile.email} />
                </div>
                {snapshot.verification.status !== "verified" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      void runAction(
                        () =>
                          getBrowserCoreApiClient().verifyOtp({
                            email: verifyForm.email || snapshot.profile.email,
                            token: verifyForm.token
                          }),
                        "Verificacion de correo completada."
                      );
                    }}
                    style={{ display: "grid", gap: "12px" }}
                  >
                    <Field
                      label="Verification email"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, email: value }))}
                      type="email"
                      value={verifyForm.email || snapshot.profile.email}
                    />
                    <Field
                      label="Codigo OTP de 6 digitos"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                      value={verifyForm.token}
                    />
                    <Button disabled={isSubmitting} type="submit">
                      Verificar correo actual
                    </Button>
                  </form>
                ) : null}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    clearMessages();
                    void runAction(
                      () =>
                        getBrowserCoreApiClient().recoverAccess({
                          email: recoverForm.email || snapshot.profile.email,
                          redirectTo: getBrowserRecoveryRedirectUrl()
                        }),
                      "Correo de recuperacion solicitado.",
                      false
                    );
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <Field
                    label="Correo de recuperacion"
                    onChange={(value) => setRecoverForm({ email: value })}
                    type="email"
                    value={recoverForm.email || snapshot.profile.email}
                  />
                  <Button disabled={isSubmitting} type="submit">
                    Re-send recovery email
                  </Button>
                </form>
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Perfil"
              title="Perfil base persistido"
              description="Estos campos se almacenan en `public.profiles` y permanecen separados de hogares y mascotas."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().updateProfile({
                        firstName: profileForm.firstName?.trim(),
                        lastName: profileForm.lastName?.trim(),
                        phone: profileForm.phone?.trim() || null,
                        avatarUrl: profileForm.avatarUrl?.trim() || null,
                        locale: profileForm.locale?.trim()
                      }),
                    "Perfil actualizado."
                  );
                }}
                style={{ display: "grid", gap: "12px" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                </div>
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
                <Button disabled={isSubmitting} type="submit">
                  Guardar perfil
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Preferencias"
              title="Preferencias de comunicacion"
              description="Las preferencias permanecen en el mismo perfil asociado al propietario."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().updatePreferences({
                        marketingOptIn: preferenceForm.marketingOptIn,
                        reminderEmailOptIn: preferenceForm.reminderEmailOptIn,
                        reminderPushOptIn: preferenceForm.reminderPushOptIn
                      }),
                    "Preferencias actualizadas."
                  );
                }}
                style={{ display: "grid", gap: "12px" }}
              >
                <CheckField
                  checked={preferenceForm.marketingOptIn}
                  label="Acepta marketing"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, marketingOptIn: value }))}
                />
                <CheckField
                  checked={preferenceForm.reminderEmailOptIn}
                  label="Recordatorios por correo"
                  onChange={(value) =>
                    setPreferenceForm((currentForm) => ({ ...currentForm, reminderEmailOptIn: value }))
                  }
                />
                <CheckField
                  checked={preferenceForm.reminderPushOptIn}
                  label="Recordatorios push"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, reminderPushOptIn: value }))}
                />
                <Button disabled={isSubmitting} type="submit">
                  Guardar preferencias
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Roles"
              title="Cambio basico de rol"
              description="Aqui solo existen los contextos de propietario y proveedor; la operacion del proveedor queda fuera de EP-01."
            >
              <div style={{ display: "grid", gap: "12px" }}>
                {snapshot.roles.map((role) => (
                  <article
                    key={role.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: "18px",
                      padding: "14px 16px",
                      background: role.isActive ? "rgba(15, 118, 110, 0.08)" : "rgba(28, 25, 23, 0.04)"
                    }}
                  >
                    <div style={{ display: "grid", gap: "4px" }}>
                      <strong>{coreRoleLabels[role.role]}</strong>
                      <span style={{ color: "#57534e" }}>
                        {role.isActive ? "Contexto visible para la sesion actual." : "Disponible, pero inactivo."}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <StatusPill tone={getRoleTone(role.role, role.isActive)} label={role.isActive ? "activo" : "disponible"} />
                      {!role.isActive ? (
                        <Button
                          disabled={isSubmitting}
                          onClick={() => {
                            clearMessages();
                            void runAction(
                              () => getBrowserCoreApiClient().switchRole({ role: role.role }),
                              `Rol activo cambiado a ${coreRoleLabels[role.role]}.`
                            );
                          }}
                          tone="secondary"
                        >
                          Activar
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Direcciones"
              title="Ubicaciones del usuario"
              description="Las direcciones siguen ligadas al usuario y no se convierten en registros del hogar."
            >
              <div style={{ display: "grid", gap: "18px" }}>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    clearMessages();
                    void runAction(
                      () =>
                        getBrowserCoreApiClient().upsertAddress({
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
                  style={{ display: "grid", gap: "12px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectField<AddressLabel>
                      label="Etiqueta"
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
                  </div>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  </div>
                  <CheckField
                    checked={Boolean(addressForm.isDefault)}
                    label="Marcar como direccion predeterminada"
                    onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                  />
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} type="submit">
                      {addressForm.id ? "Actualizar direccion" : "Guardar direccion"}
                    </Button>
                    {addressForm.id ? (
                      <Button disabled={isSubmitting} onClick={() => setAddressForm(emptyAddressForm)} tone="secondary">
                        Cancelar edicion
                      </Button>
                    ) : null}
                  </div>
                </form>

                <div style={{ display: "grid", gap: "12px" }}>
                  {snapshot.addresses.map((address) => (
                    <article
                      key={address.id}
                      style={{
                        borderRadius: "18px",
                        padding: "16px",
                        background: "rgba(247, 242, 231, 0.72)",
                        display: "grid",
                        gap: "8px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <strong>{address.recipientName}</strong>
                        <StatusPill tone={address.isDefault ? "active" : "neutral"} label={address.isDefault ? "predeterminada" : address.label} />
                      </div>
                      <span style={{ color: "#57534e" }}>
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}
                      </span>
                      <span style={{ color: "#57534e" }}>
                        {address.city}, {address.stateRegion} {address.postalCode}, {address.countryCode}
                      </span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          disabled={isSubmitting}
                          onClick={() =>
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
                        >
                          Editar
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Metodos de pago"
              title="Solo tarjetas guardadas"
              description="Core guarda tarjetas reutilizables, pero checkout, precios y cobro quedan fuera de EP-01."
            >
              <div style={{ display: "grid", gap: "18px" }}>
                <p style={{ margin: 0, color: "#57534e" }}>
                  Compatibles en el core del MVP: {coreSupportedPaymentMethodTypes.join(", ")}.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    clearMessages();
                    void runAction(
                      () =>
                        getBrowserCoreApiClient().addPaymentMethod({
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
                  style={{ display: "grid", gap: "12px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectField<PaymentMethodBrand>
                      label="Marca"
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
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <Field
                      label="Mes de vencimiento"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expMonth: value }))}
                      type="number"
                      value={paymentForm.expMonth}
                    />
                    <Field
                      label="Ano de vencimiento"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expYear: value }))}
                      type="number"
                      value={paymentForm.expYear}
                    />
                    <Field
                      label="Titular"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, cardholderName: value }))}
                      value={paymentForm.cardholderName}
                    />
                  </div>
                  <CheckField
                    checked={Boolean(paymentForm.isDefault)}
                    label="Marcar como metodo de pago predeterminado"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                  />
                  <Button disabled={isSubmitting} type="submit">
                    Guardar tarjeta
                  </Button>
                </form>

                <div style={{ display: "grid", gap: "12px" }}>
                  {snapshot.paymentMethods.map((paymentMethod) => (
                    <article
                      key={paymentMethod.id}
                      style={{
                        borderRadius: "18px",
                        padding: "16px",
                        background: "rgba(247, 242, 231, 0.72)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "16px",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ display: "grid", gap: "4px" }}>
                        <strong>
                          {paymentMethod.brand.toUpperCase()} terminada en {paymentMethod.last4}
                        </strong>
                        <span style={{ color: "#57534e" }}>
                          {paymentMethod.cardholderName} - vence {paymentMethod.expMonth}/{paymentMethod.expYear}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <StatusPill
                          tone={paymentMethod.isDefault ? "active" : "neutral"}
                          label={paymentMethod.isDefault ? "predeterminada" : paymentMethod.status}
                        />
                        {!paymentMethod.isDefault ? (
                          <Button
                            disabled={isSubmitting}
                            onClick={() => {
                              clearMessages();
                              void runAction(
                                () => getBrowserCoreApiClient().setDefaultPaymentMethod(paymentMethod.id),
                                `Metodo de pago predeterminado actualizado a ${paymentMethod.brand.toUpperCase()} ${paymentMethod.last4}.`
                              );
                            }}
                            tone="secondary"
                          >
                            Marcar como predeterminada
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </CoreSection>
          </div>
        ) : null}

        {!isLoading && authState.isAuthenticated ? <HouseholdsWorkspace enabled /> : null}
        {!isLoading && authState.isAuthenticated ? <PetsWorkspace enabled /> : null}
        {!isLoading && authState.isAuthenticated ? <HealthWorkspace enabled /> : null}
        {!isLoading && authState.isAuthenticated ? <RemindersWorkspace enabled /> : null}
        {!isLoading && authState.isAuthenticated ? (
          <ProvidersWorkspace enabled hasProviderRole={hasProviderRole} providerRoleActive={activeRole === "provider"} />
        ) : null}
        {!isLoading ? (
          <MarketplaceWorkspace
            enabled
            onSelectBookingService={
              authState.isAuthenticated
                ? (selection) => {
                    setMarketplaceSelection(selection);
                  }
                : undefined
            }
          />
        ) : null}
        {!isLoading && authState.isAuthenticated ? (
          <BookingsWorkspace
            enabled
            marketplaceSelection={marketplaceSelection}
            onOpenChatForBooking={(bookingId) => {
              setFocusedBookingId(bookingId);
              setChatFocusVersion(Date.now());
            }}
            onOpenReviewForBooking={(bookingId) => {
              setFocusedReviewBookingId(bookingId);
              setReviewFocusVersion(Date.now());
            }}
            onOpenSupportForBooking={(bookingId) => {
              setFocusedSupportBookingId(bookingId);
              setSupportFocusVersion(Date.now());
            }}
          />
        ) : null}
        {!isLoading && authState.isAuthenticated ? (
          <ReviewsWorkspace enabled focusedBookingId={focusedReviewBookingId} focusVersion={reviewFocusVersion} />
        ) : null}
        {!isLoading && authState.isAuthenticated ? (
          <SupportWorkspace enabled focusedBookingId={focusedSupportBookingId} focusVersion={supportFocusVersion} />
        ) : null}
        {!isLoading && authState.isAuthenticated ? (
          <MessagingWorkspace enabled focusedBookingId={focusedBookingId} focusVersion={chatFocusVersion} />
        ) : null}
      </section>
    </main>
  );
}


