"use client";

import type { PetAlertModerationAction, PetAlertModerationCase, PetAlertModerationCaseStatus } from "@pet/types";
import { useEffect, useMemo, useState } from "react";

import { getAdminPetAlertApiClient } from "../../core/services/supabase-admin";

const statusLabels: Record<PetAlertModerationCaseStatus, string> = {
  open: "Pendiente",
  resolved: "Resuelto",
  dismissed: "Descartado"
};

const targetLabels: Record<PetAlertModerationCase["targetType"], string> = {
  lost_pet_alert: "Mascota extraviada",
  community_sighting: "Mascota vista",
  community_claim: "Solicitud de coincidencia"
};

const actionLabels: Record<PetAlertModerationAction, string> = {
  flag: "Pausar visibilidad",
  restore: "Restaurar visibilidad",
  close: "Cerrar publicacion",
  reject_claim: "Rechazar solicitud",
  dismiss: "Descartar reporte"
};

const cardStyle = {
  borderRadius: "16px",
  border: "1px solid rgba(15,23,42,0.1)",
  background: "#ffffff",
  padding: "18px",
  display: "grid",
  gap: "12px"
} as const;

const inputStyle = {
  borderRadius: "10px",
  border: "1px solid rgba(15,23,42,0.14)",
  padding: "10px 12px",
  font: "inherit",
  background: "#ffffff"
} as const;

