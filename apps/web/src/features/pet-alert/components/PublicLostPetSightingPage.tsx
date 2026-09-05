"use client";

import type { PublicPetAlertLostPet } from "@pet/types";
import { type FormEvent, useEffect, useState } from "react";

import { getBrowserPetAlertApiClient, getBrowserSupabaseClient } from "../../core/services/supabase-browser";
import { ConfirmedBrowserLocation, type ConfirmedBrowserLocationValue } from "./ConfirmedBrowserLocation";

type FormState = {
  city: string;
  contact: string;
  contactConsent: boolean;
  country: string;
  date: string;
  name: string;
  notes: string;
  reference: string;
  region: string;
  time: string;
};

function initialForm(): FormState {
  const now = new Date();
  return {
    city: "",
    contact: "",
    contactConsent: false,
    country: "PA",
    date: now.toLocaleDateString("en-CA", { timeZone: "America/Panama" }),
    name: "",
    notes: "",
    reference: "",
    region: "",
    time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Panama" })
  };
}

export function PublicLostPetSightingPage({ slug }: { slug: string }) {
  const [alert, setAlert] = useState<PublicPetAlertLostPet | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<ConfirmedBrowserLocationValue | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getBrowserPetAlertApiClient().getPetAlertLostPetBySlug(slug),
      getBrowserSupabaseClient().auth.getSession()
    ])
      .then(([publicAlert, sessionResult]) => {
        if (!mounted) return;
        setAlert(publicAlert);
        const user = sessionResult.data.session?.user;
        setIsAuthenticated(Boolean(user));
        if (user) {
          const fullName = [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ");
          setForm((current) => ({ ...current, contact: user.email ?? "", name: fullName }));
        }
      })
      .catch((error: unknown) => {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir el formulario.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!isAuthenticated) return setErrorMessage("Inicia sesion antes de enviar informacion sobre esta mascota.");
    if (!form.city.trim()) return setErrorMessage("Indica la ciudad donde viste a la mascota.");
    if (form.notes.trim().length < 10) return setErrorMessage("Describe lo que viste con al menos 10 caracteres.");
    const sightedAt = new Date(`${form.date}T${form.time}:00-05:00`);
    if (Number.isNaN(sightedAt.getTime()) || sightedAt.getTime() > Date.now() + 60_000) return setErrorMessage("Revisa la fecha y hora del avistamiento.");

    setIsSubmitting(true);
    try {
      const sightingId = await getBrowserPetAlertApiClient().createPetAlertLostPetSighting({
        alertSlug: slug,
        city: form.city,
        country: form.country,
        locationPrecision: "approximate",
        locationReference: form.reference || null,
        notes: form.notes,
        region: form.region || null,
        reporterContact: form.contactConsent ? form.contact || null : null,
        reporterContactConsent: form.contactConsent,
        reporterName: form.name || null,
        sightedAt: sightedAt.toISOString()
      });
      const locationStored = location
        ? await getBrowserPetAlertApiClient().setPetAlertLostPetSightingLocation(sightingId, {
            ...location,
            publicLocationVisible: false
          }).then(() => true).catch(() => false)
        : true;
      setSuccessMessage(`Informacion enviada. La familia revisara el avistamiento desde PET ALERT.${locationStored ? "" : " El avistamiento se guardo sin el punto de mapa."}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible enviar el avistamiento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <main className="page"><section className="shell">Cargando formulario seguro...</section><style jsx>{styles}</style></main>;
  if (!alert) return <main className="page"><section className="shell"><h1>Alerta no disponible</h1><p>{errorMessage ?? "Esta alerta ya no recibe informacion."}</p></section><style jsx>{styles}</style></main>;

  return (
    <main className="page">
      <section className="shell">
        <header><span>PET ALERT</span><h1>¿Viste a {alert.petName}?</h1><p>Comparte una zona aproximada y lo que observaste. No te pongas en riesgo ni intentes perseguirla.</p><a href={`/pet-alert/mascota-perdida/${slug}`}>Volver a la alerta</a></header>
        {!isAuthenticated ? <div className="auth"><strong>Inicia sesion para proteger este canal</strong><p>Los avistamientos requieren una cuenta verificada. Esto reduce mensajes abusivos y permite trazabilidad.</p><a href="/app">Iniciar sesion o crear cuenta</a><button onClick={() => window.location.reload()} type="button">Ya inicie sesion</button></div> : null}
        {successMessage ? <div className="success"><h2>Gracias por ayudar</h2><p>{successMessage}</p><a href={`/pet-alert/mascota-perdida/${slug}`}>Volver a PET ALERT</a></div> : (
          <form onSubmit={submit}>
            {errorMessage ? <div className="error" role="alert">{errorMessage}</div> : null}
            <div className="grid"><label>Fecha<input onChange={(e) => update("date",e.target.value)} required type="date" value={form.date}/></label><label>Hora<input onChange={(e) => update("time",e.target.value)} required type="time" value={form.time}/></label></div>
            <div className="grid"><label>Ciudad<input maxLength={120} onChange={(e) => update("city",e.target.value)} required value={form.city}/></label><label>Provincia o region<input maxLength={120} onChange={(e) => update("region",e.target.value)} value={form.region}/></label></div>
            <div className="grid"><label>Pais<input maxLength={2} onChange={(e) => update("country",e.target.value.toUpperCase())} required value={form.country}/></label><label>Referencia aproximada<input maxLength={180} onChange={(e) => update("reference",e.target.value)} placeholder="Ej. cerca del parque" value={form.reference}/></label></div>
            <ConfirmedBrowserLocation onChange={setLocation}/>
            <label>¿Que observaste?<textarea maxLength={1200} minLength={10} onChange={(e) => update("notes",e.target.value)} required rows={5} value={form.notes}/></label>
            <div className="grid"><label>Tu nombre, opcional<input maxLength={120} onChange={(e) => update("name",e.target.value)} value={form.name}/></label><label>Contacto<input disabled={!form.contactConsent} maxLength={160} onChange={(e) => update("contact",e.target.value)} value={form.contact}/></label></div>
            <label className="consent"><input checked={form.contactConsent} onChange={(e) => update("contactConsent",e.target.checked)} type="checkbox"/><span>Autorizo compartir este contacto con la familia responsable de {alert.petName}. Si no lo autorizo, mi contacto permanece privado.</span></label>
            <p className="privacy">No escribas domicilios, documentos personales ni coordenadas exactas. La informacion se entrega de forma controlada a la familia.</p>
            <button disabled={!isAuthenticated || isSubmitting} type="submit">{isSubmitting ? "Enviando..." : "Enviar informacion"}</button>
          </form>
        )}
      </section>
      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page{background:linear-gradient(180deg,#fff7ed,#f8fafc);min-height:100vh;padding:28px 14px}.shell{background:#fff;border:1px solid #fed7aa;border-radius:28px;box-shadow:0 20px 55px rgba(15,23,42,.1);display:grid;gap:20px;margin:auto;max-width:820px;padding:28px}header{border-bottom:1px solid #fed7aa;padding-bottom:18px}header span{color:#c2410c;font-size:12px;font-weight:900}h1,h2{color:#0f172a;margin:8px 0}header p,.auth p,.success p,.privacy{color:#64748b;line-height:1.55}a{color:#9a3412;font-weight:900}.auth,.success{background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px}.auth a,.auth button{margin-right:10px}form{display:grid;gap:16px}.grid{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))}label{color:#0f172a;display:grid;font-size:13px;font-weight:900;gap:6px}input,textarea{border:1px solid rgba(194,65,12,.24);border-radius:12px;color:#0f172a;font:inherit;padding:12px}textarea{resize:vertical}.consent{align-items:flex-start;background:#fff7ed;border-radius:14px;display:flex;font-weight:600;line-height:1.45;padding:14px}.consent input{margin-top:3px}.error{background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;color:#9f1239;padding:12px}button{background:#c2410c;border:0;border-radius:999px;color:#fff;cursor:pointer;font-family:inherit;font-weight:900;min-height:46px;padding:0 18px}button:disabled{cursor:not-allowed;opacity:.55}@media(max-width:620px){.page{padding:10px}.shell{border-radius:20px;padding:18px}.grid{grid-template-columns:1fr}}
`;
