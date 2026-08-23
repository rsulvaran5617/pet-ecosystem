"use client";

import type { PetAlertCommunityClaim } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserPetAlertApiClient, getBrowserSupabaseClient } from "../../core/services/supabase-browser";
import styles from "./PublicCommunityClaimPanel.module.css";

export function PublicCommunityClaimPanel({ reportSlug }: { reportSlug: string }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [claims, setClaims] = useState<PetAlertCommunityClaim[]>([]);
  const [details, setDetails] = useState("");
  const [lostCity, setLostCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getBrowserSupabaseClient().auth.getSession().then(({ data }) => {
      const isAuthenticated = Boolean(data.session);
      setAuthenticated(isAuthenticated);
      if (isAuthenticated) void getBrowserPetAlertApiClient().listMyPetAlertCommunityClaims().then(setClaims).catch(() => undefined);
    });
  }, []);

  const currentClaim = claims.find((claim) => claim.reportSlug === reportSlug && claim.status !== "cancelled");

  async function submit() {
    if (details.trim().length < 20 || !consent) {
      setMessage("Describe una señal privada y confirma el contacto controlado.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const claim = await getBrowserPetAlertApiClient().createPetAlertCommunityClaim({
        contactConsent: consent,
        lostCity: lostCity || null,
        privateDetails: details,
        reportSlug
      });
      setClaims((current) => [claim, ...current]);
      setMessage("Solicitud enviada. El contacto permanece privado hasta que el reportante la apruebe.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible enviar la solicitud.");
    } finally {
      setSaving(false);
    }
  }

  if (!authenticated) {
    return <section className={styles.claim}><span className={styles.eyebrow}>CONTACTO CONTROLADO</span><h2>¿Crees que es tu mascota?</h2><p>Inicia sesión para compartir una señal privada con quien publicó el reporte.</p><a href="/app">Iniciar sesión</a></section>;
  }

  if (currentClaim) {
    return (
      <section className={styles.claim}>
        <span className={styles.eyebrow}>CONTACTO CONTROLADO</span>
        <h2>Solicitud de contacto</h2>
        <strong>{currentClaim.status === "pending" ? "En revisión" : currentClaim.status === "approved" ? "Contacto autorizado" : "No aprobada"}</strong>
        {currentClaim.status === "approved" ? <p>Contacto del reportante: {currentClaim.authorizedReporterEmail ?? currentClaim.authorizedReporterPhone ?? "Disponible dentro de PET ALERT"}</p> : <p>Tu información permanece privada mientras se revisa la solicitud.</p>}
        {currentClaim.decisionReason ? <p>{currentClaim.decisionReason}</p> : null}
      </section>
    );
  }

  return (
    <section className={styles.claim}>
      <span className={styles.eyebrow}>CONTACTO CONTROLADO</span>
      <h2>¿Crees que es tu mascota?</h2>
      <p>Comparte una señal que no aparezca en la ficha. No publiques documentos ni domicilios.</p>
      <div className={styles.fields}>
        <label>Ciudad donde se perdió, opcional<input maxLength={120} onChange={(event) => setLostCity(event.target.value)} value={lostCity} /></label>
        <label>Señales privadas<textarea maxLength={1500} onChange={(event) => setDetails(event.target.value)} rows={4} value={details} /></label>
      </div>
      <label className={styles.consent}><input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" /><span>Autorizo compartir mis datos de contacto con quien publicó el reporte si aprueba esta solicitud.</span></label>
      {message ? <p className={styles.message}>{message}</p> : null}
      <button disabled={saving} onClick={() => void submit()} type="button">{saving ? "Enviando..." : "Enviar solicitud segura"}</button>
    </section>
  );
}
