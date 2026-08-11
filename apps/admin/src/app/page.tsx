"use client";

import { coreRoleLabels } from "@pet/config";
import type { CoreIdentitySnapshot } from "@pet/types";
import { colorTokens, visualTokens } from "@pet/ui";
import { useEffect, useMemo, useState } from "react";

import { getAdminCoreApiClient } from "../features/core/services/supabase-admin";
import { AdminFosterWorkspace } from "../features/foster/components/AdminFosterWorkspace";
import { AdminHelpWorkspace } from "../features/help/components/AdminHelpWorkspace";
import { AdminProvidersWorkspace } from "../features/providers/components/AdminProvidersWorkspace";
import { AdminSupportWorkspace } from "../features/support/components/AdminSupportWorkspace";

type AdminSection = "inicio" | "protectora" | "proveedores" | "soporte" | "manual";

const adminSections: Array<{ description: string; id: AdminSection; label: string }> = [
  { id: "inicio", label: "Inicio", description: "Colas accionables y siguiente decision." },
  { id: "proveedores", label: "Proveedores", description: "Revision de proveedores pendientes." },
  { id: "protectora", label: "Familias protectoras", description: "Revision de solicitudes de acogida." },
  { id: "soporte", label: "Soporte", description: "Casos abiertos y resolucion basica." },
  { id: "manual", label: "Manual admin", description: "Guia interna de operacion y soporte." }
];

const shellStyle = {
  minHeight: "100vh",
  padding: "24px",
  display: "grid",
  gap: "18px",
  width: "100%",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef4f2 100%)"
} as const;

const cardStyle = {
  borderRadius: "16px",
  border: "1px solid rgba(15,23,42,0.1)",
  background: "rgba(255,255,255,0.94)",
  padding: "18px",
  display: "grid",
  gap: "12px",
  boxShadow: "0 10px 28px rgba(15,23,42,0.06)"
} as const;

const inputStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(24,24,27,0.14)",
  background: "#ffffff",
  padding: "10px 12px",
  fontSize: "13px"
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
        background: tone === "primary" ? colorTokens.adminAccent : "rgba(255,255,255,0.92)",
        color: tone === "primary" ? "#f8fafc" : colorTokens.adminAccent,
        padding: "9px 13px",
        fontSize: "12px",
        fontWeight: 800,
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
  const [activeSection, setActiveSection] = useState<AdminSection>("inicio");

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
      setErrorMessage(error instanceof Error ? error.message : "No fue posible resolver la sesion de administracion.");
      setSnapshot(null);
    } finally {
      setAuthChecked(true);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <main className="admin-web-shell" style={shellStyle}>
      <style>
        {`
          .admin-web-shell,
          .admin-web-layout,
          .admin-web-content {
            min-width: 0;
          }

          .admin-web-nav-button:focus-visible {
            outline: 2px solid rgba(45, 212, 191, 0.72);
            outline-offset: 2px;
          }

          @media (max-width: 1020px) {
            .admin-web-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .admin-web-sidebar {
              min-height: 0 !important;
              position: static !important;
            }

            .admin-web-nav {
              display: grid !important;
              grid-auto-flow: column;
              grid-auto-columns: minmax(150px, 1fr);
              overflow-x: auto;
              padding-bottom: 4px;
            }
          }

          @media (max-width: 720px) {
            .admin-web-shell {
              padding: 14px !important;
            }

            .admin-web-header {
              padding: 18px !important;
            }

            .admin-web-home-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 520px) {
            .admin-web-shell {
              padding: 10px !important;
            }

            .admin-web-nav {
              grid-auto-columns: minmax(132px, 1fr);
            }
          }
        `}
      </style>
      <header
        className="admin-web-header"
        style={{
          borderRadius: "16px",
          padding: "22px",
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: visualTokens.web.softShadow,
          color: colorTokens.ink,
          display: "flex",
          gap: "16px",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "grid", gap: "6px" }}>
          <span style={{ color: colorTokens.adminAccent, fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Backoffice Pet Ecosystem
          </span>
          <h1 style={{ margin: 0, fontSize: "24px", lineHeight: 1.12 }}>Centro de operaciones</h1>
          <p style={{ margin: 0, maxWidth: "760px", lineHeight: 1.5, color: colorTokens.muted, fontSize: "13px" }}>
            Resumen y gestion operativa de aprobaciones de proveedores y casos de soporte MVP.
          </p>
        </div>
        {snapshot ? (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {snapshot.roles.map((role) => (
              <span
                key={role.id}
                style={{
                  borderRadius: "999px",
                  padding: "7px 10px",
                  background: role.role === "admin" ? colorTokens.blueSoft : "rgba(95,102,117,0.08)",
                  color: role.role === "admin" ? colorTokens.admin : colorTokens.mutedStrong,
                  fontSize: "11px",
                  fontWeight: 800
                }}
              >
                {`${coreRoleLabels[role.role]}${role.isActive ? " activo" : ""}`}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {errorMessage ? <section style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</section> : null}
      {!errorMessage && infoMessage ? <section style={{ ...cardStyle, color: "#1d4ed8" }}>{infoMessage}</section> : null}

      {!authChecked ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0 }}>Cargando sesion administrativa</h2>
          <p style={{ margin: 0, color: "#52525b" }}>Verificando tu acceso y permisos administrativos.</p>
        </section>
      ) : null}

      {authChecked && !snapshot ? (
        <section style={{ ...cardStyle, maxWidth: "560px" }}>
          <h2 style={{ margin: 0 }}>Inicio de sesion administrativo</h2>
          <p style={{ margin: 0, color: "#52525b", lineHeight: 1.7 }}>
            Inicia sesion con un usuario de plataforma que ya tenga provisionado el rol global de <strong>admin</strong>.
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
                  setInfoMessage("Sesion administrativa autenticada.");
                  setPassword("");
                })
                .catch((error) => {
                  setErrorMessage(error instanceof Error ? error.message : "No fue posible autenticar al usuario administrador.");
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
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#71717a" }}>Contrasena</span>
              <input
                onChange={(event) => setPassword(event.target.value)}
                style={inputStyle}
                type="password"
                value={password}
              />
            </label>
            <Button disabled={isSubmitting} type="submit">
              Iniciar sesion
            </Button>
          </form>
        </section>
      ) : null}

      {authChecked && snapshot && !isAdmin ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0 }}>Se requiere rol administrativo</h2>
          <p style={{ margin: 0, color: "#52525b", lineHeight: 1.7 }}>
            Este usuario esta autenticado, pero no tiene el rol de plataforma <strong>admin</strong>, asi que la gestion administrativa del MVP permanece bloqueada.
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
                    setInfoMessage("Sesion administrativa cerrada.");
                  })
                  .catch((error) => {
                    setErrorMessage(error instanceof Error ? error.message : "No fue posible cerrar la sesion administrativa.");
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
              tone="secondary"
            >
              Cerrar sesion
            </Button>
          </div>
        </section>
      ) : null}

      {authChecked && snapshot && isAdmin ? (
        <>
          <section style={{ ...cardStyle, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: "4px" }}>
                <strong style={{ fontSize: "13px" }}>{snapshot.profile.email}</strong>
                <span style={{ color: "#52525b", fontSize: "12px" }}>
                  {snapshot.profile.firstName} {snapshot.profile.lastName}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button
                  disabled={isSubmitting}
                  onClick={() => {
                    setInfoMessage(null);
                    void refreshSession().then(() => {
                      setInfoMessage("Sesion administrativa actualizada.");
                    });
                  }}
                  tone="secondary"
                >
                  Actualizar sesion
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
                        setInfoMessage("Sesion administrativa cerrada.");
                      })
                      .catch((error) => {
                        setErrorMessage(error instanceof Error ? error.message : "No fue posible cerrar la sesion administrativa.");
                      })
                      .finally(() => {
                        setIsSubmitting(false);
                      });
                  }}
                  tone="secondary"
                >
                  Cerrar sesion
                </Button>
              </div>
            </div>
          </section>
          <div className="admin-web-layout" style={{ display: "grid", gridTemplateColumns: "210px minmax(0,1fr)", gap: "18px", alignItems: "start" }}>
            <aside
              className="admin-web-sidebar"
              style={{
                borderRadius: "18px",
                background: "linear-gradient(180deg, #06264b 0%, #0f172a 100%)",
                color: "#f8fafc",
                position: "sticky",
                top: "18px",
                padding: "14px",
                display: "grid",
                gap: "16px",
                minHeight: "calc(100vh - 48px)",
                boxShadow: "0 22px 54px rgba(2,6,23,0.22)"
              }}
            >
              <div style={{ display: "grid", gap: "4px" }}>
                <strong style={{ color: "#f8fafc", fontSize: "17px", lineHeight: 1.05 }}>Pet Ecosystem</strong>
                <span style={{ color: "rgba(248,250,252,0.66)", fontSize: "10px" }}>Backoffice admin</span>
              </div>
              <nav className="admin-web-nav" style={{ display: "grid", gap: "7px" }}>
                {adminSections.map((section) => {
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      className="admin-web-nav-button"
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      type="button"
                      style={{
                        borderRadius: "12px",
                        border: isActive ? "1px solid rgba(45,212,191,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        background: isActive ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.04)",
                        boxShadow: isActive ? "inset 3px 0 0 rgba(45,212,191,0.85)" : "none",
                        color: "#f8fafc",
                        cursor: "pointer",
                        display: "grid",
                        gap: "3px",
                        padding: "9px 10px",
                        textAlign: "left"
                      }}
                    >
                      <strong style={{ color: isActive ? "#99f6e4" : "#f8fafc", fontSize: "11px" }}>{section.label}</strong>
                      <span style={{ color: "rgba(248,250,252,0.68)", fontSize: "9.5px", lineHeight: 1.3 }}>
                        {section.description}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="admin-web-content" style={{ display: "grid", gap: "16px", minWidth: 0 }}>
              {activeSection === "inicio" ? (
                <>
                  <section style={{ ...cardStyle, background: "#111827", color: "#f8fafc", borderRadius: "18px" }}>
                    <p style={{ margin: 0, color: "#5eead4", fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Home admin
                    </p>
                    <h2 style={{ margin: 0, fontSize: "24px", lineHeight: 1.15 }}>Colas de decision</h2>
                    <p style={{ margin: 0, color: "rgba(248,250,252,0.78)", fontSize: "13px", lineHeight: 1.55 }}>
                      Empieza por proveedores pendientes y soporte abierto. Esta vista no agrega analitica nueva: solo ordena las decisiones MVP existentes.
                    </p>
                  </section>
                  <div className="admin-web-home-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "14px" }}>
                    <AdminProvidersWorkspace onOpenQueue={() => setActiveSection("proveedores")} variant="home" />
                    <AdminFosterWorkspace onOpenQueue={() => setActiveSection("protectora")} variant="home" />
                    <AdminSupportWorkspace onOpenQueue={() => setActiveSection("soporte")} variant="home" />
                  </div>
                </>
              ) : null}
              {activeSection === "proveedores" ? <AdminProvidersWorkspace /> : null}
              {activeSection === "protectora" ? <AdminFosterWorkspace /> : null}
              {activeSection === "soporte" ? <AdminSupportWorkspace /> : null}
              {activeSection === "manual" ? <AdminHelpWorkspace /> : null}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
