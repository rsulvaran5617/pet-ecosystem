"use client";

import type {
  AdminPetAdoptionApplication,
  AdminProtectiveHouseholdProfile,
  AdminProtectivePublicProfile,
  PetAdoptionListing,
  PetTransferRecord,
  ProtectivePublicProfileReviewInput,
  ProtectiveHouseholdReviewDecision,
  Uuid
} from "@pet/types";
import { colorTokens, visualTokens } from "@pet/ui";
import { useEffect, useMemo, useState } from "react";

import { getAdminFosterApiClient } from "../../core/services/supabase-admin";

const cardStyle = {
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid rgba(24,24,27,0.12)",
  padding: "20px",
  display: "grid",
  gap: "14px",
  boxShadow: visualTokens.web.softShadow
} as const;

const inputStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(24,24,27,0.14)",
  background: "#ffffff",
  padding: "12px 14px",
  fontSize: "15px"
} as const;

const statusLabels: Record<AdminProtectiveHouseholdProfile["status"], string> = {
  approved: "Aprobada",
  draft: "Borrador",
  pending_review: "En revision",
  rejected: "Rechazada",
  suspended: "Suspendida"
};

const organizationTypeLabels: Record<AdminProtectiveHouseholdProfile["organizationType"], string> = {
  foundation: "Fundacion",
  foster_home: "Hogar temporal",
  individual_rescuer: "Rescatista",
  other: "Otro",
  temporary_home: "Familia de acogida"
};

const transferStatusLabels: Record<PetTransferRecord["status"], string> = {
  accepted: "Aceptada",
  cancelled: "Cancelada",
  expired: "Expirada",
  pending: "Pendiente",
  rejected: "Rechazada"
};

const adoptionListingStatusLabels: Record<PetAdoptionListing["status"], string> = {
  adopted: "Adoptada",
  closed: "Cerrada",
  draft: "Borrador",
  paused: "Pausada",
  pending_review: "En revision",
  published: "Publicada",
  rejected: "Rechazada"
};

const adoptionMediaStatusLabels: Record<PetAdoptionListing["media"][number]["moderationStatus"], string> = {
  approved: "Aprobada",
  pending: "Pendiente",
  rejected: "Rechazada"
};

const adoptionApplicationStatusLabels: Record<AdminPetAdoptionApplication["status"], string> = {
  approved: "Aprobada",
  converted_to_transfer: "Convertida en transferencia",
  interview: "Entrevista",
  in_review: "En revision",
  rejected: "Rechazada",
  submitted: "Enviada",
  withdrawn: "Retirada"
};

const publicProfileStatusLabels: Record<AdminProtectivePublicProfile["moderationStatus"], string> = {
  approved: "Aprobado",
  draft: "Borrador",
  pending_review: "En revision",
  rejected: "Rechazado",
  suspended: "Suspendido"
};

const contactPolicyLabels: Record<AdminProtectivePublicProfile["contactPolicy"], string> = {
  external_link: "Enlace externo",
  platform_only: "Solo plataforma",
  public_email: "Correo publico",
  public_phone: "Telefono publico"
};

