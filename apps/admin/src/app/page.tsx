"use client";

import { coreRoleLabels } from "@pet/config";
import type { CoreIdentitySnapshot } from "@pet/types";
import { useEffect, useMemo, useState } from "react";

import { getAdminCoreApiClient } from "../features/core/services/supabase-admin";
import { AdminProvidersWorkspace } from "../features/providers/components/AdminProvidersWorkspace";
import { AdminSupportWorkspace } from "../features/support/components/AdminSupportWorkspace";

const shellStyle = {
  minHeight: "100vh",
  padding: "32px",
  display: "grid",
  gap: "24px",
  width: "min(1200px, 100%)",
  margin: "0 auto"
} as const;

const cardStyle = {
  borderRadius: "24px",
  border: "1px solid rgba(24,24,27,0.12)",
  background: "rgba(255,255,255,0.82)",
  padding: "24px",
  display: "grid",
  gap: "14px"
} as const;

const inputStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(24,24,27,0.14)",
  background: "#fefcf5",
  padding: "12px 14px",
  fontSize: "15px"
} as const;

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
        border: tone === "primary" ? "none" : "1px solid rgba(24,24,27,0.14)",
        background: tone === "primary" ? "#1d4ed8" : "rgba(255,255,255,0.88)",
        color: tone === "primary" ? "#f8fafc" : "#18181b",
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

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [snapshot, setSnapshot] = useState<CoreIdentitySnapshot | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = useMemo(() => snapshot?.roles.some((role) => role.role === "admin") ?? false, [snapshot]);

  async function refreshSession() {
    setErrorMessage(null);

    try {
      const authState = await getAdminCoreApiClient().getAuthState();

      if (!authState.isAuthenticated) {
        setSnapshot(null);
        return;
      }

      const nextSnapshot = await getAdminCoreApiClient().getCoreSnapshot();
      setSnapshot(nextSnapshot);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to resolve the admin session.");
      setSnapshot(null);
    } finally {
      setAuthChecked(true);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <main style={shellStyle}>
      <header
        style={{
          borderRadius: "28px",
          padding: "32px",
          background: "rgba(17,24,39,0.94)",
          color: "#f8fafc",
          display: "grid",
          gap: "12px"
        }}
      >
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#93c5fd" }}>
          Admin / Platform Ops MVP
        </p>
        <h1 style={{ margin: 0, fontSize: "42px", lineHeight: 1.05 }}>Provider approvals and support triage</h1>
        <p style={{ margin: 0, maxWidth: "760px", lineHeight: 1.7, color: "rgba(248,250,252,0.82)" }}>
          This admin surface stays limited to the MVP slices already canonized: provider approval review plus support case triage. It does not open disputes, macros or advanced admin ops.
        </p>
        {snapshot ? (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {snapshot.roles.map((role) => (
              <span
                key={role.id}
                style={{
                  borderRadius: "999px",
                  padding: "8px 12px",
                  background: role.role === "admin" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.1)",
                  color: role.role === "admin" ? "#bfdbfe" : "#e4e4e7",
                  fontWeight: 700
                }}
              >
                {`${coreRoleLabels[role.role]}${role.isActive ? " active" : ""}`}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {errorMessage ? <section style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</section> : null}
      {!errorMessage && infoMessage ? <section style={{ ...cardStyle, color: "#1d4ed8" }}>{infoMessage}</section> : null}

      {!authChecked ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0 }}>Loading admin session</h2>
          <p style={{ margin: 0, color: "#52525b" }}>Resolving the current Supabase session and admin role.</p>
        </section>
      ) : null}

      {authChecked && !snapshot ? (
        <section style={{ ...cardStyle, maxWidth: "560px" }}>
          <h2 style={{ margin: 0 }}>Admin login</h2>
          <p style={{ margin: 0, color: "#52525b", lineHeight: 1.7 }}>
            Sign in with a platform user that already has the global <strong>admin</strong> role provisioned.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setErrorMessage(null);
              setInfoMessage(null);
              void getAdminCoreApiClient()
                .login({ email, password })
                .then(async () => {
                  await refreshSession();
                  setInfoMessage("Admin session authenticated.");
                  setPassword("");
                })
                .catch((error) => {
                  setErrorMessage(error instanceof Error ? error.message : "Unable to authenticate the admin user.");
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
            style={{ display: "grid", gap: "12px" }}
          >
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#71717a" }}>Email</span>
              <input
                onChange={(event) => setEmail(event.target.value)}
                style={inputStyle}
                type="email"
                value={email}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#71717a" }}>Password</span>
              <input
                onChange={(event) => setPassword(event.target.value)}
                style={inputStyle}
                type="password"
                value={password}
              />
            </label>
            <Button disabled={isSubmitting} type="submit">
              Login
            </Button>
          </form>
        </section>
      ) : null}

      {authChecked && snapshot && !isAdmin ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0 }}>Admin role required</h2>
          <p style={{ margin: 0, color: "#52525b", lineHeight: 1.7 }}>
            This user is authenticated but does not have the platform <strong>admin</strong> role, so support case management stays locked in the MVP.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Button
              disabled={isSubmitting}
              onClick={() => {
                setIsSubmitting(true);
                setErrorMessage(null);
                setInfoMessage(null);
                void getAdminCoreApiClient()
                  .logout()
                  .then(() => {
                    setSnapshot(null);
                    setInfoMessage("Admin session closed.");
                  })
                  .catch((error) => {
                    setErrorMessage(error instanceof Error ? error.message : "Unable to close the admin session.");
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
              tone="secondary"
            >
              Logout
            </Button>
          </div>
        </section>
      ) : null}

      {authChecked && snapshot && isAdmin ? (
        <>
          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: "4px" }}>
                <strong>{snapshot.profile.email}</strong>
                <span style={{ color: "#52525b" }}>
                  {snapshot.profile.firstName} {snapshot.profile.lastName}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button
                  disabled={isSubmitting}
                  onClick={() => {
                    setInfoMessage(null);
                    void refreshSession().then(() => {
                      setInfoMessage("Admin session refreshed.");
                    });
                  }}
                  tone="secondary"
                >
                  Refresh session
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsSubmitting(true);
                    setErrorMessage(null);
                    setInfoMessage(null);
                    void getAdminCoreApiClient()
                      .logout()
                      .then(() => {
                        setSnapshot(null);
                        setInfoMessage("Admin session closed.");
                      })
                      .catch((error) => {
                        setErrorMessage(error instanceof Error ? error.message : "Unable to close the admin session.");
                      })
                      .finally(() => {
                        setIsSubmitting(false);
                      });
                  }}
                  tone="secondary"
                >
                  Logout
                </Button>
              </div>
            </div>
          </section>
          <AdminProvidersWorkspace />
          <AdminSupportWorkspace />
        </>
      ) : null}
    </main>
  );
}
