"use client";

import type { PublicPetAlertLostPet } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserPetAlertApiClient } from "../../core/services/supabase-browser";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Panama"
  }).format(new Date(value));
}

function statusLabel(status: PublicPetAlertLostPet["status"]) {
  if (status === "found") return "Mascota encontrada";
  if (status === "closed") return "Alerta cerrada";
  if (status === "expired") return "Alerta vencida";
  if (status === "flagged") return "Alerta en revision";
  return "Busqueda activa";
}

export function PublicLostPetAlertPage({ slug }: { slug: string }) {
  const [alert, setAlert] = useState<PublicPetAlertLostPet | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareLabel, setShareLabel] = useState("Compartir alerta");

  useEffect(() => {
    let mounted = true;
    getBrowserPetAlertApiClient()
      .getPetAlertLostPetBySlug(slug)
      .then((result) => {
        if (mounted) setAlert(result);
      })
      .catch((error: unknown) => {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir PET ALERT.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  async function share() {
    if (!alert) return;
    const data = {
      text: `${alert.petName} esta extraviada. Ultima vez vista en ${alert.lastSeenCity}.`,
      title: `PET ALERT: ${alert.petName}`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareLabel("Enlace copiado");
        window.setTimeout(() => setShareLabel("Compartir alerta"), 1800);
      }
    } catch {
      setShareLabel("Compartir alerta");
    }
  }

  if (isLoading) {
    return <main className="page"><section className="empty">Preparando PET ALERT...</section><style jsx>{styles}</style></main>;
  }

  if (!alert || errorMessage) {
    return (
      <main className="page">
        <section className="empty"><h1>Alerta no disponible</h1><p>{errorMessage ?? "Esta alerta no existe, vencio o dejo de ser publica."}</p></section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const isOperational = ["active", "sighting_received", "possible_match"].includes(alert.status);

  return (
    <main className="page">
      <section className="hero">
        <div className="photo">
          {alert.photoUrl ? <img alt={`Foto de ${alert.petName}`} src={alert.photoUrl} /> : <span>{alert.petName.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="hero-copy">
          <div className="kicker"><strong>PET ALERT</strong><span>{statusLabel(alert.status)}</span></div>
          <h1>Ayudanos a encontrar a {alert.petName}</h1>
          <p>{alert.publicDescription}</p>
          <div className="tags"><span>{alert.petSpecies}</span>{alert.petBreed ? <span>{alert.petBreed}</span> : null}<span>{alert.lastSeenCity}, {alert.lastSeenCountry}</span></div>
          <div className="actions">
            {isOperational ? <a href={`/pet-alert/mascota-perdida/${slug}/avistamiento`}>Tengo informacion</a> : null}
            <button onClick={() => void share()} type="button">{shareLabel}</button>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="main-column">
          <article className="card important">
            <span>Ultimo avistamiento</span>
            <h2>{alert.lastSeenCity}{alert.lastSeenRegion ? `, ${alert.lastSeenRegion}` : ""}</h2>
            <p>{formatDate(alert.lastSeenAt)}</p>
            {alert.lastSeenReference ? <strong>Referencia aproximada: {alert.lastSeenReference}</strong> : null}
          </article>
          <div className="detail-grid">
            <article className="card"><h2>Como reconocerla</h2><p>{alert.distinctiveMarks ?? "Revisa cuidadosamente la fotografia y descripcion principal."}</p></article>
            <article className="card"><h2>Comportamiento</h2><p>{alert.behaviorNotes ?? "No hay indicaciones publicas adicionales."}</p></article>
            {alert.medicalPublicNotes ? <article className="card"><h2>Informacion de cuidado</h2><p>{alert.medicalPublicNotes}</p></article> : null}
          </div>
        </div>
        <aside className="safety">
          <h2>Ayuda de forma segura</h2>
          <ul>
            <li>No te pongas en riesgo ni persigas a la mascota.</li>
            <li>Registra una zona aproximada, no domicilios privados.</li>
            <li>Pet Ecosystem no determina propiedad ni entrega custodia.</li>
          </ul>
          {isOperational ? <a href={`/pet-alert/mascota-perdida/${slug}/avistamiento`}>Reportar un avistamiento</a> : <p>Esta alerta ya no recibe informacion.</p>}
        </aside>
      </section>
      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page { background: linear-gradient(180deg,#fff7ed,#f8fafc); min-height:100vh; padding:28px 18px 56px; }
  .hero,.content,.empty { margin:auto; max-width:1120px; }
  .hero { align-items:center; background:#fff; border:1px solid #fed7aa; border-radius:28px; box-shadow:0 20px 55px rgba(15,23,42,.1); display:grid; gap:28px; grid-template-columns:minmax(260px,430px) 1fr; overflow:hidden; padding:20px; }
  .photo { align-items:center; aspect-ratio:4/3; background:#ffedd5; border-radius:20px; display:flex; justify-content:center; overflow:hidden; }
  .photo img { height:100%; object-fit:contain; width:100%; }
  .photo span { color:#c2410c; font-size:84px; font-weight:900; }
  .hero-copy { display:grid; gap:14px; }
  .kicker,.tags,.actions { display:flex; flex-wrap:wrap; gap:9px; }
  .kicker strong,.kicker span,.tags span { border-radius:999px; font-size:12px; font-weight:900; padding:7px 11px; }
  .kicker strong { background:#c2410c; color:#fff; }.kicker span,.tags span { background:#fff7ed; color:#9a3412; }
  h1 { color:#0f172a; font-size:clamp(30px,5vw,52px); letter-spacing:0; line-height:1.02; margin:0; }
  .hero-copy>p { color:#475569; font-size:17px; line-height:1.6; margin:0; }
  .actions a,.actions button,.safety a { align-items:center; border-radius:999px; display:inline-flex; font-family:inherit; font-size:14px; font-weight:900; justify-content:center; min-height:46px; padding:0 18px; text-decoration:none; }
  .actions a,.safety a { background:#c2410c; color:#fff; }.actions button { background:#fff; border:1px solid #fdba74; color:#9a3412; cursor:pointer; }
  .content { display:grid; gap:20px; grid-template-columns:minmax(0,1fr) 320px; padding-top:22px; }
  .main-column,.detail-grid { display:grid; gap:16px; }.detail-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .card,.safety,.empty { background:#fff; border:1px solid rgba(194,65,12,.16); border-radius:22px; padding:22px; }
  .card h2,.safety h2,.empty h1 { color:#0f172a; font-size:19px; margin:0 0 9px; }.card p,.safety li,.safety p,.empty p { color:#64748b; line-height:1.55; }
  .important span { color:#c2410c; font-size:11px; font-weight:900; text-transform:uppercase; }.important strong { color:#9a3412; display:block; }
  .safety { align-self:start; background:#fff7ed; position:sticky; top:20px; }.safety ul { display:grid; gap:10px; padding-left:20px; }.safety a { margin-top:8px; }
  .empty { margin-top:40px; text-align:center; }
  @media(max-width:760px){.page{padding:12px 10px 36px}.hero{grid-template-columns:1fr;padding:12px}.content{grid-template-columns:1fr}.detail-grid{grid-template-columns:1fr}.safety{position:static}h1{font-size:32px}}
`;
