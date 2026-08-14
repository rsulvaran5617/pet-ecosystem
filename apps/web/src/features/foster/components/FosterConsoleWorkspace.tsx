"use client";

import type {
  AdoptionCommitmentDocumentStatus,
  AdoptionCommitmentRequirementPolicy,
  ApplicationCommitmentDocument,
  CreatePetInput,
  ProtectiveContactPolicy,
  ProtectiveHouseholdOrganizationType,
  ProtectivePublicProfile,
  ProtectivePublicProfileInput,
  PetAdoptionApplication,
  PetAdoptionClosureDetail,
  PetAdoptionApplicationStatus,
  PetAdoptionListingInput,
  PetAdoptionListing,
  PetAdoptionListingMedia,
  PetSex,
  PetSummary,
  PetTransferRecord,
  ProtectiveAdoptionCommitmentTemplate,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useState } from "react";

import type { CreateProtectiveHouseholdInput, FosterConsoleApplicationDetail } from "../hooks/useFosterConsoleWorkspace";
import { useFosterConsoleWorkspace } from "../hooks/useFosterConsoleWorkspace";

type ApplicationStatusFilter = "all" | PetAdoptionApplicationStatus | "approved_without_transfer";
type FosterConsoleSection = "panel" | "profile" | "pets" | "publications" | "requests" | "transfers";

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

const defaultAdoptionRejectionMessage =
  "Gracias por tu interes y por abrir tu hogar a una mascota. En esta oportunidad la Familia Protectora decidio continuar el proceso con otra familia que se ajustaba mejor a las necesidades de la mascota. Agradecemos mucho tu disposicion y esperamos que pronto encuentres una mascota con la que puedas crear un vinculo especial.";

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

const commitmentRequirementLabels: Record<AdoptionCommitmentRequirementPolicy, string> = {
  informational: "Informativo",
  required_before_approval: "Requerido antes de aprobar",
  required_before_transfer: "Requerido antes de transferir"
};

const commitmentStatusLabels: Record<AdoptionCommitmentDocumentStatus, string> = {
  needs_correction: "Requiere correccion",
  pending: "Pendiente",
  received: "Recibido",
  reviewed: "Revisado"
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

function formatFosterIntakeDate(value: string | null | undefined) {
  return value ? `En acogida desde ${formatDate(value)}` : "Fecha de acogida no registrada";
}

function statusTone(status: PetAdoptionApplicationStatus): "warning" | "success" | "neutral" {
  if (status === "approved" || status === "converted_to_transfer") {
    return "success";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "neutral";
  }

  return "warning";
}

function getApplicationTransfer(application: PetAdoptionApplication, transfers: PetTransferRecord[]) {
  return transfers.find((transfer) => transfer.adoptionApplicationId === application.id);
}

function isApprovedApplicationPendingTransfer(application: PetAdoptionApplication, transfers: PetTransferRecord[]) {
  return application.status === "approved" && !getApplicationTransfer(application, transfers);
}

function getCommitmentReviewState(
  commitmentTemplate: ProtectiveAdoptionCommitmentTemplate | null,
  commitmentDocument: ApplicationCommitmentDocument | null
) {
  if (!commitmentTemplate) {
    return {
      blocksTransfer: false,
      detail: "La Familia Protectora no configuro compromiso documental.",
      done: true,
      label: "Compromiso no solicitado"
    };
  }

  if (commitmentTemplate.requirementPolicy === "informational") {
    return {
      blocksTransfer: false,
      detail: "La plantilla es informativa para el solicitante.",
      done: true,
      label: "Compromiso informativo"
    };
  }

  if (commitmentDocument?.status === "reviewed") {
    return {
      blocksTransfer: false,
      detail: "Documento recibido y revisado por la Familia Protectora.",
      done: true,
      label: "Compromiso revisado"
    };
  }

  return {
    blocksTransfer: true,
    detail: commitmentDocument ? "El documento requiere revision antes de cerrar la adopcion." : "Falta recibir el compromiso firmado.",
    done: false,
    label: "Compromiso pendiente"
  };
}

function buildAdoptionClosureChecklist(
  application: PetAdoptionApplication,
  commitmentTemplate: ProtectiveAdoptionCommitmentTemplate | null,
  commitmentDocument: ApplicationCommitmentDocument | null,
  transfer: PetTransferRecord | undefined
) {
  const commitmentState = getCommitmentReviewState(commitmentTemplate, commitmentDocument);
  const isApprovedOrClosed = application.status === "approved" || application.status === "converted_to_transfer";

  return {
    blocksTransfer: commitmentState.blocksTransfer,
    items: [
      {
        detail: isApprovedOrClosed ? "La familia fue seleccionada para continuar." : "Aprueba la solicitud antes de iniciar custodia.",
        done: isApprovedOrClosed,
        label: "Solicitud aprobada"
      },
      {
        detail: application.status === "interview" || isApprovedOrClosed ? "Datos revisados en el pipeline." : "Usa revision o entrevista antes de decidir.",
        done: application.status === "interview" || isApprovedOrClosed,
        label: "Datos del solicitante revisados"
      },
      commitmentState,
      {
        detail: transfer ? `Transferencia ${transfer.status}.` : "Se iniciara solo cuando todo este listo.",
        done: Boolean(transfer),
        label: "Transferencia privada"
      }
    ]
  };
}

function getAdoptionClosureSummary(application: PetAdoptionApplication, transfer: PetTransferRecord | undefined, closureDetail: PetAdoptionClosureDetail | null) {
  if (application.status === "converted_to_transfer" || transfer?.status === "accepted" || closureDetail?.transferStatus === "accepted") {
    const acceptedAt = closureDetail?.transferAcceptedAt ?? transfer?.acceptedAt;
    return {
      detail: `${application.petName} conserva su identidad digital y expediente permitido en el hogar receptor.${
        closureDetail?.toHouseholdName ? ` Hogar receptor: ${closureDetail.toHouseholdName}.` : ""
      }`,
      title: acceptedAt ? `Adopcion cerrada el ${formatDate(acceptedAt)}` : "Adopcion cerrada"
    };
  }

  if (transfer?.status === "pending" || closureDetail?.transferStatus === "pending") {
    return {
      detail: "La familia receptora debe aceptar desde Hogares para completar el cambio de custodia.",
      title: "Transferencia pendiente de aceptacion"
    };
  }

  return null;
}

function getApplicationJourneyStatus(application: PetAdoptionApplication, transfer: PetTransferRecord | undefined) {
  if (application.status === "converted_to_transfer" || transfer?.status === "accepted") {
    return {
      detail: transfer?.acceptedAt
        ? `Transferida el ${formatDate(transfer.acceptedAt)}.`
        : "La custodia ya fue aceptada por el nuevo hogar.",
      label: "Mascota transferida",
      tone: "success" as const
    };
  }

  if (transfer?.status === "pending") {
    return {
      detail: "La familia receptora debe aceptar la custodia.",
      label: "Transferencia pendiente",
      tone: "warning" as const
    };
  }

  if (transfer?.status === "rejected") {
    return {
      detail: "La familia receptora rechazo la transferencia.",
      label: "Transferencia rechazada",
      tone: "neutral" as const
    };
  }

  if (transfer?.status === "cancelled") {
    return {
      detail: "La transferencia fue cancelada.",
      label: "Transferencia cancelada",
      tone: "neutral" as const
    };
  }

  if (application.status === "approved") {
    return {
      detail: "Aprobada por la Familia Protectora, falta iniciar transferencia.",
      label: "Aprobada, falta transferir",
      tone: "warning" as const
    };
  }

  return {
    detail: "Estado actual de revision de esta solicitud.",
    label: applicationStatusLabels[application.status],
    tone: statusTone(application.status)
  };
}

function getListingOperationalStatus(
  listing: PetAdoptionListing,
  applications: PetAdoptionApplication[],
  transfers: PetTransferRecord[]
) {
  const listingApplications = applications.filter((application) => application.listingId === listing.id);

  if (
    listing.status === "adopted" ||
    listingApplications.some((application) => application.status === "converted_to_transfer") ||
    listingApplications.some((application) => getApplicationTransfer(application, transfers)?.status === "accepted")
  ) {
    return { label: "Adopcion cerrada", tone: "success" as const };
  }

  if (listingApplications.some((application) => getApplicationTransfer(application, transfers)?.status === "pending")) {
    return { label: "Transferencia iniciada", tone: "warning" as const };
  }

  if (listingApplications.some((application) => isApprovedApplicationPendingTransfer(application, transfers))) {
    return { label: "Transferencia pendiente", tone: "warning" as const };
  }

  if (listingApplications.some((application) => application.status === "approved")) {
    return { label: "Solicitud aprobada", tone: "success" as const };
  }

  return null;
}

type AdoptionTimelineItem = {
  id: string;
  title: string;
  date: string | null;
  summary: string;
  detail: string;
  tone?: "default" | "warning" | "success";
};

function getClosedAdoptionApplication(
  listing: PetAdoptionListing,
  applications: PetAdoptionApplication[],
  transfers: PetTransferRecord[]
) {
  const listingApplications = applications.filter((application) => application.listingId === listing.id);
  const acceptedTransfer = transfers.find((transfer) => transfer.petId === listing.petId && transfer.status === "accepted");

  return (
    listingApplications.find((application) => application.id === acceptedTransfer?.adoptionApplicationId) ??
    listingApplications.find((application) => application.status === "converted_to_transfer") ??
    listingApplications.find((application) => application.status === "approved") ??
    null
  );
}

function buildListingAdoptionTimeline(
  listing: PetAdoptionListing,
  applications: PetAdoptionApplication[],
  transfers: PetTransferRecord[]
): AdoptionTimelineItem[] {
  const listingApplications = applications
    .filter((application) => application.listingId === listing.id)
    .sort((first, second) => new Date(first.submittedAt).getTime() - new Date(second.submittedAt).getTime());
  const timeline: AdoptionTimelineItem[] = [
    {
      date: listing.createdAt,
      detail: `${listing.petName} fue preparada como publicacion de adopcion dentro de esta Familia Protectora.`,
      id: "listing-created",
      summary: "La ficha quedo disponible para completar contenido, fotos y requisitos.",
      title: "Publicacion creada"
    }
  ];

  if (listing.publishedAt || listing.sharePublishedAt) {
    timeline.push({
      date: listing.publishedAt ?? listing.sharePublishedAt,
      detail: "La mascota quedo visible para familias interesadas en la vitrina de adopcion.",
      id: "listing-published",
      summary: `${listing.city}, ${listing.countryCode}.`,
      title: "Publicacion visible",
      tone: "success"
    });
  }

  listingApplications.forEach((application) => {
    const transfer = getApplicationTransfer(application, transfers);

    timeline.push({
      date: application.submittedAt,
      detail: `${getApplicantDisplayName(application)} envio una solicitud para adoptar a ${application.petName}. Vivienda: ${application.housingType}.`,
      id: `application-${application.id}-submitted`,
      summary: application.applicantEmail,
      title: "Solicitud recibida"
    });

    if (application.status !== "submitted") {
      timeline.push({
        date: application.updatedAt,
        detail:
          application.status === "rejected"
            ? "La Familia Protectora decidio no continuar con esta solicitud."
            : application.status === "approved"
              ? "La Familia Protectora selecciono esta solicitud para continuar hacia transferencia privada."
              : application.status === "converted_to_transfer"
                ? "La solicitud quedo asociada al cierre de adopcion."
                : `La solicitud avanzo al estado ${applicationStatusLabels[application.status]}.`,
        id: `application-${application.id}-status`,
        summary: `${getApplicantDisplayName(application)} - ${applicationStatusLabels[application.status]}`,
        title: application.status === "rejected" ? "Solicitud no seleccionada" : `Solicitud ${applicationStatusLabels[application.status].toLowerCase()}`,
        tone: application.status === "rejected" ? "warning" : application.status === "approved" || application.status === "converted_to_transfer" ? "success" : "default"
      });
    }

    if (transfer) {
      timeline.push({
        date: transfer.createdAt,
        detail: `Se inicio transferencia privada hacia ${transfer.toHouseholdName ?? transfer.recipientEmail}. La custodia solo cambia al aceptar.`,
        id: `transfer-${transfer.id}-created`,
        summary: transfer.recipientEmail,
        title: "Transferencia iniciada",
        tone: "warning"
      });

      if (transfer.acceptedAt) {
        timeline.push({
          date: transfer.acceptedAt,
          detail: `${listing.petName} conserva su identidad digital y expediente permitido en el hogar receptor${
            transfer.toHouseholdName ? ` ${transfer.toHouseholdName}` : ""
          }.`,
          id: `transfer-${transfer.id}-accepted`,
          summary: `Familia adoptante: ${transfer.toHouseholdName ?? getApplicantDisplayName(application)}`,
          title: "Adopcion completada",
          tone: "success"
        });
      }
    }
  });

  if (listing.status === "adopted" || listing.closedAt) {
    timeline.push({
      date: listing.closedAt ?? listing.updatedAt,
      detail: "La publicacion quedo cerrada para nuevas solicitudes. El expediente conserva trazabilidad de la adopcion.",
      id: "listing-closed",
      summary: listing.status === "adopted" ? "Estado final: adoptada." : "Estado final: cerrada.",
      title: "Publicacion cerrada",
      tone: "success"
    });
  }

  return timeline.sort((first, second) => new Date(first.date ?? 0).getTime() - new Date(second.date ?? 0).getTime());
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
    stateRegion: publicProfile?.stateRegion ?? "",
    websiteUrl: publicProfile?.websiteUrl ?? "",
    instagramUrl: publicProfile?.instagramUrl ?? "",
    facebookUrl: publicProfile?.facebookUrl ?? "",
    tiktokUrl: publicProfile?.tiktokUrl ?? "",
    whatsappUrl: publicProfile?.whatsappUrl ?? "",
    donationsEnabled: publicProfile?.donationsEnabled ?? false,
    donationTitle: publicProfile?.donationTitle ?? "Apoya a esta Familia Protectora",
    donationDescription: publicProfile?.donationDescription ?? "",
    donationAchDetails: publicProfile?.donationAchDetails ?? "",
    donationYappyDetails: publicProfile?.donationYappyDetails ?? "",
    donationPaypalDetails: publicProfile?.donationPaypalDetails ?? "",
    donationExternalUrl: publicProfile?.donationExternalUrl ?? "",
    donationOtherDetails: publicProfile?.donationOtherDetails ?? "",
    donationDisclaimer: publicProfile?.donationDisclaimer ?? ""
  };
}

