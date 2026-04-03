"use client";

import { coreMvpBoundaries, coreRoleLabels, coreSupportedPaymentMethodTypes } from "@pet/config";
import { colorTokens, spacingTokens } from "@pet/ui";
import type {
  AddPaymentMethodInput,
  AddressLabel,
  CoreRole,
  PaymentMethodBrand,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpsertAddressInput
} from "@pet/types";
import { useEffect, useState } from "react";

import { CoreSection } from "../components/CoreSection";
import { StatusPill } from "../components/StatusPill";
import { useCoreWorkspace } from "../hooks/useCoreWorkspace";
import { getBrowserCoreApiClient, getBrowserRecoveryRedirectUrl } from "../services/supabase-browser";

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
          <h1 style={{ margin: 0, fontSize: "48px", lineHeight: 1 }}>Real Supabase auth and persisted core profile</h1>
          <p style={{ margin: 0, maxWidth: "780px", lineHeight: 1.7, color: "rgba(248, 250, 252, 0.82)" }}>
            This surface stays intentionally inside core: onboarding, register, login, verification, recovery, profile,
            preferences, addresses, role switching and saved cards only.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <StatusPill
              tone={snapshot ? "active" : "pending"}
              label={snapshot ? `${completedTasks}/${snapshot.onboardingTasks.length} core steps ready` : "auth pending"}
            />
            <StatusPill tone="neutral" label={`active role: ${coreRoleLabels[activeRole]}`} />
            <StatusPill
              tone={coreMvpBoundaries.paymentCaptureInCore ? "pending" : "active"}
              label={coreMvpBoundaries.paymentCaptureInCore ? "payment capture in core" : "saved methods only"}
            />
            {authState.isAuthenticated && authState.email ? <StatusPill tone="neutral" label={authState.email} /> : null}
          </div>
          {authState.isAuthenticated ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Refresh
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  void runAction(() => getBrowserCoreApiClient().logout(), "Session closed.", false);
                }}
                tone="secondary"
              >
                Logout
              </Button>
            </div>
          ) : null}
        </header>

        {configError ? <Notice message={configError} tone="error" /> : null}
        {!configError && errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
        {!configError && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}
        {isRecoverySession ? (
          <Notice
            message="Recovery session detected from Supabase. Set a new password below to finish the access recovery flow."
            tone="info"
          />
        ) : null}

        {!configError && isRecoverySession ? (
          <CoreSection
            eyebrow="Recovery Session"
            title="Set a new password"
            description="Supabase already validated the recovery link for this session. Save the new password here to complete core access recovery."
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                clearMessages();
                void runAction(
                  async () => {
                    if (!recoveryPasswordForm.password) {
                      throw new Error("A new password is required.");
                    }

                    if (recoveryPasswordForm.password !== recoveryPasswordForm.confirmPassword) {
                      throw new Error("The recovery passwords must match.");
                    }

                    await getBrowserCoreApiClient().completeRecovery({
                      password: recoveryPasswordForm.password
                    });
                  },
                  "Password updated. Recovery flow completed."
                ).then(() => {
                  clearRecoverySession();
                  setRecoveryPasswordForm(emptyRecoveryPasswordForm);
                });
              }}
              style={{ display: "grid", gap: "14px" }}
            >
              <Field
                label="New password"
                onChange={(value) => setRecoveryPasswordForm((currentForm) => ({ ...currentForm, password: value }))}
                type="password"
                value={recoveryPasswordForm.password}
              />
              <Field
                label="Confirm new password"
                onChange={(value) =>
                  setRecoveryPasswordForm((currentForm) => ({ ...currentForm, confirmPassword: value }))
                }
                type="password"
                value={recoveryPasswordForm.confirmPassword}
              />
              <Button disabled={isSubmitting} type="submit">
                Update password
              </Button>
            </form>
          </CoreSection>
        ) : null}

        {isLoading ? (
          <CoreSection
            eyebrow="Loading"
            title="Connecting core workspace"
            description="Resolving the current Supabase session and the persisted core records."
          >
            <p style={{ margin: 0, color: "#57534e" }}>Loading auth state, profile, roles, addresses and payment methods...</p>
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
              eyebrow="Register"
              title="Create base identity"
              description="Supabase Auth creates the account and the metadata seeds profile plus initial core role."
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
                    "Registration submitted. Complete email verification if your Supabase project requires it."
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
                  label="Password"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, password: value }))}
                  type="password"
                  value={registerForm.password}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field
                    label="First name"
                    onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, firstName: value }))}
                    value={registerForm.firstName}
                  />
                  <Field
                    label="Last name"
                    onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, lastName: value }))}
                    value={registerForm.lastName}
                  />
                </div>
                <SelectField
                  label="Initial role"
                  onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, role: value }))}
                  options={[
                    { label: coreRoleLabels.pet_owner, value: "pet_owner" },
                    { label: coreRoleLabels.provider, value: "provider" }
                  ]}
                  value={registerForm.role}
                />
                <Button disabled={isSubmitting} type="submit">
                  Register
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Login"
              title="Reuse existing access"
              description="Password login is delegated to Supabase Auth and then rehydrates persisted core data."
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
                    "Session authenticated."
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
                  label="Password"
                  onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, password: value }))}
                  type="password"
                  value={loginForm.password}
                />
                <Button disabled={isSubmitting} type="submit">
                  Login
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Verification"
              title="Confirm email with OTP"
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
                    "Email verification completed."
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
                  label="6-digit OTP code"
                  onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                  value={verifyForm.token}
                />
                <Button disabled={isSubmitting} type="submit">
                  Verify OTP
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Recovery"
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
                    "Recovery email requested.",
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
                  Send recovery email
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
              title="Current activation path"
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
              description="Verification uses the manual email OTP when Confirm email is enabled, while recovery requests go through Auth."
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
                        "Email verification completed."
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
                      label="6-digit OTP code"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                      value={verifyForm.token}
                    />
                    <Button disabled={isSubmitting} type="submit">
                      Verify current email
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
                      "Recovery email requested.",
                      false
                    );
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <Field
                    label="Recovery email"
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
              eyebrow="Profile"
              title="Persisted base profile"
              description="These fields are stored in `public.profiles` and stay separate from households and pets."
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
                    "Profile updated."
                  );
                }}
                style={{ display: "grid", gap: "12px" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field
                    label="First name"
                    onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, firstName: value }))}
                    value={profileForm.firstName ?? ""}
                  />
                  <Field
                    label="Last name"
                    onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, lastName: value }))}
                    value={profileForm.lastName ?? ""}
                  />
                </div>
                <Field
                  label="Phone"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, phone: value }))}
                  value={profileForm.phone ?? ""}
                />
                <Field
                  label="Avatar URL"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, avatarUrl: value }))}
                  value={profileForm.avatarUrl ?? ""}
                />
                <Field
                  label="Locale"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, locale: value }))}
                  value={profileForm.locale ?? "es"}
                />
                <Button disabled={isSubmitting} type="submit">
                  Save profile
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Preferences"
              title="Communication defaults"
              description="Preferences remain on the same owner-scoped profile record."
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
                    "Preferences updated."
                  );
                }}
                style={{ display: "grid", gap: "12px" }}
              >
                <CheckField
                  checked={preferenceForm.marketingOptIn}
                  label="Marketing opt-in"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, marketingOptIn: value }))}
                />
                <CheckField
                  checked={preferenceForm.reminderEmailOptIn}
                  label="Email reminders"
                  onChange={(value) =>
                    setPreferenceForm((currentForm) => ({ ...currentForm, reminderEmailOptIn: value }))
                  }
                />
                <CheckField
                  checked={preferenceForm.reminderPushOptIn}
                  label="Push reminders"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, reminderPushOptIn: value }))}
                />
                <Button disabled={isSubmitting} type="submit">
                  Save preferences
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Roles"
              title="Basic role switching"
              description="Only owner and provider contexts exist here; provider operations remain outside EP-01."
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
                        {role.isActive ? "Visible context for the current session." : "Available but inactive."}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <StatusPill tone={getRoleTone(role.role, role.isActive)} label={role.isActive ? "active" : "available"} />
                      {!role.isActive ? (
                        <Button
                          disabled={isSubmitting}
                          onClick={() => {
                            clearMessages();
                            void runAction(
                              () => getBrowserCoreApiClient().switchRole({ role: role.role }),
                              `Active role changed to ${coreRoleLabels[role.role]}.`
                            );
                          }}
                          tone="secondary"
                        >
                          Activate
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Addresses"
              title="User-owned locations"
              description="Addresses remain tied to the user and do not become household records."
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
                      addressForm.id ? "Address updated." : "Address saved."
                    ).then(() => {
                      setAddressForm(emptyAddressForm);
                    });
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectField<AddressLabel>
                      label="Label"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, label: value }))}
                      options={[
                        { label: "Home", value: "home" },
                        { label: "Work", value: "work" },
                        { label: "Other", value: "other" }
                      ]}
                      value={addressForm.label}
                    />
                    <Field
                      label="Recipient"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, recipientName: value }))}
                      value={addressForm.recipientName}
                    />
                  </div>
                  <Field
                    label="Line 1"
                    onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, line1: value }))}
                    value={addressForm.line1}
                  />
                  <Field
                    label="Line 2"
                    onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, line2: value }))}
                    value={addressForm.line2 ?? ""}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <Field
                      label="City"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, city: value }))}
                      value={addressForm.city}
                    />
                    <Field
                      label="State / region"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, stateRegion: value }))}
                      value={addressForm.stateRegion}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <Field
                      label="Postal code"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, postalCode: value }))}
                      value={addressForm.postalCode}
                    />
                    <Field
                      label="Country code"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, countryCode: value }))}
                      value={addressForm.countryCode}
                    />
                  </div>
                  <CheckField
                    checked={Boolean(addressForm.isDefault)}
                    label="Set as default address"
                    onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                  />
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} type="submit">
                      {addressForm.id ? "Update address" : "Save address"}
                    </Button>
                    {addressForm.id ? (
                      <Button disabled={isSubmitting} onClick={() => setAddressForm(emptyAddressForm)} tone="secondary">
                        Cancel edit
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
                        <StatusPill tone={address.isDefault ? "active" : "neutral"} label={address.isDefault ? "default" : address.label} />
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
                          Edit
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Payment Methods"
              title="Saved cards only"
              description="Core stores reusable cards, but checkout, pricing and capture remain outside EP-01."
            >
              <div style={{ display: "grid", gap: "18px" }}>
                <p style={{ margin: 0, color: "#57534e" }}>
                  Supported in MVP core: {coreSupportedPaymentMethodTypes.join(", ")}.
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
                      "Payment method saved."
                    ).then(() => {
                      setPaymentForm(emptyPaymentForm);
                    });
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectField<PaymentMethodBrand>
                      label="Brand"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, brand: value }))}
                      options={[
                        { label: "Visa", value: "visa" },
                        { label: "Mastercard", value: "mastercard" },
                        { label: "Amex", value: "amex" }
                      ]}
                      value={paymentForm.brand}
                    />
                    <Field
                      label="Last 4"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, last4: value }))}
                      value={paymentForm.last4}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <Field
                      label="Exp month"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expMonth: value }))}
                      type="number"
                      value={paymentForm.expMonth}
                    />
                    <Field
                      label="Exp year"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expYear: value }))}
                      type="number"
                      value={paymentForm.expYear}
                    />
                    <Field
                      label="Cardholder"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, cardholderName: value }))}
                      value={paymentForm.cardholderName}
                    />
                  </div>
                  <CheckField
                    checked={Boolean(paymentForm.isDefault)}
                    label="Set as default payment method"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                  />
                  <Button disabled={isSubmitting} type="submit">
                    Save card
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
                          {paymentMethod.brand.toUpperCase()} ending in {paymentMethod.last4}
                        </strong>
                        <span style={{ color: "#57534e" }}>
                          {paymentMethod.cardholderName} - exp {paymentMethod.expMonth}/{paymentMethod.expYear}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <StatusPill
                          tone={paymentMethod.isDefault ? "active" : "neutral"}
                          label={paymentMethod.isDefault ? "default" : paymentMethod.status}
                        />
                        {!paymentMethod.isDefault ? (
                          <Button
                            disabled={isSubmitting}
                            onClick={() => {
                              clearMessages();
                              void runAction(
                                () => getBrowserCoreApiClient().setDefaultPaymentMethod(paymentMethod.id),
                                `Default payment method updated to ${paymentMethod.brand.toUpperCase()} ${paymentMethod.last4}.`
                              );
                            }}
                            tone="secondary"
                          >
                            Make default
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
      </section>
    </main>
  );
}
