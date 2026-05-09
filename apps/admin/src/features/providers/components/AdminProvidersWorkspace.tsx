"use client";

import { providerApprovalDocumentTypeLabels, providerApprovalStatusLabels, providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";

import { useAdminProvidersWorkspace } from "../hooks/useAdminProvidersWorkspace";

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

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
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
  tone?: "primary" | "secondary" | "danger";
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

export function AdminProvidersWorkspace({
  onOpenQueue,
  variant = "full"
}: {
  onOpenQueue?: () => void;
  variant?: "full" | "home";
}) {
  const {
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    pendingOrganizations,
    selectedOrganization,
    clearMessages,
    openOrganization,
    refresh,
    approveOrganization,
    rejectOrganization
  } = useAdminProvidersWorkspace(true);

  if (variant === "home") {
    return (
      <section style={cardStyle}>
        {errorMessage ? <div style={{ color: "#991b1b" }}>{errorMessage}</div> : null}
        {!errorMessage && infoMessage ? <div style={{ color: "#1d4ed8" }}>{infoMessage}</div> : null}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px" }}>Proveedores pendientes</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>Primera cola de decision de plataforma.</p>
          </div>
          <strong style={{ fontSize: "28px", color: pendingOrganizations.length ? "#b45309" : colorTokens.adminAccent }}>
            {pendingOrganizations.length}
          </strong>
        </div>
        {isLoading && !pendingOrganizations.length ? (
          <p style={{ margin: 0, color: "#52525b" }}>Cargando cola de proveedores...</p>
        ) : pendingOrganizations.length ? (
          <div style={{ display: "grid", gap: "8px" }}>
            {pendingOrganizations.slice(0, 3).map((organization) => (
              <button
                key={organization.id}
                onClick={() => {
                  onOpenQueue?.();
                  void openOrganization(organization.id);
                }}
                type="button"
              style={{ ...inputStyle, textAlign: "left", display: "grid", gap: "6px", cursor: "pointer", boxShadow: visualTokens.web.softShadow }}
              >
                <strong>{organization.name}</strong>
                <span style={{ color: "#52525b" }}>{organization.city} · {organization.slug}</span>
              </button>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#52525b" }}>Cola despejada: no hay proveedores esperando revision ahora.</p>
        )}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button disabled={isSubmitting} onClick={onOpenQueue} tone="secondary">
            Abrir cola
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
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: colorTokens.adminAccent }}>{infoMessage}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 320px),1fr))", gap: "20px" }}>
        <aside style={{ display: "grid", gap: "20px", alignContent: "start" }}>
          <article style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "24px" }}>Proveedores pendientes</h2>
              <span style={{ color: "#52525b" }}>{pendingOrganizations.length} pendientes</span>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Actualizar
              </Button>
              <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                Limpiar avisos
              </Button>
            </div>
            {pendingOrganizations.length ? (
              pendingOrganizations.map((organization) => (
                <button
                  key={organization.id}
                  onClick={() => void openOrganization(organization.id)}
                  type="button"
                  style={{ ...inputStyle, textAlign: "left", display: "grid", gap: "8px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <strong>{organization.name}</strong>
                    <span style={{ color: "#71717a", fontWeight: 700 }}>{providerApprovalStatusLabels[organization.approvalStatus]}</span>
                  </div>
                  <div style={{ color: "#52525b" }}>{organization.slug}</div>
                  <div style={{ color: "#71717a" }}>{organization.city}</div>
                </button>
              ))
            ) : (
              <p style={{ margin: 0, color: "#52525b" }}>Cola despejada: no hay proveedores esperando revision en este momento.</p>
            )}
          </article>
        </aside>

        <article style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Revision del proveedor</h2>
            {selectedOrganization ? (
              <span style={{ color: "#52525b" }}>{selectedOrganization.organization.id}</span>
            ) : (
              <span style={{ color: "#71717a" }}>Sin proveedor seleccionado</span>
            )}
          </div>
          {isLoading && !selectedOrganization ? (
            <p style={{ margin: 0, color: "#52525b" }}>Cargando detalle del proveedor pendiente...</p>
          ) : selectedOrganization ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                <div style={inputStyle}>
                  <strong>Negocio</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedOrganization.organization.name}</div>
                  <div style={{ color: "#71717a", marginTop: "6px" }}>{selectedOrganization.organization.slug}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Estado de aprobacion</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>
                    {providerApprovalStatusLabels[selectedOrganization.organization.approvalStatus]}
                  </div>
                </div>
                <div style={inputStyle}>
                  <strong>Configuracion publica</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>
                    {selectedOrganization.organization.isPublic ? "Publico al aprobarse" : "Privado"}
                  </div>
                </div>
              </div>

              <div style={inputStyle}>
                <strong>Perfil publico</strong>
                <div style={{ color: "#52525b", marginTop: "6px" }}>
                  {selectedOrganization.publicProfile
                    ? `${selectedOrganization.publicProfile.headline} (${selectedOrganization.publicProfile.isPublic ? "publico" : "oculto"})`
                    : "Aun no hay perfil publico."}
                </div>
                {selectedOrganization.publicProfile ? (
                  <div style={{ color: "#71717a", marginTop: "6px", lineHeight: 1.7 }}>{selectedOrganization.publicProfile.bio}</div>
                ) : null}
              </div>

              <div style={inputStyle}>
                <strong>Servicios</strong>
                {selectedOrganization.services.length ? (
                  <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                    {selectedOrganization.services.map((service) => (
                      <div key={service.id} style={{ display: "grid", gap: "4px" }}>
                        <strong>{service.name}</strong>
                        <span style={{ color: "#52525b" }}>
                          {providerServiceCategoryLabels[service.category]} · {formatMoney(service.basePriceCents, service.currencyCode)}
                        </span>
                        <span style={{ color: "#71717a" }}>
                          {service.isPublic ? "Publico" : "Oculto"} · {service.isActive ? "Activo" : "Inactivo"} · {service.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#52525b", marginTop: "6px" }}>Sin servicios configurados; esto puede bloquear la visibilidad en marketplace.</div>
                )}
              </div>

              <div style={inputStyle}>
                <strong>Disponibilidad</strong>
                {selectedOrganization.availability.length ? (
                  <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                    {selectedOrganization.availability.map((slot) => (
                      <span key={slot.id} style={{ color: "#52525b" }}>
                        {providerDayOfWeekLabels[slot.dayOfWeek]} · {slot.startsAt.slice(0, 5)} - {slot.endsAt.slice(0, 5)} · {slot.isActive ? "Activo" : "Inactivo"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#52525b", marginTop: "6px" }}>Sin disponibilidad configurada; revisa si corresponde rechazar o pedir ajustes fuera de la app.</div>
                )}
              </div>

              <div style={inputStyle}>
                <strong>Documentos de aprobacion</strong>
                {selectedOrganization.approvalDocuments.length ? (
                  <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                    {selectedOrganization.approvalDocuments.map((document) => (
                      <div key={document.id} style={{ display: "grid", gap: "4px" }}>
                        <strong>{document.title}</strong>
                        <span style={{ color: "#52525b" }}>{providerApprovalDocumentTypeLabels[document.documentType]}</span>
                        <span style={{ color: "#71717a" }}>
                          {document.fileName} · {document.mimeType ?? "Tipo desconocido"} · {Math.max(1, Math.round(document.fileSizeBytes / 1024))} KB
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#52525b", marginTop: "6px" }}>Sin documentos cargados; la decision debe considerar este faltante.</div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} onClick={() => void approveOrganization()}>
                  Aprobar proveedor
                </Button>
                <Button disabled={isSubmitting} onClick={() => void rejectOrganization()} tone="danger">
                  Rechazar proveedor
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() => void refresh(selectedOrganization.organization.id)}
                  tone="secondary"
                >
                  Recargar detalle
                </Button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#52525b", lineHeight: 1.7 }}>
              Selecciona un proveedor pendiente a la izquierda para revisar su perfil de negocio, servicios, disponibilidad y documentos de aprobacion.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}


