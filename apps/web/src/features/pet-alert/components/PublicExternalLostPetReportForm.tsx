"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import styles from "./PublicExternalLostPetReportForm.module.css";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const steps = ["Mascota", "Extravío", "Contacto", "Revisar"];
const initial = {
  petName: "", petSpecies: "", petBreed: "", apparentSize: "unknown", apparentSex: "unknown", primaryColor: "",
  distinctiveMarks: "", behaviorNotes: "", medicalPublicNotes: "", lastSeenAt: "", lastSeenCity: "",
  lastSeenRegion: "", lastSeenCountry: "PA", lastSeenReference: "", publicDescription: "", contactName: "", email: ""
};

function edgeUrl() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("El servicio de reportes no está configurado.");
  return `${base}/functions/v1/pet-alert-external-report`;
}

export function PublicExternalLostPetReportForm() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initial);
  const [photos, setPhotos] = useState<File[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reference: string; managementToken: string } | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const previews = useMemo(() => photos.map((file) => ({ file, url: URL.createObjectURL(file) })), [photos]);

  function update(name: keyof typeof initial, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function initTurnstile() {
    if (!siteKey || !turnstileRef.current || !window.turnstile || widgetId) return;
    const id = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken("")
    });
    setWidgetId(id);
  }

  useEffect(() => {
    if (step === 3 && turnstileReady) initTurnstile();
  }, [step, turnstileReady, widgetId]);

  function resetTurnstile() {
    setTurnstileToken("");
    if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
  }

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(0, 4);
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Usa fotos JPG, PNG o WebP de hasta 5 MB cada una.");
      return;
    }
    setPhotos(selected);
    setError(null);
  }

  function next(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (step === 0 && (!values.petName.trim() || !values.petSpecies.trim() || photos.length < 1)) return setError("Indica nombre, especie y al menos una foto.");
    if (step === 1 && (!values.lastSeenAt || !values.lastSeenCity.trim() || values.publicDescription.trim().length < 10)) return setError("Completa fecha, ciudad y una descripción de al menos 10 caracteres.");
    if (step === 2 && (!values.contactName.trim() || !values.email.includes("@") || !acceptedTerms || !acceptedPrivacy)) return setError("Completa el contacto y acepta privacidad y responsabilidad.");
    setStep((current) => Math.min(current + 1, 3));
  }

  async function requestCode() {
    if (!turnstileToken) return setError("Completa la validación de seguridad.");
    setBusy(true); setError(null);
    try {
      const response = await fetch(edgeUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: values.email, contactName: values.contactName, acceptedTerms, acceptedPrivacy, turnstileToken })
      });
      const body = await response.json() as { ok?: boolean; challengeId?: string; message?: string };
      if (!response.ok || !body.ok || !body.challengeId) throw new Error(body.message ?? "No fue posible enviar el código.");
      setChallengeId(body.challengeId);
      resetTurnstile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible enviar el código."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!challengeId || !/^[0-9]{6}$/.test(code) || !turnstileToken) return setError("Indica el código recibido y completa la validación de seguridad.");
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.set("payload", JSON.stringify({ ...values, acceptedTerms, acceptedPrivacy }));
      form.set("challengeId", challengeId);
      form.set("code", code);
      form.set("turnstileToken", turnstileToken);
      photos.forEach((photo) => form.append("photos", photo));
      const response = await fetch(edgeUrl(), { method: "POST", body: form });
      const body = await response.json() as { ok?: boolean; reference?: string; managementToken?: string; message?: string };
      if (!response.ok || !body.ok || !body.reference || !body.managementToken) throw new Error(body.message ?? "No fue posible enviar el reporte.");
      setResult({ reference: body.reference, managementToken: body.managementToken });
    } catch (reason) { resetTurnstile(); setError(reason instanceof Error ? reason.message : "No fue posible enviar el reporte."); }
    finally { setBusy(false); }
  }

  if (result) return <main className={styles.page}><div className={styles.shell}><section className={styles.hero}><h1>Reporte recibido</h1><p>La alerta está en revisión y todavía no es pública.</p></section><section className={styles.success}><strong>Referencia: {result.reference}</strong><span>Guarda este código privado. No lo publiques ni lo compartas.</span><code className={styles.token}>{result.managementToken}</code><a href="/pet-alert">Volver a los boletines</a></section></div></main>;

  return <main className={styles.page}><Script onReady={() => setTurnstileReady(true)} src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive"/><div className={styles.shell}>
    <header className={styles.hero}><a href="/pet-alert">Volver a PET ALERT</a><h1>Reportar mi mascota extraviada</h1><p>No necesitas una cuenta. Verificaremos tu correo y revisaremos la publicación antes de hacerla visible.</p></header>
    <nav className={styles.stepper}>{steps.map((label, index) => <span className={`${styles.step} ${index === step ? styles.active : ""}`} key={label}>{index + 1}. {label}</span>)}</nav>
    {error ? <div className={styles.error}>{error}</div> : null}
    <form className={styles.card} onSubmit={next}>
      {step === 0 ? <><h2>Cuéntanos sobre tu mascota</h2><div className={styles.grid}>
        <label className={styles.label}>Nombre<input maxLength={120} onChange={(e) => update("petName", e.target.value)} value={values.petName}/></label>
        <label className={styles.label}>Especie<input maxLength={80} onChange={(e) => update("petSpecies", e.target.value)} placeholder="Perro, gato..." value={values.petSpecies}/></label>
        <label className={styles.label}>Raza opcional<input maxLength={120} onChange={(e) => update("petBreed", e.target.value)} value={values.petBreed}/></label>
        <label className={styles.label}>Color principal<input maxLength={80} onChange={(e) => update("primaryColor", e.target.value)} value={values.primaryColor}/></label>
        <label className={styles.label}>Tamaño<select onChange={(e) => update("apparentSize", e.target.value)} value={values.apparentSize}><option value="unknown">No sé</option><option value="small">Pequeña</option><option value="medium">Mediana</option><option value="large">Grande</option></select></label>
        <label className={styles.label}>Sexo<select onChange={(e) => update("apparentSex", e.target.value)} value={values.apparentSex}><option value="unknown">No indicar</option><option value="female">Hembra</option><option value="male">Macho</option></select></label>
        <label className={`${styles.label} ${styles.wide}`}>Señas distintivas<textarea maxLength={800} onChange={(e) => update("distinctiveMarks", e.target.value)} rows={3} value={values.distinctiveMarks}/></label>
        <label className={`${styles.label} ${styles.wide}`}>Fotos (1 a 4)<input accept="image/jpeg,image/png,image/webp" multiple onChange={selectPhotos} type="file"/><span className={styles.help}>No incluyas documentos, placas legibles, domicilios ni personas identificables.</span></label>
      </div>{previews.length ? <div className={styles.photos}>{previews.map(({ file, url }) => <div className={styles.photo} key={`${file.name}-${file.size}`}><img alt="Vista previa de la mascota" src={url}/></div>)}</div> : null}</> : null}
      {step === 1 ? <><h2>¿Dónde y cuándo se perdió?</h2><div className={styles.grid}>
        <label className={styles.label}>Fecha y hora<input max={new Date().toISOString().slice(0,16)} onChange={(e) => update("lastSeenAt", e.target.value)} type="datetime-local" value={values.lastSeenAt}/></label>
        <label className={styles.label}>Ciudad<input maxLength={120} onChange={(e) => update("lastSeenCity", e.target.value)} value={values.lastSeenCity}/></label>
        <label className={styles.label}>Provincia o región<input maxLength={120} onChange={(e) => update("lastSeenRegion", e.target.value)} value={values.lastSeenRegion}/></label>
        <label className={styles.label}>País<input maxLength={80} onChange={(e) => update("lastSeenCountry", e.target.value)} value={values.lastSeenCountry}/></label>
        <label className={`${styles.label} ${styles.wide}`}>Zona de referencia aproximada<input maxLength={240} onChange={(e) => update("lastSeenReference", e.target.value)} value={values.lastSeenReference}/><span className={styles.help}>No publiques una dirección exacta.</span></label>
        <label className={`${styles.label} ${styles.wide}`}>Descripción pública<textarea maxLength={1600} onChange={(e) => update("publicDescription", e.target.value)} rows={5} value={values.publicDescription}/></label>
      </div></> : null}
      {step === 2 ? <><h2>Contacto privado</h2><p className={styles.private}>Tu nombre y correo no se publicarán. Se usan para verificar y administrar el reporte.</p><div className={styles.grid}>
        <label className={styles.label}>Nombre y apellido<input maxLength={120} onChange={(e) => update("contactName", e.target.value)} value={values.contactName}/></label>
        <label className={styles.label}>Correo<input maxLength={254} onChange={(e) => update("email", e.target.value)} type="email" value={values.email}/></label>
      </div><div className={styles.checks}><label className={styles.check}><input checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} type="checkbox"/>Acepto el tratamiento de mis datos para gestionar esta alerta.</label><label className={styles.check}><input checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} type="checkbox"/>Declaro de buena fe que tengo relación legítima con la mascota y acepto la responsabilidad del contenido.</label></div></> : null}
      {step === 3 ? <><h2>Revisa y verifica</h2><div className={styles.review}><div><strong>Mascota</strong><span>{values.petName} · {values.petSpecies}</span></div><div><strong>Última vez vista</strong><span>{values.lastSeenCity} · {values.lastSeenAt}</span></div><div><strong>Contacto privado</strong><span>{values.contactName} · {values.email}</span></div><div><strong>Fotos</strong><span>{photos.length} archivo(s)</span></div></div>
        <div className={styles.notice}>Verificar el correo no prueba propiedad. El reporte será revisado antes de publicarse.</div>
        {!siteKey ? (
          <div className={styles.error}>La validación de seguridad no está configurada.</div>
        ) : (
          <div className={styles.turnstile} ref={turnstileRef} />
        )}
        {!challengeId ? <button className={styles.button} disabled={busy || !turnstileToken} onClick={() => void requestCode()} type="button">{busy ? "Enviando..." : "Enviar código al correo"}</button> : <><label className={styles.label}>Código de 6 dígitos<input inputMode="numeric" maxLength={6} onChange={(e) => setCode(e.target.value.replace(/\D/g,""))} value={code}/></label><button className={styles.button} disabled={busy || code.length !== 6 || !turnstileToken} onClick={() => void submit()} type="button">{busy ? "Enviando..." : "Enviar reporte a revisión"}</button></>}
      </> : null}
      <div className={styles.actions}>{step > 0 ? <button className={`${styles.button} ${styles.secondary}`} onClick={() => { setError(null); setStep((current) => current - 1); }} type="button">Atrás</button> : <span/>}{step < 3 ? <button className={styles.button} type="submit">Continuar</button> : null}</div>
    </form>
  </div></main>;
}
