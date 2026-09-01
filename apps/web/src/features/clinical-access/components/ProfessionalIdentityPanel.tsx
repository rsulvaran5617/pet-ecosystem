"use client";

import type { ClinicalDocumentType, ClinicalProfessionalContext, ClinicalProfessionalType, ClinicalTimelineEncounter, ClinicalWriteRequest, ClinicalWriteScope } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserClinicalAccessApiClient, getBrowserCoreApiClient } from "../../core/services/supabase-browser";
import styles from "./PublicClinicalAccessPage.module.css";

const emptyForm = {
  professionalName: "",
  professionalType: "veterinarian" as ClinicalProfessionalType,
  licenseReference: "",
  jurisdiction: "Panama",
  countryCode: "PA",
  providerOrganizationId: ""
};

const statusCopy = {
  draft: "Completa y envia tu identidad para revision.",
  pending: "Tu identidad profesional esta en revision. Puedes continuar consultando en modo de solo lectura.",
  verified: "Identidad profesional verificada por Pet Ecosystem.",
  rejected: "La solicitud necesita correcciones antes de volver a enviarse.",
  suspended: "La verificacion profesional esta suspendida. El acceso permanece en modo de solo lectura.",
  expired: "La verificacion profesional vencio. El acceso permanece en modo de solo lectura."
} as const;
const scopeOptions: Array<{ value: ClinicalWriteScope; label: string }> = [
  { value: "create_encounter", label: "Registrar atencion" }, { value: "record_diagnosis", label: "Registrar diagnostico" },
  { value: "record_vaccine", label: "Registrar vacuna" }, { value: "record_recommendation", label: "Agregar indicaciones" },
  { value: "record_treatment", label: "Registrar tratamiento" }, { value: "upload_clinical_document", label: "Adjuntar documento clinico" }
];

