"use client";

import { providerApprovalDocumentTypeLabels, providerApprovalStatusLabels, providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";

import { useAdminProvidersWorkspace } from "../hooks/useAdminProvidersWorkspace";

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

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
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
        ? { background: "#1d4ed8", color: "#f8fafc", border: "none" }
        : { background: "rgba(255,255,255,0.86)", color: "#18181b", border: "1px solid rgba(24,24,27,0.14)" };

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

export function AdminProvidersWorkspace() {
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

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#1d4ed8" }}>{infoMessage}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,340px) minmax(0,1fr)", gap: "20px" }}>
        <aside style={{ display: "grid", gap: "20px", alignContent: "start" }}>
          <article style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "24px" }}>Pending providers</h2>
              <span style={{ color: "#52525b" }}>{pendingOrganizations.length} pending</span>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Refresh
              </Button>
              <Button disabled={isSubmitting} onClick={clearMessages} tone="secondary">
                Clear notices
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
              <p style={{ margin: 0, color: "#52525b" }}>No providers are waiting for review right now.</p>
            )}
          </article>
        </aside>

        <article style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Provider review</h2>
            {selectedOrganization ? (
              <span style={{ color: "#52525b" }}>{selectedOrganization.organization.id}</span>
            ) : (
              <span style={{ color: "#71717a" }}>No provider selected</span>
            )}
          </div>
          {isLoading && !selectedOrganization ? (
            <p style={{ margin: 0, color: "#52525b" }}>Loading pending provider detail...</p>
          ) : selectedOrganization ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                <div style={inputStyle}>
                  <strong>Business</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedOrganization.organization.name}</div>
                  <div style={{ color: "#71717a", marginTop: "6px" }}>{selectedOrganization.organization.slug}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Approval status</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>
                    {providerApprovalStatusLabels[selectedOrganization.organization.approvalStatus]}
                  </div>
                </div>
                <div style={inputStyle}>
                  <strong>Public setting</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>
                    {selectedOrganization.organization.isPublic ? "Public when approved" : "Private"}
                  </div>
                </div>
              </div>

              <div style={inputStyle}>
                <strong>Public profile</strong>
                <div style={{ color: "#52525b", marginTop: "6px" }}>
                  {selectedOrganization.publicProfile
                    ? `${selectedOrganization.publicProfile.headline} (${selectedOrganization.publicProfile.isPublic ? "public" : "hidden"})`
                    : "No public profile yet."}
                </div>
                {selectedOrganization.publicProfile ? (
                  <div style={{ color: "#71717a", marginTop: "6px", lineHeight: 1.7 }}>{selectedOrganization.publicProfile.bio}</div>
                ) : null}
              </div>

              <div style={inputStyle}>
                <strong>Services</strong>
                {selectedOrganization.services.length ? (
                  <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                    {selectedOrganization.services.map((service) => (
                      <div key={service.id} style={{ display: "grid", gap: "4px" }}>
                        <strong>{service.name}</strong>
                        <span style={{ color: "#52525b" }}>
                          {providerServiceCategoryLabels[service.category]} · {formatMoney(service.basePriceCents, service.currencyCode)}
                        </span>
                        <span style={{ color: "#71717a" }}>
                          {service.isPublic ? "Public" : "Hidden"} · {service.isActive ? "Active" : "Inactive"} · {service.bookingMode === "instant" ? "Instant" : "Approval required"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#52525b", marginTop: "6px" }}>No services yet.</div>
                )}
              </div>

              <div style={inputStyle}>
                <strong>Availability</strong>
                {selectedOrganization.availability.length ? (
                  <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                    {selectedOrganization.availability.map((slot) => (
                      <span key={slot.id} style={{ color: "#52525b" }}>
                        {providerDayOfWeekLabels[slot.dayOfWeek]} · {slot.startsAt.slice(0, 5)} - {slot.endsAt.slice(0, 5)} · {slot.isActive ? "Active" : "Inactive"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#52525b", marginTop: "6px" }}>No availability yet.</div>
                )}
              </div>

              <div style={inputStyle}>
                <strong>Approval documents</strong>
                {selectedOrganization.approvalDocuments.length ? (
                  <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                    {selectedOrganization.approvalDocuments.map((document) => (
                      <div key={document.id} style={{ display: "grid", gap: "4px" }}>
                        <strong>{document.title}</strong>
                        <span style={{ color: "#52525b" }}>{providerApprovalDocumentTypeLabels[document.documentType]}</span>
                        <span style={{ color: "#71717a" }}>
                          {document.fileName} · {document.mimeType ?? "Unknown type"} · {Math.max(1, Math.round(document.fileSizeBytes / 1024))} KB
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#52525b", marginTop: "6px" }}>No approval documents uploaded yet.</div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} onClick={() => void approveOrganization()}>
                  Approve provider
                </Button>
                <Button disabled={isSubmitting} onClick={() => void rejectOrganization()} tone="danger">
                  Reject provider
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() => void refresh(selectedOrganization.organization.id)}
                  tone="secondary"
                >
                  Reload detail
                </Button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#52525b", lineHeight: 1.7 }}>
              Select a pending provider from the left to review its business profile, services, availability and approval documents.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
