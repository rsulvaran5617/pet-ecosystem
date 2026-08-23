"use client";

import type { PublicPetAlertCommunitySighting } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserPetAlertApiClient } from "../../core/services/supabase-browser";
import { PublicCommunityClaimPanel } from "./PublicCommunityClaimPanel";
import styles from "./PublicCommunitySightingsPage.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Panama"
  }).format(new Date(value));
}

function statusLabel(status: PublicPetAlertCommunitySighting["status"]) {
  if (status === "reunited") return "Reunida con su familia";
  if (status === "closed") return "Reporte cerrado";
  if (status === "owner_verified") return "Familia verificada";
  if (status === "possible_owner_claim") return "Posible familia encontrada";
  if (status === "sheltered_by_reporter") return "Bajo resguardo temporal";
  return "Reporte activo";
}

export function PublicCommunitySightingsPage({ slug }: { slug?: string }) {
  const [reports, setReports] = useState<PublicPetAlertCommunitySighting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    const request = slug
      ? getBrowserPetAlertApiClient().getPetAlertCommunitySightingBySlug(slug).then((report) => report ? [report] : [])
      : getBrowserPetAlertApiClient().listPublicPetAlertCommunitySightings({ country: "PA" });
    request
      .then(setReports)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No fue posible cargar PET ALERT."))
      .finally(() => setLoading(false));
  }, [slug]);

  const report = slug ? reports[0] : null;
  if (loading) return <main className={styles.page}><section className={styles.state}>Cargando boletín comunitario...</section></main>;
  if (error || (slug && !report)) return <main className={styles.page}><section className={styles.state}><h1>Reporte no disponible</h1><p>{error ?? "Este reporte venció o dejó de ser público."}</p><a href="/pet-alert">Volver a PET ALERT</a></section></main>;
  if (!report) return <main className={styles.page}><section className={styles.state}><a href="/pet-alert">Abrir centro comunitario PET ALERT</a></section></main>;

  const location = `${report.city}${report.region ? `, ${report.region}` : ""}`;

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Navegación PET ALERT"><a href="/pet-alert">PET ALERT</a><span>/</span><span>Mascota vista</span></nav>
      <section className={styles.hero}>
        <div className={styles.mediaColumn}>
          <div className={styles.mainPhoto}>
            {report.photoUrls[activePhoto] ? <img alt={`${report.animalSpecies} visto en ${report.city}`} src={report.photoUrls[activePhoto]} /> : <div className={styles.noPhoto}>Este reporte no tiene fotografía.</div>}
          </div>
          {report.photoUrls.length > 1 ? <div className={styles.thumbnails} aria-label="Fotografías del reporte">{report.photoUrls.map((url, index) => <button aria-label={`Ver fotografía ${index + 1}`} aria-pressed={activePhoto === index} className={activePhoto === index ? styles.thumbnailActive : styles.thumbnail} key={url} onClick={() => setActivePhoto(index)} type="button"><img alt="" src={url} /></button>)}</div> : null}
        </div>
        <div className={styles.heroContent}>
          <div className={styles.kicker}><span>PET ALERT COMUNITARIO</span><strong>{statusLabel(report.status)}</strong></div>
          <h1>{report.animalSpecies}{report.apparentBreed ? ` · ${report.apparentBreed}` : ""}</h1>
          <p className={styles.lead}>{report.observedSituation}</p>
          <div className={styles.locationCard}>
            <small>VISTA EN</small><strong>{location}, {report.country}</strong><span>{formatDate(report.sightedAt)}</span>
            {report.locationReference ? <p>Referencia aproximada: {report.locationReference}</p> : null}
          </div>
          <div className={styles.actions}><a href="/pet-alert">Volver a boletines</a><a className={styles.reportAction} href="/pet-alert/reportar-mascota-vista">Vi una mascota perdida</a></div>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.details}>
          <header><span>DATOS PÚBLICOS</span><h2>Cómo reconocerla</h2></header>
          <div className={styles.detailGrid}>
            <article><small>ESPECIE Y RAZA APARENTE</small><strong>{report.animalSpecies}{report.apparentBreed ? ` · ${report.apparentBreed}` : ""}</strong></article>
            <article><small>COLOR PRINCIPAL</small><strong>{report.primaryColor ?? "No indicado"}</strong></article>
            <article><small>COLLAR O ACCESORIO</small><strong>{report.collarDescription ?? "No indicado"}</strong></article>
            <article><small>SEÑAS DISTINTIVAS</small><strong>{report.distinctiveMarks ?? "No indicadas"}</strong></article>
          </div>
          {report.behaviorNotes ? <article className={styles.behavior}><small>COMPORTAMIENTO OBSERVADO</small><p>{report.behaviorNotes}</p></article> : null}
        </div>
        <aside className={styles.safety}><span>AYUDA SEGURA</span><h2>Ayuda sin exponerte</h2><ul><li>No persigas ni acorrales a la mascota.</li><li>No publiques domicilios ni información personal.</li><li>Este reporte no demuestra propiedad ni transfiere custodia.</li></ul></aside>
      </section>
      <section className={styles.claimWrap}><PublicCommunityClaimPanel reportSlug={report.reportSlug} /></section>
    </main>
  );
}
