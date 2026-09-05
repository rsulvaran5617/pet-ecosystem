"use client";

import { useEffect, useState } from "react";

import { getBrowserPetAlertApiClient, getBrowserSupabaseClient } from "../../core/services/supabase-browser";
import { ConfirmedBrowserLocation, type ConfirmedBrowserLocationValue } from "./ConfirmedBrowserLocation";

export function PublicCommunitySightingForm() {
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [species, setSpecies] = useState("Perro");
  const [city, setCity] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<ConfirmedBrowserLocationValue | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void getBrowserSupabaseClient().auth.getSession().then(({ data }) => { setAuthenticated(Boolean(data.session)); setSessionReady(true); }); }, []);

  async function submit() {
    if (!city.trim() || description.trim().length < 10) { setMessage("Indica ciudad y una descripcion de al menos 10 caracteres."); return; }
    setSaving(true); setMessage(null);
    try {
      const report = await getBrowserPetAlertApiClient().createPetAlertCommunitySighting({ animalSpecies: species, city, country: "PA", locationReference: reference, observedSituation: description, sightedAt: new Date().toISOString() });
      if (location) {
        await getBrowserPetAlertApiClient().setPetAlertCommunitySightingLocation(report.id, {
          ...location,
          publicLocationVisible: true
        }).catch(() => undefined);
      }
      window.location.assign(`/pet-alert/mascota-vista/${report.reportSlug}`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "No fue posible publicar el reporte."); setSaving(false); }
  }

  return <main className="page"><section className="form"><a href="/pet-alert">Volver a PET ALERT</a><span>PET ALERT COMUNITARIO</span><h1>Vi una mascota aparentemente perdida</h1><p>No te pongas en riesgo. Indica solo una zona aproximada y evita domicilios privados.</p>{sessionReady && !authenticated ? <div className="notice">Para evitar abuso, inicia sesion antes de publicar.<a href="/app">Iniciar sesion</a></div> : null}{authenticated ? <><label>Especie<input onChange={(event) => setSpecies(event.target.value)} value={species}/></label><label>Ciudad<input onChange={(event) => setCity(event.target.value)} value={city}/></label><label>Referencia aproximada<input onChange={(event) => setReference(event.target.value)} value={reference}/></label><ConfirmedBrowserLocation onChange={setLocation}/><label>Que observaste<textarea onChange={(event) => setDescription(event.target.value)} rows={5} value={description}/></label>{message ? <div className="error">{message}</div> : null}<button disabled={saving} onClick={() => void submit()} type="button">{saving ? "Publicando..." : "Publicar reporte"}</button></> : null}</section><style jsx>{styles}</style></main>;
}

const styles = `.page{background:#fff7ed;min-height:100vh;padding:28px 14px}.form{background:#fff;border:1px solid #fed7aa;border-radius:26px;display:grid;gap:14px;margin:auto;max-width:680px;padding:28px}.form>a,.form>span{color:#9a3412;font-size:12px;font-weight:900}.form h1{color:#0f172a;font-size:38px;letter-spacing:0;line-height:1.05;margin:0}.form p{color:#64748b;line-height:1.5;margin:0}.form label{color:#475569;display:grid;font-size:12px;font-weight:900;gap:6px}.form input,.form textarea{border:1px solid #fed7aa;border-radius:14px;font:inherit;padding:12px}.form button,.notice a{background:#c2410c;border:0;border-radius:999px;color:#fff;font-weight:900;padding:13px;text-align:center;text-decoration:none}.notice,.error{background:#ffedd5;border-radius:14px;color:#9a3412;display:grid;gap:10px;padding:14px}.error{background:#fee2e2;color:#991b1b}@media(max-width:600px){.page{padding:10px}.form{padding:18px}.form h1{font-size:30px}}`;
