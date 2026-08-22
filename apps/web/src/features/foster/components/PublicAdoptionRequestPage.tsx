"use client";

import type { PublicPetAdoptionProfile } from "@pet/types";
import { type FormEvent, useEffect, useState } from "react";

import { getBrowserFosterApiClient } from "../../core/services/supabase-browser";

type FormState = {
  city: string;
  companyWebsite: string;
  email: string;
  experience: string;
  hasChildren: "" | "yes" | "no";
  hasOtherPets: "" | "yes" | "no";
  housingType: string;
  motivation: string;
  name: string;
  phone: string;
  privacyAcknowledged: boolean;
};

const initialForm: FormState = {
  city: "",
  companyWebsite: "",
  email: "",
  experience: "",
  hasChildren: "",
  hasOtherPets: "",
  housingType: "",
  motivation: "",
  name: "",
  phone: "",
  privacyAcknowledged: false
};

function optionalBoolean(value: FormState["hasChildren"]) {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function PublicAdoptionRequestPage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<PublicPetAdoptionProfile | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getBrowserFosterApiClient()
      .getPublicPetAdoptionListingBySlug(slug)
      .then((result) => {
        if (mounted) setProfile(result?.listingStatus === "published" ? result : null);
      })
      .catch((error: unknown) => {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir esta publicacion.");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!profile) return;
    if (form.name.trim().length < 2) return setErrorMessage("Escribe tu nombre completo.");
    if (!form.email.includes("@")) return setErrorMessage("Escribe un correo electronico valido.");
    if (form.motivation.trim().length < 20) return setErrorMessage("Cuentanos un poco mas sobre tu motivacion para adoptar.");
    if (!form.privacyAcknowledged) return setErrorMessage("Acepta el aviso de privacidad para continuar.");

    setIsSubmitting(true);
    try {
      const result = await getBrowserFosterApiClient().createPublicAdoptionRequest({
        listingSlug: slug,
        requesterName: form.name,
        requesterEmail: form.email,
        requesterPhone: form.phone || null,
        requesterCity: form.city || null,
        motivation: form.motivation,
        experience: form.experience || null,
        housingType: form.housingType || null,
        hasOtherPets: optionalBoolean(form.hasOtherPets),
        hasChildren: optionalBoolean(form.hasChildren),
        privacyAcknowledged: form.privacyAcknowledged,
        sourceUrl: typeof window === "undefined" ? null : window.location.href,
        companyWebsite: form.companyWebsite || null
      });
      setSuccessMessage(result.message);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible enviar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="request-page"><section className="notice">Cargando ficha de adopcion...</section><style jsx>{styles}</style></main>;
  }

  if (!profile) {
    return (
      <main className="request-page">
        <section className="notice"><h1>Solicitud no disponible</h1><p>La mascota no recibe solicitudes en este momento.</p><a href={`/adopciones/${slug}`}>Volver a la ficha</a></section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="request-page">
      <section className="request-shell">
        <header>
          <span>Adopcion responsable</span>
          <h1>Conoce mejor a {profile.petName}</h1>
          <p>Comparte tus datos para que {profile.protectiveHousehold.displayName} pueda revisar tu interes inicial.</p>
          <a href={`/adopciones/${slug}`}>Volver a la ficha de {profile.petName}</a>
        </header>

        {successMessage ? (
          <section className="success" role="status">
            <h2>Solicitud enviada</h2>
            <p>{successMessage}</p>
            <p>Esta solicitud inicial no garantiza la adopcion ni transfiere la custodia. Si avanza, continuaras el proceso formal desde Pet Ecosystem.</p>
            <a href={`/protectoras/${profile.protectiveHousehold.publicSlug}`}>Ver Familia Protectora</a>
          </section>
        ) : (
          <form onSubmit={handleSubmit}>
            {errorMessage ? <div className="error" role="alert">{errorMessage}</div> : null}
            <div className="two-columns">
              <label>Nombre completo<input autoComplete="name" maxLength={120} onChange={(event) => update("name", event.target.value)} required value={form.name} /></label>
              <label>Correo electronico<input autoComplete="email" maxLength={254} onChange={(event) => update("email", event.target.value)} required type="email" value={form.email} /></label>
              <label>Telefono opcional<input autoComplete="tel" maxLength={40} onChange={(event) => update("phone", event.target.value)} value={form.phone} /></label>
              <label>Ciudad opcional<input autoComplete="address-level2" maxLength={120} onChange={(event) => update("city", event.target.value)} value={form.city} /></label>
              <label>Tipo de vivienda<select onChange={(event) => update("housingType", event.target.value)} value={form.housingType}><option value="">Prefiero conversarlo</option><option value="Casa">Casa</option><option value="Apartamento">Apartamento</option><option value="Otro">Otro</option></select></label>
              <label>Tienes otras mascotas?<select onChange={(event) => update("hasOtherPets", event.target.value as FormState["hasOtherPets"])} value={form.hasOtherPets}><option value="">Prefiero conversarlo</option><option value="yes">Si</option><option value="no">No</option></select></label>
              <label>Hay ninos en el hogar?<select onChange={(event) => update("hasChildren", event.target.value as FormState["hasChildren"])} value={form.hasChildren}><option value="">Prefiero conversarlo</option><option value="yes">Si</option><option value="no">No</option></select></label>
            </div>
            <label>Por que deseas adoptar a {profile.petName}?<textarea maxLength={1500} minLength={20} onChange={(event) => update("motivation", event.target.value)} required rows={5} value={form.motivation} /></label>
            <label>Experiencia con mascotas, opcional<textarea maxLength={1500} onChange={(event) => update("experience", event.target.value)} rows={3} value={form.experience} /></label>
            <label className="honeypot" aria-hidden="true">Sitio de empresa<input autoComplete="off" onChange={(event) => update("companyWebsite", event.target.value)} tabIndex={-1} value={form.companyWebsite} /></label>
            <label className="consent"><input checked={form.privacyAcknowledged} onChange={(event) => update("privacyAcknowledged", event.target.checked)} type="checkbox" /><span>Acepto que mis datos sean compartidos con la Familia Protectora para revisar este interes inicial. Entiendo que no garantiza la adopcion.</span></label>
            <button disabled={isSubmitting} type="submit">{isSubmitting ? "Enviando..." : "Enviar solicitud"}</button>
          </form>
        )}
      </section>
      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .request-page { background: linear-gradient(180deg, #fbfaf7, #eaf7f4); min-height: 100vh; padding: 28px 16px; }
  .request-shell, .notice { background: #fff; border: 1px solid rgba(15,118,110,.2); border-radius: 28px; box-shadow: 0 20px 55px rgba(15,23,42,.1); margin: auto; max-width: 860px; padding: 28px; }
  header { border-bottom: 1px solid rgba(15,118,110,.16); margin-bottom: 24px; padding-bottom: 20px; }
  header span { color: #0f766e; font-size: 12px; font-weight: 900; text-transform: uppercase; }
  h1, h2 { color: #0f172a; margin: 8px 0; }
  header p, .success p, .notice p { color: #64748b; line-height: 1.6; }
  a { color: #0f766e; font-weight: 800; }
  form { display: grid; gap: 18px; }
  .two-columns { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  label { color: #0f172a; display: grid; font-size: 14px; font-weight: 800; gap: 7px; }
  input, select, textarea { background: #fff; border: 1px solid rgba(15,118,110,.24); border-radius: 12px; color: #0f172a; font: inherit; padding: 12px; }
  textarea { resize: vertical; }
  .consent { align-items: flex-start; background: #e7f7f4; border-radius: 14px; display: flex; font-weight: 600; line-height: 1.45; padding: 14px; }
  .consent input { margin-top: 3px; }
  button { background: #0f8f86; border: 0; border-radius: 999px; color: #fff; cursor: pointer; font-size: 15px; font-weight: 900; min-height: 48px; padding: 0 22px; }
  button:disabled { cursor: wait; opacity: .65; }
  .error { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; color: #9f1239; padding: 12px; }
  .success { background: #e7f7f4; border: 1px solid rgba(15,118,110,.2); border-radius: 20px; padding: 22px; }
  .honeypot { height: 0; left: -10000px; overflow: hidden; position: absolute; width: 0; }
  @media (max-width: 640px) { .request-page { padding: 12px; } .request-shell, .notice { border-radius: 20px; padding: 18px; } .two-columns { grid-template-columns: 1fr; } }
`;
