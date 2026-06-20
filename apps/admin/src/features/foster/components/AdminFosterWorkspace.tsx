"use client";

import type { AdminProtectiveHouseholdProfile, ProtectiveHouseholdReviewDecision, Uuid } from "@pet/types";
import { colorTokens, visualTokens } from "@pet/ui";
import { useEffect, useMemo, useState } from "react";

import { getAdminFosterApiClient } from "../../core/services/supabase-admin";

const cardStyle = {
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid rgba(24,24,27,0.12)",
  padding: "20px",
  display: "grid",
  gap: "14px",
  boxShadow: visualTokens.web.softShadow
} as const;

const inputStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(24,24,27,0.14)",
  background: "#ffffff",
  padding: "12px 14px",
  fontSize: "15px"
} as const;

const statusLabels: Record<AdminProtectiveHouseholdProfile["status"], string> = {
  approved: "Aprobada",
  draft: "Borrador",
  pending_review: "En revision",
  rejected: "Rechazada",
  suspended: "Suspendida"
};

const organizationTypeLabels: Record<AdminProtectiveHouseholdProfile["organizationType"], string> = {
  foundation: "Fundacion",
  foster_home: "Hogar temporal",
  individual_rescuer: "Rescatista",
  other: "Otro",
  temporary_home: "Familia de acogida"
};

