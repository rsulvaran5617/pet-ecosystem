"use client";

import type { PublicPetAlertCommunitySighting } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserPetAlertApiClient } from "../../core/services/supabase-browser";
import { PublicCommunityClaimPanel } from "./PublicCommunityClaimPanel";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Panama" }).format(new Date(value));
}

export function PublicCommunitySightingsPage({ slug }: { slug?: string }) {
  const [reports, setReports] = useState<PublicPetAlertCommunitySighting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const request = slug
      ? getBrowserPetAlertApiClient().getPetAlertCommunitySightingBySlug(slug).then((report) => report ? [report] : [])
      : getBrowserPetAlertApiClient().listPublicPetAlertCommunitySightings({ country: "PA" });
    request.then(setReports).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No fue posible cargar PET ALERT.")).finally(() => setLoading(false));
  }, [slug]);

  const report = slug ? reports[0] : null;
  if (loading) return <main className="page"><section className="empty">Cargando reportes comunitarios...</section><style jsx>{styles}</style></main>;
  if (error || (slug && !report)) return <main className="page"><section className="empty"><h1>Reporte no disponible</h1><p>{error ?? "Este reporte vencio o dejo de ser publico."}</p></section><style jsx>{styles}</style></main>;

  return (
    <main className="page">
      <header className="hero">
        <span>PET ALERT COMUNITARIO</span>
        <h1>{report ? `${report.animalSpecies} visto en ${report.city}` : "Mascotas aparentemente perdidas"}</h1>
        <p>{report ? "Este reporte comunitario no determina abandono ni propiedad." : "Reportes aproximados para ayudar a reunir mascotas con sus familias."}</p>
        <div className="actions"><a href="/pet-alert/reportar-mascota-vista">Vi una mascota perdida</a>{slug ? <a className="secondary" href="/pet-alert">Ver reportes</a> : null}</div>
      </header>
      {report ? (
        <section className="detail">
          {report.photoUrls.length ? <div className="gallery">{report.photoUrls.map((url, index) => <img alt={`Mascota reportada, foto ${index + 1}`} key={url} src={url} />)}</div> : null}
          <article><small>VISTA EN</small><h2>{report.city}{report.region ? `, ${report.region}` : ""}</h2><p>{formatDate(report.sightedAt)}</p>{report.locationReference ? <strong>Referencia aproximada: {report.locationReference}</strong> : null}</article>
          <article><small>DESCRIPCION</small><h2>{report.animalSpecies}{report.apparentBreed ? ` - ${report.apparentBreed}` : ""}</h2><p>{report.observedSituation}</p></article>
          {report.distinctiveMarks || report.collarDescription ? <article><small>COMO RECONOCERLA</small><p>{report.distinctiveMarks ?? report.collarDescription}</p></article> : null}
          <aside><strong>Ayuda de forma segura</strong><p>No persigas a la mascota ni publiques domicilios. Una solicitud no demuestra propiedad ni transfiere custodia.</p></aside>
          <PublicCommunityClaimPanel reportSlug={report.reportSlug} />
        </section>
      ) : (
        <section className="grid">
          {reports.length ? reports.map((item) => <a className="card" href={`/pet-alert/mascota-vista/${item.reportSlug}`} key={item.reportSlug}>{item.photoUrls[0] ? <img alt={`Mascota vista en ${item.city}`} src={item.photoUrls[0]} /> : null}<small>{formatDate(item.sightedAt)}</small><h2>{item.animalSpecies}{item.apparentBreed ? ` - ${item.apparentBreed}` : ""}</h2><strong>{item.city}{item.region ? `, ${item.region}` : ""}</strong><p>{item.observedSituation}</p><span>Ver reporte</span></a>) : <div className="empty">Aun no hay reportes comunitarios activos.</div>}
        </section>
      )}
      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page{background:#fff7ed;min-height:100vh;padding:28px 18px 60px}.hero,.grid,.detail,.empty{margin:auto;max-width:1080px}.hero{background:#9a3412;border-radius:28px;color:#fff;display:grid;gap:12px;padding:34px}.hero span,.card small,.detail small{font-size:11px;font-weight:900}.hero h1{font-size:clamp(32px,5vw,54px);letter-spacing:0;line-height:1.04;margin:0}.hero p{color:#ffedd5;font-size:17px;margin:0}.actions{display:flex;flex-wrap:wrap;gap:9px}.actions a{background:#fff;border-radius:999px;color:#9a3412;font-weight:900;padding:12px 16px;text-decoration:none}.actions .secondary{background:#ea580c;color:#fff}.grid{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr));padding-top:22px}.card,.detail article,.detail aside,.empty{background:#fff;border:1px solid #fed7aa;border-radius:20px;color:#0f172a;padding:20px;text-decoration:none}.card{display:grid;gap:8px}.card>img{aspect-ratio:4/3;border-radius:14px;object-fit:cover;width:100%}.card h2,.detail h2{font-size:20px;margin:0}.card p,.detail p{color:#64748b;line-height:1.5;margin:0}.card span{color:#c2410c;font-weight:900}.detail{display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr));padding-top:22px}.detail aside{background:#ffedd5}.gallery{display:grid;gap:10px;grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr))}.gallery img{aspect-ratio:4/3;border-radius:18px;object-fit:cover;width:100%}.empty{margin-top:30px;text-align:center}@media(max-width:720px){.page{padding:12px 10px 40px}.hero{padding:22px}.grid,.detail{grid-template-columns:1fr}.gallery{grid-template-columns:1fr}}
`;
