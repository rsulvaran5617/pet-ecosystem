"use client";

import type { PublicPetAdoptionProfile } from "@pet/types";
import { useEffect, useMemo, useState } from "react";

import { getBrowserFosterApiClient } from "../../core/services/supabase-browser";

const colors = {
  accent: "#0f8f86",
  accentDark: "#0f766e",
  amber: "#b45309",
  ink: "#0f172a",
  line: "rgba(15, 118, 110, 0.18)",
  muted: "#64748b",
  softAmber: "#fff7ed",
  softTeal: "#e7f7f4",
  surface: "#ffffff",
  warm: "#fbfaf7"
};

function formatAge(birthDate: string | null) {
  if (!birthDate) return "Edad por confirmar";
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Edad por confirmar";

  const today = new Date();
  let years = today.getFullYear() - parsed.getFullYear();
  const birthdayPassed =
    today.getMonth() > parsed.getMonth() ||
    (today.getMonth() === parsed.getMonth() && today.getDate() >= parsed.getDate());
  if (!birthdayPassed) years -= 1;

  return years <= 0 ? "Menos de 1 ano" : `${years} ano${years === 1 ? "" : "s"}`;
}

function formatSpecies(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join(" ");
}

function formatSterilized(value: boolean | null) {
  if (value === true) return "Esterilizada";
  if (value === false) return "No esterilizada";
  return "Esterilizacion por confirmar";
}

function formatLocation(profile: PublicPetAdoptionProfile) {
  return [profile.city, profile.stateRegion, profile.countryCode].filter(Boolean).join(", ");
}

function getCover(profile: PublicPetAdoptionProfile) {
  return profile.media.find((media) => media.isCover && media.signedUrl) ?? profile.media.find((media) => media.signedUrl);
}

function getDonationMethods(profile: PublicPetAdoptionProfile) {
  const household = profile.protectiveHousehold;
  return [
    { label: "ACH / transferencia", value: household.donationAchDetails },
    { label: "Yappy", value: household.donationYappyDetails },
    { label: "PayPal", value: household.donationPaypalDetails },
    { label: "Sitio externo", value: household.donationExternalUrl },
    { label: "Otro metodo", value: household.donationOtherDetails }
  ].filter((method): method is { label: string; value: string } => Boolean(method.value?.trim()));
}

function shouldShowDonationBlock(profile: PublicPetAdoptionProfile) {
  return Boolean(
    profile.protectiveHousehold.donationsEnabled &&
      (profile.protectiveHousehold.donationDescription?.trim() || getDonationMethods(profile).length)
  );
}

function EmptyState({ copy, title }: { copy: string; title: string }) {
  return (
    <section className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
      <style jsx>{styles}</style>
    </section>
  );
}

function SectionHeading({ copy, eyebrow, title }: { copy: string; eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{copy}</span>
    </div>
  );
}

function DetailCard({ copy, title }: { copy: string; title: string }) {
  return (
    <section className="detail-card">
      <h3>{title}</h3>
      <p>{copy}</p>
    </section>
  );
}

