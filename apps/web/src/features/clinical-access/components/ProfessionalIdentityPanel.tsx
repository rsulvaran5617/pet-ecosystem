"use client";

import type { ClinicalDocumentType, ClinicalEncounterType, ClinicalEntryType, ClinicalProfessionalContext, ClinicalProfessionalType, ClinicalTimelineEncounter, ClinicalWriteRequest, ClinicalWriteScope } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getBrowserClinicalAccessApiClient, getBrowserCoreApiClient, getBrowserSupabaseClient } from "../../core/services/supabase-browser";
import { submitClinicalEncounter } from "../services/clinical-encounter-submission";
import type { ClinicalEncounterSubmission } from "../services/clinical-encounter-submission";
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
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [context, setContext] = useState<ClinicalProfessionalContext | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [startingNewRequest, setStartingNewRequest] = useState(false);
  const [writeRequest, setWriteRequest] = useState<ClinicalWriteRequest | null>(null);
  const [requestedScopes, setRequestedScopes] = useState<ClinicalWriteScope[]>(() => scopeOptions.map((option) => option.value));
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
  const [submission, setSubmission] = useState<ClinicalEncounterSubmission | null>(null);
  const submissionRunning = useRef(false);
  const identityGeneration = useRef(0);
  const authUser = useRef<string | null>(null);

  async function loadIdentity() {
    const attempt = ++identityGeneration.current;
    const auth = await getBrowserCoreApiClient().getAuthState();
    if (attempt !== identityGeneration.current) return;
    authUser.current = auth.userId ?? null;
    setIsAuthenticated(auth.isAuthenticated);
    setSessionEmail(auth.email ?? null);
    if (!auth.isAuthenticated) {
      setContext(null);
      setWriteRequest(null);
      setProfessionalEncounters([]);
      setForm(emptyForm);
      return;
    }
    await getBrowserClinicalAccessApiClient().getAuthenticatedClinicalAccessContext(token);
    const nextContext = await getBrowserClinicalAccessApiClient().getMyClinicalProfessionalContext();
    const nextRequest = await getBrowserClinicalAccessApiClient().getMyClinicalWriteRequest(token);
    const encounters = await getBrowserClinicalAccessApiClient().listMyProfessionalEncounters();
    if (attempt !== identityGeneration.current) return;
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
    return () => { identityGeneration.current += 1; };
  }, [token, sessionVersion]);

  useEffect(() => {
    const { data } = getBrowserSupabaseClient().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && session?.user.id !== authUser.current)) {
        identityGeneration.current += 1;
        authUser.current = session?.user.id ?? null;
        setContext(null); setStartingNewRequest(false); setWriteRequest(null); setReceipt(null); setSubmission(null);
        setIsAuthenticated(false);
        setSessionEmail(null);
        setSessionVersion((version) => version + 1);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isSubmitting || submission) return;
    let cancelled = false;
    let running = false;
    async function refreshStatus() {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const [identity, request] = await Promise.all([
          getBrowserClinicalAccessApiClient().getMyClinicalProfessionalContext(),
          getBrowserClinicalAccessApiClient().getMyClinicalWriteRequest(token)
        ]);
        if (!cancelled) { setContext(identity); setWriteRequest(request); }
      } catch {
        if (!cancelled) setMessage("No pudimos actualizar los permisos. Comprueba tu conexion y la vigencia del enlace.");
      } finally { running = false; }
    }
    const interval = window.setInterval(() => void refreshStatus(), 8000);
    const onVisible = () => { void refreshStatus(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isAuthenticated, isSubmitting, submission, token]);

  async function changeAccount() {
    setIsSubmitting(true);
    try { await getBrowserCoreApiClient().logout(); }
    catch { setMessage("No pudimos cerrar la sesion. Intenta nuevamente."); }
    finally { setIsSubmitting(false); }
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
      await getBrowserClinicalAccessApiClient().saveMyClinicalProfessionalProfile({
        ...form,
        providerOrganizationId: form.providerOrganizationId || null
      });
      const nextContext = await getBrowserClinicalAccessApiClient().submitMyClinicalProfessionalProfile();
      setContext(nextContext);
      setMessage("Solicitud enviada para revision manual.");
    } catch {
      setMessage("Revisa los datos de identidad y vuelve a enviar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestRenewal() {
    setIsSubmitting(true); setMessage(null);
    try {
      setContext(await getBrowserClinicalAccessApiClient().submitMyClinicalProfessionalProfile());
      setWriteRequest(null); setStartingNewRequest(false);
      setMessage("Renovacion enviada a administracion. Despues de la verificacion, solicita una nueva aprobacion al responsable de la mascota.");
    } catch {
      setMessage("No pudimos enviar la renovacion. Vuelve a intentarlo.");
    } finally { setIsSubmitting(false); }
  }

  async function requestWriteAccess() {
    if (!requestedScopes.length) { setMessage("Selecciona al menos una accion."); return; }
    setIsSubmitting(true); setMessage(null);
    try {
      await getBrowserClinicalAccessApiClient().requestClinicalWriteAccess(token, requestedScopes, requestNote);
      setWriteRequest(await getBrowserClinicalAccessApiClient().getMyClinicalWriteRequest(token));
      setStartingNewRequest(false); setSubmission(null); setReceipt(null); setIsReviewing(false);
      setEncounter({ attendedAt: new Date().toISOString().slice(0, 16), encounterType: "consultation", summary: "", entryType: "diagnosis", entryTitle: "", entryDetails: "" });
      setDocumentFile(null); setDocumentTitle(""); setDocumentType("clinical_report");
      setCorrectionEntryId(""); setCorrectionTitle(""); setCorrectionDetails(""); setCorrectionReason("");
      setMessage("Solicitud enviada. El responsable puede revisarla en su app, en Salud. Esta pagina actualizara la aprobacion automaticamente.");
    } catch { setMessage("No pudimos enviar la solicitud. Verifica que el acceso siga vigente."); }
    finally { setIsSubmitting(false); }
  }

  async function finalizeEncounter() {
    if (submissionRunning.current) return;
    if (!submission && (!writeRequest || !encounter.summary.trim())) { setMessage("Describe brevemente la atencion."); return; }
    if (!submission && !Number.isFinite(new Date(encounter.attendedAt).getTime())) { setMessage("Indica una fecha y hora validas."); return; }
    const attempt: ClinicalEncounterSubmission = submission ?? {
      input: {
        requestId: writeRequest!.id, idempotencyKey: crypto.randomUUID(),
        attendedAt: new Date(encounter.attendedAt).toISOString(), encounterType: encounter.encounterType as ClinicalEncounterType,
        summary: encounter.summary,
        entries: encounter.entryTitle.trim() ? [{ type: encounter.entryType as ClinicalEntryType, title: encounter.entryTitle, details: encounter.entryDetails }] : []
      },
      attachment: documentFile ? { file: documentFile, title: documentTitle.trim(), documentType, idempotencyKey: crypto.randomUUID() } : null,
      encounterId: null, prepared: null, documentComplete: false
    };
    submissionRunning.current = true;
    setSubmission(attempt);
    setIsSubmitting(true); setMessage(null);
    try {
      const encounterId = await submitClinicalEncounter(getBrowserClinicalAccessApiClient(), attempt);
      setWriteRequest(await getBrowserClinicalAccessApiClient().getMyClinicalWriteRequest(token));
      setStartingNewRequest(false); setSubmission(null); setReceipt(null); setIsReviewing(false);
      setEncounter({ attendedAt: new Date().toISOString().slice(0, 16), encounterType: "consultation", summary: "", entryType: "diagnosis", entryTitle: "", entryDetails: "" });
      setDocumentFile(null); setDocumentTitle(""); setDocumentType("clinical_report");
      setCorrectionEntryId(""); setCorrectionTitle(""); setCorrectionDetails(""); setCorrectionReason("");
      const encounters = await getBrowserClinicalAccessApiClient().listMyProfessionalEncounters();
      const savedReceipt = encounters.find((item) => item.id === encounterId);
      if (!savedReceipt) throw new Error("Receipt is not available yet");
      setReceipt(savedReceipt);
      setProfessionalEncounters(encounters);
      setSubmission(null);
      setDocumentFile(null);
      setIsReviewing(false);
      setMessage("Atencion incorporada al expediente. El owner ya puede consultarla.");
    } catch {
      setSubmission({ ...attempt });
      if (attempt.encounterId) {
        setWriteRequest((current) => current?.id === attempt.input.requestId && current.status === "approved" ? { ...current, status: "completed" } : current);
        setMessage(attempt.attachment && !attempt.documentComplete
          ? "La atencion esta guardada. El documento sigue pendiente; puedes reintentarlo si el permiso sigue vigente."
          : "La atencion esta guardada. No pudimos actualizar el comprobante; vuelve a consultarlo.");
      } else {
        setMessage("No pudimos confirmar el resultado. Reintenta la misma operacion para recuperar la atencion sin duplicarla.");
      }
    } finally { submissionRunning.current = false; setIsSubmitting(false); }
  }

  function reviewEncounter() {
    if (!encounter.summary.trim()) { setMessage("Describe brevemente la atencion."); return; }
    if (!Number.isFinite(new Date(encounter.attendedAt).getTime())) { setMessage("Indica una fecha y hora validas."); return; }
    if (documentFile && (!documentTitle.trim() || !["application/pdf", "image/jpeg", "image/png"].includes(documentFile.type) || documentFile.size === 0 || documentFile.size > 15 * 1024 * 1024)) { setMessage("El documento requiere titulo y debe ser PDF, JPEG o PNG no vacio de hasta 15 MB."); return; }
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

  const profile = context?.profile ?? null;
  const editable = !profile || profile.verificationStatus === "draft" || profile.verificationStatus === "rejected";

  return (
    <section className={styles.professionalPanel} id="professional-access">
      <div className={styles.professionalHeading}>
        <div><span className={styles.eyebrow}>Acceso profesional</span><h2>Identidad del profesional</h2><p>Para abrir documentos o registrar una atencion, inicia sesion y solicita la aprobacion del responsable.</p></div>
      </div>
      {isLoading ? <p role="status">Comprobando tu sesion...</p> : null}
      {!isAuthenticated ? (
        <div className={styles.identityForm}>
          <p>Si ya tienes cuenta, ingresa con tu correo y contrasena. Si aun no tienes, crea una cuenta. Volveras a este expediente al completar el acceso.</p>
          <div className={styles.formActions}>
            <a className={styles.primaryButton} href={`/app?auth=login&clinicalReturn=${encodeURIComponent(token)}`}>Iniciar sesion</a>
            <a className={styles.secondaryButton} href={`/app?auth=register&clinicalReturn=${encodeURIComponent(token)}`}>Crear cuenta</a>
          </div>
          <p className={styles.disclaimer}>Puedes seguir leyendo la informacion basica con este QR. Crear una cuenta no sustituye la verificacion profesional ni la aprobacion del responsable.</p>
        </div>
      ) : null}
      {isAuthenticated ? (
        <div className={styles.identityForm}>
          <p>Sesion iniciada{sessionEmail ? `: ${sessionEmail}` : ""}</p>
          <button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeAccount()} type="button">Cerrar sesion y usar otra cuenta</button>
          {profile ? <div className={`${styles.verificationNotice} ${profile.verificationStatus === "verified" ? styles.verified : ""}`}><strong>{profile.professionalName}</strong><span>{statusCopy[profile.verificationStatus]}</span>{profile.organizationName ? <span>{profile.organizationName}</span> : null}</div> : null}
          {profile?.verificationExpiresAt ? <p>Ultima vigencia profesional: {new Date(profile.verificationExpiresAt).toLocaleString("es-PA")} (hora local).</p> : null}
          {profile?.verificationStatus === "expired" ? <div className={styles.writeRequest}>
            <p>Tu sesion esta iniciada, pero la verificacion de plataforma vencio. Un QR nuevo no la renueva. Envia tu identidad a administracion para una nueva revision; despues podras solicitar permiso al responsable.</p>
            <button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void requestRenewal()} type="button">{isSubmitting ? "Enviando..." : "Solicitar renovacion profesional"}</button>
          </div> : null}
          {editable ? (
            <>
              <label>Nombre profesional<input onChange={(event) => setForm((current) => ({ ...current, professionalName: event.target.value }))} required value={form.professionalName} /></label>
              <label>Tipo<select onChange={(event) => setForm((current) => ({ ...current, professionalType: event.target.value as ClinicalProfessionalType }))} value={form.professionalType}><option value="veterinarian">Veterinario</option><option value="veterinary_technician">Tecnico veterinario</option><option value="other">Otro profesional de salud animal</option></select></label>
              <label>Referencia de licencia<input onChange={(event) => setForm((current) => ({ ...current, licenseReference: event.target.value }))} required value={form.licenseReference} /></label>
              <label>Jurisdiccion<input onChange={(event) => setForm((current) => ({ ...current, jurisdiction: event.target.value }))} required value={form.jurisdiction} /></label>
              <label>Organizacion opcional<select onChange={(event) => setForm((current) => ({ ...current, providerOrganizationId: event.target.value }))} value={form.providerOrganizationId}><option value="">Sin organizacion vinculada</option>{context?.organizationOptions.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
              <div className={styles.formActions}><button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void saveProfile()} type="button">Guardar borrador</button><button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void submitProfile()} type="button">Enviar a revision</button></div>
            </>
          ) : null}
          {profile?.verificationStatus === "verified" ? (
            writeRequest && !startingNewRequest ? <><div className={styles.verificationNotice}><strong>Solicitud: {writeRequest.status === "requested" ? "En espera" : writeRequest.status === "approved" ? "Aprobada" : writeRequest.status === "rejected" ? "No aprobada" : writeRequest.status === "revoked" ? "Revocada" : "Cerrada"}</strong></div>{writeRequest.status === "approved" && !submission ? <><div className={styles.writeRequest}><h3>{isReviewing ? "Revisar atencion" : "Registrar atencion autorizada"}</h3>{!isReviewing ? <><label>Fecha y hora<input onChange={(event) => setEncounter((current) => ({ ...current, attendedAt: event.target.value }))} type="datetime-local" value={encounter.attendedAt} /></label><label>Tipo<select onChange={(event) => setEncounter((current) => ({ ...current, encounterType: event.target.value }))} value={encounter.encounterType}><option value="consultation">Consulta</option><option value="vaccination">Vacunacion</option><option value="follow_up">Seguimiento</option><option value="emergency">Urgencia</option><option value="other">Otra</option></select></label><label>Resumen<textarea maxLength={2400} onChange={(event) => setEncounter((current) => ({ ...current, summary: event.target.value }))} required rows={4} value={encounter.summary} /></label><label>Entrada clinica opcional<select onChange={(event) => setEncounter((current) => ({ ...current, entryType: event.target.value }))} value={encounter.entryType}><option value="diagnosis">Diagnostico</option><option value="vaccine">Vacuna</option><option value="recommendation">Indicacion</option><option value="treatment">Tratamiento</option><option value="finding">Hallazgo</option></select></label><label>Titulo<input onChange={(event) => setEncounter((current) => ({ ...current, entryTitle: event.target.value }))} value={encounter.entryTitle} /></label><label>Detalle<textarea maxLength={4000} onChange={(event) => setEncounter((current) => ({ ...current, entryDetails: event.target.value }))} rows={3} value={encounter.entryDetails} /></label>{writeRequest.requestedScopes.includes("upload_clinical_document") ? <><label>Documento clinico opcional<input accept="application/pdf,image/jpeg,image/png" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} type="file" /></label>{documentFile ? <><label>Titulo del documento<input maxLength={200} onChange={(event) => setDocumentTitle(event.target.value)} value={documentTitle} /></label><label>Tipo de documento<select onChange={(event) => setDocumentType(event.target.value as ClinicalDocumentType)} value={documentType}><option value="prescription">Receta</option><option value="lab_result">Laboratorio</option><option value="imaging_report">Imagenologia</option><option value="clinical_report">Informe clinico</option><option value="other">Otro</option></select></label></> : null}</> : null}<button className={styles.primaryButton} disabled={isSubmitting} onClick={reviewEncounter} type="button">Revisar atencion</button></> : <><div className={styles.reviewSummary}><strong>{profile.professionalName}{profile.organizationName ? ` · ${profile.organizationName}` : ""}</strong><span>{new Date(encounter.attendedAt).toLocaleString("es-PA")}</span><p>{encounter.summary}</p>{encounter.entryTitle ? <span>{encounter.entryTitle} · {encounter.entryDetails || "Sin detalle adicional"}</span> : <span>Sin entradas estructuradas.</span>}{documentFile ? <span>Documento: {documentTitle} ({documentFile.name})</span> : <span>Sin documentos.</span>}<span>Autorizacion: {writeRequest.requestedScopes.length} permiso(s).</span></div><p className={styles.disclaimer}>Al confirmar, esta atencion quedara incorporada al expediente y no podra editarse directamente. Las correcciones se registraran como una nueva rectificacion.</p><div className={styles.formActions}><button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => setIsReviewing(false)} type="button">Volver</button><button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void finalizeEncounter()} type="button">{isSubmitting ? "Confirmando..." : "Confirmar e incorporar"}</button></div></>}</div>{professionalEncounters.flatMap((item) => item.entries.filter((entry) => !entry.correctsEntryId)).length ? <div className={styles.writeRequest}><h3>Rectificar un registro propio</h3><p>El original permanecera visible junto con esta aclaracion.</p><label>Registro original<select onChange={(event) => setCorrectionEntryId(event.target.value)} value={correctionEntryId}><option value="">Seleccionar</option>{professionalEncounters.flatMap((item) => item.entries.filter((entry) => !entry.correctsEntryId).map((entry) => <option key={entry.id} value={entry.id}>{item.petName} · {entry.title}</option>))}</select></label><label>Contenido corregido<input maxLength={200} onChange={(event) => setCorrectionTitle(event.target.value)} value={correctionTitle} /></label><label>Detalle<textarea maxLength={4000} onChange={(event) => setCorrectionDetails(event.target.value)} rows={3} value={correctionDetails} /></label><label>Motivo obligatorio<textarea maxLength={800} onChange={(event) => setCorrectionReason(event.target.value)} rows={2} value={correctionReason} /></label><button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void createCorrection()} type="button">Registrar rectificacion</button></div> : null}</> : null}{writeRequest.status !== "requested" && !submission ? <button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => setStartingNewRequest(true)} type="button">Solicitar una nueva autorizacion</button> : null}{receipt ? <div className={styles.writeRequest}><h3>Comprobante de atencion</h3><strong>{receipt.petName} · {receipt.professionalName}</strong><p>{receipt.summary}</p><span>{receipt.entries.length} registro(s) · {receipt.documents.length} documento(s)</span><p className={styles.disclaimer}>Atencion finalizada. No admite edicion directa.</p></div> : null}</> : <div className={styles.writeRequest}><h3>Solicitar permiso para registrar atencion</h3>{startingNewRequest ? <p>Al enviar, se cerraran los permisos anteriores para esta mascota. Necesitaras una nueva aprobacion del responsable para abrir archivos o registrar informacion.</p> : null}<p>Todos los permisos estan seleccionados. Desmarca los que no necesites; el responsable de la mascota debe aprobar tu solicitud.</p>{scopeOptions.map((option) => <label className={styles.checkLabel} key={option.value}><input checked={requestedScopes.includes(option.value)} onChange={() => setRequestedScopes((current) => current.includes(option.value) ? current.filter((scope) => scope !== option.value) : [...current, option.value])} type="checkbox" />{option.label}</label>)}<label>Nota opcional<textarea maxLength={800} onChange={(event) => setRequestNote(event.target.value)} rows={3} value={requestNote} /></label><button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void requestWriteAccess()} type="button">Enviar solicitud al owner</button>{startingNewRequest ? <button className={styles.secondaryButton} disabled={isSubmitting} onClick={() => setStartingNewRequest(false)} type="button">Cancelar</button> : null}</div>
          ) : null}
          <p className={styles.disclaimer}>La verificacion de plataforma no sustituye las acreditaciones exigidas por la autoridad competente. Este acceso sigue siendo solo de lectura.</p>
        </div>
      ) : null}
      {submission ? <div className={styles.writeRequest}>
        <h3>{submission.encounterId ? "Atencion guardada" : "Confirmacion pendiente"}</h3>
        <p>{submission.encounterId && submission.attachment && !submission.documentComplete
          ? "El archivo sigue pendiente. Reintentar conserva la atencion ya registrada y vuelve a validar el permiso."
          : "Puedes recuperar el resultado de esta misma operacion sin crear otra atencion."}</p>
        <button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void finalizeEncounter()} type="button">
          {isSubmitting ? "Comprobando..." : !submission.encounterId ? "Recuperar confirmacion" : submission.attachment && !submission.documentComplete ? "Reintentar documento" : "Actualizar comprobante"}
        </button>
      </div> : null}
      {message ? <p className={styles.panelMessage} role="status">{message}</p> : null}
    </section>
  );
}
