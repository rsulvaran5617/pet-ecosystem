"use client";

import type { ClinicalProfessionalContext, ClinicalProfessionalType, ClinicalWriteRequest, ClinicalWriteScope } from "@pet/types";
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
    setContext(nextContext);
    setWriteRequest(nextRequest);
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
            writeRequest ? <div className={styles.verificationNotice}><strong>Solicitud: {writeRequest.status === "requested" ? "En espera" : writeRequest.status === "approved" ? "Aprobada" : writeRequest.status === "rejected" ? "No aprobada" : writeRequest.status === "revoked" ? "Revocada" : "Cerrada"}</strong><span>Este slice aun no permite registrar informacion clinica.</span></div> : <div className={styles.writeRequest}><h3>Solicitar permiso para registrar atencion</h3><p>El owner vera exactamente las acciones seleccionadas antes de decidir.</p>{scopeOptions.map((option) => <label className={styles.checkLabel} key={option.value}><input checked={requestedScopes.includes(option.value)} onChange={() => setRequestedScopes((current) => current.includes(option.value) ? current.filter((scope) => scope !== option.value) : [...current, option.value])} type="checkbox" />{option.label}</label>)}<label>Nota opcional<textarea maxLength={800} onChange={(event) => setRequestNote(event.target.value)} rows={3} value={requestNote} /></label><button className={styles.primaryButton} disabled={isSubmitting} onClick={() => void requestWriteAccess()} type="button">Enviar solicitud al owner</button></div>
          ) : null}
          <p className={styles.disclaimer}>La verificacion de plataforma no sustituye las acreditaciones exigidas por la autoridad competente. Este acceso sigue siendo solo de lectura.</p>
        </div>
      ) : null}
      {message ? <p className={styles.panelMessage}>{message}</p> : null}
    </section>
  );
}
