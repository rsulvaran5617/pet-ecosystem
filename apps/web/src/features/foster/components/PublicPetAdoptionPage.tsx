"use client";

import type { PublicPetAdoptionProfile } from "@pet/types";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { getBrowserFosterApiClient } from "../../core/services/supabase-browser";

const colors = {
  accent: "#0f8f86",
  accentDark: "#0f766e",
  ink: "#111827",
  muted: "#64748b",
  line: "rgba(15, 118, 110, 0.18)",
  surface: "#ffffff",
  warm: "#fbfaf7",
  softTeal: "#e7f7f4",
  softAmber: "#fff7ed"
};

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

function formatSterilized(value: boolean | null) {
  if (value === true) {
    return "Esterilizada";
  }

  if (value === false) {
    return "No esterilizada";
  }

  return "Esterilizacion por confirmar";
}

function getCover(profile: PublicPetAdoptionProfile) {
  return profile.media.find((media) => media.isCover && media.signedUrl) ?? profile.media.find((media) => media.signedUrl);
}

function InfoCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section
      style={{
        background: colors.surface,
        border: `1px solid ${colors.line}`,
        borderRadius: 20,
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
        padding: 20
      }}
    >
      <h2 style={{ color: colors.ink, fontSize: 20, lineHeight: 1.2, margin: "0 0 10px", fontWeight: 900 }}>{title}</h2>
      <div style={{ color: colors.muted, fontSize: 15, lineHeight: 1.65 }}>{children}</div>
    </section>
  );
}

