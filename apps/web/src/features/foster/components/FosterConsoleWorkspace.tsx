"use client";

import type {
  PetAdoptionApplication,
  PetAdoptionApplicationStatus,
  PetAdoptionApplicationStatusHistory,
  PetAdoptionListing,
  PetTransferRecord
} from "@pet/types";
import { useMemo, useState } from "react";

import { useFosterConsoleWorkspace } from "../hooks/useFosterConsoleWorkspace";

type ApplicationStatusFilter = "all" | PetAdoptionApplicationStatus;

type MetricCard = {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "warning" | "success";
  onClick?: () => void;
};

const applicationStatusLabels: Record<PetAdoptionApplicationStatus, string> = {
  approved: "Aprobada",
  converted_to_transfer: "En transferencia",
  in_review: "En revision",
  interview: "Entrevista",
  rejected: "Rechazada",
  submitted: "Nueva",
  withdrawn: "Retirada"
};

const listingStatusLabels: Record<PetAdoptionListing["status"], string> = {
  adopted: "Adoptada",
  closed: "Cerrada",
  draft: "Borrador",
  paused: "Pausada",
  pending_review: "En revision",
  published: "Publicada",
  rejected: "Rechazada"
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function statusTone(status: PetAdoptionApplicationStatus) {
  if (status === "approved" || status === "converted_to_transfer") {
    return "success";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "neutral";
  }

  return "warning";
}

function coverUrl(listing: PetAdoptionListing) {
  return listing.media.find((item) => item.isCover && item.signedUrl)?.signedUrl ?? listing.media.find((item) => item.signedUrl)?.signedUrl ?? null;
}

export function FosterConsoleWorkspace() {
  const {
    applications,
    authState,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    listings,
    openApplication,
    profile,
    protectiveHouseholds,
    publicProfile,
    refresh,
    selectedApplicationDetail,
    selectedHousehold,
    selectedHouseholdId,
    selectHousehold,
    startTransfer,
    transfers,
    updateApplicationStatus
  } = useFosterConsoleWorkspace();
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [applicationPetFilter, setApplicationPetFilter] = useState("all");
  const [rejectNote, setRejectNote] = useState("");

  const applicationCounts = useMemo(
    () => ({
      approved: applications.filter((application) => application.status === "approved").length,
      converted_to_transfer: applications.filter((application) => application.status === "converted_to_transfer").length,
      in_review: applications.filter((application) => application.status === "in_review").length,
      interview: applications.filter((application) => application.status === "interview").length,
      rejected: applications.filter((application) => application.status === "rejected").length,
      submitted: applications.filter((application) => application.status === "submitted").length,
      withdrawn: applications.filter((application) => application.status === "withdrawn").length
    }),
    [applications]
  );

  const metrics: MetricCard[] = [
    {
      label: "Mascotas en vitrina",
      value: new Set(listings.map((listing) => listing.petId)).size,
      detail: "Expedientes publicados o preparados"
    },
    {
      label: "Publicadas",
      value: listings.filter((listing) => listing.status === "published").length,
      detail: "Visibles para familias interesadas",
      tone: "success"
    },
    {
      label: "En revision",
      value: listings.filter((listing) => listing.status === "pending_review").length,
      detail: "Esperan moderacion admin",
      tone: "warning"
    },
    {
      label: "Solicitudes nuevas",
      value: applicationCounts.submitted,
      detail: "Requieren primera revision",
      tone: applicationCounts.submitted ? "warning" : "default",
      onClick: () => setApplicationStatusFilter("submitted")
    },
    {
      label: "Entrevistas",
      value: applicationCounts.interview,
      detail: "Conversaciones en curso",
      onClick: () => setApplicationStatusFilter("interview")
    },
    {
      label: "Transferencias pendientes",
      value: transfers.filter((transfer) => transfer.status === "pending").length,
      detail: "La familia receptora debe aceptar",
      tone: "warning"
    }
  ];

  const petOptions = useMemo(() => {
    const pets = new Map<string, string>();
    listings.forEach((listing) => pets.set(listing.petId, listing.petName));
    applications.forEach((application) => pets.set(application.petId, application.petName));
    return Array.from(pets.entries()).map(([id, name]) => ({ id, name }));
  }, [applications, listings]);

  const filteredApplications = useMemo(
    () =>
      applications
        .filter((application) => applicationStatusFilter === "all" || application.status === applicationStatusFilter)
        .filter((application) => applicationPetFilter === "all" || application.petId === applicationPetFilter)
        .sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime()),
    [applicationPetFilter, applicationStatusFilter, applications]
  );

  const selectedTransfer = selectedApplicationDetail
    ? transfers.find((transfer) => transfer.adoptionApplicationId === selectedApplicationDetail.application.id)
    : undefined;

  return (
    <main style={styles.pageShell}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Consola Foster</p>
          <h1 style={styles.heroTitle}>Centro de gestion para Familias Protectoras</h1>
          <p style={styles.heroCopy}>
            Gestiona publicaciones, solicitudes y transferencias privadas sin mezclar adopcion responsable con servicios comerciales.
          </p>
        </div>
        <div style={styles.heroActions}>
          <a href="/app" style={styles.secondaryButton}>Abrir app general</a>
          <button onClick={() => void refresh()} style={styles.primaryButton} type="button">Actualizar</button>
        </div>
      </section>

      {authState === "signed_out" ? (
        <InfoPanel
          title="Inicia sesion para abrir tu consola"
          copy="Usa la app web general para iniciar sesion. Luego vuelve a /foster para gestionar tu familia protectora."
          action={<a href="/app" style={styles.primaryButton}>Iniciar sesion</a>}
        />
      ) : null}

      {errorMessage ? <Notice tone="error" message={errorMessage} /> : null}
      {infoMessage ? <Notice tone="info" message={infoMessage} /> : null}
      {isLoading && authState !== "signed_out" ? <InfoPanel title="Cargando consola" copy="Estamos preparando tus familias protectoras y solicitudes." /> : null}

      {authState === "signed_in" && !isLoading && !protectiveHouseholds.length ? (
        <InfoPanel
          title="Aun no tienes una Familia Protectora"
          copy="Crea una Familia Protectora separada desde Hogares y solicita aprobacion admin antes de publicar mascotas o gestionar adopciones."
          action={<a href="/app" style={styles.secondaryButton}>Ir a Hogares</a>}
        />
      ) : null}

      {authState === "signed_in" && protectiveHouseholds.length ? (
        <>
          <section style={styles.panel}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.eyebrow}>Familia activa</p>
                <h2 style={styles.sectionTitle}>{selectedHousehold?.name ?? "Selecciona una familia"}</h2>
              </div>
              <select
                onChange={(event) => selectHousehold(event.target.value)}
                style={styles.select}
                value={selectedHouseholdId ?? ""}
              >
                {protectiveHouseholds.map((household) => (
                  <option key={household.id} value={household.id}>{household.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.contextGrid}>
              <InfoTile label="Revision interna" value={profile ? protectiveStatusLabel(profile.status) : "Sin perfil"} />
              <InfoTile label="Perfil publico" value={publicProfile ? publicStatusLabel(publicProfile.moderationStatus) : "No configurado"} />
              <InfoTile label="Ciudad" value={profile?.city ?? publicProfile?.city ?? "Sin ciudad"} />
              <InfoTile label="Tipo" value={selectedHousehold?.householdType === "protective" ? "Familia protectora" : "Hogar familiar"} />
            </div>
          </section>

          {profile?.status !== "approved" ? (
            <InfoPanel
              title="Familia Protectora pendiente de aprobacion"
              copy="La consola operativa se habilita por completo cuando el perfil protector esta aprobado por admin."
            />
          ) : null}

          <section style={styles.metricGrid}>
            {metrics.map((metric) => (
              <button
                key={metric.label}
                onClick={metric.onClick}
                style={{ ...styles.metricCard, ...(metric.tone === "warning" ? styles.warningMetric : {}), ...(metric.tone === "success" ? styles.successMetric : {}) }}
                type="button"
              >
                <span style={styles.metricLabel}>{metric.label}</span>
                <strong style={styles.metricValue}>{metric.value}</strong>
                <span style={styles.metricDetail}>{metric.detail}</span>
              </button>
            ))}
          </section>

          <section style={styles.twoColumnGrid}>
            <div style={styles.panel}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.eyebrow}>Publicaciones</p>
                  <h2 style={styles.sectionTitle}>Mascotas en adopcion</h2>
                </div>
                <span style={styles.countPill}>{listings.length} total</span>
              </div>
              <div style={styles.listStack}>
                {listings.length ? listings.slice(0, 8).map((listing) => (
                  <article key={listing.id} style={styles.listingCard}>
                    {coverUrl(listing) ? <img alt="" src={coverUrl(listing) ?? ""} style={styles.coverImage} /> : <div style={styles.coverFallback}>{listing.petName.slice(0, 1).toUpperCase()}</div>}
                    <div style={{ flex: 1 }}>
                      <strong style={styles.itemTitle}>{listing.petName}</strong>
                      <p style={styles.itemMeta}>{listing.title}</p>
                      <p style={styles.itemMeta}>{listing.city}, {listing.countryCode}</p>
                    </div>
                    <StatusBadge label={listingStatusLabels[listing.status]} tone={listing.status === "published" ? "success" : listing.status === "pending_review" ? "warning" : "neutral"} />
                  </article>
                )) : <EmptyState text="Aun no hay publicaciones para esta familia protectora." />}
              </div>
            </div>

            <div style={styles.panel}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.eyebrow}>Transferencias</p>
                  <h2 style={styles.sectionTitle}>Seguimiento privado</h2>
                </div>
                <span style={styles.countPill}>{transfers.length} total</span>
              </div>
              <div style={styles.listStack}>
                {transfers.length ? transfers.slice(0, 8).map((transfer) => (
                  <article key={transfer.id} style={styles.transferCard}>
                    <div>
                      <strong style={styles.itemTitle}>{transfer.petName}</strong>
                      <p style={styles.itemMeta}>Para {transfer.recipientEmail}</p>
                      <p style={styles.itemMeta}>Creada {formatDate(transfer.createdAt)}</p>
                    </div>
                    <StatusBadge label={transfer.status === "pending" ? "Pendiente" : transfer.status} tone={transfer.status === "accepted" ? "success" : transfer.status === "pending" ? "warning" : "neutral"} />
                  </article>
                )) : <EmptyState text="No hay transferencias privadas iniciadas." />}
              </div>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.eyebrow}>Solicitudes</p>
                <h2 style={styles.sectionTitle}>Bandeja de adopcion</h2>
              </div>
              <span style={styles.countPill}>{filteredApplications.length} visibles</span>
            </div>
            <div style={styles.filtersRow}>
              <select onChange={(event) => setApplicationStatusFilter(event.target.value as ApplicationStatusFilter)} style={styles.select} value={applicationStatusFilter}>
                <option value="all">Todos los estados</option>
                {Object.entries(applicationStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </select>
              <select onChange={(event) => setApplicationPetFilter(event.target.value)} style={styles.select} value={applicationPetFilter}>
                <option value="all">Todas las mascotas</option>
                {petOptions.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
              </select>
            </div>
            <div style={styles.applicationGrid}>
              <div style={styles.listStack}>
                {filteredApplications.length ? filteredApplications.map((application) => (
                  <button
                    key={application.id}
                    onClick={() => {
                      setRejectNote("");
                      void openApplication(application);
                    }}
                    style={styles.applicationCard}
                    type="button"
                  >
                    <div style={styles.applicationCardHeader}>
                      <div>
                        <strong style={styles.itemTitle}>{application.petName}</strong>
                        <p style={styles.itemMeta}>{application.applicantName} - {formatDate(application.submittedAt)}</p>
                      </div>
                      <StatusBadge label={applicationStatusLabels[application.status]} tone={statusTone(application.status)} />
                    </div>
                    <p style={styles.applicationSnippet}>{application.motivation || "Sin motivacion registrada."}</p>
                  </button>
                )) : <EmptyState text="No hay solicitudes con estos filtros." />}
              </div>
              <ApplicationDetailPanel
                detail={selectedApplicationDetail}
                disabled={isSubmitting}
                onRejectNoteChange={setRejectNote}
                onStartTransfer={startTransfer}
                onUpdateStatus={updateApplicationStatus}
                rejectNote={rejectNote}
                transfer={selectedTransfer}
              />
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function ApplicationDetailPanel({
  detail,
  disabled,
  onRejectNoteChange,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  transfer
}: {
  detail: { application: PetAdoptionApplication; history: PetAdoptionApplicationStatusHistory[] } | null;
  disabled: boolean;
  onRejectNoteChange: (value: string) => void;
  onStartTransfer: (application: PetAdoptionApplication) => Promise<void>;
  onUpdateStatus: (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => Promise<void>;
  rejectNote: string;
  transfer: PetTransferRecord | undefined;
}) {
  if (!detail) {
    return <EmptyState text="Selecciona una solicitud para revisar motivacion, datos y timeline." />;
  }

  const { application, history } = detail;

  return (
    <aside style={styles.detailPanel}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>Detalle</p>
          <h3 style={styles.detailTitle}>{application.applicantName}</h3>
          <p style={styles.itemMeta}>{application.applicantEmail}{application.applicantPhone ? ` - ${application.applicantPhone}` : ""}</p>
        </div>
        <StatusBadge label={applicationStatusLabels[application.status]} tone={statusTone(application.status)} />
      </div>

      <div style={styles.detailGrid}>
        <InfoTile label="Mascota" value={application.petName} />
        <InfoTile label="Vivienda" value={application.housingType} />
        <InfoTile label="Ninos" value={formatBoolean(application.hasChildren)} />
        <InfoTile label="Otras mascotas" value={formatBoolean(application.hasOtherPets)} />
      </div>

      <TextBlock label="Motivacion" value={application.motivation} />
      <TextBlock label="Experiencia" value={application.petExperience} />
      <TextBlock label="Disponibilidad" value={application.availabilityNotes || "Sin notas adicionales."} />

      {transfer ? (
        <div style={styles.transferNotice}>
          <strong>Transferencia vinculada</strong>
          <span>Estado: {transfer.status}. La custodia solo cambia cuando la familia receptora acepta.</span>
        </div>
      ) : null}

      <ApplicationActions
        application={application}
        disabled={disabled}
        onRejectNoteChange={onRejectNoteChange}
        onStartTransfer={onStartTransfer}
        onUpdateStatus={onUpdateStatus}
        rejectNote={rejectNote}
        transfer={transfer}
      />

      <div style={styles.historyBox}>
        <h4 style={styles.historyTitle}>Historial</h4>
        {history.length ? history.map((entry) => (
          <div key={entry.id} style={styles.historyItem}>
            <strong>{entry.fromStatus ? `${applicationStatusLabels[entry.fromStatus]} -> ` : ""}{applicationStatusLabels[entry.toStatus]}</strong>
            <span>{formatDate(entry.createdAt)}{entry.changedByEmail ? ` - ${entry.changedByEmail}` : ""}</span>
            {entry.changeNotes ? <p>{entry.changeNotes}</p> : null}
          </div>
        )) : <p style={styles.itemMeta}>Sin historial todavia.</p>}
      </div>
    </aside>
  );
}

function ApplicationActions({
  application,
  disabled,
  onRejectNoteChange,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  transfer
}: {
  application: PetAdoptionApplication;
  disabled: boolean;
  onRejectNoteChange: (value: string) => void;
  onStartTransfer: (application: PetAdoptionApplication) => Promise<void>;
  onUpdateStatus: (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => Promise<void>;
  rejectNote: string;
  transfer: PetTransferRecord | undefined;
}) {
  if (["rejected", "withdrawn", "converted_to_transfer"].includes(application.status)) {
    return <p style={styles.itemMeta}>Solicitud en modo consulta.</p>;
  }

  return (
    <div style={styles.actionsBox}>
      {application.status === "submitted" ? <button disabled={disabled} onClick={() => void onUpdateStatus(application, "in_review")} style={styles.primaryButton} type="button">Marcar en revision</button> : null}
      {application.status === "in_review" ? <button disabled={disabled} onClick={() => void onUpdateStatus(application, "interview")} style={styles.primaryButton} type="button">Pasar a entrevista</button> : null}
      {application.status === "interview" ? <button disabled={disabled} onClick={() => void onUpdateStatus(application, "approved")} style={styles.primaryButton} type="button">Aprobar solicitud</button> : null}
      {application.status === "approved" && !transfer ? <button disabled={disabled} onClick={() => void onStartTransfer(application)} style={styles.primaryButton} type="button">Iniciar transferencia</button> : null}
      {application.status === "approved" && transfer ? <p style={styles.itemMeta}>La transferencia ya fue iniciada para esta solicitud.</p> : null}
      {application.status !== "approved" ? (
        <div style={styles.rejectBox}>
          <textarea
            disabled={disabled}
            onChange={(event) => onRejectNoteChange(event.target.value)}
            placeholder="Nota obligatoria para rechazar"
            style={styles.textarea}
            value={rejectNote}
          />
          <button disabled={disabled || !rejectNote.trim()} onClick={() => void onUpdateStatus(application, "rejected", rejectNote)} style={styles.dangerButton} type="button">Rechazar</button>
        </div>
      ) : null}
    </div>
  );
}

function InfoPanel({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.bodyText}>{copy}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoTile}>
      <span style={styles.tileLabel}>{label}</span>
      <strong style={styles.tileValue}>{value}</strong>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.textBlock}>
      <span style={styles.tileLabel}>{label}</span>
      <p style={styles.bodyText}>{value}</p>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "neutral" | "success" | "warning" }) {
  return <span style={{ ...styles.statusBadge, ...(tone === "success" ? styles.successBadge : {}), ...(tone === "warning" ? styles.warningBadge : {}) }}>{label}</span>;
}

function Notice({ message, tone }: { message: string; tone: "error" | "info" }) {
  return <div style={{ ...styles.notice, ...(tone === "error" ? styles.errorNotice : styles.infoNotice) }}>{message}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={styles.emptyState}>{text}</div>;
}

function protectiveStatusLabel(status: string) {
  const labels: Record<string, string> = {
    approved: "Aprobada",
    draft: "Borrador",
    pending_review: "Pendiente de revision",
    rejected: "Rechazada",
    suspended: "Suspendida"
  };

  return labels[status] ?? status;
}

function publicStatusLabel(status: string) {
  const labels: Record<string, string> = {
    approved: "Aprobado",
    draft: "Borrador",
    pending_review: "Pendiente de revision",
    rejected: "Rechazado",
    suspended: "Suspendido"
  };

  return labels[status] ?? status;
}

function formatBoolean(value: boolean | null) {
  if (value === true) {
    return "Si";
  }

  if (value === false) {
    return "No";
  }

  return "No indicado";
}

const styles: Record<string, React.CSSProperties> = {
  actionsBox: { display: "flex", flexDirection: "column", gap: "10px" },
  applicationCard: {
    background: "#fffdf8",
    border: "1px solid rgba(20, 184, 166, 0.18)",
    borderRadius: "18px",
    cursor: "pointer",
    display: "grid",
    gap: "8px",
    padding: "14px",
    textAlign: "left"
  },
  applicationCardHeader: { alignItems: "flex-start", display: "flex", gap: "10px", justifyContent: "space-between" },
  applicationGrid: { display: "grid", gap: "18px", gridTemplateColumns: "minmax(260px, 0.8fr) minmax(320px, 1.2fr)" },
  applicationSnippet: { color: "#475569", fontSize: "13px", lineHeight: 1.45, margin: 0 },
  bodyText: { color: "#475569", fontSize: "14px", lineHeight: 1.55, margin: 0 },
  contextGrid: { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" },
  countPill: { background: "#f8fafc", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f766e", fontSize: "12px", fontWeight: 800, padding: "8px 12px" },
  coverFallback: { alignItems: "center", background: "#dff7f3", borderRadius: "16px", color: "#0f766e", display: "flex", fontSize: "22px", fontWeight: 900, height: "66px", justifyContent: "center", width: "66px" },
  coverImage: { borderRadius: "16px", height: "66px", objectFit: "cover", width: "66px" },
  dangerButton: { background: "#fff1f2", border: "1px solid rgba(185, 28, 28, 0.22)", borderRadius: "999px", color: "#991b1b", cursor: "pointer", fontSize: "13px", fontWeight: 800, padding: "10px 14px" },
  detailGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" },
  detailPanel: { background: "#f8fffd", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "22px", display: "grid", gap: "14px", padding: "18px" },
  detailTitle: { color: "#0f172a", fontSize: "20px", margin: 0 },
  emptyState: { background: "#fffdf8", border: "1px dashed rgba(15, 118, 110, 0.2)", borderRadius: "18px", color: "#64748b", fontSize: "14px", padding: "18px" },
  errorNotice: { background: "#fef2f2", borderColor: "rgba(185, 28, 28, 0.22)", color: "#991b1b" },
  eyebrow: { color: "#0f766e", fontSize: "12px", fontWeight: 900, letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" },
  filtersRow: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" },
  hero: { alignItems: "flex-start", background: "linear-gradient(135deg, #0f766e, #115e59)", borderRadius: "28px", color: "white", display: "flex", gap: "24px", justifyContent: "space-between", padding: "30px" },
  heroActions: { display: "flex", flexWrap: "wrap", gap: "10px" },
  heroCopy: { color: "rgba(255,255,255,0.86)", fontSize: "15px", lineHeight: 1.55, margin: "8px 0 0", maxWidth: "720px" },
  heroTitle: { fontSize: "34px", lineHeight: 1.05, margin: "8px 0 0" },
  historyBox: { borderTop: "1px solid rgba(15, 118, 110, 0.16)", display: "grid", gap: "8px", paddingTop: "12px" },
  historyItem: { background: "#fffdf8", borderRadius: "14px", display: "grid", gap: "3px", padding: "10px" },
  historyTitle: { color: "#0f172a", fontSize: "15px", margin: 0 },
  infoNotice: { background: "#ecfeff", borderColor: "rgba(15, 118, 110, 0.2)", color: "#0f766e" },
  infoTile: { background: "#fffdf8", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "18px", display: "grid", gap: "4px", padding: "14px" },
  itemMeta: { color: "#64748b", fontSize: "12px", lineHeight: 1.4, margin: "4px 0 0" },
  itemTitle: { color: "#0f172a", fontSize: "15px" },
  listingCard: { alignItems: "center", background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "20px", display: "flex", gap: "12px", padding: "12px" },
  listStack: { display: "grid", gap: "10px" },
  metricCard: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.15)", borderRadius: "22px", cursor: "pointer", display: "grid", gap: "6px", padding: "18px", textAlign: "left" },
  metricDetail: { color: "#64748b", fontSize: "13px" },
  metricGrid: { display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  metricLabel: { color: "#0f766e", fontSize: "12px", fontWeight: 900, textTransform: "uppercase" },
  metricValue: { color: "#0f766e", fontSize: "30px", lineHeight: 1 },
  notice: { border: "1px solid", borderRadius: "18px", fontSize: "14px", fontWeight: 800, padding: "14px 18px" },
  pageShell: { background: "#fbfaf7", color: "#0f172a", display: "grid", gap: "20px", minHeight: "100vh", padding: "28px" },
  panel: { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "26px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)", display: "grid", gap: "16px", padding: "22px" },
  primaryButton: { background: "#0f766e", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "999px", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 900, padding: "11px 16px", textDecoration: "none" },
  rejectBox: { display: "grid", gap: "8px" },
  secondaryButton: { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f766e", cursor: "pointer", fontSize: "14px", fontWeight: 900, padding: "11px 16px", textDecoration: "none" },
  sectionHeader: { alignItems: "flex-start", display: "flex", gap: "14px", justifyContent: "space-between" },
  sectionTitle: { color: "#0f172a", fontSize: "24px", margin: "3px 0 0" },
  select: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f172a", fontSize: "14px", fontWeight: 800, padding: "10px 14px" },
  statusBadge: { alignSelf: "flex-start", background: "#f8fafc", border: "1px solid rgba(100, 116, 139, 0.16)", borderRadius: "999px", color: "#475569", fontSize: "11px", fontWeight: 900, padding: "7px 10px", whiteSpace: "nowrap" },
  successBadge: { background: "#ecfdf5", borderColor: "rgba(15, 118, 110, 0.2)", color: "#0f766e" },
  successMetric: { background: "linear-gradient(135deg, #f0fdfa, #ffffff)" },
  textarea: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "16px", color: "#0f172a", fontSize: "14px", minHeight: "84px", padding: "12px", resize: "vertical" },
  textBlock: { display: "grid", gap: "4px" },
  tileLabel: { color: "#64748b", fontSize: "11px", fontWeight: 900, textTransform: "uppercase" },
  tileValue: { color: "#0f172a", fontSize: "15px" },
  transferCard: { alignItems: "flex-start", background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "18px", display: "flex", gap: "12px", justifyContent: "space-between", padding: "13px" },
  transferNotice: { background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "18px", color: "#0f766e", display: "grid", gap: "4px", padding: "12px" },
  twoColumnGrid: { display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" },
  warningBadge: { background: "#fff7ed", borderColor: "rgba(234, 88, 12, 0.22)", color: "#c2410c" },
  warningMetric: { background: "linear-gradient(135deg, #fff7ed, #ffffff)" }
};