export function AdminPetAlertWorkspace() {
  const [cases, setCases] = useState<PetAlertModerationCase[]>([]);
  const [filter, setFilter] = useState<PetAlertModerationCaseStatus | "all">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<PetAlertModerationAction>("flag");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedId) ?? cases[0] ?? null, [cases, selectedId]);

  async function refresh(preferredId?: string | null) {
    setIsLoading(true);
    setError(null);
    try {
      const nextCases = await getAdminPetAlertApiClient().listPetAlertModerationQueue(filter);
      setCases(nextCases);
      setSelectedId(preferredId && nextCases.some((item) => item.id === preferredId) ? preferredId : nextCases[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible cargar la moderacion PET ALERT.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [filter]);

  async function submitModeration() {
    if (!selectedCase) return;
    if (reason.trim().length < 5) {
      setError("Explica la decision administrativa en al menos 5 caracteres.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await getAdminPetAlertApiClient().moderatePetAlertContent(selectedCase.id, action, reason.trim());
      setReason("");
      setMessage("Decision de moderacion registrada y auditada.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar la decision.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const availableActions: PetAlertModerationAction[] = selectedCase?.targetType === "community_claim"
    ? ["reject_claim", "dismiss"]
    : selectedCase?.targetStatus === "flagged"
      ? ["restore", "close", "dismiss"]
      : ["flag", "close", "dismiss"];

  useEffect(() => {
    if (!availableActions.includes(action)) setAction(availableActions[0] ?? "dismiss");
  }, [selectedCase?.id]);

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      <header style={{ ...cardStyle, background: "#111827", color: "#f8fafc" }}>
        <span style={{ color: "#5eead4", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>Seguridad comunitaria</span>
        <h2 style={{ margin: 0, fontSize: "22px" }}>Moderacion PET ALERT</h2>
        <p style={{ margin: 0, color: "rgba(248,250,252,0.76)", fontSize: "13px", lineHeight: 1.5 }}>
          Revisa contenido reportado sin revelar informacion privada fuera de la operacion administrativa.
        </p>
      </header>

      {error ? <div style={{ ...cardStyle, color: "#991b1b", borderColor: "#fecaca" }}>{error}</div> : null}
      {message ? <div style={{ ...cardStyle, color: "#166534", borderColor: "#bbf7d0" }}>{message}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,0.8fr) minmax(0,1.2fr)", gap: "16px", alignItems: "start" }}>
        <aside style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <strong>Cola de revision</strong>
            <span style={{ fontSize: "12px", color: "#52525b" }}>{cases.length} caso(s)</span>
          </div>
          <select onChange={(event) => setFilter(event.target.value as PetAlertModerationCaseStatus | "all")} style={inputStyle} value={filter}>
            <option value="open">Pendientes</option>
            <option value="resolved">Resueltos</option>
            <option value="dismissed">Descartados</option>
            <option value="all">Todos</option>
          </select>
          <button onClick={() => void refresh(selectedCase?.id)} style={inputStyle} type="button">Actualizar</button>
          {isLoading ? <p style={{ margin: 0 }}>Cargando cola...</p> : cases.length ? cases.map((item) => (
            <button
              key={item.id}
              onClick={() => { setSelectedId(item.id); setReason(""); setMessage(null); setError(null); }}
              style={{ ...inputStyle, textAlign: "left", display: "grid", gap: "5px", cursor: "pointer", background: item.id === selectedCase?.id ? "#ecfeff" : "#ffffff" }}
              type="button"
            >
              <strong style={{ fontSize: "13px" }}>{item.targetTitle}</strong>
              <span style={{ fontSize: "11px", color: "#0f766e" }}>{targetLabels[item.targetType]}</span>
              <span style={{ fontSize: "11px", color: "#52525b" }}>{statusLabels[item.status]}</span>
            </button>
          )) : <p style={{ margin: 0, color: "#52525b" }}>No hay casos con este filtro.</p>}
        </aside>

        <article style={cardStyle}>
          {selectedCase ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#0f766e", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>{targetLabels[selectedCase.targetType]}</div>
                  <h3 style={{ margin: "5px 0 0", fontSize: "19px" }}>{selectedCase.targetTitle}</h3>
                </div>
                <span style={{ ...inputStyle, fontSize: "11px", padding: "7px 10px" }}>{statusLabels[selectedCase.status]}</span>
              </div>
              <div style={inputStyle}>
                <strong style={{ fontSize: "12px" }}>Contenido revisado</strong>
                <p style={{ margin: "7px 0 0", lineHeight: 1.55, color: "#3f3f46" }}>{selectedCase.targetSummary}</p>
              </div>
              <div style={inputStyle}>
                <strong style={{ fontSize: "12px" }}>Motivo del reporte</strong>
                <p style={{ margin: "7px 0 0", color: "#3f3f46" }}>{selectedCase.reasonCode.replaceAll("_", " ")}</p>
                {selectedCase.reportDetails ? <p style={{ margin: "7px 0 0", color: "#52525b" }}>{selectedCase.reportDetails}</p> : null}
              </div>
              {selectedCase.status === "open" ? (
                <>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800 }}>Decision</span>
                    <select onChange={(event) => setAction(event.target.value as PetAlertModerationAction)} style={inputStyle} value={action}>
                      {availableActions.map((item) => <option key={item} value={item}>{actionLabels[item]}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800 }}>Justificacion administrativa</span>
                    <textarea onChange={(event) => setReason(event.target.value)} rows={5} style={{ ...inputStyle, resize: "vertical" }} value={reason} />
                  </label>
                  <button disabled={isSubmitting} onClick={() => void submitModeration()} style={{ ...inputStyle, background: "#0f766e", color: "white", fontWeight: 800, cursor: isSubmitting ? "not-allowed" : "pointer" }} type="button">
                    {isSubmitting ? "Guardando..." : "Registrar decision"}
                  </button>
                </>
              ) : (
                <div style={inputStyle}>
                  <strong>{selectedCase.resolutionAction ? actionLabels[selectedCase.resolutionAction] : "Caso revisado"}</strong>
                  <p style={{ margin: "7px 0 0", color: "#52525b" }}>{selectedCase.resolutionReason ?? "Sin nota registrada."}</p>
                </div>
              )}
            </>
          ) : <p style={{ margin: 0, color: "#52525b" }}>Selecciona un caso para revisar su contexto.</p>}
        </article>
      </div>
    </section>
  );
}