export function PublicPetAdoptionPage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<PublicPetAdoptionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await getBrowserFosterApiClient().getPublicPetAdoptionListingBySlug(slug);

        if (isMounted) {
          setProfile(result);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir esta ficha de adopcion.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const cover = useMemo(() => (profile ? getCover(profile) : null), [profile]);

  if (isLoading) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <InfoCard title="Cargando ficha">Estamos preparando la informacion publica de adopcion.</InfoCard>
      </main>
    );
  }

  if (errorMessage || !profile) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <InfoCard title="Ficha no disponible">
          {errorMessage ?? "Esta publicacion no esta disponible publicamente o fue pausada por la familia protectora."}
        </InfoCard>
      </main>
    );
  }

  return (
    <main
      style={{
        background: `linear-gradient(180deg, ${colors.warm} 0%, #eef8f5 100%)`,
        minHeight: "100vh",
        padding: "28px 16px 48px"
      }}
    >
      <div style={{ display: "grid", gap: 18, margin: "0 auto", maxWidth: 1080 }}>
        <section
          style={{
            alignItems: "stretch",
            background: colors.surface,
            border: `1px solid ${colors.line}`,
            borderRadius: 28,
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(280px, 0.95fr)",
            overflow: "hidden"
          }}
        >
          <div style={{ background: colors.softTeal, minHeight: 360 }}>
            {cover?.signedUrl ? (
              <img
                alt={`Foto principal de ${profile.petName}`}
                src={cover.signedUrl}
                style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }}
              />
            ) : (
              <div
                style={{
                  alignItems: "center",
                  color: colors.accentDark,
                  display: "flex",
                  fontSize: 72,
                  fontWeight: 900,
                  height: "100%",
                  justifyContent: "center"
                }}
              >
                {profile.petName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 26 }}>
            <span
              style={{
                alignSelf: "flex-start",
                background: colors.softAmber,
                border: "1px solid rgba(245, 158, 11, 0.22)",
                borderRadius: 999,
                color: "#b45309",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.4,
                padding: "8px 12px",
                textTransform: "uppercase"
              }}
            >
              Busca hogar
            </span>
            <div>
              <h1 style={{ color: colors.ink, fontSize: 42, lineHeight: 1.05, margin: 0 }}>{profile.petName}</h1>
              <p style={{ color: colors.muted, fontSize: 17, lineHeight: 1.55, margin: "12px 0 0" }}>
                {profile.title}
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[formatSpecies(profile.petSpecies), profile.petBreed, formatAge(profile.petBirthDate), formatSterilized(profile.petIsSterilized)]
                .filter(Boolean)
                .map((label) => (
                  <span
                    key={label}
                    style={{
                      background: colors.softTeal,
                      border: `1px solid ${colors.line}`,
                      borderRadius: 999,
                      color: colors.accentDark,
                      fontSize: 13,
                      fontWeight: 800,
                      padding: "8px 12px"
                    }}
                  >
                    {label}
                  </span>
                ))}
            </div>
            <p style={{ color: colors.ink, fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              {profile.publicStory ?? "La familia protectora esta preparando la historia publica de esta mascota."}
            </p>
            <div
              style={{
                background: colors.softTeal,
                border: `1px solid ${colors.line}`,
                borderRadius: 18,
                color: colors.accentDark,
                fontSize: 14,
                fontWeight: 800,
                padding: 14
              }}
            >
              {profile.city}, {profile.countryCode} · Publicada por {profile.protectiveHousehold.displayName}
            </div>
          </div>
        </section>

        {profile.media.length > 1 ? (
          <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            {profile.media
              .filter((media) => media.signedUrl)
              .map((media) => (
                <img
                  alt={`Foto de ${profile.petName}`}
                  key={media.id}
                  src={media.signedUrl ?? ""}
                  style={{
                    aspectRatio: "4 / 3",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 18,
                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                    objectFit: "cover",
                    width: "100%"
                  }}
                />
              ))}
          </section>
        ) : null}

        <section style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <InfoCard title="Personalidad">
            {profile.personalityNotes ?? "La familia protectora compartira mas detalles durante el proceso responsable."}
          </InfoCard>
          <InfoCard title="Salud publica">
            {profile.publicHealthSummary ?? "Resumen publico pendiente. No se muestran documentos ni historial clinico privado."}
          </InfoCard>
          <InfoCard title="Compatibilidad">
            <p style={{ margin: 0 }}>Ninos: {profile.compatibilityChildren ?? "por confirmar"}</p>
            <p style={{ margin: "6px 0 0" }}>Perros: {profile.compatibilityDogs ?? "por confirmar"}</p>
            <p style={{ margin: "6px 0 0" }}>Gatos: {profile.compatibilityCats ?? "por confirmar"}</p>
          </InfoCard>
          <InfoCard title="Requisitos">
            {profile.adoptionRequirements ?? "La coordinacion final se revisa dentro de la app con la familia protectora."}
          </InfoCard>
        </section>

        <section
          style={{
            background: colors.surface,
            border: `1px solid ${colors.line}`,
            borderRadius: 24,
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
            display: "grid",
            gap: 18,
            gridTemplateColumns: "minmax(0, 1fr) auto",
            padding: 22
          }}
        >
          <div>
            <p style={{ color: colors.accentDark, fontSize: 12, fontWeight: 900, letterSpacing: 1, margin: 0 }}>
              FAMILIA PROTECTORA
            </p>
            <h2 style={{ color: colors.ink, fontSize: 26, lineHeight: 1.15, margin: "8px 0" }}>
              {profile.protectiveHousehold.displayName}
            </h2>
            <p style={{ color: colors.muted, fontSize: 15, lineHeight: 1.65, margin: 0 }}>
              {profile.protectiveHousehold.mission ??
                profile.protectiveHousehold.publicStory ??
                "Familia protectora aprobada por la plataforma."}
            </p>
            {profile.protectiveHousehold.needsSummary ? (
              <p style={{ color: colors.accentDark, fontSize: 14, fontWeight: 800, margin: "12px 0 0" }}>
                {profile.protectiveHousehold.needsSummary}
              </p>
            ) : null}
          </div>
          <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", gap: 10, minWidth: 190 }}>
            <button
              disabled
              style={{
                background: colors.accent,
                border: 0,
                borderRadius: 999,
                color: "#ffffff",
                cursor: "not-allowed",
                fontSize: 14,
                fontWeight: 900,
                opacity: 0.75,
                padding: "12px 16px"
              }}
              type="button"
            >
              Solicitar adopcion
            </button>
            <span style={{ color: colors.muted, fontSize: 12, lineHeight: 1.45, textAlign: "center" }}>
              Inicia sesion desde la app para enviar una solicitud formal y responsable.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