function isValidProtectiveSocialUrl(field: keyof ProtectivePublicProfileInput, value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return true;
  }

  if (field === "instagramUrl") {
    return /^https:\/\/(www\.)?instagram\.com\//i.test(trimmedValue);
  }

  if (field === "facebookUrl") {
    return /^https:\/\/(www\.)?facebook\.com\//i.test(trimmedValue);
  }

  if (field === "tiktokUrl") {
    return /^https:\/\/(www\.)?tiktok\.com\//i.test(trimmedValue);
  }

  if (field === "whatsappUrl") {
    return /^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(trimmedValue);
  }

  return /^https:\/\//i.test(trimmedValue);
}

function validateProtectiveSocialLinks(form: ProtectivePublicProfileInput) {
  const checks: Array<[keyof ProtectivePublicProfileInput, string]> = [
    ["websiteUrl", "El sitio web debe iniciar con https://."],
    ["instagramUrl", "Instagram debe ser un enlace https://instagram.com/..."],
    ["facebookUrl", "Facebook debe ser un enlace https://facebook.com/..."],
    ["tiktokUrl", "TikTok debe ser un enlace https://tiktok.com/..."],
    ["whatsappUrl", "WhatsApp debe ser un enlace https://wa.me/... o https://api.whatsapp.com/..."],
    ["donationExternalUrl", "El enlace externo de apoyo debe iniciar con https://."]
  ];

  return checks.find(([field]) => !isValidProtectiveSocialUrl(field, form[field] as string | null | undefined))?.[1] ?? null;
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
  const visible = status === "published";

  return [
    { label: "Mascota", order: 1, state: "done" },
    { label: "Publicacion", order: 2, state: prepared ? "done" : "active" },
    { label: "Contenido", order: 3, state: prepared ? "done" : "pending" },
    { label: "Fotos", order: 4, state: hasMedia ? "done" : prepared ? "active" : "pending" },
    { label: "Responsabilidad", order: 5, state: visible ? "done" : prepared ? "active" : "pending" },
    { label: "Visible", order: 6, state: visible ? "done" : "pending" }
  ] as Array<{ label: string; order: number; state: "active" | "done" | "pending" }>;
}

function publicationGuidance(listing: PetAdoptionListing | null) {
  if (!listing) {
    return "Prepara la ficha publica de la mascota antes de abrir solicitudes de adopcion.";
  }

  if (listing.status === "draft") {
    return "Completa historia, salud, compatibilidad y requisitos. Luego publica bajo responsabilidad de tu Familia Protectora.";
  }

  if (listing.status === "pending_review") {
    return "Esta publicacion fue creada con el flujo anterior. Puedes publicarla bajo responsabilidad sin esperar una revision adicional.";
  }

  if (listing.status === "published") {
    return "La publicacion esta visible para familias interesadas y puedes mantener su contenido actualizado.";
  }

  if (listing.status === "rejected") {
    return "La publicacion fue pausada o rechazada. Corrige el contenido y publica bajo responsabilidad cuando este lista.";
  }

  if (listing.status === "adopted") {
    return "La adopcion fue cerrada mediante transferencia privada.";
  }

  if (listing.status === "closed") {
    return "La publicacion esta cerrada. Conserva trazabilidad del proceso y no permite editar la ficha publica.";
  }

  return "Revisa el estado de esta publicacion antes de continuar.";
}

function getAdoptionListingQuality(listing: PetAdoptionListing | null) {
  const missing: string[] = [];

  if (!listing?.publicStory?.trim()) missing.push("historia");
  if (!listing?.personalityNotes?.trim()) missing.push("personalidad");
  if (!listing?.publicHealthSummary?.trim()) missing.push("salud publica");
  if (!listing?.adoptionRequirements?.trim()) missing.push("requisitos");
  if (!listing?.city?.trim()) missing.push("ubicacion");
  if (!listing?.media.some((media) => media.moderationStatus !== "rejected")) missing.push("al menos una foto");

  return { isComplete: missing.length === 0, missing };
}

function adoptionListingQualityMessage(missing: string[]) {
  return missing.length
    ? `Completa ${missing.join(", ")} antes de publicar o cerrar esta vitrina. Si solo necesitas ocultarla temporalmente, usa Pausar.`
    : "La ficha cumple los minimos de calidad para operar.";
}

function ContentSummaryTile({ label, value }: { label: string; value: string | null | undefined }) {
  const cleanValue = value?.trim();

  return (
    <div style={styles.publicContentTile}>
      <span style={styles.tileLabel}>{label}</span>
      <strong style={cleanValue ? styles.tileValue : styles.tileEmptyValue}>{cleanValue || "Pendiente de completar"}</strong>
    </div>
  );
}