function Button({
  children,
  disabled,
  onClick,
  tone = "primary"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "danger" | "primary" | "secondary";
}) {
  const palette =
    tone === "danger"
      ? { background: "#b91c1c", color: "#fef2f2", border: "none" }
      : tone === "primary"
        ? { background: colorTokens.adminAccent, color: "#f8fafc", border: "none" }
        : { background: "#ffffff", color: colorTokens.adminAccent, border: "1px solid rgba(0,138,151,0.28)" };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      style={{
        borderRadius: "999px",
        border: palette.border,
        background: palette.background,
        color: palette.color,
        padding: "12px 18px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
    </button>
  );
}

export function AdminFosterWorkspace({
  onOpenQueue,
  variant = "full"
}: {
  onOpenQueue?: () => void;
  variant?: "full" | "home";
}) {
  const [profiles, setProfiles] = useState<AdminProtectiveHouseholdProfile[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<AdminProtectivePublicProfile[]>([]);
  const [transfers, setTransfers] = useState<PetTransferRecord[]>([]);
  const [adoptionListings, setAdoptionListings] = useState<PetAdoptionListing[]>([]);
  const [adoptionApplications, setAdoptionApplications] = useState<AdminPetAdoptionApplication[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [selectedPublicProfileId, setSelectedPublicProfileId] = useState<Uuid | null>(null);
  const [selectedAdoptionListingId, setSelectedAdoptionListingId] = useState<Uuid | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [publicProfileReviewNotes, setPublicProfileReviewNotes] = useState("");
  const [adoptionReviewNotes, setAdoptionReviewNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.householdId === selectedHouseholdId) ?? profiles[0] ?? null,
    [profiles, selectedHouseholdId]
  );
  const selectedPublicProfile = useMemo(
    () => publicProfiles.find((profile) => profile.id === selectedPublicProfileId) ?? publicProfiles[0] ?? null,
    [publicProfiles, selectedPublicProfileId]
  );
  const selectedAdoptionListing = useMemo(
    () =>
      adoptionListings.find((listing) => listing.id === selectedAdoptionListingId) ??
      adoptionListings[0] ??
      null,
    [adoptionListings, selectedAdoptionListingId]
  );

  async function refresh(preferredHouseholdId?: Uuid | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextProfiles, nextPublicProfiles, nextTransfers, nextAdoptionListings, nextAdoptionApplications] = await Promise.all([
        getAdminFosterApiClient().listPendingProtectiveHouseholdProfiles(),
        getAdminFosterApiClient().listPendingProtectivePublicProfilesForAdmin(),
        getAdminFosterApiClient().listAdminPetTransfers(),
        getAdminFosterApiClient().listPendingPetAdoptionListingsForAdmin(),
        getAdminFosterApiClient().listAdminPetAdoptionApplications()
      ]);
      setProfiles(nextProfiles);
      setPublicProfiles(nextPublicProfiles);
      setTransfers(nextTransfers);
      setAdoptionListings(nextAdoptionListings);
      setAdoptionApplications(nextAdoptionApplications);
      setSelectedHouseholdId(
        preferredHouseholdId && nextProfiles.some((profile) => profile.householdId === preferredHouseholdId)
          ? preferredHouseholdId
          : nextProfiles[0]?.householdId ?? null
      );
      setSelectedAdoptionListingId((currentListingId) =>
        currentListingId && nextAdoptionListings.some((listing) => listing.id === currentListingId)
          ? currentListingId
          : nextAdoptionListings[0]?.id ?? null
      );
      setSelectedPublicProfileId((currentProfileId) =>
        currentProfileId && nextPublicProfiles.some((profile) => profile.id === currentProfileId)
          ? currentProfileId
          : nextPublicProfiles[0]?.id ?? null
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar familias protectoras pendientes.");
    } finally {
      setIsLoading(false);
    }
  }

  async function reviewSelectedProfile(decision: ProtectiveHouseholdReviewDecision) {
    if (!selectedProfile) {
      setErrorMessage("Selecciona primero una solicitud de familia protectora.");
      return;
    }

    if ((decision === "rejected" || decision === "suspended") && !reviewNotes.trim()) {
      setErrorMessage("La nota es obligatoria para rechazar o suspender.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getAdminFosterApiClient().reviewProtectiveHouseholdProfile(selectedProfile.householdId, {
        decision,
        notes: reviewNotes.trim() || null
      });
      setInfoMessage(
        decision === "approved"
          ? "Familia protectora aprobada."
          : decision === "rejected"
            ? "Solicitud de familia protectora rechazada."
            : "Familia protectora suspendida."
      );
      setReviewNotes("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible revisar la solicitud protectora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewSelectedPublicProfile(decision: ProtectivePublicProfileReviewInput["decision"]) {
    if (!selectedPublicProfile) {
      setErrorMessage("Selecciona primero un perfil publico protector.");
      return;
    }

    if ((decision === "rejected" || decision === "suspended") && !publicProfileReviewNotes.trim()) {
      setErrorMessage("La nota es obligatoria para rechazar o suspender el perfil publico.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getAdminFosterApiClient().reviewProtectivePublicProfile(selectedPublicProfile.id, {
        decision,
        notes: publicProfileReviewNotes.trim() || null
      });
      setInfoMessage(
        decision === "approved"
          ? "Perfil publico protector aprobado."
          : decision === "rejected"
            ? "Perfil publico protector rechazado."
            : "Perfil publico protector suspendido."
      );
      setPublicProfileReviewNotes("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible revisar el perfil publico protector.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewSelectedAdoptionListing(decision: "approved" | "paused" | "rejected") {
    if (!selectedAdoptionListing) {
      setErrorMessage("Selecciona primero una publicacion de adopcion.");
      return;
    }

    if ((decision === "rejected" || decision === "paused") && !adoptionReviewNotes.trim()) {
      setErrorMessage("La nota es obligatoria para rechazar o pausar una publicacion.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getAdminFosterApiClient().reviewPetAdoptionListing(selectedAdoptionListing.id, {
        decision,
        notes: adoptionReviewNotes.trim() || null
      });
      setInfoMessage(
        decision === "approved"
          ? "Publicacion de adopcion aprobada."
          : decision === "rejected"
            ? "Publicacion de adopcion rechazada."
            : "Publicacion de adopcion pausada."
      );
      setAdoptionReviewNotes("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible revisar la publicacion de adopcion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewAdoptionListingMedia(mediaId: Uuid, decision: "approved" | "rejected") {
    if (decision === "rejected" && !adoptionReviewNotes.trim()) {
      setErrorMessage("La nota es obligatoria para rechazar una foto.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getAdminFosterApiClient().reviewPetAdoptionListingMedia(mediaId, {
        decision,
        notes: adoptionReviewNotes.trim() || null
      });
      setInfoMessage(decision === "approved" ? "Foto de adopcion aprobada." : "Foto de adopcion rechazada.");
      setAdoptionReviewNotes("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible revisar la foto de adopcion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (variant === "home") {
    return (
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px" }}>Familias protectoras</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>Solicitudes de acogida pendientes de revision.</p>
          </div>
          <strong style={{ color: profiles.length ? "#b45309" : colorTokens.adminAccent, fontSize: "28px" }}>
            {profiles.length}
          </strong>
        </div>
        <p style={{ margin: 0, color: "#52525b" }}>
          {transfers.length} transferencia(s) privadas auditables. {publicProfiles.length} perfil(es) publico(s) y{" "}
          {adoptionListings.length} publicacion(es) de adopcion pendientes. {adoptionApplications.length} solicitud(es) formales.
        </p>
        {isLoading && !profiles.length ? <p style={{ margin: 0, color: "#52525b" }}>Cargando solicitudes...</p> : null}
        {errorMessage ? <p style={{ margin: 0, color: "#991b1b" }}>{errorMessage}</p> : null}
        {!profiles.length && !isLoading ? (
          <p style={{ margin: 0, color: "#52525b" }}>No hay familias protectoras pendientes de revision.</p>
        ) : null}
        <Button onClick={onOpenQueue} tone="secondary">
          Abrir cola
        </Button>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: colorTokens.adminAccent }}>{infoMessage}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0,1fr)", gap: "20px", alignItems: "start" }}>
        <aside style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Solicitudes</h2>
            <span style={{ color: "#52525b" }}>{profiles.length} pendiente(s)</span>
          </div>
          <Button disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
            Actualizar
          </Button>
          {isLoading ? <p style={{ margin: 0, color: "#52525b" }}>Cargando familias protectoras...</p> : null}
          {profiles.length ? (
            profiles.map((profile) => (
              <button
                key={profile.householdId}
                onClick={() => setSelectedHouseholdId(profile.householdId)}
                type="button"
                style={{
                  ...inputStyle,
                  textAlign: "left",
                  display: "grid",
                  gap: "6px",
                  cursor: "pointer",
                  borderColor:
                    profile.householdId === selectedProfile?.householdId ? "rgba(0,138,151,0.32)" : "rgba(24,24,27,0.14)"
                }}
              >
                <strong>{profile.displayName}</strong>
                <span style={{ color: "#52525b" }}>{profile.householdName ?? "Hogar no disponible"}</span>
                <span style={{ color: "#71717a" }}>{profile.city}, {profile.countryCode}</span>
              </button>
            ))
          ) : (
            <p style={{ margin: 0, color: "#52525b" }}>No hay solicitudes pendientes.</p>
          )}
        </aside>

        <article style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Revision de familia protectora</h2>
            {selectedProfile ? (
              <span
                style={{
                  borderRadius: "999px",
                  background: "rgba(217,119,6,0.12)",
                  color: "#b45309",
                  fontWeight: 800,
                  padding: "8px 12px"
                }}
              >
                {statusLabels[selectedProfile.status]}
              </span>
            ) : null}
          </div>
          {selectedProfile ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                <div style={inputStyle}>
                  <strong>Nombre visible</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedProfile.displayName}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Hogar</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{selectedProfile.householdName ?? "Sin nombre"}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Tipo</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>{organizationTypeLabels[selectedProfile.organizationType]}</div>
                </div>
                <div style={inputStyle}>
                  <strong>Ubicacion</strong>
                  <div style={{ color: "#52525b", marginTop: "6px" }}>
                    {selectedProfile.city}{selectedProfile.stateRegion ? `, ${selectedProfile.stateRegion}` : ""}, {selectedProfile.countryCode}
                  </div>
                </div>
              </div>
              <div style={inputStyle}>
                <strong>Contexto de contacto</strong>
                <p style={{ color: "#52525b", lineHeight: 1.6, margin: "8px 0 0" }}>
                  {selectedProfile.contactNotes || "Sin notas de contacto."}
                </p>
              </div>
              <div style={inputStyle}>
                <strong>Descripcion corta</strong>
                <p style={{ color: "#52525b", lineHeight: 1.6, margin: "8px 0 0" }}>
                  {selectedProfile.publicNotes || "Sin descripcion adicional."}
                </p>
              </div>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase" }}>
                  Nota de revision
                </span>
                <textarea
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Motivo de rechazo/suspension o nota interna opcional."
                  style={{ ...inputStyle, minHeight: "96px", resize: "vertical" }}
                  value={reviewNotes}
                />
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button disabled={isSubmitting} onClick={() => void reviewSelectedProfile("approved")}>
                  Aprobar
                </Button>
                <Button disabled={isSubmitting} onClick={() => void reviewSelectedProfile("rejected")} tone="danger">
                  Rechazar
                </Button>
                <Button disabled={isSubmitting} onClick={() => void reviewSelectedProfile("suspended")} tone="secondary">
                  Suspender
                </Button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#52525b" }}>Selecciona una solicitud pendiente para revisarla.</p>
          )}
        </article>
      </div>
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Perfiles publicos protectores</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>
              Revisa la presencia publica de familias protectoras antes de mostrarla a adoptantes.
            </p>
          </div>
          <span style={{ color: "#52525b" }}>{publicProfiles.length} por revisar</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) minmax(0,1fr)", gap: "18px", alignItems: "start" }}>
          <div style={{ display: "grid", gap: "10px" }}>
            {publicProfiles.length ? (
              publicProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedPublicProfileId(profile.id)}
                  type="button"
                  style={{
                    ...inputStyle,
                    textAlign: "left",
                    display: "grid",
                    gap: "6px",
                    cursor: "pointer",
                    borderColor: profile.id === selectedPublicProfile?.id ? "rgba(0,138,151,0.32)" : "rgba(24,24,27,0.14)"
                  }}
                >
                  <strong>{profile.displayName}</strong>
                  <span style={{ color: "#52525b" }}>{profile.householdName ?? "Hogar no disponible"}</span>
                  <span style={{ color: "#71717a" }}>{profile.city}, {profile.countryCode}</span>
                </button>
              ))
            ) : (
              <p style={{ margin: 0, color: "#52525b" }}>No hay perfiles publicos pendientes.</p>
            )}
          </div>
          <article style={{ ...inputStyle, display: "grid", gap: "12px" }}>
            {selectedPublicProfile ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: "18px" }}>{selectedPublicProfile.displayName}</strong>
                    <p style={{ margin: "4px 0 0", color: "#52525b" }}>
                      {selectedPublicProfile.householdName ?? "Hogar no disponible"} - {selectedPublicProfile.publicSlug}
                    </p>
                  </div>
                  <span
                    style={{
                      borderRadius: "999px",
                      background: "rgba(217,119,6,0.12)",
                      color: "#b45309",
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "6px 10px"
                    }}
                  >
                    {publicProfileStatusLabels[selectedPublicProfile.moderationStatus]}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "10px" }}>
                  <div style={inputStyle}>
                    <strong>Ubicacion publica</strong>
                    <p style={{ margin: "6px 0 0", color: "#52525b" }}>
                      {selectedPublicProfile.city}
                      {selectedPublicProfile.stateRegion ? `, ${selectedPublicProfile.stateRegion}` : ""},{" "}
                      {selectedPublicProfile.countryCode}
                    </p>
                  </div>
                  <div style={inputStyle}>
                    <strong>Contacto</strong>
                    <p style={{ margin: "6px 0 0", color: "#52525b" }}>
                      {contactPolicyLabels[selectedPublicProfile.contactPolicy]}
                      {selectedPublicProfile.publicContactLabel ? ` - ${selectedPublicProfile.publicContactLabel}` : ""}
                    </p>
                  </div>
                </div>
                {[
                  ["Mision", selectedPublicProfile.mission],
                  ["Historia publica", selectedPublicProfile.publicStory],
                  ["Necesidades actuales", selectedPublicProfile.needsSummary],
                  ["Dato de contacto", selectedPublicProfile.publicContactValue]
                ].map(([label, value]) => (
                  <div key={label} style={inputStyle}>
                    <strong>{label}</strong>
                    <p style={{ margin: "6px 0 0", color: "#52525b", lineHeight: 1.55 }}>{value || "Sin informacion cargada."}</p>
                  </div>
                ))}
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase" }}>Nota de revision</span>
                  <textarea
                    onChange={(event) => setPublicProfileReviewNotes(event.target.value)}
                    placeholder="Motivo de rechazo/suspension o nota interna opcional."
                    style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }}
                    value={publicProfileReviewNotes}
                  />
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} onClick={() => void reviewSelectedPublicProfile("approved")}>
                    Aprobar perfil
                  </Button>
                  <Button disabled={isSubmitting} onClick={() => void reviewSelectedPublicProfile("rejected")} tone="danger">
                    Rechazar
                  </Button>
                  <Button disabled={isSubmitting} onClick={() => void reviewSelectedPublicProfile("suspended")} tone="secondary">
                    Suspender
                  </Button>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: "#52525b" }}>Selecciona un perfil publico pendiente para revisarlo.</p>
            )}
          </article>
        </div>
      </section>
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Publicaciones de adopcion</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>
              Revisa textos publicos y galeria antes de mostrarlos a familias interesadas.
            </p>
          </div>
                  <span style={{ color: "#52525b" }}>{adoptionListings.length} por revisar</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) minmax(0,1fr)", gap: "18px", alignItems: "start" }}>
          <div style={{ display: "grid", gap: "10px" }}>
            {adoptionListings.length ? (
              adoptionListings.map((listing) => (
                <button
                  key={listing.id}
                  onClick={() => setSelectedAdoptionListingId(listing.id)}
                  type="button"
                  style={{
                    ...inputStyle,
                    textAlign: "left",
                    display: "grid",
                    gap: "6px",
                    cursor: "pointer",
                    borderColor:
                      listing.id === selectedAdoptionListing?.id ? "rgba(0,138,151,0.32)" : "rgba(24,24,27,0.14)"
                  }}
                >
                  <strong>{listing.petName}</strong>
                  <span style={{ color: "#52525b" }}>{listing.title}</span>
                  <span style={{ color: "#71717a" }}>{listing.city}, {listing.countryCode}</span>
                  {listing.media.some((media) => media.moderationStatus === "pending") ? (
                    <span style={{ color: colorTokens.adminAccent, fontSize: "12px", fontWeight: 800 }}>Fotos pendientes</span>
                  ) : null}
                </button>
              ))
            ) : (
              <p style={{ margin: 0, color: "#52525b" }}>No hay publicaciones pendientes.</p>
            )}
          </div>
          <article style={{ ...inputStyle, display: "grid", gap: "12px" }}>
            {selectedAdoptionListing ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: "18px" }}>{selectedAdoptionListing.petName}</strong>
                    <p style={{ margin: "4px 0 0", color: "#52525b" }}>{selectedAdoptionListing.householdName}</p>
                  </div>
                  <span
                    style={{
                      borderRadius: "999px",
                      background: "rgba(217,119,6,0.12)",
                      color: "#b45309",
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "6px 10px"
                    }}
                  >
                    {adoptionListingStatusLabels[selectedAdoptionListing.status]}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "10px" }}>
                  <div style={inputStyle}><strong>Titulo</strong><p style={{ margin: "6px 0 0", color: "#52525b" }}>{selectedAdoptionListing.title}</p></div>
                  <div style={inputStyle}><strong>Ubicacion</strong><p style={{ margin: "6px 0 0", color: "#52525b" }}>{selectedAdoptionListing.city}, {selectedAdoptionListing.countryCode}</p></div>
                  <div style={inputStyle}><strong>Mascota</strong><p style={{ margin: "6px 0 0", color: "#52525b" }}>{selectedAdoptionListing.petSpecies} {selectedAdoptionListing.petBreed ? `- ${selectedAdoptionListing.petBreed}` : ""}</p></div>
                </div>
                {[
                  ["Historia", selectedAdoptionListing.publicStory],
                  ["Personalidad", selectedAdoptionListing.personalityNotes],
                  ["Salud publica", selectedAdoptionListing.publicHealthSummary],
                  ["Requisitos", selectedAdoptionListing.adoptionRequirements],
                  ["Necesidades especiales", selectedAdoptionListing.specialNeedsNotes]
                ].map(([label, value]) => (
                  <div key={label} style={inputStyle}>
                    <strong>{label}</strong>
                    <p style={{ margin: "6px 0 0", color: "#52525b", lineHeight: 1.55 }}>{value || "Sin informacion cargada."}</p>
                  </div>
                ))}
                {selectedAdoptionListing.media.length ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {selectedAdoptionListing.media.map((media) => (
                      <div
                        key={media.id}
                        style={{
                          borderRadius: "16px",
                          border: "1px solid rgba(24,24,27,0.12)",
                          display: "grid",
                          gap: "8px",
                          padding: "8px",
                          width: "164px"
                        }}
                      >
                        {media.signedUrl ? (
                          <img
                            alt={media.fileName}
                            src={media.signedUrl}
                            style={{ borderRadius: "12px", height: "104px", objectFit: "cover", width: "100%" }}
                          />
                        ) : (
                          <div
                            style={{
                              alignItems: "center",
                              background: "rgba(0,138,151,0.08)",
                              borderRadius: "12px",
                              color: colorTokens.adminAccent,
                              display: "flex",
                              fontSize: "12px",
                              fontWeight: 800,
                              height: "104px",
                              justifyContent: "center"
                            }}
                          >
                            Sin vista previa
                          </div>
                        )}
                        <div style={{ display: "grid", gap: "4px" }}>
                          <strong style={{ color: "#18181b", fontSize: "12px" }}>
                            {adoptionMediaStatusLabels[media.moderationStatus]}{media.isCover ? " · Portada" : ""}
                          </strong>
                          <span style={{ color: "#71717a", fontSize: "11px", overflowWrap: "anywhere" }}>{media.fileName}</span>
                        </div>
                        {media.moderationStatus === "pending" ? (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <Button disabled={isSubmitting} onClick={() => void reviewAdoptionListingMedia(media.id, "approved")}>
                              Aprobar foto
                            </Button>
                            <Button disabled={isSubmitting} onClick={() => void reviewAdoptionListingMedia(media.id, "rejected")} tone="danger">
                              Rechazar
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#71717a" }}>Sin fotos cargadas.</p>
                )}
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase" }}>Nota de revision</span>
                  <textarea
                    onChange={(event) => setAdoptionReviewNotes(event.target.value)}
                    placeholder="Motivo de rechazo/pausa o nota interna opcional."
                    style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }}
                    value={adoptionReviewNotes}
                  />
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button disabled={isSubmitting} onClick={() => void reviewSelectedAdoptionListing("approved")}>
                    Aprobar publicacion
                  </Button>
                  <Button disabled={isSubmitting} onClick={() => void reviewSelectedAdoptionListing("rejected")} tone="danger">
                    Rechazar
                  </Button>
                  <Button disabled={isSubmitting} onClick={() => void reviewSelectedAdoptionListing("paused")} tone="secondary">
                    Pausar
                  </Button>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: "#52525b" }}>Selecciona una publicacion pendiente para revisarla.</p>
            )}
          </article>
        </div>
      </section>
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Solicitudes de adopcion</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>
              Auditoria inicial de solicitudes enviadas por familias interesadas. No cambia custodia ni inicia transferencia.
            </p>
          </div>
          <span style={{ color: "#52525b" }}>{adoptionApplications.length} registro(s)</span>
        </div>
        {adoptionApplications.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "10px" }}>
            {adoptionApplications.map((application) => (
              <article key={application.id} style={{ ...inputStyle, display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <strong>{application.petName}</strong>
                  <span
                    style={{
                      borderRadius: "999px",
                      background: application.status === "submitted" ? "rgba(0,138,151,0.12)" : "rgba(217,119,6,0.12)",
                      color: application.status === "submitted" ? colorTokens.adminAccent : "#b45309",
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "6px 10px"
                    }}
                  >
                    {adoptionApplicationStatusLabels[application.status]}
                  </span>
                </div>
                <span style={{ color: "#52525b" }}>{application.listingTitle}</span>
                <span style={{ color: "#71717a" }}>{application.protectiveHouseholdName}</span>
                <div style={{ borderTop: "1px solid rgba(24,24,27,0.08)", paddingTop: "8px" }}>
                  <strong>{application.applicantName}</strong>
                  <p style={{ color: "#52525b", margin: "4px 0 0" }}>
                    {application.applicantEmail}{application.applicantPhone ? ` - ${application.applicantPhone}` : ""}
                  </p>
                </div>
                <p style={{ color: "#52525b", lineHeight: 1.5, margin: 0 }}>{application.motivation}</p>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#52525b" }}>Aun no hay solicitudes de adopcion registradas.</p>
        )}
      </section>
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Auditoria de transferencias</h2>
            <p style={{ margin: "6px 0 0", color: "#52525b" }}>
              Transferencias privadas de mascota entre familias protectoras y receptoras.
            </p>
          </div>
          <span style={{ color: "#52525b" }}>{transfers.length} registro(s)</span>
        </div>
        {transfers.length ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {transfers.map((transfer) => (
              <div key={transfer.id} style={{ ...inputStyle, display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{transfer.petName}</strong>
                  <span
                    style={{
                      borderRadius: "999px",
                      background: transfer.status === "accepted" ? "rgba(0,138,151,0.12)" : "rgba(217,119,6,0.12)",
                      color: transfer.status === "accepted" ? colorTokens.adminAccent : "#b45309",
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "6px 10px"
                    }}
                  >
                    {transferStatusLabels[transfer.status]}
                  </span>
                </div>
                <span style={{ color: "#52525b" }}>
                  {transfer.fromHouseholdName} {"->"} {transfer.toHouseholdName ?? transfer.recipientEmail}
                </span>
                <span style={{ color: "#71717a", fontSize: "13px" }}>
                  Creada: {new Date(transfer.createdAt).toLocaleString("es-PA")}
                  {transfer.acceptedAt ? ` - Aceptada: ${new Date(transfer.acceptedAt).toLocaleString("es-PA")}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#52525b" }}>Aun no hay transferencias privadas registradas.</p>
        )}
      </section>
    </section>
  );
}