function Button({
  children,
  disabled,
  onClick,
  tone = "primary"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "danger" | "primary" | "secondary";
}) {
  const palette =
    tone === "danger"
      ? { background: "#b91c1c", color: "#fef2f2", border: "none" }
      : tone === "primary"
        ? { background: colorTokens.adminAccent, color: "#f8fafc", border: "none" }
        : { background: "#ffffff", color: colorTokens.adminAccent, border: "1px solid rgba(0,138,151,0.28)" };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      style={{
        borderRadius: "999px",
        border: palette.border,
        background: palette.background,
        color: palette.color,
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

export function AdminFosterWorkspace({
  onOpenQueue,
  variant = "full"
}: {
  onOpenQueue?: () => void;
  variant?: "full" | "home";
}) {
  const [profiles, setProfiles] = useState<AdminProtectiveHouseholdProfile[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.householdId === selectedHouseholdId) ?? profiles[0] ?? null,
    [profiles, selectedHouseholdId]
  );

  async function refresh(preferredHouseholdId?: Uuid | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextProfiles = await getAdminFosterApiClient().listPendingProtectiveHouseholdProfiles();
      setProfiles(nextProfiles);
      setSelectedHouseholdId(
        preferredHouseholdId && nextProfiles.some((profile) => profile.householdId === preferredHouseholdId)
          ? preferredHouseholdId
          : nextProfiles[0]?.householdId ?? null
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar familias protectoras pendientes.");
    } finally {
      setIsLoading(false);
    }
  }

  async function reviewSelectedProfile(decision: ProtectiveHouseholdReviewDecision) {
    if (!selectedProfile) {
      setErrorMessage("Selecciona primero una solicitud de familia protectora.");
      return;
    }

    if ((decision === "rejected" || decision === "suspended") && !reviewNotes.trim()) {
      setErrorMessage("La nota es obligatoria para rechazar o suspender.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getAdminFosterApiClient().reviewProtectiveHouseholdProfile(selectedProfile.householdId, {
        decision,
        notes: reviewNotes.trim() || null
      });
      setInfoMessage(
        decision === "approved"
          ? "Familia protectora aprobada."
          : decision === "rejected"
            ? "Solicitud de familia protectora rechazada."
            : "Familia protectora suspendida."
      );
      setReviewNotes("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible revisar la solicitud protectora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (variant === "home") {
    return (
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px" }}>Familias protectoras</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>Solicitudes de acogida pendientes de revision.</p>
          </div>
          <strong style={{ color: profiles.length ? "#b45309" : colorTokens.adminAccent, fontSize: "28px" }}>
            {profiles.length}
          </strong>
        </div>
        {isLoading && !profiles.length ? <p style={{ margin: 0, color: "#52525b" }}>Cargando solicitudes...</p> : null}
        {errorMessage ? <p style={{ margin: 0, color: "#991b1b" }}>{errorMessage}</p> : null}
        {!profiles.length && !isLoading ? (
          <p style={{ margin: 0, color: "#52525b" }}>No hay familias protectoras pendientes de revision.</p>
        ) : null}
        <Button onClick={onOpenQueue} tone="secondary">
          Abrir cola
        </Button>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: colorTokens.adminAccent }}>{infoMessage}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0,1fr)", gap: "20px", alignItems: "start" }}>
        <aside style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Solicitudes</h2>
            <span style={{ color: "#52525b" }}>{profiles.length} pendiente(s)</span>
          </div>
          <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
            Actualizar
          </Button>
          {isLoading ? <p style={{ margin: 0, color: "#52525b" }}>Cargando familias protectoras...</p> : null}
          {profiles.length ? (
            profiles.map((profile) => (
              <button
                key={profile.householdId}
                onClick={() => setSelectedHouseholdId(profile.householdId)}
                type="button"
                style={{
                  ...inputStyle,
                  textAlign: "left",
                  display: "grid",
                  gap: "6px",
                  cursor: "pointer",
                  borderColor:
                    profile.householdId === selectedProfile?.householdId ? "rgba(0,138,151,0.32)" : "rgba(24,24,27,0.14)"
                }}
              >
                <strong>{profile.displayName}</strong>
                <span style={{ color: "#52525b" }}>{profile.householdName ?? "Hogar no disponible"}</span>
                <span style={{ color: "#71717a" }}>{profile.city}, {profile.countryCode}</span>
              </button>
            ))
          ) : (
            <p style={{ margin: 0, color: "#52525b" }}>No hay solicitudes pendientes.</p>
          )}
        </aside>

        <article style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Revision de familia protectora</h2>
            {selectedProfile ? (
              <span
                style={{
                  borderRadius: "999px",
                  background: "rgba(217,119,6,0.12)",
                  color: "#b45309",
                  fontWeight: 800,
                  padding: "8px 12px"
                }}
              >
                {statusLabels[selectedProfile.status]}
              </span>
            ) : null}
          </div>
          {selectedProfile ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                <div style={inputStyle}>
                  <strong>Nombre visible</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedProfile.displayName}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Hogar</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedProfile.householdName ?? "Sin nombre"}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Tipo</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{organizationTypeLabels[selectedProfile.organizationType]}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Ubicacion</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>
                    {selectedProfile.city}{selectedProfile.stateRegion ? `, ${selectedProfile.stateRegion}` : ""}, {selectedProfile.countryCode}
                  </div>
                </div>
              </div>
              <div style={inputStyle}>
                <strong>Contexto de contacto</strong>
                <p style={{ color: "#52525b", lineHeight: 1.6, margin: "8px 0 0" }}>
                  {selectedProfile.contactNotes || "Sin notas de contacto."}
                </p>
              </div>
              <div style={inputStyle}>
                <strong>Descripcion corta</strong>
                <p style={{ color: "#52525b", lineHeight: 1.6, margin: "8px 0 0" }}>
                  {selectedProfile.publicNotes || "Sin descripcion adicional."}
                </p>
              </div>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase" }}>
                  Nota de revision
                </span>
                <textarea
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Motivo de rechazo/suspension o nota interna opcional."
                  style={{ ...inputStyle, minHeight: "96px", resize: "vertical" }}
                  value={reviewNotes}
                />
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} onClick={() => void reviewSelectedProfile("approved")}>
                  Aprobar
                </Button>
                <Button disabled={isSubmitting} onClick={() => void reviewSelectedProfile("rejected")} tone="danger">
                  Rechazar
                </Button>
                <Button disabled={isSubmitting} onClick={() => void reviewSelectedProfile("suspended")} tone="secondary">
                  Suspender
                </Button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#52525b" }}>Selecciona una solicitud pendiente para revisarla.</p>
          )}
        </article>
      </div>
    </section>
  );
}
