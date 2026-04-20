"use client";

import { supportCaseStatusLabels } from "@pet/config";
import type { Uuid } from "@pet/types";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useSupportWorkspace } from "../hooks/useSupportWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getStatusTone(status: "open" | "in_review" | "resolved") {
  if (status === "resolved") {
    return "active" as const;
  }

  if (status === "in_review") {
    return "pending" as const;
  }

  return "neutral" as const;
}

function Button({
  children,
  disabled,
  onClick,
  tone = "primary"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
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

export function SupportWorkspace({
  enabled,
  focusedBookingId,
  focusVersion
}: {
  enabled: boolean;
  focusedBookingId: Uuid | null;
  focusVersion: number;
}) {
  const {
    supportCases,
    selectedCase,
    subjectDraft,
    descriptionDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    openCaseDetail,
    refresh,
    submitCase,
    setDescriptionDraft,
    setSubjectDraft
  } = useSupportWorkspace(enabled, focusedBookingId, focusVersion);

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-07 / Soporte"
        title="Casos de soporte basicos para reservas"
        description="El soporte sigue anclado a una reserva y orientado a la plataforma. Este MVP no incluye disputas, chat de soporte ni adjuntos."
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) minmax(0,1fr)", gap: "18px" }}>
          <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Crear caso de soporte</h3>
                <StatusPill label={focusedBookingId ? "reserva seleccionada" : "esperando reserva"} tone={focusedBookingId ? "active" : "neutral"} />
              </div>
              <div style={{ color: "#57534e", lineHeight: 1.7 }}>
                {focusedBookingId
                  ? `Reserva lista para soporte: ${focusedBookingId}. Solo los participantes del hogar pueden abrir un caso.`
                  : "Abre el detalle de una reserva y elige soporte. En este MVP, cada caso queda ligado a una reserva existente."}
              </div>
              <input
                onChange={(event) => setSubjectDraft(event.target.value)}
                placeholder="Resumen del problema"
                style={inputStyle}
                value={subjectDraft}
              />
              <textarea
                onChange={(event) => setDescriptionDraft(event.target.value)}
                placeholder="Describe lo ocurrido, lo que necesitas y cualquier contexto relevante de la reserva."
                rows={6}
                style={{ ...inputStyle, resize: "vertical", minHeight: "140px", fontFamily: "inherit" }}
                value={descriptionDraft}
              />
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={!focusedBookingId || isSubmitting} onClick={() => void submitCase()}>
                  Crear caso
                </Button>
                <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                  Actualizar
                </Button>
                <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                  Limpiar avisos
                </Button>
              </div>
            </article>

            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Mis casos de soporte</h3>
                <StatusPill label={`${supportCases.length} caso(s)`} tone="neutral" />
              </div>
              {supportCases.length ? (
                supportCases.map((supportCase) => (
                  <button
                    key={supportCase.id}
                    onClick={() => void openCaseDetail(supportCase.id)}
                    type="button"
                    style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "grid", gap: "8px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <strong>{supportCase.subject}</strong>
                      <StatusPill label={supportCaseStatusLabels[supportCase.status]} tone={getStatusTone(supportCase.status)} />
                    </div>
                    <div style={{ color: "#57534e" }}>
                      {supportCase.providerName} · {supportCase.serviceName}
                    </div>
                    <div style={{ color: "#57534e" }}>{supportCase.petName}</div>
                    <div style={{ color: "#57534e" }}>{formatDateTime(supportCase.createdAt)}</div>
                  </button>
                ))
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>Todavia no has creado casos de soporte.</p>
              )}
            </article>
          </div>

          <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Detalle del caso</h3>
                <StatusPill
                  label={selectedCase ? supportCaseStatusLabels[selectedCase.status] : "sin caso seleccionado"}
                  tone={selectedCase ? getStatusTone(selectedCase.status) : "neutral"}
                />
              </div>
              {isLoading && !selectedCase ? (
                <p style={{ margin: 0, color: "#57534e" }}>Cargando datos de soporte desde Supabase...</p>
              ) : selectedCase ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                    <div style={inputStyle}>
                      <strong>Proveedor</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedCase.providerName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Servicio</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedCase.serviceName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Mascota</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedCase.petName}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Inicio programado</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{formatDateTime(selectedCase.scheduledStartAt)}</div>
                    </div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Asunto</strong>
                    <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.subject}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Descripcion</strong>
                    <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.descriptionText}</div>
                  </div>
                  <div style={inputStyle}>
                    <strong>Estado</strong>
                    <div style={{ color: "#57534e", marginTop: "6px" }}>{supportCaseStatusLabels[selectedCase.status]}</div>
                  </div>
                  {selectedCase.adminNote ? (
                    <div style={inputStyle}>
                      <strong>Nota administrativa</strong>
                      <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.adminNote}</div>
                    </div>
                  ) : null}
                  {selectedCase.resolutionText ? (
                    <div style={inputStyle}>
                      <strong>Resolucion</strong>
                      <div style={{ color: "#44403c", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.resolutionText}</div>
                      {selectedCase.resolvedAt ? <div style={{ color: "#78716c", marginTop: "6px" }}>{formatDateTime(selectedCase.resolvedAt)}</div> : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                  Elige uno de tus casos existentes o abre soporte desde el detalle de una reserva para iniciar el flujo.
                </p>
              )}
            </article>
          </div>
        </div>
      </CoreSection>
    </div>
  );
}
