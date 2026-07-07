"use client";

import type {
  CreatePetInput,
  ProtectiveContactPolicy,
  ProtectiveHouseholdOrganizationType,
  ProtectivePublicProfile,
  ProtectivePublicProfileInput,
  PetAdoptionApplication,
  PetAdoptionApplicationStatus,
  PetAdoptionApplicationStatusHistory,
  PetAdoptionListingInput,
  PetAdoptionListing,
  PetAdoptionListingMedia,
  PetSex,
  PetSummary,
  PetTransferRecord,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useState } from "react";

import type { CreateProtectiveHouseholdInput } from "../hooks/useFosterConsoleWorkspace";
import { useFosterConsoleWorkspace } from "../hooks/useFosterConsoleWorkspace";

type ApplicationStatusFilter = "all" | PetAdoptionApplicationStatus;

type MetricCard = {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "warning" | "success";
  onClick?: () => void;
};

const applicationStatusLabels: Record<PetAdoptionApplicationStatus, string> = {
  approved: "Aprobada",
  converted_to_transfer: "En transferencia",
  in_review: "En revision",
  interview: "Entrevista",
  rejected: "Rechazada",
  submitted: "Nueva",
  withdrawn: "Retirada"
};

const listingStatusLabels: Record<PetAdoptionListing["status"], string> = {
  adopted: "Adoptada",
  closed: "Cerrada",
  draft: "Borrador",
  paused: "Pausada",
  pending_review: "En revision",
  published: "Publicada",
  rejected: "Rechazada"
};

const organizationTypeLabels: Record<ProtectiveHouseholdOrganizationType, string> = {
  foster_home: "Hogar de acogida",
  foundation: "Fundacion",
  individual_rescuer: "Rescatista independiente",
  other: "Otro",
  temporary_home: "Hogar temporal"
};

const contactPolicyLabels: Record<ProtectiveContactPolicy, string> = {
  external_link: "Enlace externo",
  platform_only: "Solo por la plataforma",
  public_email: "Email publico",
  public_phone: "Telefono publico"
};

