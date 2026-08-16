"use client";

import type { PetAdoptionListing, ProtectivePublicProfile } from "@pet/types";
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

function getLocation(profile: ProtectivePublicProfile) {
  return [profile.city, profile.stateRegion, profile.countryCode].filter(Boolean).join(", ");
}

function getPetLocation(listing: PetAdoptionListing) {
  return [listing.city, listing.stateRegion, listing.countryCode].filter(Boolean).join(", ");
}

function formatAge(birthDate: string | null) {
  if (!birthDate) {
    return "Edad por confirmar";
  }

  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "Edad por confirmar";
  }

  const today = new Date();
  let years = today.getFullYear() - parsed.getFullYear();
  const birthdayPassed =
    today.getMonth() > parsed.getMonth() ||
    (today.getMonth() === parsed.getMonth() && today.getDate() >= parsed.getDate());

  if (!birthdayPassed) {
    years -= 1;
  }

  if (years <= 0) {
    return "Menos de 1 ano";
  }

  return `${years} ano${years === 1 ? "" : "s"}`;
}

function formatSpecies(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join(" ");
}

function getCover(listing: PetAdoptionListing) {
  return listing.media.find((media) => media.isCover && media.signedUrl) ?? listing.media.find((media) => media.signedUrl);
}

function getContactHref(profile: ProtectivePublicProfile) {
  const value = profile.publicContactValue?.trim();
  if (!value) {
    return null;
  }

  if (profile.contactPolicy === "public_email" || value.includes("@")) {
    return `mailto:${value}`;
  }

  if (profile.contactPolicy === "public_phone") {
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return null;
}

function shouldShowProfile(profile: ProtectivePublicProfile | null): profile is ProtectivePublicProfile {
  return Boolean(profile?.isPublic && profile.moderationStatus === "approved");
}

function shouldShowDonationBlock(profile: ProtectivePublicProfile) {
  return Boolean(
    profile.donationsEnabled &&
      (profile.donationDescription?.trim() ||
        profile.donationAchDetails?.trim() ||
        profile.donationYappyDetails?.trim() ||
        profile.donationPaypalDetails?.trim() ||
        profile.donationExternalUrl?.trim() ||
        profile.donationOtherDetails?.trim())
  );
}

function getDonationMethods(profile: ProtectivePublicProfile) {
  return [
    { label: "ACH / transferencia", value: profile.donationAchDetails },
    { label: "Yappy", value: profile.donationYappyDetails },
    { label: "PayPal", value: profile.donationPaypalDetails },
    { label: "Sitio externo", value: profile.donationExternalUrl },
    { label: "Otro metodo", value: profile.donationOtherDetails }
  ].filter((method): method is { label: string; value: string } => Boolean(method.value?.trim()));
}

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{copy}</span>
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

export function PublicProtectiveLandingPage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<ProtectivePublicProfile | null>(null);
  const [listings, setListings] = useState<PetAdoptionListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState("Compartir");

  useEffect(() => {
    let isMounted = true;

    async function loadLanding() {
      setIsLoading(true);
      setMessage(null);

      try {
        const client = getBrowserFosterApiClient();
        const publicProfile = await client.getPublicProtectiveProfileBySlug(slug);

        if (!shouldShowProfile(publicProfile)) {
          if (isMounted) {
            setProfile(null);
            setListings([]);
          }
          return;
        }

        const publishedListings = await client.listPublishedPetAdoptionListings();
        const visibleListings = publishedListings.filter(
          (listing) =>
            listing.householdId === publicProfile.householdId &&
            listing.status === "published" &&
            listing.shareStatus === "enabled" &&
            Boolean(listing.publicSlug)
        );

        if (isMounted) {
          setProfile(publicProfile);
          setListings(visibleListings);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "No fue posible cargar esta Familia Protectora.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLanding();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const contactHref = profile ? getContactHref(profile) : null;
  const donationMethods = useMemo(() => (profile ? getDonationMethods(profile) : []), [profile]);

  async function handleShare() {
    const title = profile?.displayName ? `${profile.displayName} en Pet Ecosystem` : "Familia Protectora";
    const text = profile?.mission ?? "Conoce esta Familia Protectora y sus mascotas en adopcion.";
    const url = typeof window !== "undefined" ? window.location.href : "";

    try {
      const browserNavigator =
        typeof navigator !== "undefined"
          ? (navigator as Navigator & {
              clipboard?: Clipboard;
              share?: (data: ShareData) => Promise<void>;
            })
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
      <main className="public-protective-page">
        <EmptyState title="Cargando perfil" copy="Estamos preparando la landing publica de esta Familia Protectora." />
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (message || !profile) {
    return (
      <main className="public-protective-page">
        <EmptyState
          title="Familia Protectora no disponible"
          copy={message ?? "Esta landing no existe, no esta aprobada o no esta publicada en este momento."}
        />
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="public-protective-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="logo-row">
            <div className="logo-mark">
              {profile.logoUrl ? <img alt={`Logo de ${profile.displayName}`} src={profile.logoUrl} /> : profile.displayName.slice(0, 2)}
            </div>
            <span>Familia Protectora aprobada</span>
          </div>
          <h1>{profile.displayName}</h1>
          <p>{profile.mission ?? "Gestiona acogida y adopciones responsables con apoyo de Pet Ecosystem."}</p>
          <div className="location-pill">{getLocation(profile) || "Ubicacion general no publicada"}</div>
          <div className="hero-actions">
            <a href="#mascotas">Ver mascotas en adopcion</a>
            <button onClick={handleShare} type="button">
              {shareLabel}
            </button>
            {contactHref ? (
              <a href={contactHref} rel="noreferrer" target={contactHref.startsWith("http") ? "_blank" : undefined}>
                Contactar
              </a>
            ) : null}
          </div>
        </div>
        <div className="hero-panel">
          <strong>Visibilidad responsable</strong>
          <p>Esta vitrina publica muestra solo informacion aprobada por la Familia Protectora y segura para adopcion.</p>
          <div className="metric-grid">
            <div>
              <span>{listings.length}</span>
              <small>Mascotas publicadas</small>
            </div>
            <div>
              <span>{profile.needsSummary ? "Activas" : "No publicadas"}</span>
              <small>Necesidades actuales</small>
            </div>
            <div>
              <span>Privado</span>
              <small>Expedientes y documentos</small>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid" id="mascotas">
        <div className="main-column">
          <section className="card">
            <SectionTitle
              copy="Estas fichas son publicas y no muestran expedientes, documentos, gastos ni notas internas."
              eyebrow="Adopcion responsable"
              title="Mascotas en adopcion"
            />
            {listings.length ? (
              <div className="pet-grid">
                {listings.map((listing) => {
                  const cover = getCover(listing);
                  return (
                    <article className="pet-card" key={listing.id}>
                      <div className="pet-photo">
                        {cover?.signedUrl ? (
                          <img alt={`Foto de ${listing.petName}`} src={cover.signedUrl} />
                        ) : (
                          <span>{listing.petName.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="pet-card-copy">
                        <div>
                          <h3>{listing.petName}</h3>
                          <p>
                            {formatSpecies(listing.petSpecies)} {listing.petBreed ? `- ${listing.petBreed}` : ""}
                          </p>
                        </div>
                        <div className="pet-tags">
                          <span>{formatAge(listing.petBirthDate)}</span>
                          <span>{listing.petSex}</span>
                          <span>{getPetLocation(listing)}</span>
                        </div>
                        <a href={`/adopciones/${listing.publicSlug}`}>Ver historia</a>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Sin mascotas publicadas"
                copy="Esta Familia Protectora aun no tiene fichas publicas disponibles para adopcion."
              />
            )}
          </section>

          {profile.needsSummary ? (
            <section className="card soft-card">
              <SectionTitle
                copy="Informacion declarada por la Familia Protectora. Pet Ecosystem no procesa pagos ni donaciones."
                eyebrow="Necesidades actuales"
                title="Como puedes apoyar"
              />
              <p>{profile.needsSummary}</p>
            </section>
          ) : null}
        </div>

        <aside className="side-column">
          <section className="card">
            <SectionTitle
              copy="Conoce el enfoque de cuidado antes de iniciar cualquier proceso."
              eyebrow="Sobre la organizacion"
              title="Mision e historia"
            />
            <p>{profile.publicStory ?? profile.mission ?? "La Familia Protectora esta preparando su historia publica."}</p>
          </section>

          <section className="card">
            <SectionTitle copy="Canales publicos declarados por la Familia Protectora." eyebrow="Contacto" title="Redes y enlaces" />
            <div className="link-list">
              {contactHref ? (
                <a href={contactHref} rel="noreferrer" target={contactHref.startsWith("http") ? "_blank" : undefined}>
                  {profile.publicContactLabel || "Contacto publico"}
                </a>
              ) : null}
              {profile.websiteUrl ? (
                <a href={profile.websiteUrl} rel="noreferrer" target="_blank">
                  Sitio web
                </a>
              ) : null}
              {profile.instagramUrl ? (
                <a href={profile.instagramUrl} rel="noreferrer" target="_blank">
                  Instagram
                </a>
              ) : null}
              {profile.facebookUrl ? (
                <a href={profile.facebookUrl} rel="noreferrer" target="_blank">
                  Facebook
                </a>
              ) : null}
              {profile.tiktokUrl ? (
                <a href={profile.tiktokUrl} rel="noreferrer" target="_blank">
                  TikTok
                </a>
              ) : null}
              {profile.whatsappUrl ? (
                <a href={profile.whatsappUrl} rel="noreferrer" target="_blank">
                  WhatsApp
                </a>
              ) : null}
              {!contactHref &&
              !profile.websiteUrl &&
              !profile.instagramUrl &&
              !profile.facebookUrl &&
              !profile.tiktokUrl &&
              !profile.whatsappUrl ? (
                <p>Esta Familia Protectora mantiene la coordinacion solo por la plataforma.</p>
              ) : null}
            </div>
          </section>

          {shouldShowDonationBlock(profile) ? (
            <section className="card soft-card">
              <SectionTitle
                copy="Donar es opcional y no garantiza aprobacion de adopcion."
                eyebrow="Apoyo declarado"
                title={profile.donationTitle?.trim() || "Apoya a esta Familia Protectora"}
              />
              <p>{profile.donationDescription}</p>
              <div className="donation-list">
                {donationMethods.map((method) => (
                  <div key={method.label}>
                    <strong>{method.label}</strong>
                    <span>{method.value}</span>
                  </div>
                ))}
              </div>
              <small>
                {profile.donationDisclaimer ||
                  "La informacion fue declarada por la Familia Protectora. Pet Ecosystem no procesa ni valida donaciones."}
              </small>
            </section>
          ) : null}
        </aside>
      </section>

      <footer className="trust-footer">
        Perfil publicado en Pet Ecosystem. La informacion es responsabilidad de la organizacion protectora.
      </footer>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .public-protective-page {
    background: linear-gradient(180deg, ${colors.warm} 0%, #eef8f5 100%);
    color: ${colors.ink};
    min-height: 100vh;
    padding: 24px 16px 42px;
  }

  .hero,
  .content-grid,
  .trust-footer,
  .empty-state {
    margin-left: auto;
    margin-right: auto;
    max-width: 1180px;
  }

  .hero {
    background: ${colors.surface};
    border: 1px solid ${colors.line};
    border-radius: 32px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
    overflow: hidden;
    padding: 28px;
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
    gap: 18px;
    justify-content: center;
    min-height: 420px;
  }

  .logo-row {
    align-items: center;
    color: ${colors.accentDark};
    display: flex;
    font-size: 12px;
    font-weight: 900;
    gap: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .logo-mark {
    align-items: center;
    background: ${colors.softTeal};
    border: 1px solid ${colors.line};
    border-radius: 18px;
    color: ${colors.accentDark};
    display: flex;
    font-size: 18px;
    font-weight: 900;
    height: 58px;
    justify-content: center;
    overflow: hidden;
    width: 58px;
  }

  .logo-mark img,
  .pet-photo img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  h1 {
    color: ${colors.ink};
    font-size: clamp(38px, 6vw, 76px);
    line-height: 0.96;
    margin: 0;
    max-width: 780px;
  }

  .hero-copy p,
  .hero-panel p,
  .card p,
  .empty-state p {
    color: ${colors.muted};
    font-size: 16px;
    line-height: 1.7;
    margin: 0;
  }

  .location-pill {
    align-self: flex-start;
    background: ${colors.softTeal};
    border: 1px solid ${colors.line};
    border-radius: 999px;
    color: ${colors.accentDark};
    font-size: 13px;
    font-weight: 900;
    padding: 10px 14px;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .hero-actions a,
  .hero-actions button,
  .pet-card-copy a {
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
  .pet-card-copy a {
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

  .hero-panel {
    background: #101827;
    border-radius: 28px;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 420px;
    padding: 28px;
    position: relative;
  }

  .hero-panel::before {
    background: rgba(45, 212, 191, 0.24);
    border-radius: 999px;
    content: "";
    height: 220px;
    position: absolute;
    right: -70px;
    top: -70px;
    width: 220px;
  }

  .hero-panel strong {
    font-size: 28px;
    line-height: 1.1;
    position: relative;
  }

  .hero-panel p,
  .hero-panel .metric-grid {
    position: relative;
  }

  .metric-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 24px;
  }

  .metric-grid div {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    padding: 14px;
  }

  .metric-grid span {
    display: block;
    font-size: 21px;
    font-weight: 900;
  }

  .metric-grid small {
    color: rgba(255, 255, 255, 0.74);
    display: block;
    font-size: 12px;
    line-height: 1.35;
    margin-top: 6px;
  }

  .content-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(0, 1fr) 340px;
    margin-top: 22px;
  }

  .main-column,
  .side-column {
    display: grid;
    gap: 20px;
  }

  .card,
  .empty-state,
  .trust-footer {
    background: ${colors.surface};
    border: 1px solid ${colors.line};
    border-radius: 24px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    padding: 22px;
  }

  .soft-card {
    background: ${colors.softAmber};
    border-color: rgba(245, 158, 11, 0.2);
  }

  .section-heading {
    margin-bottom: 18px;
  }

  .section-heading p {
    color: ${colors.accentDark};
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  .section-heading h2 {
    color: ${colors.ink};
    font-size: 26px;
    line-height: 1.12;
    margin: 0;
  }

  .section-heading span {
    color: ${colors.muted};
    display: block;
    font-size: 14px;
    line-height: 1.55;
    margin-top: 8px;
  }

  .pet-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .pet-card {
    background: ${colors.warm};
    border: 1px solid rgba(15, 118, 110, 0.2);
    border-radius: 22px;
    display: grid;
    gap: 14px;
    grid-template-columns: 112px minmax(0, 1fr);
    padding: 14px;
  }

  .pet-photo {
    align-items: center;
    aspect-ratio: 1;
    background: ${colors.softTeal};
    border: 1px solid ${colors.line};
    border-radius: 18px;
    color: ${colors.accentDark};
    display: flex;
    font-size: 36px;
    font-weight: 900;
    justify-content: center;
    overflow: hidden;
  }

  .pet-card-copy {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .pet-card-copy h3 {
    color: ${colors.ink};
    font-size: 20px;
    line-height: 1.15;
    margin: 0 0 4px;
  }

  .pet-card-copy p {
    font-size: 13px;
  }

  .pet-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pet-tags span {
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 999px;
    color: ${colors.muted};
    font-size: 11px;
    font-weight: 800;
    padding: 6px 8px;
  }

  .link-list,
  .donation-list {
    display: grid;
    gap: 10px;
  }

  .link-list a,
  .donation-list div {
    background: ${colors.warm};
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 14px;
    color: ${colors.accentDark};
    font-size: 13px;
    font-weight: 900;
    padding: 12px;
    text-decoration: none;
  }

  .donation-list strong,
  .donation-list span {
    display: block;
  }

  .donation-list span {
    color: ${colors.muted};
    font-size: 12px;
    line-height: 1.45;
    margin-top: 4px;
    word-break: break-word;
  }

  .soft-card small {
    color: ${colors.muted};
    display: block;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 12px;
  }

  .trust-footer {
    color: ${colors.muted};
    font-size: 13px;
    line-height: 1.5;
    margin-top: 22px;
    text-align: center;
  }

  .empty-state {
    color: ${colors.muted};
  }

  .empty-state strong {
    color: ${colors.ink};
    display: block;
    font-size: 18px;
    margin-bottom: 8px;
  }

  @media (max-width: 920px) {
    .hero,
    .content-grid {
      grid-template-columns: 1fr;
    }

    .hero-copy,
    .hero-panel {
      min-height: auto;
    }

    .metric-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .public-protective-page {
      padding: 12px;
    }

    .hero,
    .card,
    .empty-state,
    .trust-footer {
      border-radius: 20px;
      padding: 18px;
    }

    .pet-card {
      grid-template-columns: 82px minmax(0, 1fr);
    }

    .hero-actions a,
    .hero-actions button {
      width: 100%;
    }
  }
`;
