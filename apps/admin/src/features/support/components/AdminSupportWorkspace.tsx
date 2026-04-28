"use client";

import { supportCaseStatusLabels, supportCaseStatusOrder } from "@pet/config";
import type { SupportCaseStatus } from "@pet/types";

import { useAdminSupportWorkspace } from "../hooks/useAdminSupportWorkspace";

const cardStyle = {
  borderRadius: "22px",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(24,24,27,0.12)",
  padding: "20px",
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getStatusTone(status: SupportCaseStatus) {
  if (status === "resolved") {
    return { background: "rgba(15,118,110,0.12)", color: "#0f766e" };
  }

  if (status === "in_review") {
    return { background: "rgba(217,119,6,0.12)", color: "#b45309" };
  }

  return { background: "rgba(113,113,122,0.12)", color: "#3f3f46" };
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
        border: tone === "primary" ? "none" : "1px solid rgba(24,24,27,0.14)",
        background: tone === "primary" ? "#1d4ed8" : "rgba(255,255,255,0.86)",
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

export function AdminSupportWorkspace({
  onOpenQueue,
  variant = "full"
}: {
  onOpenQueue?: () => void;
  variant?: "full" | "home";
}) {
  const {
    adminNoteDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    resolutionDraft,
    selectedCase,
    selectedStatus,
    statusFilter,
    supportCases,
    clearMessages,
    openCaseDetail,
    refresh,
    saveCase,
    setAdminNoteDraft,
    setResolutionDraft,
    setSelectedStatus,
    setStatusFilter
  } = useAdminSupportWorkspace(true);

  const openCases = supportCases.filter((supportCase) => supportCase.status === "open");
  const inReviewCases = supportCases.filter((supportCase) => supportCase.status === "in_review");

  if (variant === "home") {
    return (
      <section style={cardStyle}>
        {errorMessage ? <div style={{ color: "#991b1b" }}>{errorMessage}</div> : null}
        {!errorMessage && infoMessage ? <div style={{ color: "#1d4ed8" }}>{infoMessage}</div> : null}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px" }}>Soporte abierto</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>Casos vinculados a reservas que requieren seguimiento.</p>
          </div>
          <strong style={{ fontSize: "28px", color: openCases.length ? "#b45309" : "#0f766e" }}>{openCases.length}</strong>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ borderRadius: "999px", background: "rgba(113,113,122,0.12)", color: "#3f3f46", padding: "6px 10px", fontWeight: 700 }}>
            {openCases.length} abiertos
          </span>
          <span style={{ borderRadius: "999px", background: "rgba(217,119,6,0.12)", color: "#b45309", padding: "6px 10px", fontWeight: 700 }}>
            {inReviewCases.length} en revision
          </span>
        </div>
        {isLoading && !supportCases.length ? (
          <p style={{ margin: 0, color: "#52525b" }}>Cargando casos de soporte...</p>
        ) : supportCases.length ? (
          <div style={{ display: "grid", gap: "8px" }}>
            {supportCases.slice(0, 3).map((supportCase) => {
              const tone = getStatusTone(supportCase.status);

              return (
                <button
                  key={supportCase.id}
                  onClick={() => {
                    onOpenQueue?.();
                    void openCaseDetail(supportCase.id);
                  }}
                  type="button"
                  style={{ ...inputStyle, textAlign: "left", display: "grid", gap: "6px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <strong>{supportCase.subject}</strong>
                    <span style={{ borderRadius: "999px", background: tone.background, color: tone.color, padding: "6px 10px", fontWeight: 700 }}>
                      {supportCaseStatusLabels[supportCase.status]}
                    </span>
                  </div>
                  <span style={{ color: "#52525b" }}>{supportCase.providerName} · {supportCase.serviceName}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#52525b" }}>No hay casos para este filtro. Cambia el filtro o vuelve a refrescar la cola.</p>
        )}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button disabled={isSubmitting} onClick={onOpenQueue} tone="secondary">
            Abrir soporte
          </Button>
          <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
            Refrescar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#1d4ed8" }}>{infoMessage}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 320px),1fr))", gap: "20px" }}>
        <aside style={{ display: "grid", gap: "20px", alignContent: "start" }}>
          <article style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "24px" }}>Casos de soporte</h2>
              <span style={{ color: "#52525b" }}>{supportCases.length} cargados</span>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => setStatusFilter("all")} tone={statusFilter === "all" ? "primary" : "secondary"}>
                Todos
              </Button>
              {supportCaseStatusOrder.map((status) => (
                <Button
                  key={status}
                  disabled={isSubmitting}
                  onClick={() => setStatusFilter(status)}
                  tone={statusFilter === status ? "primary" : "secondary"}
                >
                  {supportCaseStatusLabels[status]}
                </Button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Actualizar
              </Button>
              <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                Limpiar avisos
              </Button>
            </div>
            {supportCases.length ? (
              supportCases.map((supportCase) => {
                const tone = getStatusTone(supportCase.status);

                return (
                  <button
                    key={supportCase.id}
                    onClick={() => void openCaseDetail(supportCase.id)}
                    type="button"
                    style={{
                      ...inputStyle,
                      textAlign: "left",
                      display: "grid",
                      gap: "8px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <strong>{supportCase.subject}</strong>
                      <span style={{ borderRadius: "999px", background: tone.background, color: tone.color, padding: "6px 10px", fontWeight: 700 }}>
                        {supportCaseStatusLabels[supportCase.status]}
                      </span>
                    </div>
                    <div style={{ color: "#52525b" }}>
                      {supportCase.creatorDisplayName} - {supportCase.providerName}
                    </div>
                    <div style={{ color: "#52525b" }}>{supportCase.serviceName}</div>
                    <div style={{ color: "#71717a" }}>{formatDateTime(supportCase.createdAt)}</div>
                  </button>
                );
              })
            ) : (
              <p style={{ margin: 0, color: "#52525b" }}>No hay casos de soporte para este filtro. Prueba con Todos si necesitas revisar actividad reciente.</p>
            )}
          </article>
        </aside>

        <article style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Detalle del caso</h2>
            {selectedCase ? (
              <span style={{ color: "#52525b" }}>{selectedCase.id}</span>
            ) : (
              <span style={{ color: "#71717a" }}>Sin caso seleccionado</span>
            )}
          </div>
          {isLoading && !selectedCase ? (
            <p style={{ margin: 0, color: "#52525b" }}>Cargando detalle administrativo del caso...</p>
          ) : selectedCase ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                <div style={inputStyle}>
                  <strong>Cliente</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedCase.creatorDisplayName}</div>
                  <div style={{ color: "#71717a", marginTop: "6px" }}>{selectedCase.creatorEmail}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Proveedor</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedCase.providerName}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Servicio</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedCase.serviceName}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Mascota</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedCase.petName}</div>
                </div>
              </div>

              <div style={inputStyle}>
                <strong>Asunto</strong>
                <div style={{ color: "#27272a", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.subject}</div>
              </div>
              <div style={inputStyle}>
                <strong>Descripcion</strong>
                <div style={{ color: "#27272a", marginTop: "6px", lineHeight: 1.7 }}>{selectedCase.descriptionText}</div>
              </div>
              <div style={inputStyle}>
                <strong>Agenda de la reserva</strong>
                <div style={{ color: "#52525b", marginTop: "6px" }}>{formatDateTime(selectedCase.scheduledStartAt)}</div>
              </div>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#71717a" }}>Estado</span>
                <select
                  onChange={(event) => setSelectedStatus(event.target.value as SupportCaseStatus)}
                  style={inputStyle}
                  value={selectedStatus}
                >
                  {supportCaseStatusOrder.map((status) => (
                    <option key={status} value={status}>
                      {supportCaseStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#71717a" }}>Nota administrativa</span>
                <textarea
                  onChange={(event) => setAdminNoteDraft(event.target.value)}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", minHeight: "120px", fontFamily: "inherit" }}
                  value={adminNoteDraft}
                />
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#71717a" }}>Resolucion</span>
                <textarea
                  onChange={(event) => setResolutionDraft(event.target.value)}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", minHeight: "120px", fontFamily: "inherit" }}
                  value={resolutionDraft}
                />
              </label>

              {selectedCase.resolvedAt ? (
                <div style={{ color: "#71717a" }}>{`Resuelto el ${formatDateTime(selectedCase.resolvedAt)}`}</div>
              ) : null}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} onClick={() => void saveCase()}>
                  Guardar caso de soporte
                </Button>
                <Button disabled={isSubmitting} onClick={() => void refresh(selectedCase.id)} tone="secondary">
                  Recargar detalle
                </Button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#52525b", lineHeight: 1.7 }}>
              Selecciona un caso de soporte a la izquierda para revisar su contexto y aplicar una actualizacion basica de estado o resolucion.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