export function FosterConsoleWorkspace() {
  const {
    applications,
    authState,
    closeAdoptionListing,
    commitmentTemplate,
    createProtectiveHousehold,
    createFosterPet,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    listings,
    openApplication,
    openAdoptionCommitmentTemplate,
    pauseAdoptionListing,
    pets,
    prepareAdoptionListing,
    profile,
    protectiveHouseholds,
    publicProfile,
    refresh,
    reviewApplicationCommitmentDocument,
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
    uploadAdoptionCommitmentTemplate,
    uploadAdoptionListingPhoto,
    uploadFosterPetAvatar,
    uploadPublicProfileLogo,
    updateApplicationStatus
  } = useFosterConsoleWorkspace();
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [applicationPetFilter, setApplicationPetFilter] = useState("all");
  const [activeSection, setActiveSection] = useState<FosterConsoleSection>("panel");
  const [expandedApplicationId, setExpandedApplicationId] = useState<Uuid | null>(null);
  const [expandedListingId, setExpandedListingId] = useState<Uuid | null>(null);
  const [expandedTimelineItemId, setExpandedTimelineItemId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState(defaultAdoptionRejectionMessage);

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
  const approvedPendingTransferCount = useMemo(
    () => applications.filter((application) => isApprovedApplicationPendingTransfer(application, transfers)).length,
    [applications, transfers]
  );
  const transferredPetsCount = useMemo(
    () => new Set(transfers.filter((transfer) => transfer.status === "accepted").map((transfer) => transfer.petId)).size,
    [transfers]
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
      onClick: () => {
        setApplicationStatusFilter("submitted");
        setActiveSection("requests");
      }
    },
    {
      label: "Entrevistas",
      value: applicationCounts.interview,
      detail: "Conversaciones en curso",
      onClick: () => {
        setApplicationStatusFilter("interview");
        setActiveSection("requests");
      }
    },
    {
      label: "Aprobadas pendientes",
      value: approvedPendingTransferCount,
      detail: "Listas para iniciar transferencia",
      tone: approvedPendingTransferCount ? "warning" : "default",
      onClick: () => {
        setApplicationStatusFilter("approved_without_transfer");
        setActiveSection("requests");
      }
    },
    {
      label: "Transferencias pendientes",
      value: transfers.filter((transfer) => transfer.status === "pending").length,
      detail: "La familia receptora debe aceptar",
      tone: "warning"
    },
    {
      label: "Mascotas entregadas",
      value: transferredPetsCount,
      detail: "Adopciones cerradas por transferencia",
      tone: transferredPetsCount ? "success" : "default",
      onClick: () => setActiveSection("transfers")
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
        .filter((application) => {
          if (applicationStatusFilter === "all") {
            return true;
          }

          if (applicationStatusFilter === "approved_without_transfer") {
            return isApprovedApplicationPendingTransfer(application, transfers);
          }

          return application.status === applicationStatusFilter;
        })
        .filter((application) => applicationPetFilter === "all" || application.petId === applicationPetFilter)
        .sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime()),
    [applicationPetFilter, applicationStatusFilter, applications, transfers]
  );

  const selectedApplicationIsVisible = selectedApplicationDetail
    ? filteredApplications.some((application) => application.id === selectedApplicationDetail.application.id)
    : false;
  const visibleApplicationDetail = selectedApplicationIsVisible ? selectedApplicationDetail : null;
  const selectedHouseholdPermissionLabel = selectedHousehold?.myPermissions.includes("admin")
    ? "admin"
    : selectedHousehold?.myPermissions.join(", ") || "sin permisos de gestion";
  const fosterNavigationItems: Array<{ id: FosterConsoleSection; label: string; detail: string; count?: number }> = [
    { id: "panel", label: "Panel", detail: "Resumen y estado" },
    { id: "profile", label: "Perfil", detail: "Identidad publica" },
    { id: "pets", label: "Mascotas", detail: "Bajo acogida", count: pets.length },
    { id: "publications", label: "Publicaciones", detail: "Vitrina y fotos", count: listings.length },
    { id: "requests", label: "Solicitudes", detail: "Pipeline adopcion", count: applications.length },
    { id: "transfers", label: "Transferencias", detail: "Custodia privada", count: transfers.length }
  ];

  return (
    <main className="foster-web-page-shell" style={styles.pageShell}>
      <style>
        {`
          .foster-web-hero,
          .foster-web-console-shell,
          .foster-web-content,
          .foster-web-metrics {
            min-width: 0;
          }

          .foster-web-nav-button:focus-visible {
            outline: 2px solid rgba(45, 212, 191, 0.72);
            outline-offset: 2px;
          }

          @media (max-width: 1120px) {
            .foster-web-console-shell {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .foster-web-sidebar {
              position: static !important;
            }

            .foster-web-nav {
              display: grid !important;
              grid-auto-flow: column;
              grid-auto-columns: minmax(132px, 1fr);
              overflow-x: auto;
              padding-bottom: 4px;
            }
          }

          @media (max-width: 760px) {
            .foster-web-page-shell {
              padding: 14px !important;
            }

            .foster-web-hero {
              flex-direction: column;
              padding: 20px !important;
            }

            .foster-web-hero-title {
              font-size: 24px !important;
            }

            .foster-web-section-header {
              flex-direction: column;
            }
          }

          @media (max-width: 520px) {
            .foster-web-page-shell {
              padding: 10px !important;
            }

            .foster-web-nav {
              grid-auto-columns: minmax(116px, 1fr);
            }
          }
        `}
      </style>
      <section className="foster-web-hero" style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Consola Foster</p>
          <h1 className="foster-web-hero-title" style={styles.heroTitle}>Centro de gestion para Familias Protectoras</h1>
          <p style={styles.heroCopy}>
            Gestiona publicaciones, solicitudes y transferencias privadas sin mezclar adopcion responsable con servicios comerciales.
          </p>
          {sessionUserEmail ? (
            <p style={styles.sessionHint}>
              Sesion activa: {sessionUserEmail}
              {selectedHousehold ? ` · Permisos en familia seleccionada: ${selectedHouseholdPermissionLabel}` : ""}
            </p>
          ) : null}
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
        <section className="foster-web-console-shell" style={styles.consoleShell}>
          <aside className="foster-web-sidebar" style={styles.sideNav}>
            <div style={styles.sideNavBrand}>
              <span style={styles.sideNavMark}>
                {publicProfile?.logoUrl ? (
                  <img
                    alt={`Logo de ${publicProfile.displayName}`}
                    src={publicProfile.logoUrl}
                    style={styles.sideNavLogoImage}
                  />
                ) : (
                  (publicProfile?.displayName ?? selectedHousehold?.name ?? "FP").slice(0, 2).toUpperCase()
                )}
              </span>
              <div>
                <strong style={styles.sideNavTitle}>Familia Protectora</strong>
                <span style={styles.sideNavSubtitle}>{selectedHousehold?.name ?? "Selecciona una familia"}</span>
              </div>
            </div>
            <nav aria-label="Secciones Foster" className="foster-web-nav" style={styles.sideNavList}>
              {fosterNavigationItems.map((item) => (
                <button
                  className="foster-web-nav-button"
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{ ...styles.sideNavItem, ...(activeSection === item.id ? styles.sideNavItemActive : {}) }}
                  type="button"
                >
                  <span style={styles.sideNavItemLabel}>{item.label}</span>
                  <span style={styles.sideNavItemDetail}>{item.detail}</span>
                  {typeof item.count === "number" ? <span style={styles.sideNavCount}>{item.count}</span> : null}
                </button>
              ))}
            </nav>
          </aside>
          <div className="foster-web-content" style={styles.consoleContent}>
          {activeSection === "panel" ? (
            <>
          <section style={styles.panel}>
            <div className="foster-web-section-header" style={styles.sectionHeader}>
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

          {profile?.status !== "approved" ? (
            <InfoPanel
              title="Familia Protectora pendiente de aprobacion"
              copy="La consola operativa se habilita por completo cuando el perfil protector esta aprobado por admin."
            />
          ) : null}

          <section className="foster-web-metrics" style={styles.metricGrid}>
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
            </>
          ) : null}

          {activeSection === "profile" ? (
          <PublicProfilePanel
            commitmentTemplate={commitmentTemplate}
            key={selectedHouseholdId ?? "public-profile"}
            disabled={isSubmitting}
            profileStatus={profile?.status ?? null}
            publicProfile={publicProfile}
            selectedHouseholdId={selectedHouseholdId}
            selectedHouseholdName={selectedHousehold?.name ?? ""}
            onSave={savePublicProfile}
            onSubmit={submitPublicProfile}
            onUploadCommitmentTemplate={uploadAdoptionCommitmentTemplate}
            onUploadLogo={uploadPublicProfileLogo}
            onOpenCommitmentTemplate={openAdoptionCommitmentTemplate}
          />
          ) : null}

          {activeSection === "pets" ? (
          <FosterPetsPanel
            applications={applications}
            disabled={isSubmitting}
            listings={listings}
            pets={pets}
            profileStatus={profile?.status ?? null}
            publicProfileStatus={publicProfile?.moderationStatus ?? null}
            onCreatePet={createFosterPet}
            onCloseListing={closeAdoptionListing}
            onPauseListing={pauseAdoptionListing}
            onPrepareListing={prepareAdoptionListing}
            onRemoveListingPhoto={removeAdoptionListingPhoto}
            onSaveListing={saveAdoptionListing}
            onSetListingCover={setAdoptionListingCover}
            onShowApplications={(petId) => {
              setApplicationPetFilter(petId);
              setApplicationStatusFilter("all");
              setActiveSection("requests");
            }}
            onSubmitListing={submitAdoptionListing}
            onUploadListingPhoto={uploadAdoptionListingPhoto}
            onUploadPetAvatar={uploadFosterPetAvatar}
          />
          ) : null}

          {activeSection === "publications" ? (
            <div style={styles.panel}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.eyebrow}>Publicaciones</p>
                  <h2 style={styles.sectionTitle}>Mascotas en adopcion</h2>
                </div>
                <span style={styles.countPill}>{listings.length} total</span>
              </div>
              <div style={styles.listStack}>
                {listings.length ? listings.slice(0, 8).map((listing) => {
                  const operationalStatus = getListingOperationalStatus(listing, applications, transfers);
                  const isClosureListing = listing.status === "adopted" || operationalStatus?.label === "Adopcion cerrada";

                  return (
                    <article key={listing.id} style={styles.listingHistoryCard}>
                      <div style={styles.listingCard}>
                        {coverUrl(listing) ? <img alt="" src={coverUrl(listing) ?? ""} style={styles.coverImage} /> : <div style={styles.coverFallback}>{listing.petName.slice(0, 1).toUpperCase()}</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={styles.itemTitle}>{listing.petName}</strong>
                          <p style={styles.itemMeta}>{listing.title}</p>
                          <p style={styles.itemMeta}>{listing.city}, {listing.countryCode}</p>
                          {operationalStatus ? (
                            <p style={styles.operationalStatusText}>{operationalStatus.label}</p>
                          ) : null}
                        </div>
                        <div style={styles.badgeStack}>
                          <StatusBadge label={listingStatusLabels[listing.status]} tone={listing.status === "published" ? "success" : listing.status === "pending_review" ? "warning" : "neutral"} />
                          {operationalStatus ? <StatusBadge label={operationalStatus.label} tone={operationalStatus.tone} /> : null}
                          {isClosureListing ? (
                            <button
                              onClick={() => {
                                setExpandedListingId((current) => (current === listing.id ? null : listing.id));
                                setExpandedTimelineItemId(null);
                              }}
                              style={styles.secondaryButtonCompact}
                              type="button"
                            >
                              {expandedListingId === listing.id ? "Ocultar historia" : "Ver historia"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {isClosureListing && expandedListingId === listing.id ? (
                        <AdoptionClosureTimeline
                          applications={applications}
                          expandedItemId={expandedTimelineItemId}
                          listing={listing}
                          onToggleItem={(itemId) => setExpandedTimelineItemId((current) => (current === itemId ? null : itemId))}
                          transfers={transfers}
                        />
                      ) : null}
                    </article>
                  );
                }) : <EmptyState text="Aun no hay publicaciones para esta familia protectora." />}
              </div>
            </div>

          ) : null}

          {activeSection === "transfers" ? (
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
          ) : null}

          {activeSection === "requests" ? (
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
                <option value="approved_without_transfer">Aprobadas pendientes de transferencia</option>
                {Object.entries(applicationStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </select>
              <select onChange={(event) => setApplicationPetFilter(event.target.value)} style={styles.select} value={applicationPetFilter}>
                <option value="all">Todas las mascotas</option>
                {petOptions.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
              </select>
            </div>
            <div style={styles.applicationAccordionList}>
              {filteredApplications.length ? (
                filteredApplications.map((application) => {
                  const transfer = getApplicationTransfer(application, transfers);
                  const journeyStatus = getApplicationJourneyStatus(application, transfer);
                  const isExpanded = expandedApplicationId === application.id;
                  const detailForApplication = isExpanded && visibleApplicationDetail?.application.id === application.id ? visibleApplicationDetail : null;

                  return (
                    <article key={application.id} style={isExpanded ? { ...styles.applicationAccordionCard, ...styles.applicationAccordionCardOpen } : styles.applicationAccordionCard}>
                      <button
                        onClick={() => {
                          setRejectNote(defaultAdoptionRejectionMessage);
                          if (isExpanded) {
                            setExpandedApplicationId(null);
                            return;
                          }
                          setExpandedApplicationId(application.id);
                          void openApplication(application);
                        }}
                        style={styles.applicationAccordionHeader}
                        type="button"
                      >
                        <div style={styles.applicationCardTitle}>
                          <div style={styles.applicationTitleRow}>
                            <strong style={styles.itemTitle}>{application.petName}</strong>
                            <StatusBadge label={applicationStatusLabels[application.status]} tone={statusTone(application.status)} />
                          </div>
                          <ApplicantIdentity application={application} compact />
                          <p style={styles.itemMeta}>Recibida {formatDate(application.submittedAt)}</p>
                          <p style={styles.applicationSnippet}>{application.motivation || "Sin motivacion registrada."}</p>
                        </div>
                        <div style={styles.applicationStatusStack}>
                          <StatusBadge label={journeyStatus.label} tone={journeyStatus.tone} />
                          <span style={styles.itemMeta}>{journeyStatus.detail}</span>
                          <span style={styles.accordionChevron}>{isExpanded ? "Ocultar" : "Ver detalle"}</span>
                        </div>
                      </button>
                      {isExpanded ? (
                        <div style={styles.applicationAccordionBody}>
                          <ApplicationDetailPanel
                            commitmentTemplate={commitmentTemplate}
                            detail={detailForApplication}
                            disabled={isSubmitting}
                            onRejectNoteChange={setRejectNote}
                            onOpenCommitmentTemplate={openAdoptionCommitmentTemplate}
                            onReviewCommitmentDocument={reviewApplicationCommitmentDocument}
                            onStartTransfer={startTransfer}
                            onUpdateStatus={updateApplicationStatus}
                            rejectNote={rejectNote}
                            transfer={transfer}
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <EmptyState text="No hay solicitudes con estos filtros. Cambia el estado o la mascota para revisar otras solicitudes." />
              )}
            </div>
          </section>
          ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function AdoptionClosureTimeline({
  applications,
  expandedItemId,
  listing,
  onToggleItem,
  transfers
}: {
  applications: PetAdoptionApplication[];
  expandedItemId: string | null;
  listing: PetAdoptionListing;
  onToggleItem: (itemId: string) => void;
  transfers: PetTransferRecord[];
}) {
  const selectedApplication = getClosedAdoptionApplication(listing, applications, transfers);
  const selectedTransfer = selectedApplication ? getApplicationTransfer(selectedApplication, transfers) : undefined;
  const timeline = buildListingAdoptionTimeline(listing, applications, transfers);
  const applicantName = selectedApplication ? getApplicantDisplayName(selectedApplication) : null;
  const adopterLabel = selectedTransfer?.toHouseholdName ?? applicantName ?? "Familia adoptante no identificada";

  return (
    <div style={styles.closureTimelineBox}>
      <div style={styles.closureSummaryGrid}>
        <InfoTile label="Familia adoptante" value={adopterLabel} />
        <InfoTile label="Solicitante" value={selectedApplication?.applicantEmail ?? "Sin solicitud vinculada"} />
        <InfoTile label="Transferencia" value={selectedTransfer?.status === "accepted" ? "Aceptada" : selectedTransfer?.status ?? "Sin registro"} />
        <InfoTile label="Cierre" value={formatDate(selectedTransfer?.acceptedAt ?? listing.closedAt ?? listing.updatedAt)} />
      </div>
      <div style={styles.historyBox}>
        <div style={styles.sectionHeaderCompact}>
          <div>
            <h4 style={styles.historyTitle}>Historia de adopcion</h4>
            <p style={styles.itemMeta}>Abre cada evento para revisar que paso y con quien.</p>
          </div>
          <span style={styles.countPill}>{timeline.length} evento(s)</span>
        </div>
        {timeline.map((item) => {
          const isOpen = expandedItemId === `${listing.id}:${item.id}`;

          return (
            <div key={item.id} style={styles.timelineAccordionItem}>
              <button
                aria-expanded={isOpen}
                onClick={() => onToggleItem(`${listing.id}:${item.id}`)}
                style={styles.timelineAccordionHeader}
                type="button"
              >
                <span style={item.tone === "success" ? { ...styles.timelineDot, ...styles.timelineDotSuccess } : item.tone === "warning" ? { ...styles.timelineDot, ...styles.timelineDotWarning } : styles.timelineDot} />
                <span style={styles.timelineText}>
                  <strong style={styles.itemTitle}>{item.title}</strong>
                  <span style={styles.itemMeta}>{formatDate(item.date)} · {item.summary}</span>
                </span>
                <span style={styles.accordionChevron}>{isOpen ? "Ocultar" : "Abrir"}</span>
              </button>
              {isOpen ? (
                <div style={styles.timelineAccordionBody}>
                  <p style={styles.bodyText}>{item.detail}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FosterPetsPanel({
  applications,
  disabled,
  listings,
  onCreatePet,
  onCloseListing,
  onPauseListing,
  onPrepareListing,
  onRemoveListingPhoto,
  onSaveListing,
  onSetListingCover,
  onShowApplications,
  onSubmitListing,
  onUploadListingPhoto,
  onUploadPetAvatar,
  pets,
  profileStatus,
  publicProfileStatus
}: {
  applications: PetAdoptionApplication[];
  disabled: boolean;
  listings: PetAdoptionListing[];
  onCreatePet: (input: Omit<CreatePetInput, "householdId">) => Promise<PetSummary | null>;
  onCloseListing: (listingId: Uuid) => Promise<PetAdoptionListing | null>;
  onPauseListing: (listingId: Uuid) => Promise<PetAdoptionListing | null>;
  onPrepareListing: (petId: Uuid) => Promise<PetAdoptionListing | null>;
  onRemoveListingPhoto: (media: PetAdoptionListingMedia) => Promise<void>;
  onSaveListing: (input: PetAdoptionListingInput) => Promise<PetAdoptionListing | null>;
  onSetListingCover: (mediaId: Uuid) => Promise<PetAdoptionListingMedia | null>;
  onShowApplications: (petId: Uuid) => void;
  onSubmitListing: (listingId: Uuid) => Promise<PetAdoptionListing | null>;
  onUploadListingPhoto: (listingId: Uuid, file: File) => Promise<PetAdoptionListingMedia | null>;
  onUploadPetAvatar: (petId: Uuid, file: File) => Promise<PetSummary | null>;
  pets: PetSummary[];
  profileStatus: string | null;
  publicProfileStatus: string | null;
}) {
  const canCreatePet = profileStatus === "approved";
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [expandedPetId, setExpandedPetId] = useState<Uuid | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewAvatarPetId, setPreviewAvatarPetId] = useState<Uuid | null>(null);
  const [uploadingAvatarPetId, setUploadingAvatarPetId] = useState<Uuid | null>(null);
  const [form, setForm] = useState<Omit<CreatePetInput, "householdId">>({
    birthDate: "",
    breed: "",
    fosterIntakeDate: "",
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
      fosterIntakeDate: "",
      isSterilized: null,
      name: "",
      notes: "",
      sex: "unknown",
      species: ""
    });
    setCreateAvatarFile(null);
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
              fosterIntakeDate: form.fosterIntakeDate || null,
              notes: form.notes?.trim() || null
            }).then((pet) => {
              if (pet) {
                const avatarFile = createAvatarFile;
                resetForm();
                setIsCreating(false);
                setExpandedPetId(pet.id);

                if (avatarFile) {
                  setUploadingAvatarPetId(pet.id);
                  void onUploadPetAvatar(pet.id, avatarFile).finally(() => setUploadingAvatarPetId(null));
                }
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
              Fecha de ingreso a acogida
              <input disabled={disabled} onChange={(event) => updateField("fosterIntakeDate", event.target.value)} style={styles.input} type="date" value={form.fosterIntakeDate ?? ""} />
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
          <label style={styles.fieldLabel}>
            Foto de perfil
            <span style={styles.avatarPickerRow}>
              <span style={styles.avatarPreview}>
                {getDraftPetInitials(form.name, form.species)}
              </span>
              <span style={styles.avatarPickerCopy}>
                <strong>{createAvatarFile ? createAvatarFile.name : "Opcional al registrar"}</strong>
                <span>JPG, PNG o WebP. Esta foto identifica la mascota en la consola.</span>
              </span>
              <span style={styles.secondaryButton}>Elegir foto</span>
            </span>
            <input
              accept=".jpg,.jpeg,.jpe,.jfif,.png,.webp,image/jpeg,image/png,image/webp"
              disabled={disabled}
              onChange={(event) => {
                setCreateAvatarFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
              style={styles.fileInput}
              type="file"
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
        <div style={styles.fosterPetAccordion}>
          {pets.map((pet) => {
            const listing = listingByPetId.get(pet.id);
            const applicationCount = applicationCountByPetId.get(pet.id) ?? 0;
            const isExpanded = expandedPetId === pet.id;
            const listingSummary =
              listing?.status === "published"
                ? "Publicada"
                : listing?.status === "draft"
                  ? "Borrador"
                  : listing?.status === "paused"
                    ? "Pausada"
                    : listing?.status === "adopted"
                      ? "Adoptada"
                      : listing
                        ? listingStatusLabels[listing.status]
                        : "Sin publicacion";

            return (
              <article key={pet.id} style={{ ...styles.fosterPetCard, ...(previewAvatarPetId === pet.id ? styles.fosterPetCardPreviewing : {}) }}>
                <div style={styles.fosterPetAccordionHeader}>
                  <div style={styles.fosterPetHeaderMain}>
                    <div style={styles.fosterPetIdentity}>
                      <span
                        onBlur={() => setPreviewAvatarPetId(null)}
                        onFocus={() => {
                          if (pet.avatarUrl) {
                            setPreviewAvatarPetId(pet.id);
                          }
                        }}
                        onMouseEnter={() => {
                          if (pet.avatarUrl) {
                            setPreviewAvatarPetId(pet.id);
                          }
                        }}
                        onMouseLeave={() => setPreviewAvatarPetId(null)}
                        style={styles.fosterPetAvatarFrame}
                        tabIndex={pet.avatarUrl ? 0 : undefined}
                        title={pet.avatarUrl ? `Ver foto ampliada de ${pet.name}` : undefined}
                      >
                        <span style={{ ...styles.fosterPetAvatar, ...(pet.avatarUrl ? styles.fosterPetAvatarInspectable : {}) }}>
                          {pet.avatarUrl ? (
                            <img alt={`Foto de ${pet.name}`} src={pet.avatarUrl} style={styles.fosterPetAvatarImage} />
                          ) : (
                            getPetInitials(pet)
                          )}
                        </span>
                        {pet.avatarUrl && previewAvatarPetId === pet.id ? (
                          <span aria-hidden="true" style={styles.avatarZoomPreview}>
                            <img alt="" src={pet.avatarUrl} style={styles.avatarZoomImage} />
                            <span style={styles.avatarZoomCaption}>{pet.name}</span>
                          </span>
                        ) : null}
                      </span>
                      <div style={styles.fosterPetIdentityCopy}>
                        <strong style={styles.itemTitle}>{pet.name}</strong>
                        <p style={styles.itemMeta}>{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</p>
                        <p style={styles.itemMeta}>{pet.birthDate ? `Nacio ${formatDate(pet.birthDate)}` : "Edad no indicada"} - {petSexLabels[pet.sex]}</p>
                        <p style={styles.itemMeta}>{formatFosterIntakeDate(pet.fosterIntakeDate)}</p>
                      </div>
                    </div>
                    <div style={styles.fosterPetHeaderMeta}>
                      <StatusBadge label="En acogida" tone="success" />
                      <span style={styles.compactPill}>{listingSummary}</span>
                      {applicationCount ? <span style={styles.compactPill}>{applicationCount} solicitud(es)</span> : null}
                      <label style={styles.avatarInlineUpload}>
                        {uploadingAvatarPetId === pet.id ? "Subiendo..." : pet.avatarUrl ? "Cambiar foto" : "+ Foto"}
                        <input
                          accept=".jpg,.jpeg,.jpe,.jfif,.png,.webp,image/jpeg,image/png,image/webp"
                          disabled={disabled || uploadingAvatarPetId === pet.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";

                            if (file) {
                              setUploadingAvatarPetId(pet.id);
                              void onUploadPetAvatar(pet.id, file).finally(() => setUploadingAvatarPetId(null));
                            }
                          }}
                          style={styles.fileInput}
                          type="file"
                        />
                      </label>
                      <button
                        aria-label={`${isExpanded ? "Ocultar" : "Abrir"} detalle de ${pet.name}`}
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedPetId((current) => (current === pet.id ? null : pet.id))}
                        style={styles.accordionChevronButton}
                        type="button"
                      >
                        {isExpanded ? "Ocultar" : "Abrir"}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div style={styles.fosterPetAccordionBody}>
                    <p style={styles.itemMeta}>{pet.notes || "Sin notas de acogida registradas."}</p>
                    <div style={styles.detailGrid}>
                      <InfoTile label="Ingreso a acogida" value={formatFosterIntakeDate(pet.fosterIntakeDate)} />
                      <InfoTile label="Nacimiento" value={pet.birthDate ? formatDate(pet.birthDate) : "Fecha de nacimiento no registrada"} />
                      <InfoTile label="Esterilizacion" value={pet.isSterilized === null ? "Sin indicar" : pet.isSterilized ? "Esterilizada" : "No esterilizada"} />
                    </div>
                    <AdoptionPublicationFlow
                      applicationCount={applicationCount}
                      disabled={disabled}
                      listing={listing ?? null}
                      onClose={onCloseListing}
                      onPause={onPauseListing}
                      onPrepare={() => onPrepareListing(pet.id)}
                      onRemovePhoto={onRemoveListingPhoto}
                      onSave={onSaveListing}
                      onSetCover={onSetListingCover}
                      onShowApplications={() => onShowApplications(pet.id)}
                      onSubmit={onSubmitListing}
                      onUploadPhoto={onUploadListingPhoto}
                      pet={pet}
                    />
                  </div>
                ) : null}
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
  onClose,
  onPause,
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
  onClose: (listingId: Uuid) => Promise<PetAdoptionListing | null>;
  onPause: (listingId: Uuid) => Promise<PetAdoptionListing | null>;
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
  const canEdit = !listing || !["adopted", "closed"].includes(listing.status);
  const canPublish = listing ? ["draft", "rejected", "paused", "pending_review"].includes(listing.status) : false;
  const canManageMedia = Boolean(listing && !["adopted", "closed"].includes(listing.status));
  const quality = getAdoptionListingQuality(listing);

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
      {listing && !quality.isComplete && !["adopted", "closed"].includes(listing.status) ? (
        <div style={styles.qualityNotice}>
          <strong>Ficha incompleta.</strong>
          <span>{adoptionListingQualityMessage(quality.missing)}</span>
        </div>
      ) : null}

      {listing ? (
        <section style={styles.publicContentBox}>
          <div style={styles.sectionHeaderCompact}>
            <div>
              <strong style={styles.itemTitle}>Ficha publica de adopcion</strong>
              <p style={styles.itemMeta}>Estos datos son los que vera una familia interesada antes de solicitar la adopcion.</p>
            </div>
            <div style={styles.inlineActions}>
              <StatusBadge
                label={listing.status === "published" ? "Visible" : listing.status === "paused" ? "Pausada" : "Pendiente"}
                tone={listing.status === "published" ? "success" : listing.status === "paused" ? "warning" : "neutral"}
              />
              {canEdit ? (
                <button disabled={disabled} onClick={() => setIsEditing((current) => !current)} style={styles.secondaryButtonCompact} type="button">
                  {isEditing ? "Ocultar formulario" : "Editar ficha publica"}
                </button>
              ) : null}
            </div>
          </div>
          {canEdit ? (
            <button
              disabled={disabled}
              onClick={() => setIsEditing((current) => !current)}
              style={isEditing ? styles.secondaryButton : styles.primaryButton}
              type="button"
            >
              {isEditing ? "Ocultar edicion" : "Editar ficha publica"}
            </button>
          ) : (
            <div style={styles.lockedPublicationNotice}>
              <strong>Ficha cerrada para edicion.</strong>
              <span>Esta publicacion ya esta cerrada o adoptada. Se conserva como evidencia del proceso y no debe modificarse desde la vitrina.</span>
            </div>
          )}
          <div style={styles.publicContentGrid}>
            <ContentSummaryTile label="Historia" value={listing.publicStory} />
            <ContentSummaryTile label="Personalidad" value={listing.personalityNotes} />
            <ContentSummaryTile label="Salud publica" value={listing.publicHealthSummary} />
            <ContentSummaryTile label="Requisitos" value={listing.adoptionRequirements} />
            <ContentSummaryTile label="Ninos" value={listing.compatibilityChildren} />
            <ContentSummaryTile label="Perros" value={listing.compatibilityDogs} />
            <ContentSummaryTile label="Gatos" value={listing.compatibilityCats} />
            <ContentSummaryTile label="Ubicacion" value={`${listing.city}${listing.stateRegion ? `, ${listing.stateRegion}` : ""}, ${listing.countryCode}`} />
          </div>
          <div style={styles.responsibilityNotice}>
            <strong>Publicacion bajo responsabilidad de la Familia Protectora.</strong>
            <span>La plataforma podra pausar contenido sensible o reportado, pero no requiere aprobacion previa de cada ficha.</span>
          </div>
        </section>
      ) : null}

      {listing ? (
        <section style={styles.mediaGalleryBox}>
          <div style={styles.sectionHeaderCompact}>
            <div>
              <strong style={styles.itemTitle}>Fotos publicas</strong>
              <p style={styles.itemMeta}>Estas fotos seran visibles para familias interesadas bajo responsabilidad de la Familia Protectora.</p>
            </div>
            <span style={styles.countPill}>{listing.media.length}/8 fotos</span>
          </div>

          {isUploadingPhoto ? (
            <div style={styles.mediaUploadNotice}>Subiendo foto y actualizando galeria...</div>
          ) : null}

          {listing.media.length ? null : (
            <div style={styles.mediaEmptyState}>
              <strong>Agrega fotos para hacer mas cercana la publicacion.</strong>
              <span>Usa imagenes claras de la mascota. No subas documentos privados ni datos sensibles.</span>
            </div>
          )}

          <div style={styles.mediaRail}>
            {listing.media.map((media) => (
              <article key={media.id} style={styles.mediaTile}>
                <div style={styles.mediaPreview}>
                  {media.signedUrl ? (
                    <img alt={`Foto publica de ${pet.name}`} src={media.signedUrl} style={styles.mediaImage} />
                  ) : (
                    <div style={styles.mediaFallback}>{pet.name.slice(0, 1).toUpperCase()}</div>
                  )}
                  <span style={styles.mediaStatusOverlay}>{getAdoptionMediaStatusLabel(media.moderationStatus)}{media.isCover ? " · Portada" : ""}</span>
                </div>
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
              </article>
            ))}
            <label style={{ ...styles.mediaUploadTile, opacity: disabled || !canManageMedia || listing.media.length >= 8 ? 0.55 : 1 }}>
              <span style={styles.mediaUploadIcon}>+</span>
              <span>{isUploadingPhoto ? "Subiendo..." : "Subir foto"}</span>
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
          </div>
        </section>
      ) : null}

      <div style={styles.petActionsRow}>
        {!listing ? (
          <button disabled={disabled} onClick={() => void onPrepare()} style={styles.secondaryButton} type="button">
            Preparar publicacion
          </button>
        ) : null}
        {listing && canPublish ? (
          <button disabled={disabled || !quality.isComplete} onClick={() => void onSubmit(listing.id)} style={styles.primaryButton} type="button">
            Publicar bajo responsabilidad
          </button>
        ) : null}
        {listing?.status === "published" || listing?.status === "pending_review" ? (
          <button disabled={disabled} onClick={() => void onPause(listing.id)} style={styles.secondaryButton} type="button">
            Pausar
          </button>
        ) : null}
        {listing && ["published", "paused", "pending_review"].includes(listing.status) ? (
          <button disabled={disabled || !quality.isComplete} onClick={() => void onClose(listing.id)} style={styles.secondaryButton} type="button">
            Cerrar
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
            <button disabled={disabled} style={styles.primaryButton} type="submit">
              {listing.status === "published" ? "Guardar cambios publicados" : "Guardar contenido"}
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
    </div>
  );
}

function PublicProfilePanel({
  commitmentTemplate,
  disabled,
  onOpenCommitmentTemplate,
  onSave,
  onSubmit,
  onUploadCommitmentTemplate,
  onUploadLogo,
  profileStatus,
  publicProfile,
  selectedHouseholdId,
  selectedHouseholdName
}: {
  commitmentTemplate: ProtectiveAdoptionCommitmentTemplate | null;
  disabled: boolean;
  onOpenCommitmentTemplate: (householdId: Uuid) => Promise<ProtectiveAdoptionCommitmentTemplate | null>;
  onSave: (input: ProtectivePublicProfileInput) => Promise<ProtectivePublicProfile | null>;
  onSubmit: (profileId: Uuid) => Promise<ProtectivePublicProfile | null>;
  onUploadCommitmentTemplate: (input: {
    description?: string | null;
    file: File;
    householdId: Uuid;
    requirementPolicy: AdoptionCommitmentRequirementPolicy;
    title: string;
  }) => Promise<ProtectiveAdoptionCommitmentTemplate | null>;
  onUploadLogo: (profile: ProtectivePublicProfile, file: File) => Promise<ProtectivePublicProfile | null>;
  profileStatus: string | null;
  publicProfile: ProtectivePublicProfile | null;
  selectedHouseholdId: Uuid | null;
  selectedHouseholdName: string;
}) {
  const canManage = Boolean(selectedHouseholdId && profileStatus === "approved");
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfileId, setDraftProfileId] = useState<Uuid | null>(publicProfile?.id ?? null);
  const [form, setForm] = useState<ProtectivePublicProfileInput>(() => buildPublicProfileForm(publicProfile, selectedHouseholdId, selectedHouseholdName));
  const [commitmentForm, setCommitmentForm] = useState({
    description: commitmentTemplate?.description ?? "",
    requirementPolicy: (commitmentTemplate?.requirementPolicy ?? "informational") as AdoptionCommitmentRequirementPolicy,
    title: commitmentTemplate?.title ?? "Compromiso de adopcion"
  });

  useEffect(() => {
    setCommitmentForm({
      description: commitmentTemplate?.description ?? "",
      requirementPolicy: (commitmentTemplate?.requirementPolicy ?? "informational") as AdoptionCommitmentRequirementPolicy,
      title: commitmentTemplate?.title ?? "Compromiso de adopcion"
    });
  }, [commitmentTemplate]);

  function resetForm() {
    setForm(buildPublicProfileForm(publicProfile, selectedHouseholdId, selectedHouseholdName));
  }

  function updateField<K extends keyof ProtectivePublicProfileInput>(field: K, value: ProtectivePublicProfileInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const statusLabel = publicProfile ? publicStatusLabel(publicProfile.moderationStatus) : "No configurado";
  const actionLabel = !publicProfile
    ? "Crear perfil publico"
    : publicProfile.moderationStatus === "approved"
      ? "Editar y reenviar"
      : publicProfile.moderationStatus === "rejected"
        ? "Corregir perfil"
        : "Editar perfil";
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
            <div style={styles.logoSummaryTile}>
              <div style={styles.logoPreview}>
                {publicProfile?.logoUrl ? (
                  <img alt="" src={publicProfile.logoUrl} style={styles.logoImage} />
                ) : (
                  <span>{(publicProfile?.displayName ?? selectedHouseholdName).slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <span style={styles.tileLabel}>Logo</span>
                <strong style={styles.tileValue}>{publicProfile?.logoUrl ? "Configurado" : "Pendiente"}</strong>
                {publicProfile ? (
                  <label style={{ ...styles.secondaryButton, display: "inline-flex", justifyContent: "center", maxWidth: "150px" }}>
                    Cambiar logo
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={disabled}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (file) {
                          void onUploadLogo(publicProfile, file);
                        }
                      }}
                      style={styles.fileInput}
                      type="file"
                    />
                  </label>
                ) : (
                  <span style={styles.itemMeta}>Guarda el perfil antes de subir logo.</span>
                )}
              </div>
            </div>
            <InfoTile label="Nombre publico" value={publicProfile?.displayName ?? "No configurado"} />
            <InfoTile label="Ciudad" value={publicProfile ? `${publicProfile.city}, ${publicProfile.countryCode}` : "Pendiente"} />
            <InfoTile label="Contacto" value={publicProfile ? contactPolicyLabels[publicProfile.contactPolicy] : "Solo plataforma"} />
            <InfoTile
              label="Apoyo"
              value={publicProfile?.donationsEnabled ? "Informacion declarada" : "No publicado"}
            />
          </div>
          <p style={styles.bodyText}>
            Guardar el perfil no lo hace publico automaticamente. Despues de guardar, debes enviarlo a revision y admin debe aprobarlo.
          </p>
          {publicProfile?.logoStoragePath && publicProfile.moderationStatus === "draft" ? (
            <p style={styles.bodyText}>El logo esta guardado en borrador. Envia el perfil a revision para que admin lo apruebe.</p>
          ) : null}
          {publicProfile?.moderationStatus === "approved" ? (
            <p style={styles.bodyText}>
              El perfil esta aprobado. Si guardas cambios, pasara a borrador y deberas enviarlo nuevamente a revision antes de mostrarlo como publico.
            </p>
          ) : null}
          {publicProfile?.moderationStatus === "pending_review" ? (
            <p style={styles.bodyText}>El perfil esta pendiente de revision. Admin debe aprobarlo antes de mostrarlo como perfil publico confiable.</p>
          ) : null}
          {publicProfile?.reviewNotes ? <Notice tone="info" message={`Nota de revision: ${publicProfile.reviewNotes}`} /> : null}

          <section style={styles.subPanel}>
            <div style={styles.sectionHeaderCompact}>
              <div>
                <p style={styles.eyebrow}>Compromiso de adopcion</p>
                <h3 style={styles.itemTitle}>{commitmentTemplate ? commitmentTemplate.title : "Sin documento activo"}</h3>
                <p style={styles.itemMeta}>
                  Este documento lo proporciona la Familia Protectora. Pet Ecosystem facilita el intercambio documental, pero no sustituye asesoria legal ni valida el contenido del acuerdo.
                </p>
              </div>
              {commitmentTemplate ? <StatusBadge label={commitmentRequirementLabels[commitmentTemplate.requirementPolicy]} tone="success" /> : <StatusBadge label="Opcional" tone="neutral" />}
            </div>
            {commitmentTemplate ? (
              <div style={styles.documentSummaryRow}>
                <div>
                  <strong style={styles.itemTitle}>{commitmentTemplate.fileName}</strong>
                  <p style={styles.itemMeta}>{commitmentTemplate.mimeType}{commitmentTemplate.fileSizeBytes ? ` - ${Math.round(commitmentTemplate.fileSizeBytes / 1024)} KB` : ""}</p>
                </div>
                <button
                  disabled={disabled || !selectedHouseholdId}
                  onClick={() => selectedHouseholdId ? void onOpenCommitmentTemplate(selectedHouseholdId) : undefined}
                  style={styles.secondaryButtonCompact}
                  type="button"
                >
                  Ver/descargar
                </button>
              </div>
            ) : (
              <p style={styles.bodyText}>Sube una plantilla PDF o imagen para que las familias interesadas puedan revisarla y devolverla firmada cuando corresponda.</p>
            )}
            <div style={styles.formGrid}>
              <label style={styles.fieldLabel}>
                Titulo
                <input
                  disabled={disabled}
                  onChange={(event) => setCommitmentForm((current) => ({ ...current, title: event.target.value }))}
                  style={styles.input}
                  value={commitmentForm.title}
                />
              </label>
              <label style={styles.fieldLabel}>
                Politica
                <select
                  disabled={disabled}
                  onChange={(event) => setCommitmentForm((current) => ({ ...current, requirementPolicy: event.target.value as AdoptionCommitmentRequirementPolicy }))}
                  style={styles.select}
                  value={commitmentForm.requirementPolicy}
                >
                  {Object.entries(commitmentRequirementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <label style={styles.fieldLabel}>
              Descripcion breve
              <textarea
                disabled={disabled}
                onChange={(event) => setCommitmentForm((current) => ({ ...current, description: event.target.value }))}
                style={styles.textarea}
                value={commitmentForm.description}
              />
            </label>
            <label style={{ ...styles.secondaryButton, display: "inline-flex", justifyContent: "center", maxWidth: "220px" }}>
              {commitmentTemplate ? "Reemplazar documento" : "Subir compromiso"}
              <input
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={disabled || !selectedHouseholdId}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file && selectedHouseholdId) {
                    void onUploadCommitmentTemplate({
                      description: commitmentForm.description,
                      file,
                      householdId: selectedHouseholdId,
                      requirementPolicy: commitmentForm.requirementPolicy,
                      title: commitmentForm.title
                    });
                  }
                }}
                style={styles.fileInput}
                type="file"
              />
            </label>
          </section>

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
                const socialLinkError = validateProtectiveSocialLinks(form);

                if (socialLinkError) {
                  window.alert(socialLinkError);
                  return;
                }

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
              <section style={styles.subPanel}>
                <div style={styles.sectionHeaderCompact}>
                  <div>
                    <p style={styles.eyebrow}>Redes sociales</p>
                    <h3 style={styles.itemTitle}>Canales publicos complementarios</h3>
                    <p style={styles.itemMeta}>
                      Estos enlaces solo se muestran dentro del detalle de una mascota publicada, cuando una familia interesada presiona Ver perfil.
                    </p>
                  </div>
                  <StatusBadge label="Opcional" tone="neutral" />
                </div>
                <div style={styles.formGrid}>
                  <label style={styles.fieldLabel}>
                    Sitio web
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField("websiteUrl", event.target.value)}
                      placeholder="https://..."
                      style={styles.input}
                      value={form.websiteUrl ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    Instagram
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField("instagramUrl", event.target.value)}
                      placeholder="https://instagram.com/..."
                      style={styles.input}
                      value={form.instagramUrl ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    Facebook
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField("facebookUrl", event.target.value)}
                      placeholder="https://facebook.com/..."
                      style={styles.input}
                      value={form.facebookUrl ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    TikTok
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField("tiktokUrl", event.target.value)}
                      placeholder="https://tiktok.com/..."
                      style={styles.input}
                      value={form.tiktokUrl ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    WhatsApp publico
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField("whatsappUrl", event.target.value)}
                      placeholder="https://wa.me/507..."
                      style={styles.input}
                      value={form.whatsappUrl ?? ""}
                    />
                  </label>
                </div>
                <p style={styles.itemMeta}>
                  No publiques telefonos o cuentas privadas. La solicitud formal de adopcion sigue ocurriendo dentro de Pet Ecosystem.
                </p>
              </section>
              <section style={styles.subPanel}>
                <div style={styles.sectionHeaderCompact}>
                  <div>
                    <p style={styles.eyebrow}>Apoyo opcional</p>
                    <h3 style={styles.itemTitle}>Informacion publica de donaciones</h3>
                    <p style={styles.itemMeta}>
                      Este bloque se muestra solo en el perfil de la Familia Protectora dentro de una mascota publicada. Donar es opcional y no garantiza aprobacion de adopcion.
                    </p>
                  </div>
                  <StatusBadge label={form.donationsEnabled ? "Activo" : "Oculto"} tone={form.donationsEnabled ? "success" : "neutral"} />
                </div>
                <label style={{ alignItems: "flex-start", display: "flex", gap: "10px", lineHeight: 1.5 }}>
                  <input
                    checked={Boolean(form.donationsEnabled)}
                    disabled={disabled}
                    onChange={(event) => updateField("donationsEnabled", event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Mostrar informacion de apoyo declarada por la Familia Protectora cuando el perfil publico este aprobado.
                  </span>
                </label>
                <div style={styles.formGrid}>
                  <label style={styles.fieldLabel}>
                    Titulo
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField("donationTitle", event.target.value)}
                      placeholder="Apoya a esta Familia Protectora"
                      style={styles.input}
                      value={form.donationTitle ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    Sitio externo
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField("donationExternalUrl", event.target.value)}
                      placeholder="https://..."
                      style={styles.input}
                      value={form.donationExternalUrl ?? ""}
                    />
                  </label>
                </div>
                <label style={styles.fieldLabel}>
                  Descripcion
                  <textarea
                    disabled={disabled}
                    onChange={(event) => updateField("donationDescription", event.target.value)}
                    placeholder="Explica como se usan los aportes sin prometer beneficios fiscales o aprobacion de adopcion."
                    style={styles.textarea}
                    value={form.donationDescription ?? ""}
                  />
                </label>
                <div style={styles.formGrid}>
                  <label style={styles.fieldLabel}>
                    ACH / transferencia
                    <textarea
                      disabled={disabled}
                      onChange={(event) => updateField("donationAchDetails", event.target.value)}
                      placeholder="Banco, tipo de cuenta o referencia publica declarada"
                      style={styles.textarea}
                      value={form.donationAchDetails ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    Yappy
                    <textarea
                      disabled={disabled}
                      onChange={(event) => updateField("donationYappyDetails", event.target.value)}
                      placeholder="Alias o instrucciones publicas declaradas"
                      style={styles.textarea}
                      value={form.donationYappyDetails ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    PayPal
                    <textarea
                      disabled={disabled}
                      onChange={(event) => updateField("donationPaypalDetails", event.target.value)}
                      placeholder="Correo o enlace declarado por la organizacion"
                      style={styles.textarea}
                      value={form.donationPaypalDetails ?? ""}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    Otro metodo
                    <textarea
                      disabled={disabled}
                      onChange={(event) => updateField("donationOtherDetails", event.target.value)}
                      placeholder="Instrucciones adicionales de apoyo"
                      style={styles.textarea}
                      value={form.donationOtherDetails ?? ""}
                    />
                  </label>
                </div>
                <label style={styles.fieldLabel}>
                  Aclaratoria publica
                  <textarea
                    disabled={disabled}
                    onChange={(event) => updateField("donationDisclaimer", event.target.value)}
                    placeholder="Ej. Informacion declarada por la organizacion. Pet Ecosystem no procesa ni valida donaciones."
                    style={styles.textarea}
                    value={form.donationDisclaimer ?? ""}
                  />
                </label>
                <p style={styles.itemMeta}>
                  Pet Ecosystem no procesa pagos, no valida aportes y no condiciona solicitudes de adopcion a donaciones.
                </p>
              </section>
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
  commitmentTemplate,
  detail,
  disabled,
  onOpenCommitmentTemplate,
  onRejectNoteChange,
  onReviewCommitmentDocument,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  transfer
}: {
  commitmentTemplate: ProtectiveAdoptionCommitmentTemplate | null;
  detail: FosterConsoleApplicationDetail | null;
  disabled: boolean;
  onOpenCommitmentTemplate: (householdId: Uuid) => Promise<ProtectiveAdoptionCommitmentTemplate | null>;
  onRejectNoteChange: (value: string) => void;
  onReviewCommitmentDocument: (
    applicationId: Uuid,
    status: Exclude<AdoptionCommitmentDocumentStatus, "pending" | "received">,
    notes?: string | null
  ) => Promise<ApplicationCommitmentDocument | null>;
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

  const { application, closureDetail, commitmentDocument, history } = detail;
  const isApprovedWithoutTransfer = application.status === "approved" && !transfer;
  const closureChecklist = buildAdoptionClosureChecklist(application, commitmentTemplate, commitmentDocument, transfer);
  const closureSummary = getAdoptionClosureSummary(application, transfer, closureDetail);
  const rejectionNote =
    history.find((entry) => entry.toStatus === "rejected" && entry.changeNotes?.trim())?.changeNotes?.trim() ??
    defaultAdoptionRejectionMessage;
  const showClosureChecklist = application.status === "approved" || application.status === "converted_to_transfer" || Boolean(transfer);

  return (
    <aside style={styles.detailPanel}>
      <div style={styles.sectionHeader}>
        <ApplicantIdentity application={application} />
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

      {application.status === "rejected" ? (
        <div style={styles.rejectionNotice}>
          <strong>Solicitud no seleccionada</strong>
          <span>{rejectionNote}</span>
        </div>
      ) : null}

      <section style={styles.subPanel}>
        <div style={styles.sectionHeaderCompact}>
          <div>
            <p style={styles.eyebrow}>Compromiso de adopcion</p>
            <h4 style={styles.historyTitle}>
              {commitmentDocument ? commitmentStatusLabels[commitmentDocument.status] : commitmentTemplate ? "Pendiente de recibir" : "Sin compromiso solicitado"}
            </h4>
            <p style={styles.itemMeta}>
              {commitmentTemplate
                ? `${commitmentTemplate.title} - ${commitmentRequirementLabels[commitmentTemplate.requirementPolicy]}`
                : "La Familia Protectora aun no configuro una plantilla de compromiso."}
            </p>
          </div>
          {commitmentDocument ? (
            <StatusBadge
              label={commitmentStatusLabels[commitmentDocument.status]}
              tone={commitmentDocument.status === "reviewed" ? "success" : commitmentDocument.status === "needs_correction" ? "warning" : "neutral"}
            />
          ) : null}
        </div>
        {commitmentTemplate ? (
          <button
            disabled={disabled}
            onClick={() => void onOpenCommitmentTemplate(application.protectiveHouseholdId)}
            style={styles.secondaryButtonCompact}
            type="button"
          >
            Ver plantilla
          </button>
        ) : null}
        {commitmentDocument?.signedUrl ? (
          <div style={styles.documentSummaryRow}>
            <div>
              <strong style={styles.itemTitle}>{commitmentDocument.fileName ?? "Compromiso firmado"}</strong>
              <p style={styles.itemMeta}>
                {commitmentDocument.mimeType ?? "Archivo"}{commitmentDocument.submittedAt ? ` - Recibido ${formatDate(commitmentDocument.submittedAt)}` : ""}
              </p>
            </div>
            <a href={commitmentDocument.signedUrl} rel="noreferrer" style={styles.secondaryButtonCompact} target="_blank">Ver documento</a>
          </div>
        ) : (
          <p style={styles.bodyText}>Cuando el solicitante suba el compromiso completado, aparecera aqui para revision.</p>
        )}
        {commitmentDocument?.signedUrl ? (
          <div style={styles.heroActions}>
            <button disabled={disabled} onClick={() => void onReviewCommitmentDocument(application.id, "reviewed")} style={styles.secondaryButtonCompact} type="button">Marcar revisado</button>
            <button disabled={disabled} onClick={() => void onReviewCommitmentDocument(application.id, "needs_correction", "Requiere correccion por la Familia Protectora.")} style={styles.dangerPillButton} type="button">Solicitar correccion</button>
          </div>
        ) : null}
      </section>

      {transfer ? (
        <div style={styles.transferNotice}>
          <strong>Transferencia vinculada</strong>
          <span>Estado: {transfer.status}. La custodia solo cambia cuando la familia receptora acepta.</span>
        </div>
      ) : null}
      {isApprovedWithoutTransfer ? (
        <div style={styles.pendingTransferNotice}>
          <strong>Solicitud aprobada, transferencia pendiente</strong>
          <span>Inicia la transferencia privada para que {application.petName} pueda pasar al hogar receptor. Aprobar la solicitud no mueve la custodia.</span>
        </div>
      ) : null}
      {showClosureChecklist ? (
        <section style={styles.subPanel}>
          <div style={styles.sectionHeaderCompact}>
            <div>
              <p style={styles.eyebrow}>Cierre responsable</p>
              <h4 style={styles.historyTitle}>Checklist antes de transferir</h4>
            </div>
            <StatusBadge label={closureChecklist.blocksTransfer ? "Pendiente" : "Listo"} tone={closureChecklist.blocksTransfer ? "warning" : "success"} />
          </div>
          <div style={styles.checklistGrid}>
            {closureChecklist.items.map((item) => (
              <div key={item.label} style={styles.checklistItem}>
                <span style={{ ...styles.processDot, ...(item.done ? styles.processDotDone : styles.processDotPending) }}>{item.done ? "✓" : "!"}</span>
                <div>
                  <strong style={styles.itemTitle}>{item.label}</strong>
                  <p style={styles.itemMeta}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {closureSummary ? (
        <div style={styles.transferNotice}>
          <strong>{closureSummary.title}</strong>
          <span>{closureSummary.detail}</span>
        </div>
      ) : null}

      <ApplicationActions
        application={application}
        canStartTransfer={!closureChecklist.blocksTransfer}
        disabled={disabled}
        onRejectNoteChange={onRejectNoteChange}
        onStartTransfer={onStartTransfer}
        onUpdateStatus={onUpdateStatus}
        rejectNote={rejectNote}
        startTransferBlockedReason="Revisa el compromiso documental antes de iniciar la transferencia."
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
  canStartTransfer,
  disabled,
  onRejectNoteChange,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  startTransferBlockedReason,
  transfer
}: {
  application: PetAdoptionApplication;
  canStartTransfer: boolean;
  disabled: boolean;
  onRejectNoteChange: (value: string) => void;
  onStartTransfer: (application: PetAdoptionApplication) => Promise<void>;
  onUpdateStatus: (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => Promise<void>;
  rejectNote: string;
  startTransferBlockedReason: string;
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
      {application.status === "approved" && !transfer ? (
        <>
          {!canStartTransfer ? <p style={styles.itemMeta}>{startTransferBlockedReason}</p> : null}
          <button disabled={disabled || !canStartTransfer} onClick={() => void onStartTransfer(application)} style={styles.primaryButton} type="button">Iniciar transferencia de {application.petName}</button>
        </>
      ) : null}
      {application.status === "approved" && transfer ? <p style={styles.itemMeta}>La transferencia ya fue iniciada para esta solicitud.</p> : null}
      {application.status !== "approved" ? (
        <div style={styles.rejectBox}>
          <textarea
            disabled={disabled}
            onChange={(event) => onRejectNoteChange(event.target.value)}
            placeholder={defaultAdoptionRejectionMessage}
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

function getApplicantDisplayName(application: PetAdoptionApplication) {
  const rawName = application.applicantName.trim();
  const emailLocalPart = application.applicantEmail.split("@")[0]?.trim().toLowerCase();

  if (emailLocalPart && rawName.toLowerCase().startsWith(emailLocalPart)) {
    const cleanedName = rawName.slice(emailLocalPart.length).trim();

    if (cleanedName) {
      return cleanedName;
    }
  }

  return rawName || "Solicitante sin nombre";
}

function getApplicantInitials(application: PetAdoptionApplication) {
  const source = getApplicantDisplayName(application) || application.applicantEmail;
  const parts = source
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  return (parts[0]?.[0] ?? "S").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function getPetInitials(pet: PetSummary) {
  const initials = pet.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "MP";
}

function getDraftPetInitials(name: string, species: string) {
  const initials = [name, species]
    .map((value) => value.trim()[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials || "MP";
}

function ApplicantIdentity({ application, compact = false }: { application: PetAdoptionApplication; compact?: boolean }) {
  return (
    <div style={compact ? styles.applicantIdentityCompact : styles.applicantIdentity}>
      <span aria-hidden="true" style={compact ? styles.applicantAvatarCompact : styles.applicantAvatar}>
        {getApplicantInitials(application)}
      </span>
      <div style={styles.applicantCopy}>
        <span style={compact ? styles.applicantLabelCompact : styles.eyebrow}>Solicitante</span>
        <strong style={compact ? styles.itemTitle : styles.detailTitle}>{getApplicantDisplayName(application)}</strong>
        <span style={styles.itemMeta}>
          {application.applicantEmail}
          {application.applicantPhone ? ` - ${application.applicantPhone}` : ""}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  actionsBox: { display: "flex", flexDirection: "column", gap: "10px" },
  applicantAvatar: { alignItems: "center", background: "#ccfbf1", borderRadius: "18px", color: "#0f766e", display: "inline-flex", flexShrink: 0, fontSize: "14px", fontWeight: 900, height: "44px", justifyContent: "center", width: "44px" },
  applicantAvatarCompact: { alignItems: "center", background: "#ccfbf1", borderRadius: "14px", color: "#0f766e", display: "inline-flex", flexShrink: 0, fontSize: "11px", fontWeight: 900, height: "32px", justifyContent: "center", width: "32px" },
  applicantCopy: { display: "grid", gap: "3px", minWidth: 0 },
  applicantIdentity: { alignItems: "center", display: "flex", gap: "12px", minWidth: 0 },
  applicantIdentityCompact: { alignItems: "center", display: "flex", gap: "8px", marginTop: "6px", minWidth: 0 },
  applicantLabelCompact: { color: "#0f766e", fontSize: "10px", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" },
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
  applicationCardTitle: { display: "grid", gap: "2px", minWidth: 0 },
  applicationAccordionBody: { borderTop: "1px solid rgba(15, 118, 110, 0.12)", padding: "0 12px 12px" },
  applicationAccordionCard: { background: "#fffdf8", border: "1px solid rgba(20, 184, 166, 0.18)", borderRadius: "18px", display: "grid", overflow: "hidden" },
  applicationAccordionCardOpen: { background: "#f8fffd", borderColor: "rgba(15, 118, 110, 0.28)", boxShadow: "0 14px 30px rgba(15, 118, 110, 0.08)" },
  applicationAccordionHeader: { alignItems: "flex-start", background: "transparent", border: 0, color: "inherit", cursor: "pointer", display: "flex", gap: "14px", justifyContent: "space-between", padding: "14px", textAlign: "left", width: "100%" },
  applicationAccordionList: { display: "grid", gap: "10px" },
  applicationSnippet: { color: "#475569", fontSize: "13px", lineHeight: 1.45, margin: 0 },
  applicationStatusStack: { alignItems: "flex-end", display: "grid", flexShrink: 0, gap: "5px", justifyItems: "end", maxWidth: "260px", textAlign: "right" },
  applicationTitleRow: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: "8px" },
  accordionChevron: { alignItems: "center", background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f766e", display: "inline-flex", flexShrink: 0, fontSize: "9.5px", fontWeight: 900, justifyContent: "center", lineHeight: 1, minHeight: "24px", padding: "5px 8px", whiteSpace: "nowrap" },
  accordionChevronButton: { alignItems: "center", background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f766e", cursor: "pointer", display: "inline-flex", flexShrink: 0, fontSize: "8.8px", fontWeight: 900, justifyContent: "center", lineHeight: 1, minHeight: "26px", padding: "5px 8px", whiteSpace: "nowrap" },
  avatarInlineUpload: { alignItems: "center", background: "#f0fdfa", border: "1px solid rgba(15, 118, 110, 0.22)", borderRadius: "999px", color: "#00796f", cursor: "pointer", display: "inline-flex", flexShrink: 0, fontSize: "8.8px", fontWeight: 900, justifyContent: "center", minHeight: "26px", padding: "5px 8px", whiteSpace: "nowrap" },
  avatarPickerCopy: { display: "flex", flex: 1, flexDirection: "column", gap: "3px", minWidth: 0 },
  avatarPickerRow: { alignItems: "center", background: "#ffffff", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "18px", cursor: "pointer", display: "flex", gap: "12px", padding: "10px" },
  avatarPreview: { alignItems: "center", background: "#dff7f3", border: "1px solid rgba(15, 118, 110, 0.22)", borderRadius: "999px", color: "#00796f", display: "inline-flex", flexShrink: 0, fontSize: "13px", fontWeight: 900, height: "44px", justifyContent: "center", width: "44px" },
  avatarZoomCaption: { background: "rgba(15, 23, 42, 0.82)", borderRadius: "999px", bottom: "10px", color: "#ffffff", fontSize: "11px", fontWeight: 900, left: "12px", maxWidth: "156px", overflow: "hidden", padding: "5px 8px", position: "absolute", right: "12px", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  avatarZoomImage: { display: "block", height: "100%", objectFit: "cover", width: "100%" },
  avatarZoomPreview: { background: "#ffffff", border: "1px solid rgba(15, 118, 110, 0.22)", borderRadius: "20px", boxShadow: "0 22px 50px rgba(15, 23, 42, 0.22)", height: "210px", left: "58px", overflow: "hidden", padding: "6px", pointerEvents: "none", position: "absolute", top: "-56px", width: "210px", zIndex: 60 },
  badgeStack: { alignItems: "flex-end", display: "flex", flexDirection: "column", gap: "6px" },
  bodyText: { color: "#475569", fontSize: "12px", lineHeight: 1.5, margin: 0 },
  checklistGrid: { display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" },
  checklistItem: { alignItems: "flex-start", background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "16px", display: "flex", gap: "10px", padding: "10px" },
  closureSummaryGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" },
  closureTimelineBox: { background: "#f8fffd", borderTop: "1px solid rgba(15, 118, 110, 0.12)", display: "grid", gap: "12px", padding: "14px" },
  consoleContent: { display: "grid", gap: "14px", minWidth: 0 },
  consoleShell: { alignItems: "start", display: "grid", gap: "16px", gridTemplateColumns: "210px minmax(0, 1fr)" },
  contextGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))" },
  countPill: { background: "#f8fafc", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f766e", fontSize: "10px", fontWeight: 800, padding: "6px 10px" },
  compactPill: { background: "#f8fafc", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "999px", color: "#0f766e", fontSize: "8.8px", fontWeight: 900, padding: "5px 7px", whiteSpace: "nowrap" },
  coverFallback: { alignItems: "center", background: "#dff7f3", borderRadius: "16px", color: "#0f766e", display: "flex", fontSize: "22px", fontWeight: 900, height: "66px", justifyContent: "center", width: "66px" },
  coverImage: { borderRadius: "16px", height: "66px", objectFit: "cover", width: "66px" },
  dangerButton: { background: "#fff1f2", border: "1px solid rgba(185, 28, 28, 0.22)", borderRadius: "999px", color: "#991b1b", cursor: "pointer", fontSize: "11px", fontWeight: 800, padding: "8px 12px" },
  dangerPillButton: { background: "#fff1f2", border: "1px solid rgba(185, 28, 28, 0.18)", borderRadius: "999px", color: "#991b1b", cursor: "pointer", fontSize: "9.5px", fontWeight: 900, padding: "6px 8px" },
  documentSummaryRow: { alignItems: "center", background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "16px", display: "flex", gap: "12px", justifyContent: "space-between", padding: "12px" },
  detailGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" },
  detailPanel: { background: "#f8fffd", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "18px", display: "grid", gap: "12px", padding: "14px" },
  detailTitle: { color: "#0f172a", fontSize: "17px", margin: 0 },
  emptyState: { background: "#fffdf8", border: "1px dashed rgba(15, 118, 110, 0.2)", borderRadius: "16px", color: "#64748b", fontSize: "12px", padding: "14px" },
  errorNotice: { background: "#fef2f2", borderColor: "rgba(185, 28, 28, 0.22)", color: "#991b1b" },
  eyebrow: { color: "#0f766e", fontSize: "10px", fontWeight: 900, letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" },
  filtersRow: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" },
  fieldLabel: { color: "#334155", display: "grid", fontSize: "10px", fontWeight: 900, gap: "6px", textTransform: "uppercase" },
  fileInput: { height: 1, opacity: 0, overflow: "hidden", position: "absolute", width: 1 },
  formGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" },
  formStack: { display: "grid", gap: "12px" },
  fosterPetAccordion: { display: "grid", gap: "10px" },
  fosterPetAccordionBody: { borderTop: "1px solid rgba(15, 118, 110, 0.12)", display: "grid", gap: "12px", padding: "12px 14px 14px" },
  fosterPetAccordionHeader: { alignItems: "center", background: "transparent", border: 0, color: "inherit", display: "flex", gap: "14px", justifyContent: "space-between", padding: "14px", position: "relative", textAlign: "left", width: "100%" },
  fosterPetCard: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "20px", display: "grid", overflow: "hidden" },
  fosterPetCardPreviewing: { overflow: "visible", position: "relative", zIndex: 25 },
  fosterPetGrid: { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" },
  fosterPetAvatar: { alignItems: "center", background: "#dff7f3", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f766e", display: "inline-flex", flexShrink: 0, fontSize: "13px", fontWeight: 900, height: "46px", justifyContent: "center", overflow: "hidden", width: "46px" },
  fosterPetAvatarFrame: { borderRadius: "999px", display: "inline-flex", flexShrink: 0, position: "relative" },
  fosterPetAvatarImage: { display: "block", height: "100%", objectFit: "cover", width: "100%" },
  fosterPetAvatarInspectable: { boxShadow: "0 0 0 3px rgba(15, 118, 110, 0.08)", cursor: "zoom-in" },
  fosterPetHeaderMain: { alignItems: "center", display: "flex", flex: 1, gap: "12px", justifyContent: "space-between", minWidth: 0 },
  fosterPetHeaderMeta: { alignItems: "center", display: "flex", flex: "0 1 auto", flexWrap: "wrap", gap: "5px", justifyContent: "flex-end", minWidth: 0 },
  fosterPetIdentity: { alignItems: "center", display: "flex", gap: "11px", minWidth: 0 },
  fosterPetIdentityCopy: { display: "grid", minWidth: 0 },
  guidanceGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" },
  hero: { alignItems: "flex-start", background: "linear-gradient(135deg, #0f766e, #115e59)", borderRadius: "24px", color: "white", display: "flex", gap: "20px", justifyContent: "space-between", padding: "24px" },
  heroActions: { display: "flex", flexWrap: "wrap", gap: "8px" },
  heroCopy: { color: "rgba(255,255,255,0.86)", fontSize: "13px", lineHeight: 1.5, margin: "7px 0 0", maxWidth: "680px" },
  heroTitle: { fontSize: "28px", lineHeight: 1.05, margin: "7px 0 0" },
  historyBox: { borderTop: "1px solid rgba(15, 118, 110, 0.16)", display: "grid", gap: "8px", paddingTop: "12px" },
  historyItem: { background: "#fffdf8", borderRadius: "14px", display: "grid", gap: "3px", padding: "10px" },
  historyTitle: { color: "#0f172a", fontSize: "15px", margin: 0 },
  infoNotice: { background: "#ecfeff", borderColor: "rgba(15, 118, 110, 0.2)", color: "#0f766e" },
  infoTile: { background: "#fffdf8", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "14px", display: "grid", gap: "3px", padding: "11px" },
  inlineActions: { alignItems: "center", display: "flex", flexShrink: 0, flexWrap: "wrap", gap: "8px", justifyContent: "flex-end" },
  input: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f172a", fontSize: "12px", fontWeight: 700, padding: "10px 12px", textTransform: "none" },
  iconPillButton: { background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f766e", cursor: "pointer", fontSize: "9.5px", fontWeight: 900, padding: "6px 8px" },
  itemMeta: { color: "#64748b", fontSize: "10.5px", lineHeight: 1.4, margin: "4px 0 0" },
  itemTitle: { color: "#0f172a", fontSize: "13px" },
  listingCard: { alignItems: "center", background: "#fffdf8", borderRadius: "20px", display: "flex", gap: "12px", padding: "12px" },
  listingHistoryCard: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "20px", display: "grid", overflow: "hidden" },
  listStack: { display: "grid", gap: "10px" },
  logoImage: { display: "block", height: "100%", objectFit: "cover", width: "100%" },
  logoPreview: { alignItems: "center", background: "#dff7f3", borderRadius: "18px", color: "#0f766e", display: "flex", flexShrink: 0, fontSize: "18px", fontWeight: 900, height: "76px", justifyContent: "center", overflow: "hidden", width: "76px" },
  logoSummaryTile: { alignItems: "center", background: "#fffdf8", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "18px", display: "flex", gap: "12px", padding: "14px" },
  metricCard: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.15)", borderRadius: "16px", cursor: "pointer", display: "grid", gap: "5px", minHeight: "84px", padding: "13px", textAlign: "left" },
  metricDetail: { color: "#64748b", fontSize: "10.5px" },
  metricGrid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" },
  metricLabel: { color: "#0f766e", fontSize: "9.5px", fontWeight: 900, textTransform: "uppercase" },
  metricValue: { color: "#0f766e", fontSize: "24px", lineHeight: 1 },
  mediaActions: { display: "flex", flexWrap: "wrap", gap: "5px", padding: "7px" },
  mediaEmptyState: { background: "#fffdf8", border: "1px dashed rgba(15, 118, 110, 0.18)", borderRadius: "16px", color: "#64748b", display: "grid", fontSize: "12px", gap: "4px", padding: "12px" },
  mediaFallback: { alignItems: "center", background: "#dff7f3", color: "#0f766e", display: "flex", fontSize: "18px", fontWeight: 900, height: "100%", justifyContent: "center", width: "100%" },
  mediaGalleryBox: { background: "rgba(255, 255, 255, 0.72)", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "18px", display: "grid", gap: "8px", padding: "10px" },
  mediaImage: { display: "block", height: "100%", objectFit: "cover", width: "100%" },
  mediaPreview: { aspectRatio: "1 / 1", background: "#dff7f3", position: "relative", width: "100%" },
  mediaRail: { alignItems: "start", display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 118px))" },
  mediaStatus: { color: "#475569", fontSize: "11px", fontWeight: 900 },
  mediaStatusOverlay: { background: "rgba(255, 253, 248, 0.92)", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", bottom: "6px", color: "#0f766e", fontSize: "10px", fontWeight: 900, left: "6px", maxWidth: "calc(100% - 12px)", overflow: "hidden", padding: "4px 6px", position: "absolute", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  mediaTile: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "14px", overflow: "hidden", width: "118px" },
  mediaTileFooter: { display: "grid", gap: "6px", padding: "8px" },
  mediaUploadIcon: { alignItems: "center", background: "#dff7f3", borderRadius: "999px", color: "#0f766e", display: "inline-flex", fontSize: "18px", fontWeight: 900, height: "32px", justifyContent: "center", width: "32px" },
  mediaUploadNotice: { background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "14px", color: "#0f766e", fontSize: "12px", fontWeight: 900, padding: "10px 12px" },
  mediaUploadTile: { alignItems: "center", aspectRatio: "1 / 1", background: "#fffdf8", border: "1px dashed rgba(15, 118, 110, 0.26)", borderRadius: "14px", color: "#0f766e", cursor: "pointer", display: "flex", flexDirection: "column", fontSize: "12px", fontWeight: 900, gap: "8px", justifyContent: "center", padding: "10px", textAlign: "center", width: "118px" },
  lockedPublicationNotice: { background: "rgba(247, 242, 232, 0.78)", border: "1px solid rgba(120, 113, 108, 0.18)", borderRadius: "14px", color: "#475569", display: "grid", fontSize: "12px", gap: "4px", lineHeight: 1.45, padding: "10px 12px" },
  notice: { border: "1px solid", borderRadius: "16px", fontSize: "12px", fontWeight: 800, padding: "12px 14px" },
  operationalStatusText: { color: "#c2410c", fontSize: "12px", fontWeight: 900, margin: "6px 0 0" },
  pageShell: { background: "#fbfaf7", color: "#0f172a", display: "grid", gap: "16px", minHeight: "100vh", padding: "24px" },
  panel: { background: "rgba(255,255,255,0.92)", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "20px", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.055)", display: "grid", gap: "14px", padding: "18px" },
  pendingTransferNotice: { background: "#fff7ed", border: "1px solid rgba(234, 88, 12, 0.22)", borderRadius: "16px", color: "#c2410c", display: "grid", gap: "5px", padding: "11px" },
  petActionsRow: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: "8px" },
  primaryButton: { background: "#0f766e", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "999px", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: 900, padding: "9px 13px", textDecoration: "none" },
  processDot: { alignItems: "center", background: "rgba(15, 118, 110, 0.08)", borderRadius: "999px", display: "inline-flex", fontSize: "11px", fontWeight: 900, height: "22px", justifyContent: "center", width: "22px" },
  processDotDone: { background: "#ccfbf1", color: "#0f766e" },
  processDotPending: { background: "#ffedd5", color: "#c2410c" },
  processRail: { display: "flex", flexWrap: "wrap", gap: "8px" },
  processStep: { alignItems: "center", background: "#f8fafc", border: "1px solid rgba(100, 116, 139, 0.16)", borderRadius: "999px", color: "#64748b", display: "inline-flex", fontSize: "10px", fontWeight: 900, gap: "5px", padding: "5px 8px" },
  processStepActive: { background: "#fff7ed", borderColor: "rgba(234, 88, 12, 0.24)", color: "#c2410c" },
  processStepDone: { background: "#ecfdf5", borderColor: "rgba(15, 118, 110, 0.22)", color: "#0f766e" },
  publicationFlowBox: { background: "#f8fffd", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "18px", display: "grid", gap: "10px", padding: "12px" },
  qualityNotice: { background: "#fff7ed", border: "1px solid rgba(234, 88, 12, 0.18)", borderRadius: "14px", color: "#9a3412", display: "grid", fontSize: "12px", gap: "4px", lineHeight: 1.45, padding: "10px 12px" },
  publicContentBox: { background: "rgba(255, 253, 248, 0.82)", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "18px", display: "grid", gap: "10px", padding: "12px" },
  publicContentGrid: { display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" },
  publicContentTile: { background: "#fffdf8", border: "1px solid rgba(28, 25, 23, 0.08)", borderRadius: "14px", display: "grid", gap: "4px", minHeight: "74px", padding: "10px" },
  publicProfileSummary: { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" },
  rejectionNotice: { background: "#fff7ed", border: "1px solid rgba(234, 88, 12, 0.2)", borderRadius: "16px", color: "#9a3412", display: "grid", gap: "6px", lineHeight: 1.45, padding: "11px" },
  rejectBox: { display: "grid", gap: "8px" },
  responsibilityNotice: { background: "#fff7ed", border: "1px solid rgba(234, 88, 12, 0.18)", borderRadius: "14px", color: "#9a3412", display: "grid", fontSize: "12px", gap: "3px", lineHeight: 1.4, padding: "10px" },
  secondaryButton: { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f766e", cursor: "pointer", fontSize: "12px", fontWeight: 900, padding: "9px 13px", textDecoration: "none" },
  secondaryButtonCompact: { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "999px", color: "#0f766e", cursor: "pointer", fontSize: "10px", fontWeight: 900, padding: "7px 10px", textDecoration: "none", whiteSpace: "nowrap" },
  sectionHeader: { alignItems: "flex-start", display: "flex", gap: "14px", justifyContent: "space-between" },
  sectionHeaderCompact: { alignItems: "flex-start", display: "flex", gap: "12px", justifyContent: "space-between" },
  sectionTitle: { color: "#0f172a", fontSize: "19px", margin: "3px 0 0" },
  select: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "999px", color: "#0f172a", fontSize: "12px", fontWeight: 800, padding: "8px 12px" },
  sessionHint: { color: "rgba(255,255,255,0.72)", fontSize: "10px", fontWeight: 700, margin: "9px 0 0" },
  subPanel: { background: "#f8fffd", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "16px", display: "grid", gap: "10px", padding: "12px" },
  sideNav: { background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.18)", color: "white", display: "grid", gap: "13px", padding: "14px", position: "sticky", top: "18px" },
  sideNavBrand: { alignItems: "center", display: "flex", gap: "9px", minWidth: 0 },
  sideNavCount: { background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", color: "white", fontSize: "9px", fontWeight: 900, padding: "3px 6px", position: "absolute", right: "8px", top: "8px" },
  sideNavItem: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "white", cursor: "pointer", display: "grid", gap: "3px", padding: "9px 40px 9px 10px", position: "relative", textAlign: "left" },
  sideNavItemActive: { background: "rgba(20,184,166,0.22)", borderColor: "rgba(45,212,191,0.42)", boxShadow: "inset 3px 0 0 rgba(45,212,191,0.85)" },
  sideNavItemDetail: { color: "rgba(255,255,255,0.66)", fontSize: "9px" },
  sideNavItemLabel: { fontSize: "11px", fontWeight: 900 },
  sideNavList: { display: "grid", gap: "7px" },
  sideNavLogoImage: { display: "block", height: "100%", objectFit: "cover", width: "100%" },
  sideNavMark: { alignItems: "center", background: "#dff7f3", borderRadius: "13px", color: "#0f766e", display: "inline-flex", flexShrink: 0, fontSize: "12px", fontWeight: 900, height: "34px", justifyContent: "center", overflow: "hidden", width: "34px" },
  sideNavSubtitle: { color: "rgba(255,255,255,0.66)", display: "block", fontSize: "9.5px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sideNavTitle: { display: "block", fontSize: "11.5px" },
  statusBadge: { alignSelf: "flex-start", background: "#f8fafc", border: "1px solid rgba(100, 116, 139, 0.16)", borderRadius: "999px", color: "#475569", fontSize: "9.5px", fontWeight: 900, padding: "6px 8px", whiteSpace: "nowrap" },
  successBadge: { background: "#ecfdf5", borderColor: "rgba(15, 118, 110, 0.2)", color: "#0f766e" },
  successMetric: { background: "linear-gradient(135deg, #f0fdfa, #ffffff)" },
  textarea: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.16)", borderRadius: "14px", color: "#0f172a", fontSize: "12px", minHeight: "78px", padding: "10px", resize: "vertical" },
  textBlock: { display: "grid", gap: "4px" },
  tileEmptyValue: { color: "#94a3b8", fontSize: "11px", fontWeight: 800, lineHeight: 1.35 },
  tileLabel: { color: "#64748b", fontSize: "9.5px", fontWeight: 900, textTransform: "uppercase" },
  tileValue: { color: "#0f172a", fontSize: "13px", lineHeight: 1.25 },
  timelineAccordionBody: { borderTop: "1px solid rgba(15, 118, 110, 0.1)", padding: "10px 12px 12px 42px" },
  timelineAccordionHeader: { alignItems: "center", background: "transparent", border: 0, color: "inherit", cursor: "pointer", display: "flex", gap: "10px", padding: "11px 12px", textAlign: "left", width: "100%" },
  timelineAccordionItem: { background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.12)", borderRadius: "16px", overflow: "hidden" },
  timelineDot: { background: "#cbd5e1", borderRadius: "999px", display: "inline-block", flexShrink: 0, height: "10px", width: "10px" },
  timelineDotSuccess: { background: "#0f766e" },
  timelineDotWarning: { background: "#f97316" },
  timelineText: { display: "grid", flex: 1, gap: "2px", minWidth: 0 },
  transferCard: { alignItems: "flex-start", background: "#fffdf8", border: "1px solid rgba(15, 118, 110, 0.14)", borderRadius: "18px", display: "flex", gap: "12px", justifyContent: "space-between", padding: "13px" },
  transferNotice: { background: "#ecfdf5", border: "1px solid rgba(15, 118, 110, 0.18)", borderRadius: "18px", color: "#0f766e", display: "grid", gap: "4px", padding: "12px" },
  twoColumnGrid: { display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" },
  warningBadge: { background: "#fff7ed", borderColor: "rgba(234, 88, 12, 0.22)", color: "#c2410c" },
  warningMetric: { background: "linear-gradient(135deg, #fff7ed, #ffffff)" }
};
