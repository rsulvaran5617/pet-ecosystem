"use client";

import type { AdminClinicalProfessionalSummary, ClinicalAuditEvent } from "@pet/types";
import { useEffect, useState } from "react";

import { getAdminClinicalAccessApiClient } from "../../core/services/supabase-admin";

import styles from "./AdminClinicalProfessionalsWorkspace.module.css";

const statusLabels: Record<string, string> = { pending: "Pendiente", verified: "Verificada", expired: "Vencida", suspended: "Suspendida", rejected: "Rechazada", draft: "Borrador" };
const eventLabels: Record<string, string> = {
  clinical_write_requested: "Permiso solicitado", clinical_write_approved: "Permiso aprobado",
  clinical_write_revoked: "Permiso revocado", clinical_write_rejected: "Permiso rechazado",
  clinical_encounter_finalized: "Atención registrada", clinical_entry_corrected: "Registro corregido",
  clinical_document_added: "Documento agregado",
};
const formatDate = (value: string) => new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Panama" }).format(new Date(value));

function typeLabel(value: AdminClinicalProfessionalSummary["professionalType"]) {
  if (value === "veterinarian") return "Veterinario";
  if (value === "veterinary_technician") return "Tecnico veterinario";
  return "Otro profesional de salud animal";
}

export function AdminClinicalProfessionalsWorkspace() {
  const [profiles, setProfiles] = useState<AdminClinicalProfessionalSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<ClinicalAuditEvent[]>([]);
  const [auditFilter, setAuditFilter] = useState("");
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;

  async function refresh() {
    setIsLoading(true);
    try {
      const [rows, events] = await Promise.all([getAdminClinicalAccessApiClient().listClinicalProfessionalsForAdmin(), getAdminClinicalAccessApiClient().listClinicalAuditEventsForAdmin()]);
      setProfiles(rows);
      setAuditEvents(events);
      setSelectedId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
    } catch {
      setMessage("No fue posible consultar la cola profesional.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function decide(decision: "verified" | "rejected" | "suspended") {
    if (!selected) return;
    if ((decision === "rejected" || decision === "suspended") && !reason.trim()) {
      setMessage("Indica una justificacion antes de continuar.");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await getAdminClinicalAccessApiClient().reviewClinicalProfessionalProfile(selected.id, decision, reason, expiresAt ? new Date(`${expiresAt}T23:59:59-05:00`).toISOString() : null);
      setReason("");
      setExpiresAt("");
      setMessage(decision === "verified" ? "Identidad verificada." : decision === "rejected" ? "Solicitud rechazada." : "Verificacion suspendida.");
      await refresh();
    } catch {
      setMessage("No fue posible registrar la decision.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingCount = profiles.filter((profile) => profile.verificationStatus === "pending").length;
  const filteredEvents = auditEvents.filter((event) => [event.professionalName, event.organizationName, event.petReference, event.event, eventLabels[event.event]].some((value) => value?.toLowerCase().includes(auditFilter.toLowerCase())));

  return (
    <section className={styles.workspace} aria-busy={isLoading}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Salud animal · Profesionales</span><h2>Verificación profesional</h2><p>Revisa la identidad y la vigencia de cada profesional.</p></div>
        <button className={styles.secondary} disabled={isLoading || isSubmitting} onClick={() => void refresh()} type="button">{isLoading ? "Actualizando…" : "Actualizar lista"}</button>
      </header>
      <div className={styles.overview}>
        <strong>{isLoading ? "Consultando perfiles…" : pendingCount ? `${pendingCount} ${pendingCount === 1 ? "identidad pendiente" : "identidades pendientes"} de revisión` : "Sin revisiones pendientes"}</strong>
        <span>La verificación de identidad y el permiso del responsable son independientes.</span>
      </div>
      {message ? <div className={styles.message} role="status">{message}</div> : null}
      <div className={styles.columns}>
        <aside className={styles.card} aria-label="Lista de profesionales">
          <h3>Profesionales <span className={styles.count}>{profiles.length}</span></h3>
          <div className={styles.profileList}>
            {isLoading ? <p>Cargando…</p> : profiles.length ? profiles.map((profile) => <button key={profile.id} disabled={isSubmitting} aria-pressed={selectedId === profile.id} onClick={() => { setSelectedId(profile.id); setReason(""); setExpiresAt(""); setMessage(null); }} type="button" className={styles.profile}><strong>{profile.professionalName}</strong><span>{typeLabel(profile.professionalType)}</span><span className={styles.badge} data-status={profile.verificationStatus}>{statusLabels[profile.verificationStatus] ?? profile.verificationStatus}</span></button>) : <p>No hay perfiles para revisar.</p>}
          </div>
        </aside>
        <article className={styles.card}>
          {selected ? <>
            <div className={styles.identity}><div><span className={styles.eyebrow}>Identidad declarada</span><h3>{selected.professionalName}</h3><p>{typeLabel(selected.professionalType)}</p></div><span className={styles.badge} data-status={selected.verificationStatus}>{statusLabels[selected.verificationStatus] ?? selected.verificationStatus}</span></div>
            <div className={styles.validity}><span>Vigencia registrada</span><strong>{selected.verificationExpiresAt ? formatDate(selected.verificationExpiresAt) : "Sin vencimiento configurado"}</strong><small>Hora de Panamá · Independiente de la duración del QR.</small></div>
            <dl className={styles.facts}>
              <div><dt>Referencia de licencia</dt><dd>{selected.licenseReference}</dd></div>
              <div><dt>Jurisdicción</dt><dd>{selected.jurisdiction}, {selected.countryCode}</dd></div>
              <div><dt>Organización</dt><dd>{selected.organizationName ?? "Sin vinculación"}</dd></div>
            </dl>
            {selected.verificationStatus === "expired" ? <div className={styles.notice}><strong>Debe solicitar una renovación</strong><p>El profesional debe pulsar «Solicitar renovación profesional» desde el enlace del expediente. Después podrás revisar la nueva solicitud aquí.</p></div> : null}
            {selected.verificationStatus === "verified" ? <div className={styles.notice}><strong>Identidad verificada. Sin acciones pendientes.</strong><p>Para consultar archivos o registrar una atención, necesita además el permiso vigente del responsable de la mascota.</p></div> : null}
            {selected.verificationStatus === "pending" ? <div className={styles.review}>
              <h4>Revisar solicitud</h4>
              <label>Válida hasta (opcional)<input onChange={(event) => setExpiresAt(event.target.value)} disabled={isSubmitting} type="date" value={expiresAt} /></label>
              <p className={styles.help}>Vence a las 11:59:59 p. m. de Panamá (UTC−5). Sin fecha, la verificación no tendrá vencimiento.</p>
              <label>Motivo del rechazo<textarea onChange={(event) => setReason(event.target.value)} disabled={isSubmitting} rows={2} placeholder="Obligatorio solo si rechazas la solicitud" value={reason} /></label>
              <div className={styles.actions}><button className={styles.primary} disabled={isSubmitting || isLoading} onClick={() => void decide("verified")} type="button">{isSubmitting ? "Guardando…" : "Verificar identidad"}</button><button className={styles.danger} disabled={isSubmitting || isLoading} onClick={() => void decide("rejected")} type="button">Rechazar solicitud</button></div>
            </div> : null}
            {selected.verificationStatus === "verified" ? <details className={styles.disclosure} key={selected.id}><summary>Suspender verificación</summary><div className={styles.review}><p>La suspensión bloquea el acceso profesional que requiere una identidad verificada.</p><label>Motivo de la suspensión<textarea disabled={isSubmitting} onChange={(event) => setReason(event.target.value)} rows={3} value={reason} /></label><div><button className={styles.danger} disabled={isSubmitting || isLoading} onClick={() => void decide("suspended")} type="button">{isSubmitting ? "Guardando…" : "Confirmar suspensión"}</button></div></div></details> : null}
            <p className={styles.help}>Esta revisión de plataforma no sustituye las acreditaciones exigidas por la autoridad competente.</p>
          </> : <p>Selecciona un profesional para revisar su identidad.</p>}
        </article>
      </div>
      <details className={`${styles.card} ${styles.audit}`}>
        <summary><span>Actividad clínica</span><span className={styles.count}>{auditEvents.length} {auditEvents.length === 1 ? "evento" : "eventos"}</span><small>Consultar historial</small></summary>
        <div className={styles.review}>
          <p className={styles.help}>Registro de actividad sin contenido clínico ni archivos. Horarios de Panamá.</p>
          <label>Buscar en la actividad<input onChange={(event) => setAuditFilter(event.target.value)} placeholder="Profesional, organización, referencia o actividad" value={auditFilter} /></label>
          <div className={styles.events}>
            {filteredEvents.map((event) => <div key={event.id} className={styles.event}><div><strong>{eventLabels[event.event] ?? event.event.replaceAll("_", " ")}</strong><span>{event.professionalName ?? "Sin atribución"} · {event.organizationName ?? "Independiente"}</span></div><div><span>{event.petReference ?? "Sin referencia"}</span><time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time></div></div>)}
            {!filteredEvents.length ? <p>{auditEvents.length ? "No hay resultados para esta búsqueda." : "No hay eventos clínicos registrados."}</p> : null}
          </div>
        </div>
      </details>
    </section>
  );
}
