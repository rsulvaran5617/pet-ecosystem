"use client";

import type { PetAlertCommunityClaim } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserPetAlertApiClient, getBrowserSupabaseClient } from "../../core/services/supabase-browser";

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
      if (isAuthenticated) {
        void getBrowserPetAlertApiClient().listMyPetAlertCommunityClaims().then(setClaims).catch(() => undefined);
      }
    });
  }, []);

  const currentClaim = claims.find((claim) => claim.reportSlug === reportSlug && claim.status !== "cancelled");

  async function submit() {
    if (details.trim().length < 20 || !consent) {
      setMessage("Describe una senal privada y confirma el contacto controlado.");
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
    return <section className="claim"><h2>¿Crees que es tu mascota?</h2><p>Inicia sesion para enviar informacion privada al reportante.</p><a href="/app">Iniciar sesion</a><style jsx>{styles}</style></section>;
  }

  if (currentClaim) {
    return (
      <section className="claim">
        <h2>Solicitud de contacto</h2>
        <strong>{currentClaim.status === "pending" ? "En revision" : currentClaim.status === "approved" ? "Contacto autorizado" : "No aprobada"}</strong>
        {currentClaim.status === "approved" ? <p>Contacto del reportante: {currentClaim.authorizedReporterEmail ?? currentClaim.authorizedReporterPhone ?? "Disponible dentro de PET ALERT"}</p> : <p>Tu informacion permanece privada mientras se revisa la solicitud.</p>}
        {currentClaim.decisionReason ? <p>{currentClaim.decisionReason}</p> : null}
        <style jsx>{styles}</style>
      </section>
    );
  }

  return (
    <section className="claim">
      <h2>¿Crees que es tu mascota?</h2>
      <p>Comparte una senal que no aparezca en la ficha. No publiques documentos ni domicilios.</p>
      <label>Ciudad donde se perdio, opcional<input maxLength={120} onChange={(event) => setLostCity(event.target.value)} value={lostCity} /></label>
      <label>Senales privadas<textarea maxLength={1500} onChange={(event) => setDetails(event.target.value)} rows={4} value={details} /></label>
      <label className="consent"><input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" /><span>Autorizo compartir mis datos de contacto con quien publico el reporte si aprueba esta solicitud.</span></label>
      {message ? <p className="message">{message}</p> : null}
      <button disabled={saving} onClick={() => void submit()} type="button">{saving ? "Enviando..." : "Enviar solicitud segura"}</button>
      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
  .claim{background:#fff;border:1px solid #fed7aa;border-radius:20px;color:#0f172a;display:grid;gap:12px;grid-column:1/-1;padding:20px}.claim h2,.claim p{margin:0}.claim p{color:#64748b;line-height:1.5}.claim label{display:grid;font-size:13px;font-weight:800;gap:6px}.claim input,.claim textarea{border:1px solid #fdba74;border-radius:12px;font:inherit;padding:11px}.claim .consent{align-items:flex-start;display:flex;font-weight:500;line-height:1.4}.claim .consent input{margin-top:3px}.claim button,.claim a{background:#c2410c;border:0;border-radius:999px;color:#fff;font-weight:900;padding:12px 16px;text-align:center;text-decoration:none}.claim button:disabled{opacity:.6}.message{background:#fff7ed;border-radius:12px;padding:10px}
`;