export function ProfessionalIdentityPanel({ token }: { token: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [context, setContext] = useState<ClinicalProfessionalContext | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [writeRequest, setWriteRequest] = useState<ClinicalWriteRequest | null>(null);
  const [requestedScopes, setRequestedScopes] = useState<ClinicalWriteScope[]>(["create_encounter"]);
  const [requestNote, setRequestNote] = useState("");
  const [encounter, setEncounter] = useState({ attendedAt: new Date().toISOString().slice(0, 16), encounterType: "consultation", summary: "", entryType: "diagnosis", entryTitle: "", entryDetails: "" });
  const [isReviewing, setIsReviewing] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentType, setDocumentType] = useState<ClinicalDocumentType>("clinical_report");
  const [receipt, setReceipt] = useState<ClinicalTimelineEncounter | null>(null);
  const [professionalEncounters, setProfessionalEncounters] = useState<ClinicalTimelineEncounter[]>([]);
  const [correctionEntryId, setCorrectionEntryId] = useState("");
  const [correctionTitle, setCorrectionTitle] = useState("");
  const [correctionDetails, setCorrectionDetails] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  async function loadIdentity() {
    const auth = await getBrowserCoreApiClient().getAuthState();
    setIsAuthenticated(auth.isAuthenticated);
    if (!auth.isAuthenticated) {
      setContext(null);
      return;
    }
    await getBrowserClinicalAccessApiClient().getAuthenticatedClinicalAccessContext(token);
    const nextContext = await getBrowserClinicalAccessApiClient().getMyClinicalProfessionalContext();
    const nextRequest = await getBrowserClinicalAccessApiClient().getMyClinicalWriteRequest(token);
    const encounters = await getBrowserClinicalAccessApiClient().listMyProfessionalEncounters();
    setContext(nextContext);
    setWriteRequest(nextRequest);
    setProfessionalEncounters(encounters);
    if (nextContext.profile) {
      setForm({
        professionalName: nextContext.profile.professionalName,
        professionalType: nextContext.profile.professionalType,
        licenseReference: nextContext.profile.licenseReference,
        jurisdiction: nextContext.profile.jurisdiction,
        countryCode: nextContext.profile.countryCode,
        providerOrganizationId: nextContext.profile.providerOrganizationId ?? ""
      });
    }
  }

  useEffect(() => {
    void loadIdentity().catch(() => setMessage("No pudimos consultar la identidad profesional.")).finally(() => setIsLoading(false));
  }, [token]);

  async function login() {
    setIsSubmitting(true);
    setMessage(null);
    try {
      await getBrowserCoreApiClient().login({ email, password });
      await loadIdentity();
      setPassword("");
    } catch {
      setMessage("No pudimos iniciar sesion. Revisa tus datos e intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveProfile() {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const nextContext = await getBrowserClinicalAccessApiClient().saveMyClinicalProfessionalProfile({
        ...form,
        providerOrganizationId: form.providerOrganizationId || null
      });
      setContext(nextContext);
      setMessage("Identidad profesional guardada como borrador.");
    } catch {
      setMessage("No pudimos guardar la identidad. Revisa los campos e intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProfile() {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const nextContext = await getBrowserClinicalAccessApiClient().submitMyClinicalProfessionalProfile();
      setContext(nextContext);
      setMessage("Solicitud enviada para revision manual.");
    } catch {
      setMessage("Guarda todos los datos antes de enviar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestWriteAccess() {
    if (!requestedScopes.length) { setMessage("Selecciona al menos una accion."); return; }
    setIsSubmitting(true); setMessage(null);
    try {
      await getBrowserClinicalAccessApiClient().requestClinicalWriteAccess(token, requestedScopes, requestNote);
      setWriteRequest(await getBrowserClinicalAccessApiClient().getMyClinicalWriteRequest(token));
      setMessage("Solicitud enviada al responsable de la mascota.");
    } catch { setMessage("No pudimos enviar la solicitud. Verifica que el acceso siga vigente."); }
    finally { setIsSubmitting(false); }
  }

  async function finalizeEncounter() {
    if (!writeRequest || !encounter.summary.trim()) { setMessage("Describe brevemente la atencion."); return; }
    setIsSubmitting(true); setMessage(null);
    try {
      const encounterId = await getBrowserClinicalAccessApiClient().finalizeClinicalEncounter({ requestId: writeRequest.id, idempotencyKey: crypto.randomUUID(), attendedAt: new Date(encounter.attendedAt).toISOString(), encounterType: encounter.encounterType as "consultation", summary: encounter.summary, entries: encounter.entryTitle.trim() ? [{ type: encounter.entryType as "diagnosis", title: encounter.entryTitle, details: encounter.entryDetails }] : [] });
      if (documentFile) {
        const prepared = await getBrowserClinicalAccessApiClient().prepareClinicalDocumentUpload({ encounterId, idempotencyKey: crypto.randomUUID(), title: documentTitle.trim(), documentType, mimeType: documentFile.type as "application/pdf" | "image/jpeg" | "image/png", fileSizeBytes: documentFile.size });
        await getBrowserClinicalAccessApiClient().uploadPreparedClinicalDocument(prepared, documentFile);
      }
      setWriteRequest(await getBrowserClinicalAccessApiClient().getMyClinicalWriteRequest(token));
      const encounters = await getBrowserClinicalAccessApiClient().listMyProfessionalEncounters();
      setReceipt(encounters.find((item) => item.id === encounterId) ?? null);
      setIsReviewing(false);
      setMessage("Atencion incorporada al expediente. El owner ya puede consultarla.");
    } catch { setMessage("No pudimos registrar la atencion. Revisa el alcance y la vigencia."); }
    finally { setIsSubmitting(false); }
  }

  function reviewEncounter() {
    if (!encounter.summary.trim()) { setMessage("Describe brevemente la atencion."); return; }
    if (documentFile && (!documentTitle.trim() || !["application/pdf", "image/jpeg", "image/png"].includes(documentFile.type) || documentFile.size > 15 * 1024 * 1024)) { setMessage("El documento requiere titulo y debe ser PDF, JPEG o PNG de hasta 15 MB."); return; }
    setMessage(null); setIsReviewing(true);
  }

  async function createCorrection() {
    if (!writeRequest || !correctionEntryId || !correctionTitle.trim() || !correctionReason.trim()) { setMessage("Selecciona un registro e indica el contenido y motivo de la rectificacion."); return; }
    setIsSubmitting(true); setMessage(null);
    try {
      await getBrowserClinicalAccessApiClient().createClinicalEntryCorrection(correctionEntryId, writeRequest.id, correctionTitle, correctionDetails || null, correctionReason);
      const encounters = await getBrowserClinicalAccessApiClient().listMyProfessionalEncounters();
      setProfessionalEncounters(encounters); setCorrectionEntryId(""); setCorrectionTitle(""); setCorrectionDetails(""); setCorrectionReason("");
      setMessage("Rectificacion registrada sin alterar el contenido original.");
    } catch { setMessage("No pudimos registrar la rectificacion. Verifica el permiso y su vigencia."); }
    finally { setIsSubmitting(false); }
  }

  if (isLoading) return null;
  const profile = context?.profile ?? null;
  const editable = !profile || profile.verificationStatus === "draft" || profile.verificationStatus === "rejected";

  return (
    <section className={styles.professionalPanel}>
      <div className={styles.professionalHeading}>
        <div><span className={styles.eyebrow}>Acceso profesional</span><h2>Identidad del profesional</h2><p>Identificarte no habilita cambios en el expediente.</p></div>
        {!isOpen ? <button className={styles.secondaryButton} onClick={() => setIsOpen(true)} type="button">Identificarme como profesional</button> : null}
      </div>
      {isOpen && !isAuthenticated ? (
        <form className={styles.identityForm} onSubmit={(event) => { event.preventDefault(); void login(); }}>
          <label>Correo<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label>Contrasena<input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          <button className={styles.primaryButton} disabled={isSubmitting} type="submit">{isSubmitting ? "Ingresando..." : "Iniciar sesion"}</button>
          <a className={styles.textLink} href="/app">Crear una cuenta en Pet Ecosystem</a>
        </form>
      ) : null}
      {isOpen && isAuthenticated ? (
        <div className={styles.identityForm}>
          {profile ? <div className={`${styles.verificationNotice} ${profile.verificationStatus === "verified" ? styles.verified : ""}`}><strong>{profile.professionalName}</strong><span>{statusCopy[profile.verificationStatus]}</span>{profile.organizationName ? <span>{profile.organizationName}</span> : null}</div> : null}
          {editable ? (
            <>
              <label>Nombre profesional<input onChange={(event) => setForm((current) => ({ ...current, professionalName: event.target.value }))} required value={form.professionalName} /></label>
              <label>Tipo<select onChange={(event) => setForm((current) => ({ ...current, professionalType: event.target.value as ClinicalProfessionalType }))} value={form.professionalType}><option value="veterinarian">Veterinario</option><option value="veterinary_technician">Tecnico veterinario</option><option value="other">Otro profesional de salud animal</option></select></label>
              <label>Referencia de licencia<input onChange={(event) => setForm((current) => ({ ...current, licenseReference: event.target.value }))} required value={form.licenseReference} /></label>
              <label>Jurisdiccion<input onChange={(event) => setForm((current) => ({ ...current, jurisdiction: event.target.value }))} required value={form.jurisdiction} /></label>
              <label>Organizacion opcional<select onChange={(event) => setForm((current) => ({ ...current, providerOrganizationId: event.target.value }))} value={form.providerOrganizationId}><option value="">Sin organizacion vinculada</option>{context?.organizationOptions.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
              <div className={styles.formActions}><button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void saveProfile()} type="button">Guardar borrador</button>{profile?.verificationStatus === "draft" ? <button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void submitProfile()} type="button">Enviar a revision</button> : null}</div>
            </>
          ) : null}
          {profile?.verificationStatus === "verified" ? (
            writeRequest ? <><div className={styles.verificationNotice}><strong>Solicitud: {writeRequest.status === "requested" ? "En espera" : writeRequest.status === "approved" ? "Aprobada" : writeRequest.status === "rejected" ? "No aprobada" : writeRequest.status === "revoked" ? "Revocada" : "Cerrada"}</strong></div>{writeRequest.status === "approved" ? <><div className={styles.writeRequest}><h3>{isReviewing ? "Revisar atencion" : "Registrar atencion autorizada"}</h3>{!isReviewing ? <><label>Fecha y hora<input onChange={(event) => setEncounter((current) => ({ ...current, attendedAt: event.target.value }))} type="datetime-local" value={encounter.attendedAt} /></label><label>Tipo<select onChange={(event) => setEncounter((current) => ({ ...current, encounterType: event.target.value }))} value={encounter.encounterType}><option value="consultation">Consulta</option><option value="vaccination">Vacunacion</option><option value="follow_up">Seguimiento</option><option value="emergency">Urgencia</option><option value="other">Otra</option></select></label><label>Resumen<textarea maxLength={2400} onChange={(event) => setEncounter((current) => ({ ...current, summary: event.target.value }))} required rows={4} value={encounter.summary} /></label><label>Entrada clinica opcional<select onChange={(event) => setEncounter((current) => ({ ...current, entryType: event.target.value }))} value={encounter.entryType}><option value="diagnosis">Diagnostico</option><option value="vaccine">Vacuna</option><option value="recommendation">Indicacion</option><option value="treatment">Tratamiento</option><option value="finding">Hallazgo</option></select></label><label>Titulo<input onChange={(event) => setEncounter((current) => ({ ...current, entryTitle: event.target.value }))} value={encounter.entryTitle} /></label><label>Detalle<textarea maxLength={4000} onChange={(event) => setEncounter((current) => ({ ...current, entryDetails: event.target.value }))} rows={3} value={encounter.entryDetails} /></label>{writeRequest.requestedScopes.includes("upload_clinical_document") ? <><label>Documento clinico opcional<input accept="application/pdf,image/jpeg,image/png" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} type="file" /></label>{documentFile ? <><label>Titulo del documento<input maxLength={200} onChange={(event) => setDocumentTitle(event.target.value)} value={documentTitle} /></label><label>Tipo de documento<select onChange={(event) => setDocumentType(event.target.value as ClinicalDocumentType)} value={documentType}><option value="prescription">Receta</option><option value="lab_result">Laboratorio</option><option value="imaging_report">Imagenologia</option><option value="clinical_report">Informe clinico</option><option value="other">Otro</option></select></label></> : null}</> : null}<button className={styles.primaryButton} disabled={isSubmitting} onClick={reviewEncounter} type="button">Revisar atencion</button></> : <><div className={styles.reviewSummary}><strong>{profile.professionalName}{profile.organizationName ? ` · ${profile.organizationName}` : ""}</strong><span>{new Date(encounter.attendedAt).toLocaleString("es-PA")}</span><p>{encounter.summary}</p>{encounter.entryTitle ? <span>{encounter.entryTitle} · {encounter.entryDetails || "Sin detalle adicional"}</span> : <span>Sin entradas estructuradas.</span>}{documentFile ? <span>Documento: {documentTitle} ({documentFile.name})</span> : <span>Sin documentos.</span>}<span>Autorizacion: {writeRequest.requestedScopes.length} permiso(s).</span></div><p className={styles.disclaimer}>Al confirmar, esta atencion quedara incorporada al expediente y no podra editarse directamente. Las correcciones se registraran como una nueva rectificacion.</p><div className={styles.formActions}><button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => setIsReviewing(false)} type="button">Volver</button><button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void finalizeEncounter()} type="button">{isSubmitting ? "Confirmando..." : "Confirmar e incorporar"}</button></div></>}</div>{professionalEncounters.flatMap((item) => item.entries.filter((entry) => !entry.correctsEntryId)).length ? <div className={styles.writeRequest}><h3>Rectificar un registro propio</h3><p>El original permanecera visible junto con esta aclaracion.</p><label>Registro original<select onChange={(event) => setCorrectionEntryId(event.target.value)} value={correctionEntryId}><option value="">Seleccionar</option>{professionalEncounters.flatMap((item) => item.entries.filter((entry) => !entry.correctsEntryId).map((entry) => <option key={entry.id} value={entry.id}>{item.petName} · {entry.title}</option>))}</select></label><label>Contenido corregido<input maxLength={200} onChange={(event) => setCorrectionTitle(event.target.value)} value={correctionTitle} /></label><label>Detalle<textarea maxLength={4000} onChange={(event) => setCorrectionDetails(event.target.value)} rows={3} value={correctionDetails} /></label><label>Motivo obligatorio<textarea maxLength={800} onChange={(event) => setCorrectionReason(event.target.value)} rows={2} value={correctionReason} /></label><button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void createCorrection()} type="button">Registrar rectificacion</button></div> : null}</> : null}{receipt ? <div className={styles.writeRequest}><h3>Comprobante de atencion</h3><strong>{receipt.petName} · {receipt.professionalName}</strong><p>{receipt.summary}</p><span>{receipt.entries.length} registro(s) · {receipt.documents.length} documento(s)</span><p className={styles.disclaimer}>Atencion finalizada. No admite edicion directa.</p></div> : null}</> : <div className={styles.writeRequest}><h3>Solicitar permiso para registrar atencion</h3><p>El owner vera exactamente las acciones seleccionadas antes de decidir.</p>{scopeOptions.map((option) => <label className={styles.checkLabel} key={option.value}><input checked={requestedScopes.includes(option.value)} onChange={() => setRequestedScopes((current) => current.includes(option.value) ? current.filter((scope) => scope !== option.value) : [...current, option.value])} type="checkbox" />{option.label}</label>)}<label>Nota opcional<textarea maxLength={800} onChange={(event) => setRequestNote(event.target.value)} rows={3} value={requestNote} /></label><button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void requestWriteAccess()} type="button">Enviar solicitud al owner</button></div>
          ) : null}
          <p className={styles.disclaimer}>La verificacion de plataforma no sustituye las acreditaciones exigidas por la autoridad competente. Este acceso sigue siendo solo de lectura.</p>
        </div>
      ) : null}
      {message ? <p className={styles.panelMessage}>{message}</p> : null}
    </section>
  );
}