const petSexLabels: Record<PetSex, string> = {
  female: "Hembra",
  male: "Macho",
  unknown: "Sin indicar"
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function statusTone(status: PetAdoptionApplicationStatus) {
  if (status === "approved" || status === "converted_to_transfer") {
    return "success";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "neutral";
  }

  return "warning";
}

function coverUrl(listing: PetAdoptionListing) {
  return listing.media.find((item) => item.isCover && item.signedUrl)?.signedUrl ?? listing.media.find((item) => item.signedUrl)?.signedUrl ?? null;
}

function getAdoptionMediaStatusLabel(status: PetAdoptionListingMedia["moderationStatus"]) {
  if (status === "approved") {
    return "Aprobada";
  }

  if (status === "rejected") {
    return "Rechazada";
  }

  return "En revision";
}

function buildPublicProfileForm(
  publicProfile: ProtectivePublicProfile | null,
  selectedHouseholdId: Uuid | null,
  selectedHouseholdName: string
): ProtectivePublicProfileInput {
  return {
    city: publicProfile?.city ?? "",
    contactPolicy: publicProfile?.contactPolicy ?? "platform_only",
    countryCode: publicProfile?.countryCode ?? "PA",
    displayName: publicProfile?.displayName ?? selectedHouseholdName,
    householdId: publicProfile?.householdId ?? selectedHouseholdId ?? "",
    mission: publicProfile?.mission ?? "",
    needsSummary: publicProfile?.needsSummary ?? "",
    publicContactLabel: publicProfile?.publicContactLabel ?? "",
    publicContactValue: publicProfile?.publicContactValue ?? "",
    publicStory: publicProfile?.publicStory ?? "",
    stateRegion: publicProfile?.stateRegion ?? ""
  };
}

function buildAdoptionListingForm(listing: PetAdoptionListing | null, pet: PetSummary): PetAdoptionListingInput {
  return {
    adoptionRequirements: listing?.adoptionRequirements ?? "",
    city: listing?.city ?? "",
    compatibilityCats: listing?.compatibilityCats ?? "",
    compatibilityChildren: listing?.compatibilityChildren ?? "",
    compatibilityDogs: listing?.compatibilityDogs ?? "",
    countryCode: listing?.countryCode ?? "PA",
    listingId: listing?.id ?? "",
    personalityNotes: listing?.personalityNotes ?? "",
    publicHealthSummary: listing?.publicHealthSummary ?? "",
    publicStory: listing?.publicStory ?? "",
    specialNeedsNotes: listing?.specialNeedsNotes ?? "",
    stateRegion: listing?.stateRegion ?? "",
    title: listing?.title ?? `${pet.name} busca hogar`
  };
}

function buildAdoptionSteps(listing: PetAdoptionListing | null) {
  const status = listing?.status ?? null;
  const prepared = Boolean(listing);
  const hasMedia = Boolean(listing?.media.length);
  const sentToReview = Boolean(status && status !== "draft");
  const visible = status === "published";

  return [
    { label: "Mascota", order: 1, state: "done" },
    { label: "Publicacion", order: 2, state: prepared ? "done" : "active" },
    { label: "Contenido", order: 3, state: prepared && status === "draft" ? "active" : sentToReview ? "done" : "pending" },
    { label: "Fotos", order: 4, state: hasMedia ? "done" : prepared ? "active" : "pending" },
    { label: "Revision", order: 5, state: status === "pending_review" ? "active" : visible ? "done" : "pending" },
    { label: "Visible", order: 6, state: visible ? "done" : "pending" }
  ] as Array<{ label: string; order: number; state: "active" | "done" | "pending" }>;
}

function publicationGuidance(listing: PetAdoptionListing | null) {
  if (!listing) {
    return "Prepara una publicacion para iniciar el proceso de adopcion. No se hara visible todavia.";
  }

  if (listing.status === "draft") {
    return "Completa historia, salud, compatibilidad y requisitos. Luego envia a revision admin.";
  }

  if (listing.status === "pending_review") {
    return "La publicacion esta en revision admin. Aun no aparece en Mascotas que buscan hogar.";
  }

  if (listing.status === "published") {
    return "La publicacion esta visible para familias interesadas.";
  }

  if (listing.status === "rejected") {
    return "Admin rechazo la publicacion. Corrige el contenido y enviala nuevamente a revision.";
  }

  if (listing.status === "adopted") {
    return "La adopcion fue cerrada mediante transferencia privada.";
  }

  return "Revisa el estado de esta publicacion antes de continuar.";
}

export function FosterConsoleWorkspace() {
  const {
    applications,
    authState,
    createProtectiveHousehold,
    createFosterPet,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    listings,
    openApplication,
    pets,
    prepareAdoptionListing,
    profile,
    protectiveHouseholds,
    publicProfile,
    refresh,
    removeAdoptionListingPhoto,
    savePublicProfile,
    saveAdoptionListing,
    selectedApplicationDetail,
    selectedHousehold,
    selectedHouseholdId,
    selectHousehold,
    sessionUserEmail,
    startTransfer,
    submitAdoptionListing,
    submitPublicProfile,
    setAdoptionListingCover,
    transfers,
    uploadAdoptionListingPhoto,
    updateApplicationStatus
  } = useFosterConsoleWorkspace();
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [applicationPetFilter, setApplicationPetFilter] = useState("all");
  const [rejectNote, setRejectNote] = useState("");

  const applicationCounts = useMemo(
    () => ({
      approved: applications.filter((application) => application.status === "approved").length,
      converted_to_transfer: applications.filter((application) => application.status === "converted_to_transfer").length,
      in_review: applications.filter((application) => application.status === "in_review").length,
      interview: applications.filter((application) => application.status === "interview").length,
      rejected: applications.filter((application) => application.status === "rejected").length,
      submitted: applications.filter((application) => application.status === "submitted").length,
      withdrawn: applications.filter((application) => application.status === "withdrawn").length
    }),
    [applications]
  );

  const metrics: MetricCard[] = [
    {
      label: "Mascotas en vitrina",
      value: new Set(listings.map((listing) => listing.petId)).size,
      detail: "Expedientes publicados o preparados"
    },
    {
      label: "Publicadas",
      value: listings.filter((listing) => listing.status === "published").length,
      detail: "Visibles para familias interesadas",
      tone: "success"
    },
    {
      label: "En revision",
      value: listings.filter((listing) => listing.status === "pending_review").length,
      detail: "Esperan moderacion admin",
      tone: "warning"
    },
    {
      label: "Solicitudes nuevas",
      value: applicationCounts.submitted,
      detail: "Requieren primera revision",
      tone: applicationCounts.submitted ? "warning" : "default",
      onClick: () => setApplicationStatusFilter("submitted")
    },
    {
      label: "Entrevistas",
      value: applicationCounts.interview,
      detail: "Conversaciones en curso",
      onClick: () => setApplicationStatusFilter("interview")
    },
    {
      label: "Transferencias pendientes",
      value: transfers.filter((transfer) => transfer.status === "pending").length,
      detail: "La familia receptora debe aceptar",
      tone: "warning"
    }
  ];

  const petOptions = useMemo(() => {
    const pets = new Map<string, string>();
    listings.forEach((listing) => pets.set(listing.petId, listing.petName));
    applications.forEach((application) => pets.set(application.petId, application.petName));
    return Array.from(pets.entries()).map(([id, name]) => ({ id, name }));
  }, [applications, listings]);

  const filteredApplications = useMemo(
    () =>
      applications
        .filter((application) => applicationStatusFilter === "all" || application.status === applicationStatusFilter)
        .filter((application) => applicationPetFilter === "all" || application.petId === applicationPetFilter)
        .sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime()),
    [applicationPetFilter, applicationStatusFilter, applications]
  );

  const selectedTransfer = selectedApplicationDetail
    ? transfers.find((transfer) => transfer.adoptionApplicationId === selectedApplicationDetail.application.id)
    : undefined;

  return (
    <main style={styles.pageShell}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Consola Foster</p>
          <h1 style={styles.heroTitle}>Centro de gestion para Familias Protectoras</h1>
          <p style={styles.heroCopy}>
            Gestiona publicaciones, solicitudes y transferencias privadas sin mezclar adopcion responsable con servicios comerciales.
          </p>
          {sessionUserEmail ? <p style={styles.sessionHint}>Sesion activa: {sessionUserEmail}</p> : null}
        </div>
        <div style={styles.heroActions}>
          <a href="/app" style={styles.secondaryButton}>Abrir app general</a>
          <button onClick={() => void refresh()} style={styles.primaryButton} type="button">Actualizar</button>
        </div>
      </section>

      {authState === "signed_out" ? (
        <InfoPanel
          title="Inicia sesion para abrir tu consola"
          copy="Usa la app web general para iniciar sesion. Luego vuelve a /foster para gestionar tu familia protectora."
          action={<a href="/app" style={styles.primaryButton}>Iniciar sesion</a>}
        />
      ) : null}

      {errorMessage ? <Notice tone="error" message={errorMessage} /> : null}
      {infoMessage ? <Notice tone="info" message={infoMessage} /> : null}
      {isLoading && authState !== "signed_out" ? <InfoPanel title="Cargando consola" copy="Estamos preparando tus familias protectoras y solicitudes." /> : null}

      {authState === "signed_in" && !isLoading && !protectiveHouseholds.length ? (
        <CreateProtectiveHouseholdPanel
          disabled={isSubmitting}
          onSubmit={createProtectiveHousehold}
        />
      ) : null}

      {authState === "signed_in" && protectiveHouseholds.length ? (
        <>
          <section style={styles.panel}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.eyebrow}>Familia activa</p>
                <h2 style={styles.sectionTitle}>{selectedHousehold?.name ?? "Selecciona una familia"}</h2>
              </div>
              <select
                onChange={(event) => selectHousehold(event.target.value)}
                style={styles.select}
                value={selectedHouseholdId ?? ""}
              >
                {protectiveHouseholds.map((household) => (
                  <option key={household.id} value={household.id}>{household.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.contextGrid}>
              <InfoTile label="Revision interna" value={profile ? protectiveStatusLabel(profile.status) : "Sin perfil"} />
              <InfoTile label="Perfil publico" value={publicProfile ? publicStatusLabel(publicProfile.moderationStatus) : "No configurado"} />
              <InfoTile label="Ciudad" value={profile?.city ?? publicProfile?.city ?? "Sin ciudad"} />
              <InfoTile label="Tipo" value={selectedHousehold?.householdType === "protective" ? "Familia protectora" : "Hogar familiar"} />
            </div>
          </section>

          <PublicProfilePanel
            key={selectedHouseholdId ?? "public-profile"}
            disabled={isSubmitting}
            profileStatus={profile?.status ?? null}
            publicProfile={publicProfile}
            selectedHouseholdId={selectedHouseholdId}
            selectedHouseholdName={selectedHousehold?.name ?? ""}
            onSave={savePublicProfile}
            onSubmit={submitPublicProfile}
          />

          <FosterPetsPanel
            applications={applications}
            disabled={isSubmitting}
            listings={listings}
            pets={pets}
            profileStatus={profile?.status ?? null}
            publicProfileStatus={publicProfile?.moderationStatus ?? null}
            onCreatePet={createFosterPet}
            onPrepareListing={prepareAdoptionListing}
            onRemoveListingPhoto={removeAdoptionListingPhoto}
            onSaveListing={saveAdoptionListing}
            onSetListingCover={setAdoptionListingCover}
            onShowApplications={(petId) => {
              setApplicationPetFilter(petId);
              setApplicationStatusFilter("all");
            }}
            onSubmitListing={submitAdoptionListing}
            onUploadListingPhoto={uploadAdoptionListingPhoto}
          />

          {profile?.status !== "approved" ? (
            <InfoPanel
              title="Familia Protectora pendiente de aprobacion"
              copy="La consola operativa se habilita por completo cuando el perfil protector esta aprobado por admin."
            />
          ) : null}

          <section style={styles.metricGrid}>
            {metrics.map((metric) => (
              <button
                key={metric.label}
                onClick={metric.onClick}
                style={{ ...styles.metricCard, ...(metric.tone === "warning" ? styles.warningMetric : {}), ...(metric.tone === "success" ? styles.successMetric : {}) }}
                type="button"
              >
                <span style={styles.metricLabel}>{metric.label}</span>
                <strong style={styles.metricValue}>{metric.value}</strong>
                <span style={styles.metricDetail}>{metric.detail}</span>
              </button>
            ))}
          </section>

          <section style={styles.twoColumnGrid}>
            <div style={styles.panel}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.eyebrow}>Publicaciones</p>
                  <h2 style={styles.sectionTitle}>Mascotas en adopcion</h2>
                </div>
                <span style={styles.countPill}>{listings.length} total</span>
              </div>
              <div style={styles.listStack}>
                {listings.length ? listings.slice(0, 8).map((listing) => (
                  <article key={listing.id} style={styles.listingCard}>
                    {coverUrl(listing) ? <img alt="" src={coverUrl(listing) ?? ""} style={styles.coverImage} /> : <div style={styles.coverFallback}>{listing.petName.slice(0, 1).toUpperCase()}</div>}
                    <div style={{ flex: 1 }}>
                      <strong style={styles.itemTitle}>{listing.petName}</strong>
                      <p style={styles.itemMeta}>{listing.title}</p>
                      <p style={styles.itemMeta}>{listing.city}, {listing.countryCode}</p>
                    </div>
                    <StatusBadge label={listingStatusLabels[listing.status]} tone={listing.status === "published" ? "success" : listing.status === "pending_review" ? "warning" : "neutral"} />
                  </article>
                )) : <EmptyState text="Aun no hay publicaciones para esta familia protectora." />}
              </div>
            </div>

            <div style={styles.panel}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.eyebrow}>Transferencias</p>
                  <h2 style={styles.sectionTitle}>Seguimiento privado</h2>
                </div>
                <span style={styles.countPill}>{transfers.length} total</span>
              </div>
              <div style={styles.listStack}>
                {transfers.length ? transfers.slice(0, 8).map((transfer) => (
                  <article key={transfer.id} style={styles.transferCard}>
                    <div>
                      <strong style={styles.itemTitle}>{transfer.petName}</strong>
                      <p style={styles.itemMeta}>Para {transfer.recipientEmail}</p>
                      <p style={styles.itemMeta}>Creada {formatDate(transfer.createdAt)}</p>
                    </div>
                    <StatusBadge label={transfer.status === "pending" ? "Pendiente" : transfer.status} tone={transfer.status === "accepted" ? "success" : transfer.status === "pending" ? "warning" : "neutral"} />
                  </article>
                )) : <EmptyState text="No hay transferencias privadas iniciadas." />}
              </div>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.eyebrow}>Solicitudes</p>
                <h2 style={styles.sectionTitle}>Bandeja de adopcion</h2>
              </div>
              <span style={styles.countPill}>{filteredApplications.length} visibles</span>
            </div>
            <div style={styles.filtersRow}>
              <select onChange={(event) => setApplicationStatusFilter(event.target.value as ApplicationStatusFilter)} style={styles.select} value={applicationStatusFilter}>
                <option value="all">Todos los estados</option>
                {Object.entries(applicationStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </select>
              <select onChange={(event) => setApplicationPetFilter(event.target.value)} style={styles.select} value={applicationPetFilter}>
                <option value="all">Todas las mascotas</option>
                {petOptions.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
              </select>
            </div>
            <div style={styles.applicationGrid}>
              <div style={styles.listStack}>
                {filteredApplications.length ? filteredApplications.map((application) => (
                  <button
                    key={application.id}
                    onClick={() => {
                      setRejectNote("");
                      void openApplication(application);
                    }}
                    style={styles.applicationCard}
                    type="button"
                  >
                    <div style={styles.applicationCardHeader}>
                      <div>
                        <strong style={styles.itemTitle}>{application.petName}</strong>
                        <p style={styles.itemMeta}>{application.applicantName} - {formatDate(application.submittedAt)}</p>
                      </div>
                      <StatusBadge label={applicationStatusLabels[application.status]} tone={statusTone(application.status)} />
                    </div>
                    <p style={styles.applicationSnippet}>{application.motivation || "Sin motivacion registrada."}</p>
                  </button>
                )) : <EmptyState text="No hay solicitudes con estos filtros." />}
              </div>
              <ApplicationDetailPanel
                detail={selectedApplicationDetail}
                disabled={isSubmitting}
                onRejectNoteChange={setRejectNote}
                onStartTransfer={startTransfer}
                onUpdateStatus={updateApplicationStatus}
                rejectNote={rejectNote}
                transfer={selectedTransfer}
              />
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function FosterPetsPanel({
  applications,
  disabled,
  listings,
  onCreatePet,
  onPrepareListing,
  onRemoveListingPhoto,
  onSaveListing,
  onSetListingCover,
  onShowApplications,
  onSubmitListing,
  onUploadListingPhoto,
  pets,
  profileStatus,
  publicProfileStatus
}: {
  applications: PetAdoptionApplication[];
  disabled: boolean;
  listings: PetAdoptionListing[];
  onCreatePet: (input: Omit<CreatePetInput, "householdId">) => Promise<PetSummary | null>;
  onPrepareListing: (petId: Uuid) => Promise<PetAdoptionListing | null>;
  onRemoveListingPhoto: (media: PetAdoptionListingMedia) => Promise<void>;
  onSaveListing: (input: PetAdoptionListingInput) => Promise<PetAdoptionListing | null>;
  onSetListingCover: (mediaId: Uuid) => Promise<PetAdoptionListingMedia | null>;
  onShowApplications: (petId: Uuid) => void;
  onSubmitListing: (listingId: Uuid) => Promise<PetAdoptionListing | null>;
  onUploadListingPhoto: (listingId: Uuid, file: File) => Promise<PetAdoptionListingMedia | null>;
  pets: PetSummary[];
  profileStatus: string | null;
  publicProfileStatus: string | null;
}) {
  const canCreatePet = profileStatus === "approved";
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<Omit<CreatePetInput, "householdId">>({
    birthDate: "",
    breed: "",
    isSterilized: null,
    name: "",
    notes: "",
    sex: "unknown",
    species: ""
  });
  const listingByPetId = useMemo(() => new Map(listings.map((listing) => [listing.petId, listing])), [listings]);
  const applicationCountByPetId = useMemo(
    () =>
      applications.reduce((countMap, application) => {
        countMap.set(application.petId, (countMap.get(application.petId) ?? 0) + 1);
        return countMap;
      }, new Map<string, number>()),
    [applications]
  );

  function updateField<K extends keyof Omit<CreatePetInput, "householdId">>(field: K, value: Omit<CreatePetInput, "householdId">[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm({
      birthDate: "",
      breed: "",
      isSterilized: null,
      name: "",
      notes: "",
      sex: "unknown",
      species: ""
    });
  }

  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>Acogida</p>
          <h2 style={styles.sectionTitle}>Mascotas bajo acogida</h2>
          <p style={styles.bodyText}>Mascotas registradas bajo esta Familia Protectora.</p>
        </div>
        <div style={styles.heroActions}>
          <span style={styles.countPill}>{pets.length} total</span>
          <button disabled={disabled || !canCreatePet} onClick={() => setIsCreating((current) => !current)} style={styles.primaryButton} type="button">
            {isCreating ? "Ocultar formulario" : "Registrar mascota en acogida"}
          </button>
        </div>
      </div>

      {!canCreatePet ? <Notice tone="info" message="Primero espera la aprobacion de tu Familia Protectora." /> : null}
      {canCreatePet && publicProfileStatus !== "approved" ? (
        <Notice tone="info" message="Para publicar adopciones, completa y aprueba tu perfil publico." />
      ) : null}

      {isCreating ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onCreatePet({
              ...form,
              birthDate: form.birthDate || null,
              breed: form.breed?.trim() || null,
              notes: form.notes?.trim() || null
            }).then((pet) => {
              if (pet) {
                resetForm();
                setIsCreating(false);
              }
            });
          }}
          style={styles.formStack}
        >
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>
              Nombre
              <input disabled={disabled} onChange={(event) => updateField("name", event.target.value)} placeholder="Ej. Luna" style={styles.input} value={form.name} />
            </label>
            <label style={styles.fieldLabel}>
              Especie
              <input disabled={disabled} onChange={(event) => updateField("species", event.target.value)} placeholder="Perro, gato u otro" style={styles.input} value={form.species} />
            </label>
            <label style={styles.fieldLabel}>
              Raza o tipo
              <input disabled={disabled} onChange={(event) => updateField("breed", event.target.value)} placeholder="Opcional" style={styles.input} value={form.breed ?? ""} />
            </label>
            <label style={styles.fieldLabel}>
              Sexo
              <select disabled={disabled} onChange={(event) => updateField("sex", event.target.value as PetSex)} style={styles.input} value={form.sex ?? "unknown"}>
                {Object.entries(petSexLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Fecha de nacimiento
              <input disabled={disabled} onChange={(event) => updateField("birthDate", event.target.value)} style={styles.input} type="date" value={form.birthDate ?? ""} />
            </label>
            <label style={styles.fieldLabel}>
              Esterilizada
              <select
                disabled={disabled}
                onChange={(event) => updateField("isSterilized", event.target.value === "unknown" ? null : event.target.value === "yes")}
                style={styles.input}
                value={form.isSterilized === null ? "unknown" : form.isSterilized ? "yes" : "no"}
              >
                <option value="unknown">Sin indicar</option>
                <option value="yes">Si</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>
          <label style={styles.fieldLabel}>
            Notas breves
            <textarea
              disabled={disabled}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Notas de comportamiento, rescate o cuidado inicial."
              style={styles.textarea}
              value={form.notes ?? ""}
            />
          </label>
          <div style={styles.heroActions}>
            <button disabled={disabled} style={styles.primaryButton} type="submit">
              {disabled ? "Guardando..." : "Registrar mascota"}
            </button>
            <button
              disabled={disabled}
              onClick={() => {
                resetForm();
                setIsCreating(false);
              }}
              style={styles.secondaryButton}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {pets.length ? (
        <div style={styles.fosterPetGrid}>
          {pets.map((pet) => {
            const listing = listingByPetId.get(pet.id);
            const applicationCount = applicationCountByPetId.get(pet.id) ?? 0;

            return (
              <article key={pet.id} style={styles.fosterPetCard}>
                <div style={styles.applicationCardHeader}>
                  <div>
                    <strong style={styles.itemTitle}>{pet.name}</strong>
                    <p style={styles.itemMeta}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</p>
                    <p style={styles.itemMeta}>{pet.birthDate ? `Nacio ${formatDate(pet.birthDate)}` : "Edad no indicada"} - {petSexLabels[pet.sex]}</p>
                  </div>
                  <StatusBadge label="En acogida" tone="success" />
                </div>
                <p style={styles.itemMeta}>{pet.notes || "Sin notas de acogida registradas."}</p>
                <AdoptionPublicationFlow
                  applicationCount={applicationCount}
                  disabled={disabled}
                  listing={listing ?? null}
                  onPrepare={() => onPrepareListing(pet.id)}
                  onRemovePhoto={onRemoveListingPhoto}
                  onSave={onSaveListing}
                  onSetCover={onSetListingCover}
                  onShowApplications={() => onShowApplications(pet.id)}
                  onSubmit={onSubmitListing}
                  onUploadPhoto={onUploadListingPhoto}
                  pet={pet}
                />
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState text="Aun no tienes mascotas bajo acogida. Registra la primera mascota cuando este bajo cuidado de esta Familia Protectora." />
      )}
    </section>
  );
}

function AdoptionPublicationFlow({
  applicationCount,
  disabled,
  listing,
  onPrepare,
  onRemovePhoto,
  onSave,
  onSetCover,
  onShowApplications,
  onSubmit,
  onUploadPhoto,
  pet
}: {
  applicationCount: number;
  disabled: boolean;
  listing: PetAdoptionListing | null;
  onPrepare: () => Promise<PetAdoptionListing | null>;
  onRemovePhoto: (media: PetAdoptionListingMedia) => Promise<void>;
  onSave: (input: PetAdoptionListingInput) => Promise<PetAdoptionListing | null>;
  onSetCover: (mediaId: Uuid) => Promise<PetAdoptionListingMedia | null>;
  onShowApplications: () => void;
  onSubmit: (listingId: Uuid) => Promise<PetAdoptionListing | null>;
  onUploadPhoto: (listingId: Uuid, file: File) => Promise<PetAdoptionListingMedia | null>;
  pet: PetSummary;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [form, setForm] = useState<PetAdoptionListingInput>(() => buildAdoptionListingForm(listing, pet));
  const steps = buildAdoptionSteps(listing);
  const canEdit = !listing || ["draft", "rejected", "paused"].includes(listing.status);
  const canSubmit = listing ? ["draft", "rejected", "paused"].includes(listing.status) : false;
  const canManageMedia = Boolean(listing && !["adopted", "closed"].includes(listing.status));

  useEffect(() => {
    setForm(buildAdoptionListingForm(listing, pet));
  }, [listing?.id, listing?.updatedAt, pet.id]);

  function resetForm() {
    setForm(buildAdoptionListingForm(listing, pet));
  }

  function updateField<K extends keyof PetAdoptionListingInput>(field: K, value: PetAdoptionListingInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div style={styles.publicationFlowBox}>
      <div style={styles.processRail}>
        {steps.map((step) => (
          <div key={step.label} style={{ ...styles.processStep, ...(step.state === "done" ? styles.processStepDone : {}), ...(step.state === "active" ? styles.processStepActive : {}) }}>
            <span style={styles.processDot}>{step.state === "done" ? "✓" : step.order}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <p style={styles.itemMeta}>{publicationGuidance(listing)}</p>

      {listing ? (
        <section style={styles.mediaGalleryBox}>
          <div style={styles.sectionHeaderCompact}>
            <div>
              <strong style={styles.itemTitle}>Fotos publicas</strong>
              <p style={styles.itemMeta}>Estas fotos seran visibles para familias interesadas cuando admin las apruebe.</p>
            </div>
            <span style={styles.countPill}>{listing.media.length}/8 fotos</span>
          </div>

          {isUploadingPhoto ? (
            <div style={styles.mediaUploadNotice}>Subiendo foto y actualizando galeria...</div>
          ) : null}

          {listing.media.length ? (
            <div style={styles.mediaRail}>
              {listing.media.map((media) => (
                <article key={media.id} style={styles.mediaTile}>
                  {media.signedUrl ? (
                    <img alt={`Foto publica de ${pet.name}`} src={media.signedUrl} style={styles.mediaImage} />
                  ) : (
                    <div style={styles.mediaFallback}>{pet.name.slice(0, 1).toUpperCase()}</div>
                  )}
                  <div style={styles.mediaTileFooter}>
                    <span style={styles.mediaStatus}>{getAdoptionMediaStatusLabel(media.moderationStatus)}{media.isCover ? " - Portada" : ""}</span>
                    <div style={styles.mediaActions}>
                      {!media.isCover ? (
                        <button
                          disabled={disabled || !canManageMedia}
                          onClick={() => void onSetCover(media.id)}
                          style={styles.iconPillButton}
                          title="Marcar como portada"
                          type="button"
                        >
                          Portada
                        </button>
                      ) : null}
                      <button
                        disabled={disabled || !canManageMedia}
                        onClick={() => void onRemovePhoto(media)}
                        style={styles.dangerPillButton}
                        title="Quitar foto"
                        type="button"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={styles.mediaEmptyState}>
              <strong>Agrega fotos para hacer mas cercana la publicacion.</strong>
              <span>Usa imagenes claras de la mascota. No subas documentos privados ni datos sensibles.</span>
            </div>
          )}

          <label style={{ ...styles.secondaryButton, opacity: disabled || !canManageMedia || listing.media.length >= 8 ? 0.55 : 1 }}>
            {isUploadingPhoto ? "Subiendo..." : "+ Subir foto"}
            <input
              accept=".jpg,.jpeg,.jpe,.jfif,.png,.webp,image/jpeg,image/png,image/webp"
              disabled={disabled || isUploadingPhoto || !canManageMedia || listing.media.length >= 8}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";

                if (file) {
                  setIsUploadingPhoto(true);
                  void onUploadPhoto(listing.id, file).finally(() => setIsUploadingPhoto(false));
                }
              }}
              style={styles.fileInput}
              type="file"
            />
          </label>
        </section>
      ) : null}

      <div style={styles.petActionsRow}>
        {!listing ? (
          <button disabled={disabled} onClick={() => void onPrepare()} style={styles.secondaryButton} type="button">
            Preparar publicacion
          </button>
        ) : null}
        {listing && canEdit ? (
          <button disabled={disabled} onClick={() => setIsEditing((current) => !current)} style={styles.secondaryButton} type="button">
            {isEditing ? "Ocultar formulario" : "Completar publicacion"}
          </button>
        ) : null}
        {listing && canSubmit ? (
          <button disabled={disabled} onClick={() => void onSubmit(listing.id)} style={styles.primaryButton} type="button">
            Enviar a revision
          </button>
        ) : null}
        {applicationCount ? (
          <button onClick={onShowApplications} style={styles.secondaryButton} type="button">
            Ver solicitudes ({applicationCount})
          </button>
        ) : (
          <span style={styles.itemMeta}>Sin solicitudes todavia</span>
        )}
      </div>

      {isEditing && listing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(form).then((saved) => {
              if (saved) {
                setForm(buildAdoptionListingForm(saved, pet));
                setIsEditing(false);
              }
            });
          }}
          style={styles.formStack}
        >
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>
              Titulo
              <input disabled={disabled} onChange={(event) => updateField("title", event.target.value)} style={styles.input} value={form.title} />
            </label>
            <label style={styles.fieldLabel}>
              Ciudad
              <input disabled={disabled} onChange={(event) => updateField("city", event.target.value)} style={styles.input} value={form.city} />
            </label>
            <label style={styles.fieldLabel}>
              Region
              <input disabled={disabled} onChange={(event) => updateField("stateRegion", event.target.value)} style={styles.input} value={form.stateRegion ?? ""} />
            </label>
            <label style={styles.fieldLabel}>
              Pais
              <input disabled={disabled} maxLength={2} onChange={(event) => updateField("countryCode", event.target.value.toUpperCase())} style={styles.input} value={form.countryCode ?? "PA"} />
            </label>
          </div>
          <label style={styles.fieldLabel}>
            Historia publica
            <textarea disabled={disabled} onChange={(event) => updateField("publicStory", event.target.value)} style={styles.textarea} value={form.publicStory ?? ""} />
          </label>
          <label style={styles.fieldLabel}>
            Personalidad
            <textarea disabled={disabled} onChange={(event) => updateField("personalityNotes", event.target.value)} style={styles.textarea} value={form.personalityNotes ?? ""} />
          </label>
          <label style={styles.fieldLabel}>
            Salud publica resumida
            <textarea disabled={disabled} onChange={(event) => updateField("publicHealthSummary", event.target.value)} style={styles.textarea} value={form.publicHealthSummary ?? ""} />
          </label>
          <label style={styles.fieldLabel}>
            Requisitos de adopcion
            <textarea disabled={disabled} onChange={(event) => updateField("adoptionRequirements", event.target.value)} style={styles.textarea} value={form.adoptionRequirements ?? ""} />
          </label>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>
              Ninos
              <input disabled={disabled} onChange={(event) => updateField("compatibilityChildren", event.target.value)} style={styles.input} value={form.compatibilityChildren ?? ""} />
            </label>
            <label style={styles.fieldLabel}>
              Perros
              <input disabled={disabled} onChange={(event) => updateField("compatibilityDogs", event.target.value)} style={styles.input} value={form.compatibilityDogs ?? ""} />
            </label>
            <label style={styles.fieldLabel}>
              Gatos
              <input disabled={disabled} onChange={(event) => updateField("compatibilityCats", event.target.value)} style={styles.input} value={form.compatibilityCats ?? ""} />
            </label>
          </div>
          <label style={styles.fieldLabel}>
            Necesidades especiales
            <textarea disabled={disabled} onChange={(event) => updateField("specialNeedsNotes", event.target.value)} style={styles.textarea} value={form.specialNeedsNotes ?? ""} />
          </label>
          <div style={styles.heroActions}>
            <button disabled={disabled} style={styles.primaryButton} type="submit">Guardar borrador</button>
            <button
              disabled={disabled}
              onClick={() => {
                resetForm();
                setIsEditing(false);
              }}
              style={styles.secondaryButton}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function PublicProfilePanel({
  disabled,
  onSave,
  onSubmit,
  profileStatus,
  publicProfile,
  selectedHouseholdId,
  selectedHouseholdName
}: {
  disabled: boolean;
  onSave: (input: ProtectivePublicProfileInput) => Promise<ProtectivePublicProfile | null>;
  onSubmit: (profileId: Uuid) => Promise<ProtectivePublicProfile | null>;
  profileStatus: string | null;
  publicProfile: ProtectivePublicProfile | null;
  selectedHouseholdId: Uuid | null;
  selectedHouseholdName: string;
}) {
  const canManage = Boolean(selectedHouseholdId && profileStatus === "approved");
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfileId, setDraftProfileId] = useState<Uuid | null>(publicProfile?.id ?? null);
  const [form, setForm] = useState<ProtectivePublicProfileInput>(() => buildPublicProfileForm(publicProfile, selectedHouseholdId, selectedHouseholdName));

  function resetForm() {
    setForm(buildPublicProfileForm(publicProfile, selectedHouseholdId, selectedHouseholdName));
  }

  function updateField<K extends keyof ProtectivePublicProfileInput>(field: K, value: ProtectivePublicProfileInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const statusLabel = publicProfile ? publicStatusLabel(publicProfile.moderationStatus) : "No configurado";
  const actionLabel = !publicProfile ? "Crear perfil publico" : publicProfile.moderationStatus === "rejected" ? "Corregir perfil" : "Editar perfil";
  const canSubmit = Boolean(draftProfileId ?? publicProfile?.id) && publicProfile?.moderationStatus !== "pending_review" && publicProfile?.moderationStatus !== "approved";

  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>Perfil publico</p>
          <h2 style={styles.sectionTitle}>{statusLabel}</h2>
        </div>
        <StatusBadge
          label={statusLabel}
          tone={publicProfile?.moderationStatus === "approved" ? "success" : publicProfile?.moderationStatus === "pending_review" ? "warning" : "neutral"}
        />
      </div>

      {!canManage ? (
        <p style={styles.bodyText}>Primero espera la aprobacion de tu Familia Protectora para crear el perfil publico.</p>
      ) : (
        <>
          <div style={styles.publicProfileSummary}>
            <InfoTile label="Nombre publico" value={publicProfile?.displayName ?? "No configurado"} />
            <InfoTile label="Ciudad" value={publicProfile ? `${publicProfile.city}, ${publicProfile.countryCode}` : "Pendiente"} />
            <InfoTile label="Contacto" value={publicProfile ? contactPolicyLabels[publicProfile.contactPolicy] : "Solo plataforma"} />
          </div>
          <p style={styles.bodyText}>
            Guardar el perfil no lo hace publico automaticamente. Despues de guardar, debes enviarlo a revision y admin debe aprobarlo.
          </p>
          {publicProfile?.moderationStatus === "approved" ? (
            <p style={styles.bodyText}>El perfil esta aprobado. Si editas datos publicos importantes, revisa si corresponde reenviarlo a revision.</p>
          ) : null}
          {publicProfile?.moderationStatus === "pending_review" ? (
            <p style={styles.bodyText}>El perfil esta pendiente de revision. Admin debe aprobarlo antes de mostrarlo como perfil publico confiable.</p>
          ) : null}
          {publicProfile?.reviewNotes ? <Notice tone="info" message={`Nota de revision: ${publicProfile.reviewNotes}`} /> : null}

          <div style={styles.heroActions}>
            <button disabled={disabled || !canManage} onClick={() => setIsEditing((current) => !current)} style={styles.primaryButton} type="button">
              {isEditing ? "Ocultar formulario" : actionLabel}
            </button>
            {canSubmit ? (
              <button
                disabled={disabled}
                onClick={() => void onSubmit((draftProfileId ?? publicProfile?.id) as Uuid)}
                style={styles.secondaryButton}
                type="button"
              >
                Enviar a revision
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void onSave({ ...form, householdId: selectedHouseholdId as Uuid }).then((saved) => {
                  if (saved) {
                    setDraftProfileId(saved.id);
                    setForm(buildPublicProfileForm(saved, selectedHouseholdId, selectedHouseholdName));
                    setIsEditing(false);
                  }
                });
              }}
              style={styles.formStack}
            >
              <div style={styles.formGrid}>
                <label style={styles.fieldLabel}>
                  Nombre publico
                  <input
                    disabled={disabled}
                    onChange={(event) => updateField("displayName", event.target.value)}
                    placeholder="Nombre visible de la familia"
                    style={styles.input}
                    value={form.displayName}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Ciudad
                  <input
                    disabled={disabled}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="Ej. Panama City"
                    style={styles.input}
                    value={form.city}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Region
                  <input
                    disabled={disabled}
                    onChange={(event) => updateField("stateRegion", event.target.value)}
                    placeholder="Opcional"
                    style={styles.input}
                    value={form.stateRegion ?? ""}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Pais
                  <input
                    disabled={disabled}
                    maxLength={2}
                    onChange={(event) => updateField("countryCode", event.target.value.toUpperCase())}
                    placeholder="PA"
                    style={styles.input}
                    value={form.countryCode ?? "PA"}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Politica de contacto
                  <select
                    disabled={disabled}
                    onChange={(event) => updateField("contactPolicy", event.target.value as ProtectiveContactPolicy)}
                    style={styles.input}
                    value={form.contactPolicy ?? "platform_only"}
                  >
                    {Object.entries(contactPolicyLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.fieldLabel}>
                  Etiqueta de contacto
                  <input
                    disabled={disabled}
                    onChange={(event) => updateField("publicContactLabel", event.target.value)}
                    placeholder="Ej. WhatsApp de adopciones"
                    style={styles.input}
                    value={form.publicContactLabel ?? ""}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Dato de contacto
                  <input
                    disabled={disabled}
                    onChange={(event) => updateField("publicContactValue", event.target.value)}
                    placeholder="Visible solo si decides hacerlo publico"
                    style={styles.input}
                    value={form.publicContactValue ?? ""}
                  />
                </label>
              </div>
              <label style={styles.fieldLabel}>
                Mision
                <textarea
                  disabled={disabled}
                  onChange={(event) => updateField("mission", event.target.value)}
                  placeholder="Describe la mision de tu familia protectora."
                  style={styles.textarea}
                  value={form.mission ?? ""}
                />
              </label>
              <label style={styles.fieldLabel}>
                Historia publica
                <textarea
                  disabled={disabled}
                  onChange={(event) => updateField("publicStory", event.target.value)}
                  placeholder="Cuenta brevemente la historia o enfoque de la familia protectora."
                  style={styles.textarea}
                  value={form.publicStory ?? ""}
                />
              </label>
              <label style={styles.fieldLabel}>
                Necesidades principales
                <textarea
                  disabled={disabled}
                  onChange={(event) => updateField("needsSummary", event.target.value)}
                  placeholder="Ej. alimento, hogares temporales, transporte, apoyo veterinario."
                  style={styles.textarea}
                  value={form.needsSummary ?? ""}
                />
              </label>
              <div style={styles.heroActions}>
                <button disabled={disabled} style={styles.primaryButton} type="submit">
                  {disabled ? "Guardando..." : "Guardar perfil"}
                </button>
                <button
                  disabled={disabled}
                  onClick={() => {
                    resetForm();
                    setIsEditing(false);
                  }}
                  style={styles.secondaryButton}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}

function CreateProtectiveHouseholdPanel({
  disabled,
  onSubmit
}: {
  disabled: boolean;
  onSubmit: (input: CreateProtectiveHouseholdInput) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<CreateProtectiveHouseholdInput>({
    city: "",
    contactNotes: "",
    countryCode: "PA",
    displayName: "",
    householdName: "",
    organizationType: "foster_home",
    publicNotes: "",
    stateRegion: ""
  });

  function updateField<K extends keyof CreateProtectiveHouseholdInput>(field: K, value: CreateProtectiveHouseholdInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>Primer paso</p>
          <h2 style={styles.sectionTitle}>Crea tu Familia Protectora</h2>
        </div>
        <button onClick={() => setIsOpen((current) => !current)} style={styles.primaryButton} type="button">
          {isOpen ? "Ocultar formulario" : "Crear Familia Protectora"}
        </button>
      </div>
      <p style={styles.bodyText}>
        Este espacio es para hogares, fundaciones y rescatistas que cuidan mascotas y gestionan adopciones responsables.
        La familia protectora se revisa antes de habilitar publicaciones y solicitudes.
      </p>
      <div style={styles.guidanceGrid}>
        <InfoTile label="1" value="Crea una familia separada" />
        <InfoTile label="2" value="Envia solicitud a revision" />
        <InfoTile label="3" value="Admin aprueba antes de publicar" />
      </div>

      {isOpen ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
          style={styles.formStack}
        >
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>
              Nombre de la familia protectora
              <input
                disabled={disabled}
                onChange={(event) => updateField("householdName", event.target.value)}
                placeholder="Ej. Patitas en casa"
                style={styles.input}
                value={form.householdName}
              />
            </label>
            <label style={styles.fieldLabel}>
              Nombre visible
              <input
                disabled={disabled}
                onChange={(event) => updateField("displayName", event.target.value)}
                placeholder="Como quieres que lo vea admin"
                style={styles.input}
                value={form.displayName}
              />
            </label>
            <label style={styles.fieldLabel}>
              Tipo
              <select
                disabled={disabled}
                onChange={(event) => updateField("organizationType", event.target.value as ProtectiveHouseholdOrganizationType)}
                style={styles.input}
                value={form.organizationType}
              >
                {Object.entries(organizationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Ciudad
              <input
                disabled={disabled}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="Ej. Panama City"
                style={styles.input}
                value={form.city}
              />
            </label>
            <label style={styles.fieldLabel}>
              Region
              <input
                disabled={disabled}
                onChange={(event) => updateField("stateRegion", event.target.value)}
                placeholder="Opcional"
                style={styles.input}
                value={form.stateRegion ?? ""}
              />
            </label>
            <label style={styles.fieldLabel}>
              Pais
              <input
                disabled={disabled}
                maxLength={2}
                onChange={(event) => updateField("countryCode", event.target.value.toUpperCase())}
                placeholder="PA"
                style={styles.input}
                value={form.countryCode}
              />
            </label>
          </div>
          <label style={styles.fieldLabel}>
            Motivo o mision breve
            <textarea
              disabled={disabled}
              onChange={(event) => updateField("publicNotes", event.target.value)}
              placeholder="Cuenta brevemente por que quieres operar como familia protectora."
              style={styles.textarea}
              value={form.publicNotes ?? ""}
            />
          </label>
          <label style={styles.fieldLabel}>
            Contacto o disponibilidad para revision
            <textarea
              disabled={disabled}
              onChange={(event) => updateField("contactNotes", event.target.value)}
              placeholder="Indica horario, telefono de referencia o notas para que admin pueda revisar la solicitud."
              style={styles.textarea}
              value={form.contactNotes ?? ""}
            />
          </label>
          <div style={styles.heroActions}>
            <button disabled={disabled} style={styles.primaryButton} type="submit">
              {disabled ? "Enviando..." : "Enviar solicitud"}
            </button>
            <button disabled={disabled} onClick={() => setIsOpen(false)} style={styles.secondaryButton} type="button">Cancelar</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function ApplicationDetailPanel({
  detail,
  disabled,
  onRejectNoteChange,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  transfer
}: {
  detail: { application: PetAdoptionApplication; history: PetAdoptionApplicationStatusHistory[] } | null;
  disabled: boolean;
  onRejectNoteChange: (value: string) => void;
  onStartTransfer: (application: PetAdoptionApplication) => Promise<void>;
  onUpdateStatus: (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => Promise<void>;
  rejectNote: string;
  transfer: PetTransferRecord | undefined;
}) {
  if (!detail) {
    return <EmptyState text="Selecciona una solicitud para revisar motivacion, datos y timeline." />;
  }

  const { application, history } = detail;

  return (
    <aside style={styles.detailPanel}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>Detalle</p>
          <h3 style={styles.detailTitle}>{application.applicantName}</h3>
          <p style={styles.itemMeta}>{application.applicantEmail}{application.applicantPhone ? ` - ${application.applicantPhone}` : ""}</p>
        </div>
        <StatusBadge label={applicationStatusLabels[application.status]} tone={statusTone(application.status)} />
      </div>

      <div style={styles.detailGrid}>
        <InfoTile label="Mascota" value={application.petName} />
        <InfoTile label="Vivienda" value={application.housingType} />
        <InfoTile label="Ninos" value={formatBoolean(application.hasChildren)} />
        <InfoTile label="Otras mascotas" value={formatBoolean(application.hasOtherPets)} />
      </div>

      <TextBlock label="Motivacion" value={application.motivation} />
      <TextBlock label="Experiencia" value={application.petExperience} />
      <TextBlock label="Disponibilidad" value={application.availabilityNotes || "Sin notas adicionales."} />

      {transfer ? (
        <div style={styles.transferNotice}>
          <strong>Transferencia vinculada</strong>
          <span>Estado: {transfer.status}. La custodia solo cambia cuando la familia receptora acepta.</span>
        </div>
      ) : null}

      <ApplicationActions
        application={application}
        disabled={disabled}
        onRejectNoteChange={onRejectNoteChange}
        onStartTransfer={onStartTransfer}
        onUpdateStatus={onUpdateStatus}
        rejectNote={rejectNote}
        transfer={transfer}
      />

      <div style={styles.historyBox}>
        <h4 style={styles.historyTitle}>Historial</h4>
        {history.length ? history.map((entry) => (
          <div key={entry.id} style={styles.historyItem}>
            <strong>{entry.fromStatus ? `${applicationStatusLabels[entry.fromStatus]} -> ` : ""}{applicationStatusLabels[entry.toStatus]}</strong>
            <span>{formatDate(entry.createdAt)}{entry.changedByEmail ? ` - ${entry.changedByEmail}` : ""}</span>
            {entry.changeNotes ? <p>{entry.changeNotes}</p> : null}
          </div>
        )) : <p style={styles.itemMeta}>Sin historial todavia.</p>}
      </div>
    </aside>
  );
}

function ApplicationActions({
  application,
  disabled,
  onRejectNoteChange,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  transfer
}: {
  application: PetAdoptionApplication;
  disabled: boolean;
  onRejectNoteChange: (value: string) => void;
  onStartTransfer: (application: PetAdoptionApplication) => Promise<void>;
  onUpdateStatus: (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => Promise<void>;
  rejectNote: string;
  transfer: PetTransferRecord | undefined;
}) {
  if (["rejected", "withdrawn", "converted_to_transfer"].includes(application.status)) {
    return <p style={styles.itemMeta}>Solicitud en modo consulta.</p>;
  }

  return (
    <div style={styles.actionsBox}>
      {application.status === "submitted" ? <button disabled={disabled} onClick={() => void onUpdateStatus(application, "in_review")} style={styles.primaryButton} type="button">Marcar en revision</button> : null}
      {application.status === "in_review" ? <button disabled={disabled} onClick={() => void onUpdateStatus(application, "interview")} style={styles.primaryButton} type="button">Pasar a entrevista</button> : null}
      {application.status === "interview" ? <button disabled={disabled} onClick={() => void onUpdateStatus(application, "approved")} style={styles.primaryButton} type="button">Aprobar solicitud</button> : null}
      {application.status === "approved" && !transfer ? <button disabled={disabled} onClick={() => void onStartTransfer(application)} style={styles.primaryButton} type="button">Iniciar transferencia</button> : null}
      {application.status === "approved" && transfer ? <p style={styles.itemMeta}>La transferencia ya fue iniciada para esta solicitud.</p> : null}
      {application.status !== "approved" ? (
        <div style={styles.rejectBox}>
          <textarea
            disabled={disabled}
            onChange={(event) => onRejectNoteChange(event.target.value)}
            placeholder="Nota obligatoria para rechazar"
            style={styles.textarea}
            value={rejectNote}
          />
          <button disabled={disabled || !rejectNote.trim()} onClick={() => void onUpdateStatus(application, "rejected", rejectNote)} style={styles.dangerButton} type="button">Rechazar</button>
        </div>
      ) : null}
    </div>
  );
}

function InfoPanel({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.bodyText}>{copy}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoTile}>
      <span style={styles.tileLabel}>{label}</span>
      <strong style={styles.tileValue}>{value}</strong>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.textBlock}>
      <span style={styles.tileLabel}>{label}</span>
      <p style={styles.bodyText}>{value}</p>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "neutral" | "success" | "warning" }) {
  return <span style={{ ...styles.statusBadge, ...(tone === "success" ? styles.successBadge : {}), ...(tone === "warning" ? styles.warningBadge : {}) }}>{label}</span>;
}

function Notice({ message, tone }: { message: string; tone: "error" | "info" }) {
  return <div style={{ ...styles.notice, ...(tone === "error" ? styles.errorNotice : styles.infoNotice) }}>{message}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={styles.emptyState}>{text}</div>;
}

function protectiveStatusLabel(status: string) {
  const labels: Record<string, string> = {
    approved: "Aprobada",
    draft: "Borrador",
    pending_review: "Pendiente de revision",
    rejected: "Rechazada",
    suspended: "Suspendida"
  };

  return labels[status] ?? status;
}

function publicStatusLabel(status: string) {
  const labels: Record<string, string> = {
    approved: "Aprobado",
    draft: "Borrador",
    pending_review: "Pendiente de revision",
    rejected: "Rechazado",
    suspended: "Suspendido"
  };

  return labels[status] ?? status;
}

function formatBoolean(value: boolean | null) {
  if (value === true) {
    return "Si";
  }

  if (value === false) {
    return "No";
  }

  return "No indicado";
}

const styles: Record<string, React.CSSProperties> = {
  actionsBox: { display: "flex", flexDirection: "column", gap: "10px" },
  applicationCard: {
    background: "#fffdf8",
    border: "1px solid rgba(20, 184, 166, 0.18)",
    borderRadius: "18px",
    cursor: "pointer",
    display: "grid",
    gap: "8px",
    padding: "14px",
    textAlign: "left"
  },
  applicationCardHeader: { alignItems: "flex-start", display: "flex", gap: "10px", justifyContent: "space-between" },
  applicationGrid: { display: "grid", gap: "18px", gridTemplateColumns: "minmax(260px, 0.8fr) minmax(320px, 1.2fr)" },
  applicationSnippet: { color: "#475569", fontSize: "13px", lineHeight: 1.45, margin: 0 },
  bodyText: { color: "#475569", fontSize: "14px", lineHeight: 1.55, margin: 0 },
  contextGrid: { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" },
  countPill: { background: "#f8fafc", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f766e", fontSize: "12px", fontWeight: 800, padding: "8px 12px" },
  coverFallback: { alignItems: "center", background: "#dff7f3", borderRadius: "16px", color: "#0f766e", display: "flex", fontSize: "22px", fontWeight: 900, height: "66px", justifyContent: "center", width: "66px" },
  coverImage: { borderRadius: "16px", height: "66px", objectFit: "cover", width: "66px" },
  dangerButton: { background: "#fff1f2", border: "1px solid rgba(185, 28, 28, 0.22)", borderRadius: "999px", color: "#991b1b", cursor: "pointer", fontSize: "13px", fontWeight: 800, padding: "10px 14px" },
  dangerPillButton: { background: "#fff1f2", border: "1px solid rgba(185, 28, 28, 0.18)", borderRadius: "999px", color: "#991b1b", cursor: "pointer", fontSize: "11px", fontWeight: 900, padding: "7px 9px" },
  detailGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" },
  detailPanel: { background: "#f8fffd", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "22px", display: "grid", gap: "14px", padding: "18px" },
  detailTitle: { color: "#0f172a", fontSize: "20px", margin: 0 },
  emptyState: { background: "#fffdf8", border: "1px dashed rgba(15, 118, 110, 0.2)", borderRadius: "18px", color: "#64748b", fontSize: "14px", padding: "18px" },
  errorNotice: { background: "#fef2f2", borderColor: "rgba(185, 28, 28, 0.22)", color: "#991b1b" },
  eyebrow: { color: "#0f766e", fontSize: "12px", fontWeight: 900, letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" },
  filtersRow: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" },
  fieldLabel: { color: "#334155", display: "grid", fontSize: "12px", fontWeight: 900, gap: "7px", textTransform: "uppercase" },
  fileInput: { height: 1, opacity: 0, overflow: "hidden", position: "absolute", width: 1 },
  formGrid: { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  formStack: { display: "grid", gap: "14px" },
  fosterPetCard: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "20px", display: "grid", gap: "12px", padding: "14px" },
  fosterPetGrid: { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" },
  guidanceGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" },
  hero: { alignItems: "flex-start", background: "linear-gradient(135deg, #0f766e, #115e59)", borderRadius: "28px", color: "white", display: "flex", gap: "24px", justifyContent: "space-between", padding: "30px" },
  heroActions: { display: "flex", flexWrap: "wrap", gap: "10px" },
  heroCopy: { color: "rgba(255,255,255,0.86)", fontSize: "15px", lineHeight: 1.55, margin: "8px 0 0", maxWidth: "720px" },
  heroTitle: { fontSize: "34px", lineHeight: 1.05, margin: "8px 0 0" },
  historyBox: { borderTop: "1px solid rgba(15, 118, 110, 0.16)", display: "grid", gap: "8px", paddingTop: "12px" },
  historyItem: { background: "#fffdf8", borderRadius: "14px", display: "grid", gap: "3px", padding: "10px" },
  historyTitle: { color: "#0f172a", fontSize: "15px", margin: 0 },
  infoNotice: { background: "#ecfeff", borderColor: "rgba(15, 118, 110, 0.2)", color: "#0f766e" },
  infoTile: { background: "#fffdf8", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "18px", display: "grid", gap: "4px", padding: "14px" },
  input: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f172a", fontSize: "14px", fontWeight: 700, padding: "12px 14px", textTransform: "none" },
  iconPillButton: { background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f766e", cursor: "pointer", fontSize: "11px", fontWeight: 900, padding: "7px 9px" },
  itemMeta: { color: "#64748b", fontSize: "12px", lineHeight: 1.4, margin: "4px 0 0" },
  itemTitle: { color: "#0f172a", fontSize: "15px" },
  listingCard: { alignItems: "center", background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "20px", display: "flex", gap: "12px", padding: "12px" },
  listStack: { display: "grid", gap: "10px" },
  metricCard: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.15)", borderRadius: "22px", cursor: "pointer", display: "grid", gap: "6px", padding: "18px", textAlign: "left" },
  metricDetail: { color: "#64748b", fontSize: "13px" },
  metricGrid: { display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  metricLabel: { color: "#0f766e", fontSize: "12px", fontWeight: 900, textTransform: "uppercase" },
  metricValue: { color: "#0f766e", fontSize: "30px", lineHeight: 1 },
  mediaActions: { display: "flex", flexWrap: "wrap", gap: "6px" },
  mediaEmptyState: { background: "#fffdf8", border: "1px dashed rgba(15, 118, 110, 0.18)", borderRadius: "16px", color: "#64748b", display: "grid", fontSize: "12px", gap: "4px", padding: "12px" },
  mediaFallback: { alignItems: "center", background: "#dff7f3", color: "#0f766e", display: "flex", fontSize: "24px", fontWeight: 900, height: "112px", justifyContent: "center", width: "100%" },
  mediaGalleryBox: { background: "rgba(255, 255, 255, 0.72)", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "18px", display: "grid", gap: "10px", padding: "12px" },
  mediaImage: { display: "block", height: "112px", objectFit: "cover", width: "100%" },
  mediaRail: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" },
  mediaStatus: { color: "#475569", fontSize: "11px", fontWeight: 900 },
  mediaTile: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "16px", overflow: "hidden" },
  mediaTileFooter: { display: "grid", gap: "8px", padding: "10px" },
  mediaUploadNotice: { background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "14px", color: "#0f766e", fontSize: "12px", fontWeight: 900, padding: "10px 12px" },
  notice: { border: "1px solid", borderRadius: "18px", fontSize: "14px", fontWeight: 800, padding: "14px 18px" },
  pageShell: { background: "#fbfaf7", color: "#0f172a", display: "grid", gap: "20px", minHeight: "100vh", padding: "28px" },
  panel: { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "26px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)", display: "grid", gap: "16px", padding: "22px" },
  petActionsRow: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: "10px" },
  primaryButton: { background: "#0f766e", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "999px", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 900, padding: "11px 16px", textDecoration: "none" },
  processDot: { alignItems: "center", background: "rgba(15, 118, 110, 0.08)", borderRadius: "999px", display: "inline-flex", fontSize: "11px", fontWeight: 900, height: "22px", justifyContent: "center", width: "22px" },
  processRail: { display: "flex", flexWrap: "wrap", gap: "8px" },
  processStep: { alignItems: "center", background: "#f8fafc", border: "1px solid rgba(100, 116, 139, 0.16)", borderRadius: "999px", color: "#64748b", display: "inline-flex", fontSize: "12px", fontWeight: 900, gap: "6px", padding: "6px 9px" },
  processStepActive: { background: "#fff7ed", borderColor: "rgba(234, 88, 12, 0.24)", color: "#c2410c" },
  processStepDone: { background: "#ecfdf5", borderColor: "rgba(15, 118, 110, 0.22)", color: "#0f766e" },
  publicationFlowBox: { background: "#f8fffd", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "18px", display: "grid", gap: "10px", padding: "12px" },
  publicProfileSummary: { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" },
  rejectBox: { display: "grid", gap: "8px" },
  secondaryButton: { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f766e", cursor: "pointer", fontSize: "14px", fontWeight: 900, padding: "11px 16px", textDecoration: "none" },
  sectionHeader: { alignItems: "flex-start", display: "flex", gap: "14px", justifyContent: "space-between" },
  sectionHeaderCompact: { alignItems: "flex-start", display: "flex", gap: "12px", justifyContent: "space-between" },
  sectionTitle: { color: "#0f172a", fontSize: "24px", margin: "3px 0 0" },
  select: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f172a", fontSize: "14px", fontWeight: 800, padding: "10px 14px" },
  sessionHint: { color: "rgba(255,255,255,0.72)", fontSize: "11px", fontWeight: 700, margin: "10px 0 0" },
  statusBadge: { alignSelf: "flex-start", background: "#f8fafc", border: "1px solid rgba(100, 116, 139, 0.16)", borderRadius: "999px", color: "#475569", fontSize: "11px", fontWeight: 900, padding: "7px 10px", whiteSpace: "nowrap" },
  successBadge: { background: "#ecfdf5", borderColor: "rgba(15, 118, 110, 0.2)", color: "#0f766e" },
  successMetric: { background: "linear-gradient(135deg, #f0fdfa, #ffffff)" },
  textarea: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "16px", color: "#0f172a", fontSize: "14px", minHeight: "84px", padding: "12px", resize: "vertical" },
  textBlock: { display: "grid", gap: "4px" },
  tileLabel: { color: "#64748b", fontSize: "11px", fontWeight: 900, textTransform: "uppercase" },
  tileValue: { color: "#0f172a", fontSize: "15px" },
  transferCard: { alignItems: "flex-start", background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "18px", display: "flex", gap: "12px", justifyContent: "space-between", padding: "13px" },
  transferNotice: { background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "18px", color: "#0f766e", display: "grid", gap: "4px", padding: "12px" },
  twoColumnGrid: { display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" },
  warningBadge: { background: "#fff7ed", borderColor: "rgba(234, 88, 12, 0.22)", color: "#c2410c" },
  warningMetric: { background: "linear-gradient(135deg, #fff7ed, #ffffff)" }
};