export function PublicPetAdoptionPage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<PublicPetAdoptionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState("Compartir");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await getBrowserFosterApiClient().getPublicPetAdoptionListingBySlug(slug);
        if (isMounted) {
          setProfile(result);
          if (result) {
            void getBrowserFosterApiClient().recordPublicAdoptionFunnelEvent({
              eventName: "pet_listing_viewed",
              listingSlug: slug
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir esta ficha de adopcion.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const cover = useMemo(() => (profile ? getCover(profile) : null), [profile]);
  const gallery = useMemo(() => profile?.media.filter((media) => media.signedUrl) ?? [], [profile]);
  const donationMethods = useMemo(() => (profile ? getDonationMethods(profile) : []), [profile]);
  const isAdopted = profile?.listingStatus === "adopted";
  const isAvailable = profile?.listingStatus === "published";

  async function handleShare() {
    const title = profile ? `${profile.petName} busca hogar responsable` : "Mascota en adopcion";
    const text = profile?.title ?? "Conoce esta ficha publica de adopcion en Pet Ecosystem.";
    const url = typeof window !== "undefined" ? window.location.href : "";

    try {
      void getBrowserFosterApiClient().recordPublicAdoptionFunnelEvent({
        eventName: "share_clicked",
        listingSlug: slug
      });
      const browserNavigator =
        typeof navigator !== "undefined"
          ? (navigator as Navigator & { clipboard?: Clipboard; share?: (data: ShareData) => Promise<void> })
          : null;

      if (browserNavigator?.share) {
        await browserNavigator.share({ title, text, url });
      } else if (browserNavigator?.clipboard && url) {
        await browserNavigator.clipboard.writeText(url);
        setShareLabel("Enlace copiado");
        window.setTimeout(() => setShareLabel("Compartir"), 1800);
      }
    } catch {
      setShareLabel("Compartir");
    }
  }

  if (isLoading) {
    return (
      <main className="public-adoption-page">
        <EmptyState copy="Estamos preparando la informacion publica de adopcion." title="Cargando ficha" />
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (errorMessage || !profile) {
    return (
      <main className="public-adoption-page">
        <EmptyState
          copy={errorMessage ?? "Esta publicacion no esta disponible publicamente o fue pausada por la Familia Protectora."}
          title="Ficha no disponible"
        />
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="public-adoption-page">
      <section className="hero">
        <div className="hero-media">
          {cover?.signedUrl ? <img alt={`Foto principal de ${profile.petName}`} src={cover.signedUrl} /> : <span>{profile.petName.slice(0, 1).toUpperCase()}</span>}
        </div>

        <div className="hero-copy">
          <div className="hero-kicker">
            <span>{isAdopted ? "Adopcion cerrada" : "Busca hogar"}</span>
            <span>{formatLocation(profile) || "Ubicacion general no publicada"}</span>
          </div>
          <h1>{profile.petName}</h1>
          <p>{profile.title}</p>
          <div className="tag-row">
            {[formatSpecies(profile.petSpecies), profile.petBreed, profile.petSex, formatAge(profile.petBirthDate), formatSterilized(profile.petIsSterilized)]
              .filter(Boolean)
              .map((label) => (
                <span key={label}>{label}</span>
              ))}
          </div>
          <div className="hero-actions">
            <a href={isAvailable ? `/adopciones/${slug}/solicitar` : "#estado"}>{isAvailable ? "Quiero adoptar" : "Ver estado"}</a>
            <button onClick={handleShare} type="button">
              {shareLabel}
            </button>
            <a href={`/protectoras/${profile.protectiveHousehold.publicSlug}`}>Ver protectora</a>
          </div>
        </div>
      </section>

      {gallery.length > 1 ? (
        <section aria-label={`Galeria publica de ${profile.petName}`} className="gallery">
          {gallery.map((media) => (
            <img alt={`Foto publica de ${profile.petName}`} key={media.id} src={media.signedUrl ?? ""} />
          ))}
        </section>
      ) : null}

      <section className="content-grid">
        <div className="main-column">
          <section className="card">
            <SectionHeading
              copy="Esta informacion fue preparada por la Familia Protectora para orientar el proceso de adopcion."
              eyebrow="Historia"
              title={`${profile.petName} busca una familia responsable`}
            />
            <p className="story-copy">{profile.publicStory ?? "La Familia Protectora esta preparando la historia publica de esta mascota."}</p>
          </section>

          <section className="details-grid">
            <DetailCard copy={profile.personalityNotes ?? "La Familia Protectora compartira mas detalles durante el proceso responsable."} title="Personalidad" />
            <DetailCard copy={profile.publicHealthSummary ?? "Resumen publico pendiente. No se muestran documentos ni historial clinico privado."} title="Salud publica" />
            <DetailCard copy={profile.adoptionRequirements ?? "La coordinacion final se revisa dentro de la app con la Familia Protectora."} title="Requisitos" />
            <DetailCard
              copy={`Ninos: ${profile.compatibilityChildren ?? "por confirmar"}. Perros: ${profile.compatibilityDogs ?? "por confirmar"}. Gatos: ${
                profile.compatibilityCats ?? "por confirmar"
              }.`}
              title="Compatibilidad"
            />
          </section>

          <section className="card process-card" id="adopcion-responsable">
            <SectionHeading
              copy="Pet Ecosystem conserva el cierre formal dentro de la app para proteger hogares, expedientes y trazabilidad."
              eyebrow="Adopcion responsable"
              title={isAvailable ? "Siguiente paso" : "Estado de la publicacion"}
            />
            {isAvailable ? (
              <div className="process-steps">
                <div>
                  <strong>1. Conoce la historia</strong>
                  <span>Revisa la ficha publica y comparte la mascota si puede interesar a otra familia.</span>
                </div>
                <div>
                  <strong>2. Envia tu interes inicial</strong>
                  <span>Comparte tus datos minimos para que la Familia Protectora pueda revisar tu solicitud.</span>
                </div>
                <div>
                  <strong>3. Continua en Pet Ecosystem</strong>
                  <span>La solicitud formal, evaluacion y transferencia responsable ocurren dentro de la app owner.</span>
                </div>
              </div>
            ) : (
              <p className="story-copy" id="estado">
                {isAdopted
                  ? "Esta mascota ya encontro hogar. La ficha puede conservarse como referencia publica del proceso."
                  : "Esta publicacion no recibe solicitudes en este momento."}
              </p>
            )}
          </section>
        </div>

        <aside className="side-column">
          <section className="card">
            <SectionHeading copy="Organizacion responsable de esta publicacion." eyebrow="Familia Protectora" title={profile.protectiveHousehold.displayName} />
            <p>
              {profile.protectiveHousehold.mission ??
                profile.protectiveHousehold.publicStory ??
                "Familia Protectora aprobada por Pet Ecosystem."}
            </p>
            {profile.protectiveHousehold.needsSummary ? <p className="needs-copy">{profile.protectiveHousehold.needsSummary}</p> : null}
            <a className="profile-link" href={`/protectoras/${profile.protectiveHousehold.publicSlug}`}>
              Ver landing publica
            </a>
          </section>

          <section className="card privacy-card">
            <SectionHeading copy="Esta ficha publica no expone informacion sensible." eyebrow="Privacidad" title="Datos protegidos" />
            <ul>
              <li>No muestra documentos privados.</li>
              <li>No muestra direccion exacta.</li>
              <li>No muestra gastos ni comprobantes.</li>
              <li>No muestra notas internas.</li>
            </ul>
          </section>

          {shouldShowDonationBlock(profile) ? (
            <section className="card support-card">
              <SectionHeading
                copy="Donar no es obligatorio y no garantiza aprobacion de adopcion."
                eyebrow="Apoyo opcional"
                title={profile.protectiveHousehold.donationTitle?.trim() || "Apoya a esta Familia Protectora"}
              />
              <p>{profile.protectiveHousehold.donationDescription}</p>
              <div className="donation-list">
                {donationMethods.map((method) => (
                  <div key={method.label}>
                    <strong>{method.label}</strong>
                    <span>{method.value}</span>
                  </div>
                ))}
              </div>
              <small>
                {profile.protectiveHousehold.donationDisclaimer ||
                  "La informacion fue declarada por la Familia Protectora. Pet Ecosystem no procesa ni valida donaciones."}
              </small>
            </section>
          ) : null}
        </aside>
      </section>

      <footer className="trust-footer">
        Ficha publicada en Pet Ecosystem. La informacion es responsabilidad de la organizacion protectora.
      </footer>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .public-adoption-page {
    background: linear-gradient(180deg, ${colors.warm} 0%, #eef8f5 100%);
    color: ${colors.ink};
    min-height: 100vh;
    padding: 24px 16px 42px;
  }

  .hero,
  .gallery,
  .content-grid,
  .trust-footer,
  .empty-state {
    margin-left: auto;
    margin-right: auto;
    max-width: 1120px;
  }

  .hero {
    background: ${colors.surface};
    border: 1px solid ${colors.line};
    border-radius: 32px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(320px, 0.92fr) minmax(0, 1.08fr);
    overflow: hidden;
    padding: 24px;
  }

  .hero-media {
    align-items: center;
    aspect-ratio: 4 / 3;
    background: ${colors.softTeal};
    border: 1px solid ${colors.line};
    border-radius: 26px;
    color: ${colors.accentDark};
    display: flex;
    font-size: 78px;
    font-weight: 900;
    justify-content: center;
    overflow: hidden;
  }

  .hero-media img,
  .gallery img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
    gap: 18px;
    justify-content: center;
    padding: 16px 10px;
  }

  .hero-kicker,
  .tag-row,
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .hero-kicker span,
  .tag-row span {
    background: ${colors.softTeal};
    border: 1px solid ${colors.line};
    border-radius: 999px;
    color: ${colors.accentDark};
    font-size: 12px;
    font-weight: 900;
    padding: 8px 11px;
  }

  .hero-kicker span:first-child {
    background: ${colors.softAmber};
    border-color: rgba(245, 158, 11, 0.25);
    color: ${colors.amber};
    text-transform: uppercase;
  }

  h1 {
    color: ${colors.ink};
    font-size: clamp(42px, 6vw, 78px);
    line-height: 0.95;
    margin: 0;
  }

  .hero-copy p,
  .card p,
  .detail-card p,
  .empty-state p {
    color: ${colors.muted};
    font-size: 15px;
    line-height: 1.65;
    margin: 0;
  }

  .hero-copy > p {
    color: ${colors.ink};
    font-size: 18px;
  }

  .hero-actions a,
  .hero-actions button,
  .profile-link {
    align-items: center;
    border-radius: 999px;
    display: inline-flex;
    font-size: 14px;
    font-weight: 900;
    justify-content: center;
    min-height: 44px;
    padding: 0 18px;
    text-decoration: none;
  }

  .hero-actions a:first-child,
  .profile-link {
    background: ${colors.accent};
    border: 1px solid ${colors.accent};
    color: #ffffff;
  }

  .hero-actions a:not(:first-child),
  .hero-actions button {
    background: #ffffff;
    border: 1px solid rgba(15, 118, 110, 0.28);
    color: ${colors.accentDark};
  }

  .gallery {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    margin-top: 18px;
  }

  .gallery img {
    aspect-ratio: 4 / 3;
    border: 1px solid ${colors.line};
    border-radius: 18px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  }

  .content-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(0, 1fr) 340px;
    margin-top: 20px;
  }

  .main-column,
  .side-column,
  .details-grid {
    display: grid;
    gap: 18px;
  }

  .details-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card,
  .detail-card,
  .empty-state,
  .trust-footer {
    background: ${colors.surface};
    border: 1px solid ${colors.line};
    border-radius: 24px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    padding: 22px;
  }

  .section-heading {
    margin-bottom: 16px;
  }

  .section-heading p {
    color: ${colors.accentDark};
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  .section-heading h2,
  .detail-card h3 {
    color: ${colors.ink};
    font-size: 24px;
    line-height: 1.15;
    margin: 0;
  }

  .detail-card h3 {
    font-size: 18px;
    margin-bottom: 8px;
  }

  .section-heading span {
    color: ${colors.muted};
    display: block;
    font-size: 14px;
    line-height: 1.55;
    margin-top: 8px;
  }

  .story-copy {
    color: ${colors.ink} !important;
    font-size: 16px !important;
  }

  .process-card {
    background: ${colors.softTeal};
  }

  .process-steps {
    display: grid;
    gap: 12px;
  }

  .process-steps div {
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(15, 118, 110, 0.16);
    border-radius: 16px;
    padding: 14px;
  }

  .process-steps strong,
  .process-steps span {
    display: block;
  }

  .process-steps strong {
    color: ${colors.ink};
    font-size: 14px;
    margin-bottom: 4px;
  }

  .process-steps span,
  .privacy-card li,
  .support-card small {
    color: ${colors.muted};
    font-size: 13px;
    line-height: 1.5;
  }

  .needs-copy {
    color: ${colors.accentDark} !important;
    font-weight: 800;
    margin-top: 12px !important;
  }

  .profile-link {
    margin-top: 16px;
  }

  .privacy-card ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding-left: 18px;
  }

  .support-card {
    background: ${colors.softAmber};
    border-color: rgba(245, 158, 11, 0.2);
  }

  .donation-list {
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }

  .donation-list div {
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 14px;
    padding: 12px;
  }

  .donation-list strong,
  .donation-list span {
    display: block;
  }

  .donation-list strong {
    color: ${colors.ink};
    font-size: 13px;
  }

  .donation-list span {
    color: ${colors.muted};
    font-size: 12px;
    line-height: 1.45;
    margin-top: 4px;
    word-break: break-word;
  }

  .trust-footer {
    color: ${colors.muted};
    font-size: 13px;
    line-height: 1.5;
    margin-top: 22px;
    text-align: center;
  }

  .empty-state {
    margin-top: 24px;
  }

  .empty-state strong {
    color: ${colors.ink};
    display: block;
    font-size: 18px;
    margin-bottom: 8px;
  }

  @media (max-width: 920px) {
    .hero,
    .content-grid,
    .details-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .public-adoption-page {
      padding: 12px;
    }

    .hero,
    .card,
    .detail-card,
    .empty-state,
    .trust-footer {
      border-radius: 20px;
      padding: 18px;
    }

    .hero {
      gap: 14px;
    }

    .hero-actions a,
    .hero-actions button {
      width: 100%;
    }
  }
`;
