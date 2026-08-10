import { colorTokens, visualTokens } from "@pet/ui";
import type {
  ApplicationCommitmentDocument,
  PetAdoptionApplication,
  PetAdoptionApplicationInput,
  PetAdoptionListing,
  PetTransferRecord,
  ProtectiveAdoptionCommitmentTemplate
} from "@pet/types";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import { Image, Linking, Modal, Pressable, Share, Text, TextInput, View } from "react-native";

import { StatusChip } from "../../core/components/StatusChip";
import { getMobileCoreApiClient, getMobileFosterApiClient } from "../../core/services/supabase-mobile";

const inputStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colorTokens.line,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: colorTokens.surface,
  color: colorTokens.ink
} as const;

const cardStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colorTokens.line,
  backgroundColor: colorTokens.surface,
  padding: 14,
  gap: 10,
  ...visualTokens.mobile.softShadow
} as const;

function Button({ disabled, label, onPress, tone = "primary" }: { disabled?: boolean; label: string; onPress: () => void; tone?: "primary" | "secondary" }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: tone === "primary" ? colorTokens.accent : colorTokens.surface,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(0,151,143,0.26)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: disabled ? 0.65 : 1,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function FilterChip({ isActive, label, onPress }: { isActive: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: isActive ? "rgba(20,184,166,0.16)" : "#ffffff",
        borderWidth: 1,
        borderColor: isActive ? "rgba(15,118,110,0.28)" : "rgba(15,23,42,0.1)",
        paddingHorizontal: 12,
        paddingVertical: 8
      }}
    >
      <Text style={{ color: isActive ? colorTokens.accentDark : colorTokens.ink, fontSize: 11, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function formatSpeciesLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatAdoptionPetAge(birthDate: string | null) {
  if (!birthDate) {
    return "Edad por confirmar";
  }

  const birthday = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(birthday.getTime())) {
    return "Edad por confirmar";
  }

  const today = new Date();
  let years = today.getFullYear() - birthday.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());

  if (!hasBirthdayPassed) {
    years -= 1;
  }

  if (years <= 0) {
    return "Menos de 1 ano";
  }

  return `${years} ano${years === 1 ? "" : "s"}`;
}

function formatAdoptionSterilized(value: boolean | null) {
  if (value === true) {
    return "Esterilizada";
  }

  if (value === false) {
    return "No esterilizada";
  }

  return "Esterilizacion por confirmar";
}

function formatAdoptionCompatibility(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

const adoptionApplicationStatusLabels: Record<PetAdoptionApplication["status"], string> = {
  approved: "Aprobada",
  converted_to_transfer: "Convertida en transferencia",
  interview: "Entrevista",
  in_review: "En revision",
  rejected: "Rechazada",
  submitted: "Enviada",
  withdrawn: "Retirada"
};

const commitmentStatusLabels: Record<ApplicationCommitmentDocument["status"], string> = {
  needs_correction: "Requiere correccion",
  pending: "Pendiente",
  received: "Recibido",
  reviewed: "Revisado"
};

const commitmentRequirementLabels: Record<ProtectiveAdoptionCommitmentTemplate["requirementPolicy"], string> = {
  informational: "Informativo",
  required_before_approval: "Requerido antes de aprobar",
  required_before_transfer: "Requerido antes de transferir"
};

const commitmentAllowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const commitmentMaxFileSizeBytes = 10 * 1024 * 1024;

function getApprovedAdoptionMedia(listing: PetAdoptionListing) {
  return listing.media.filter((media) => media.moderationStatus === "approved" && media.signedUrl);
}

function getAdoptionListingCover(listing: PetAdoptionListing) {
  const approvedMedia = getApprovedAdoptionMedia(listing);
  return approvedMedia.find((media) => media.isCover) ?? approvedMedia[0] ?? null;
}

function getAdoptionPetInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

function getProtectiveHouseholdDisplayName(listing: PetAdoptionListing) {
  return listing.householdName?.trim() || null;
}

function getProtectiveHouseholdInitials(name: string) {
  const segments = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return segments.map((segment) => segment[0]?.toUpperCase()).join("") || "FP";
}

function getProtectiveSocialLinks(listing: PetAdoptionListing) {
  return [
    { label: "Web", url: listing.protectiveWebsiteUrl },
    { label: "Instagram", url: listing.protectiveInstagramUrl },
    { label: "Facebook", url: listing.protectiveFacebookUrl },
    { label: "TikTok", url: listing.protectiveTiktokUrl },
    { label: "WhatsApp", url: listing.protectiveWhatsappUrl }
  ].filter((link): link is { label: string; url: string } => Boolean(link.url?.trim()));
}

function getProtectiveDonationMethods(listing: PetAdoptionListing) {
  return [
    { label: "ACH", value: listing.protectiveDonationAchDetails, url: null },
    { label: "Yappy", value: listing.protectiveDonationYappyDetails, url: null },
    { label: "PayPal", value: listing.protectiveDonationPaypalDetails, url: null },
    { label: "Sitio", value: listing.protectiveDonationExternalUrl, url: listing.protectiveDonationExternalUrl },
    { label: "Otro", value: listing.protectiveDonationOtherDetails, url: null }
  ].filter((method): method is { label: string; value: string; url: string | null } => Boolean(method.value?.trim()));
}

function shouldShowProtectiveDonationBlock(listing: PetAdoptionListing) {
  if (!listing.protectiveDonationsEnabled) {
    return false;
  }

  return Boolean(listing.protectiveDonationDescription?.trim() || getProtectiveDonationMethods(listing).length);
}

async function openProtectiveSocialLink(url: string) {
  if (!/^https:\/\//i.test(url)) {
    return;
  }

  await Linking.openURL(url);
}

function getPublicAdoptionUrl(slug: string) {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const publicWebUrl = env?.EXPO_PUBLIC_WEB_URL ?? "https://petecosyst.com";
  return `${publicWebUrl.replace(/\/$/, "")}/adopciones/${slug}`;
}

type AdoptionApplicantDefaults = {
  applicantName: string;
  applicantEmail: string;
};

const emptyApplicantDefaults: AdoptionApplicantDefaults = {
  applicantName: "",
  applicantEmail: ""
};

const defaultAdoptionRejectionMessage =
  "Gracias por tu interes y por abrir tu hogar a una mascota. En esta oportunidad la Familia Protectora decidio continuar el proceso con otra familia que se ajustaba mejor a las necesidades de la mascota. Agradecemos mucho tu disposicion y esperamos que pronto encuentres una mascota con la que puedas crear un vinculo especial.";

function applyApplicantDefaults(
  current: Omit<PetAdoptionApplicationInput, "listingId">,
  defaults: AdoptionApplicantDefaults
) {
  return {
    ...current,
    applicantName: current.applicantName.trim() ? current.applicantName : defaults.applicantName,
    applicantEmail: current.applicantEmail.trim() ? current.applicantEmail : defaults.applicantEmail
  };
}

function getAdoptionClosureCopy(application: PetAdoptionApplication, transfer: PetTransferRecord | undefined) {
  if (application.status === "rejected") {
    return defaultAdoptionRejectionMessage;
  }

  if (application.status === "converted_to_transfer") {
    return "La adopcion ya fue cerrada mediante transferencia privada.";
  }

  if (transfer?.status === "pending") {
    return "La transferencia fue iniciada. Revisa Hogares para aceptarla.";
  }

  if (transfer?.status === "accepted") {
    return "La transferencia fue aceptada. La mascota ya puede verse en el hogar receptor.";
  }

  if (application.status === "approved") {
    return "Tu solicitud fue aprobada. La familia protectora debe iniciar la transferencia privada para que esta mascota pase a tu hogar.";
  }

  return null;
}

type AdoptionDiscoveryWorkspaceProps = {
  enabled: boolean;
  onBackHome: () => void;
  onOpenPetInvitations?: () => void;
};

type AdoptionPhotoViewerState = {
  index: number;
  photos: Array<{ id: string; signedUrl: string }>;
  title: string;
};

export function AdoptionDiscoveryWorkspace({ enabled, onBackHome, onOpenPetInvitations }: AdoptionDiscoveryWorkspaceProps) {
  const [adoptionListings, setAdoptionListings] = useState<PetAdoptionListing[]>([]);
  const [myApplications, setMyApplications] = useState<PetAdoptionApplication[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<PetTransferRecord[]>([]);
  const [selectedAdoptionListing, setSelectedAdoptionListing] = useState<PetAdoptionListing | null>(null);
  const [currentView, setCurrentView] = useState<"list" | "detail">("list");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
  const [isUploadingCommitmentDocument, setIsUploadingCommitmentDocument] = useState(false);
  const [applicantDefaults, setApplicantDefaults] = useState<AdoptionApplicantDefaults>(emptyApplicantDefaults);
  const [commitmentDocument, setCommitmentDocument] = useState<ApplicationCommitmentDocument | null>(null);
  const [commitmentTemplate, setCommitmentTemplate] = useState<ProtectiveAdoptionCommitmentTemplate | null>(null);
  const [photoViewer, setPhotoViewer] = useState<AdoptionPhotoViewerState | null>(null);
  const [applicationInput, setApplicationInput] = useState<Omit<PetAdoptionApplicationInput, "listingId">>({
    applicantHouseholdId: null,
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    availabilityNotes: "",
    commitmentAcknowledged: false,
    hasChildren: null,
    hasOtherPets: null,
    housingType: "",
    motivation: "",
    petExperience: ""
  });

  async function loadApplicantDefaults() {
    try {
      const snapshot = await getMobileCoreApiClient().getCoreSnapshot();
      const applicantName = [snapshot.profile.firstName, snapshot.profile.lastName].filter(Boolean).join(" ").trim();
      const nextDefaults = {
        applicantName: applicantName || snapshot.profile.email,
        applicantEmail: snapshot.profile.email
      };

      setApplicantDefaults(nextDefaults);
      setApplicationInput((current) => applyApplicantDefaults(current, nextDefaults));
    } catch {
      setApplicantDefaults(emptyApplicantDefaults);
    }
  }

  async function loadAdoptionListings() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fosterApi = getMobileFosterApiClient();
      const [listings, applications, transfers] = await Promise.all([
        fosterApi.listPublishedPetAdoptionListings(),
        fosterApi.listMyPetAdoptionApplications(),
        fosterApi.listIncomingPetTransfers()
      ]);
      setAdoptionListings(listings);
      setMyApplications(applications);
      setIncomingTransfers(transfers);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar mascotas en adopcion.");
    } finally {
      setIsLoading(false);
    }
  }

  async function openAdoptionDetail(listingId: string) {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const detail = await getMobileFosterApiClient().getPetAdoptionListingDetail(listingId, "public");
      const nextListing = detail ?? adoptionListings.find((listing) => listing.id === listingId) ?? null;
      setSelectedAdoptionListing(nextListing);
      setCurrentView("detail");
      if (nextListing) {
        const application = myApplications.find((item) => item.listingId === nextListing.id);
        await loadCommitmentContext(nextListing, application);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir el perfil de adopcion.");
    } finally {
      setIsLoading(false);
    }
  }

  async function shareAdoptionListing(listing: PetAdoptionListing) {
    if (!listing.publicSlug) {
      setErrorMessage("La ficha publica aun no tiene enlace compartible.");
      return;
    }

    try {
      const publicUrl = getPublicAdoptionUrl(listing.publicSlug);
      await Share.share({
        message: `Conoce a ${listing.petName}, una mascota que busca hogar: ${publicUrl}`,
        url: publicUrl,
        title: `Adopcion responsable: ${listing.petName}`
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible compartir la ficha publica.");
    }
  }

  function updateApplicationInput(nextInput: Partial<Omit<PetAdoptionApplicationInput, "listingId">>) {
    setApplicationInput((current) => ({ ...current, ...nextInput }));
  }

  async function loadCommitmentContext(listing: PetAdoptionListing, application?: PetAdoptionApplication) {
    try {
      const fosterApi = getMobileFosterApiClient();
      const [template, document] = await Promise.all([
        fosterApi.getProtectiveAdoptionCommitmentTemplate(listing.householdId),
        application ? fosterApi.getApplicationCommitmentDocument(application.id) : Promise.resolve(null)
      ]);

      setCommitmentTemplate(template);
      setCommitmentDocument(document);
    } catch {
      setCommitmentTemplate(null);
      setCommitmentDocument(null);
    }
  }

  async function openCommitmentTemplate() {
    if (!commitmentTemplate?.signedUrl) {
      setErrorMessage("El compromiso de adopcion aun no esta disponible para descarga.");
      return;
    }

    await Linking.openURL(commitmentTemplate.signedUrl);
  }

  async function openCommitmentDocument() {
    if (!commitmentDocument?.signedUrl) {
      setErrorMessage("El documento firmado aun no esta disponible.");
      return;
    }

    await Linking.openURL(commitmentDocument.signedUrl);
  }

  async function uploadCommitmentDocument(application: PetAdoptionApplication) {
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: commitmentAllowedMimeTypes
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? "application/octet-stream";
      const fileSize = asset.size ?? null;

      if (!commitmentAllowedMimeTypes.includes(mimeType)) {
        setErrorMessage("El compromiso firmado debe ser PDF o imagen JPG, PNG o WEBP.");
        return;
      }

      if (fileSize && fileSize > commitmentMaxFileSizeBytes) {
        setErrorMessage("El compromiso firmado no puede superar 10 MB.");
        return;
      }

      setIsUploadingCommitmentDocument(true);
      const document = await getMobileFosterApiClient().uploadApplicationCommitmentDocument({
        applicationId: application.id,
        fileName: asset.name ?? "compromiso-adopcion",
        fileSizeBytes: fileSize,
        fileUri: asset.uri,
        mimeType,
        templateId: commitmentTemplate?.id ?? null
      });

      setCommitmentDocument(document);
      setInfoMessage("Compromiso firmado recibido. La familia protectora podra revisarlo desde su bandeja.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible subir el compromiso firmado.");
    } finally {
      setIsUploadingCommitmentDocument(false);
    }
  }

  function openPhotoViewer(listing: PetAdoptionListing, mediaId?: string) {
    const photos = getApprovedAdoptionMedia(listing)
      .filter((media): media is typeof media & { signedUrl: string } => Boolean(media.signedUrl))
      .map((media) => ({ id: media.id, signedUrl: media.signedUrl }));

    if (!photos.length) {
      return;
    }

    const selectedIndex = mediaId ? Math.max(photos.findIndex((photo) => photo.id === mediaId), 0) : 0;
    setPhotoViewer({ index: selectedIndex, photos, title: listing.petName });
  }

  function movePhotoViewer(direction: "next" | "previous") {
    setPhotoViewer((current) => {
      if (!current) {
        return current;
      }

      const delta = direction === "next" ? 1 : -1;
      const nextIndex = (current.index + delta + current.photos.length) % current.photos.length;
      return { ...current, index: nextIndex };
    });
  }

  function toggleApplicationForm() {
    setApplicationInput((current) => applyApplicantDefaults(current, applicantDefaults));
    setIsApplicationFormOpen((current) => !current);
  }

  async function submitAdoptionApplication() {
    if (!selectedAdoptionListing) {
      return;
    }

    setIsSubmittingApplication(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getMobileFosterApiClient().createPetAdoptionApplication({
        ...applicationInput,
        listingId: selectedAdoptionListing.id
      });
      const applications = await getMobileFosterApiClient().listMyPetAdoptionApplications();
      setMyApplications(applications);
      const nextApplication = applications.find((application) => application.listingId === selectedAdoptionListing.id);
      await loadCommitmentContext(selectedAdoptionListing, nextApplication);
      setIsApplicationFormOpen(false);
      setInfoMessage("Solicitud enviada. La familia protectora podra revisar tus datos y contactarte por el siguiente paso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible enviar la solicitud de adopcion.");
    } finally {
      setIsSubmittingApplication(false);
    }
  }

  async function withdrawAdoptionApplication(applicationId: string) {
    setIsSubmittingApplication(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getMobileFosterApiClient().withdrawPetAdoptionApplication(applicationId);
      const applications = await getMobileFosterApiClient().listMyPetAdoptionApplications();
      setMyApplications(applications);
      if (selectedAdoptionListing) {
        const nextApplication = applications.find((application) => application.listingId === selectedAdoptionListing.id);
        await loadCommitmentContext(selectedAdoptionListing, nextApplication);
      }
      setInfoMessage("Solicitud retirada. Puedes volver a enviar una solicitud si la publicacion sigue disponible.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible retirar la solicitud.");
    } finally {
      setIsSubmittingApplication(false);
    }
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void loadApplicantDefaults();
    void loadAdoptionListings();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !selectedAdoptionListing) {
      return;
    }

    const application = myApplications.find((item) => item.listingId === selectedAdoptionListing.id);
    void loadCommitmentContext(selectedAdoptionListing, application);
  }, [enabled, myApplications, selectedAdoptionListing]);

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          borderRadius: 24,
          backgroundColor: colorTokens.accent,
          padding: 16,
          gap: 8,
          ...visualTokens.mobile.shadow
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", lineHeight: 24 }}>
          Mascotas que buscan hogar
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 11, fontWeight: "700", lineHeight: 16 }}>
          Conoce mascotas publicadas por familias protectoras.
        </Text>
        <View style={{ alignSelf: "flex-start" }}>
          <Button label="Volver al inicio" onPress={onBackHome} tone="secondary" />
        </View>
      </View>

      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}

      {currentView === "list" ? (
        <View style={[cardStyle, { gap: 14 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: "#1c1917", fontSize: 16, fontWeight: "900" }}>Publicaciones disponibles</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                Perfiles revisados para conocer antes de coordinar una adopcion responsable.
              </Text>
            </View>
            <StatusChip label={`${adoptionListings.length} publicadas`} tone={adoptionListings.length ? "active" : "neutral"} />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip isActive label="Publicadas" onPress={() => undefined} />
            <FilterChip isActive={false} label="Ciudad" onPress={() => undefined} />
            <FilterChip isActive={false} label="Perros y gatos" onPress={() => undefined} />
          </View>

          {isLoading ? (
            <Text style={{ color: colorTokens.muted, fontSize: 12 }}>Cargando mascotas publicadas...</Text>
          ) : null}

          {!isLoading && !adoptionListings.length ? (
            <View style={{ alignItems: "center", backgroundColor: "rgba(247,250,252,0.92)", borderRadius: 18, gap: 8, padding: 18 }}>
              <Text style={{ color: "#1c1917", fontSize: 15, fontWeight: "900", textAlign: "center" }}>
                Aun no hay mascotas publicadas
              </Text>
              <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17, textAlign: "center" }}>
                Cuando una familia protectora publique una mascota aprobada, aparecera aqui.
              </Text>
              <Button label="Actualizar" onPress={() => void loadAdoptionListings()} tone="secondary" />
            </View>
          ) : null}

          {adoptionListings.map((listing) => {
            const cover = getAdoptionListingCover(listing);
            const protectiveHouseholdName = getProtectiveHouseholdDisplayName(listing);

            return (
              <Pressable
                accessibilityLabel={`Ver perfil de ${listing.petName}`}
                accessibilityRole="button"
                key={listing.id}
                onPress={() => void openAdoptionDetail(listing.id)}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(15,118,110,0.16)",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  ...visualTokens.mobile.softShadow
                }}
              >
                {cover?.signedUrl ? (
                  <Pressable
                    accessibilityLabel={`Ver foto de ${listing.petName}`}
                    accessibilityRole="imagebutton"
                    onPress={() => openPhotoViewer(listing, cover.id)}
                    style={{ backgroundColor: "#f8fafc" }}
                  >
                    <Image resizeMode="contain" source={{ uri: cover.signedUrl }} style={{ height: 150, width: "100%" }} />
                  </Pressable>
                ) : (
                  <View style={{ alignItems: "center", backgroundColor: "rgba(20,184,166,0.1)", height: 132, justifyContent: "center" }}>
                    <Text style={{ color: colorTokens.accentDark, fontSize: 28, fontWeight: "900" }}>{getAdoptionPetInitial(listing.petName)}</Text>
                  </View>
                )}
                <View style={{ gap: 8, padding: 12 }}>
                  <View style={{ flexDirection: "row", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={{ color: "#1c1917", fontSize: 15, fontWeight: "900", lineHeight: 18 }}>
                        {listing.petName}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 11, marginTop: 3 }}>
                        {formatSpeciesLabel(listing.petSpecies)}{listing.petBreed ? ` - ${listing.petBreed}` : ""} - {formatAdoptionPetAge(listing.petBirthDate)}
                      </Text>
                      {protectiveHouseholdName ? (
                        <Text numberOfLines={1} style={{ color: "#0f766e", fontSize: 10, fontWeight: "800", marginTop: 3 }}>
                          Publica: {protectiveHouseholdName}
                        </Text>
                      ) : null}
                    </View>
                    <StatusChip label="Busca hogar" tone="pending" />
                  </View>
                  <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>
                    {listing.city}, {listing.countryCode} - {formatAdoptionSterilized(listing.petIsSterilized)}
                  </Text>
                  <Text numberOfLines={3} style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                    {listing.publicStory || listing.personalityNotes || "Perfil publicado por una familia protectora aprobada."}
                  </Text>
                  <View style={{ alignSelf: "flex-start" }}>
                    <Button label="Ver perfil" onPress={() => void openAdoptionDetail(listing.id)} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {currentView === "detail" && selectedAdoptionListing ? (
        <View style={[cardStyle, { gap: 14 }]}>
          {(() => {
            const currentApplication = myApplications.find((application) => application.listingId === selectedAdoptionListing.id);
            const hasActiveApplication =
              currentApplication && !["withdrawn", "rejected"].includes(currentApplication.status);
            const currentTransfer = currentApplication
              ? incomingTransfers.find((transfer) => transfer.adoptionApplicationId === currentApplication.id)
              : undefined;
            const closureCopy = currentApplication ? getAdoptionClosureCopy(currentApplication, currentTransfer) : null;
            const canOpenPetInvitations = currentTransfer?.status === "pending" && Boolean(onOpenPetInvitations);
            const protectiveHouseholdName = getProtectiveHouseholdDisplayName(selectedAdoptionListing);
            const protectiveSocialLinks = getProtectiveSocialLinks(selectedAdoptionListing);
            const protectiveDonationMethods = getProtectiveDonationMethods(selectedAdoptionListing);

            return (
              <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable accessibilityLabel="Volver a publicaciones" accessibilityRole="button" onPress={() => setCurrentView("list")}>
              <Text style={{ color: colorTokens.accentDark, fontSize: 20, fontWeight: "900" }}>{"<"}</Text>
            </Pressable>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: "#1c1917", fontSize: 16, fontWeight: "900" }}>{selectedAdoptionListing.petName}</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                Perfil publico de adopcion responsable.
              </Text>
            </View>
            <StatusChip label="Busca hogar" tone="pending" />
          </View>

          {protectiveHouseholdName ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: "rgba(236,253,245,0.72)",
                borderColor: "rgba(15,118,110,0.16)",
                borderRadius: 16,
                borderWidth: 1,
                flexDirection: "row",
                gap: 10,
                padding: 10
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: "rgba(20,184,166,0.14)",
                  borderRadius: 14,
                  height: 38,
                  justifyContent: "center",
                  width: 38
                }}
              >
                <Text style={{ color: colorTokens.accentDark, fontSize: 12, fontWeight: "900" }}>
                  {getProtectiveHouseholdInitials(protectiveHouseholdName)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "900" }}>
                  Familia protectora aprobada
                </Text>
                <Text numberOfLines={2} style={{ color: "#1c1917", fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                  {protectiveHouseholdName}
                </Text>
                <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "800", marginTop: 2 }}>
                  {selectedAdoptionListing.city}, {selectedAdoptionListing.countryCode}
                </Text>
                {protectiveSocialLinks.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {protectiveSocialLinks.map((link) => (
                      <Pressable
                        accessibilityLabel={`Abrir ${link.label} de ${protectiveHouseholdName}`}
                        accessibilityRole="link"
                        key={link.label}
                        onPress={() => void openProtectiveSocialLink(link.url)}
                        style={{
                          backgroundColor: "#ffffff",
                          borderColor: "rgba(15,118,110,0.18)",
                          borderRadius: 999,
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5
                        }}
                      >
                        <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>
                          {link.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {shouldShowProtectiveDonationBlock(selectedAdoptionListing) ? (
            <View
              style={{
                backgroundColor: "rgba(255,247,237,0.82)",
                borderColor: "rgba(245,158,11,0.22)",
                borderRadius: 18,
                borderWidth: 1,
                gap: 10,
                padding: 12
              }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ color: "#b45309", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 }}>
                  APOYO OPCIONAL
                </Text>
                <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                  {selectedAdoptionListing.protectiveDonationTitle?.trim() || "Apoya a esta Familia Protectora"}
                </Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                  {selectedAdoptionListing.protectiveDonationDescription ||
                    "Esta Familia Protectora declaro informacion de apoyo para sostener su labor de cuidado."}
                </Text>
              </View>
              {protectiveDonationMethods.length ? (
                <View style={{ gap: 8 }}>
                  {protectiveDonationMethods.map((method) => (
                    <Pressable
                      accessibilityRole={method.url ? "link" : "text"}
                      disabled={!method.url}
                      key={method.label}
                      onPress={() => (method.url ? void openProtectiveSocialLink(method.url) : undefined)}
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: "rgba(15,23,42,0.08)",
                        borderRadius: 14,
                        borderWidth: 1,
                        padding: 10
                      }}
                    >
                      <Text style={{ color: "#1c1917", fontSize: 11, fontWeight: "900" }}>{method.label}</Text>
                      <Text style={{ color: method.url ? colorTokens.accentDark : colorTokens.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }}>
                        {method.value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 15 }}>
                {selectedAdoptionListing.protectiveDonationDisclaimer ||
                  "Donar es opcional, no garantiza aprobacion de adopcion y la informacion fue declarada por la Familia Protectora. Pet Ecosystem no procesa ni valida donaciones."}
              </Text>
            </View>
          ) : null}

          {(() => {
            const cover = getAdoptionListingCover(selectedAdoptionListing);

            return cover?.signedUrl ? (
              <Pressable
                accessibilityLabel={`Ver foto grande de ${selectedAdoptionListing.petName}`}
                accessibilityRole="imagebutton"
                onPress={() => openPhotoViewer(selectedAdoptionListing, cover.id)}
                style={{ backgroundColor: "#f8fafc", borderRadius: 18, overflow: "hidden" }}
              >
                <Image resizeMode="contain" source={{ uri: cover.signedUrl }} style={{ height: 220, width: "100%" }} />
              </Pressable>
            ) : (
              <View style={{ alignItems: "center", backgroundColor: "rgba(20,184,166,0.1)", borderRadius: 18, height: 190, justifyContent: "center" }}>
                <Text style={{ color: colorTokens.accentDark, fontSize: 34, fontWeight: "900" }}>{getAdoptionPetInitial(selectedAdoptionListing.petName)}</Text>
              </View>
            );
          })()}

          {getApprovedAdoptionMedia(selectedAdoptionListing).length > 1 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {getApprovedAdoptionMedia(selectedAdoptionListing).slice(0, 5).map((media) =>
                media.signedUrl ? (
                  <Pressable
                    accessibilityLabel={`Ver foto de ${selectedAdoptionListing.petName}`}
                    accessibilityRole="imagebutton"
                    key={media.id}
                    onPress={() => openPhotoViewer(selectedAdoptionListing, media.id)}
                    style={{ backgroundColor: "#f8fafc", borderRadius: 12, overflow: "hidden" }}
                  >
                    <Image resizeMode="cover" source={{ uri: media.signedUrl }} style={{ height: 56, width: 70 }} />
                  </Pressable>
                ) : null
              )}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatusChip label={formatSpeciesLabel(selectedAdoptionListing.petSpecies)} tone="neutral" />
            <StatusChip label={formatAdoptionPetAge(selectedAdoptionListing.petBirthDate)} tone="neutral" />
            <StatusChip label={formatAdoptionSterilized(selectedAdoptionListing.petIsSterilized)} tone="active" />
          </View>

          <View style={inputStyle}>
            <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>{selectedAdoptionListing.title}</Text>
            <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16, marginTop: 6 }}>
              {selectedAdoptionListing.publicStory || "La familia protectora aun no ha agregado una historia publica detallada."}
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <View style={inputStyle}>
              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Personalidad</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16, marginTop: 6 }}>
                {selectedAdoptionListing.personalityNotes || "Por confirmar con la familia protectora."}
              </Text>
            </View>
            <View style={inputStyle}>
              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Salud publica</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16, marginTop: 6 }}>
                {selectedAdoptionListing.publicHealthSummary || "Resumen publico pendiente de completar."}
              </Text>
            </View>
            <View style={inputStyle}>
              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Compatibilidad</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                Ninos: {formatAdoptionCompatibility(selectedAdoptionListing.compatibilityChildren, "por confirmar")}
              </Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                Perros: {formatAdoptionCompatibility(selectedAdoptionListing.compatibilityDogs, "por confirmar")}
              </Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                Gatos: {formatAdoptionCompatibility(selectedAdoptionListing.compatibilityCats, "por confirmar")}
              </Text>
            </View>
            <View style={inputStyle}>
              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Requisitos y ubicacion</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16, marginTop: 6 }}>
                {selectedAdoptionListing.adoptionRequirements || "La coordinacion final se revisa con la familia protectora."}
              </Text>
              <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900", lineHeight: 16, marginTop: 6 }}>
                {selectedAdoptionListing.city}, {selectedAdoptionListing.countryCode}
              </Text>
            </View>
          </View>

          <View style={[inputStyle, { gap: 10 }]}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, justifyContent: "space-between" }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Compromiso de adopcion</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
                  Este documento es proporcionado por la familia protectora. Pet Ecosystem facilita el intercambio documental, pero no valida el contenido legal.
                </Text>
              </View>
              {commitmentTemplate ? (
                <StatusChip label={commitmentRequirementLabels[commitmentTemplate.requirementPolicy]} tone="active" />
              ) : (
                <StatusChip label="Sin compromiso" tone="neutral" />
              )}
            </View>
            {commitmentTemplate ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900", lineHeight: 16 }}>
                  {commitmentTemplate.title}
                </Text>
                {commitmentTemplate.description ? (
                  <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                    {commitmentTemplate.description}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label="Ver compromiso" onPress={() => void openCommitmentTemplate()} tone="secondary" />
                  {currentApplication ? (
                    <Button
                      disabled={isUploadingCommitmentDocument}
                      label={commitmentDocument ? "Reemplazar firmado" : "Subir firmado"}
                      onPress={() => void uploadCommitmentDocument(currentApplication)}
                    />
                  ) : null}
                  {commitmentDocument?.signedUrl ? (
                    <Button label="Ver firmado" onPress={() => void openCommitmentDocument()} tone="secondary" />
                  ) : null}
                </View>
                {currentApplication ? (
                  <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                    Estado documental: {commitmentDocument ? commitmentStatusLabels[commitmentDocument.status] : "Pendiente de envio"}.
                    {commitmentDocument?.reviewNotes ? ` Nota: ${commitmentDocument.reviewNotes}` : ""}
                  </Text>
                ) : (
                  <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                    Envia tu solicitud para poder devolver el documento completado.
                  </Text>
                )}
              </View>
            ) : (
              <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                Esta familia protectora no ha configurado un documento de compromiso para esta publicacion.
              </Text>
            )}
          </View>

          <View style={[inputStyle, { gap: 10 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Solicitud de adopcion</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
                  Esta solicitud no transfiere custodia ni reserva la mascota. Solo abre una revision responsable.
                </Text>
              </View>
              {currentApplication ? (
                <StatusChip label={adoptionApplicationStatusLabels[currentApplication.status]} tone={hasActiveApplication ? "active" : "neutral"} />
              ) : null}
            </View>
            {currentApplication?.status === "rejected" && closureCopy ? (
              <View
                style={{
                  backgroundColor: "rgba(255,247,237,0.9)",
                  borderColor: "rgba(234,88,12,0.18)",
                  borderRadius: 14,
                  borderWidth: 1,
                  gap: 6,
                  padding: 10
                }}
              >
                <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "900" }}>
                  Solicitud no seleccionada
                </Text>
                <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "800", lineHeight: 16 }}>
                  {closureCopy}
                </Text>
              </View>
            ) : null}
            {hasActiveApplication && currentApplication ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>
                  Ya enviaste una solicitud para {currentApplication.petName}.
                </Text>
                {closureCopy ? (
                  <Pressable
                    accessibilityLabel={
                      canOpenPetInvitations
                        ? "Abrir invitaciones de mascota para aceptar o rechazar transferencia"
                        : undefined
                    }
                    accessibilityRole={canOpenPetInvitations ? "button" : undefined}
                    disabled={!canOpenPetInvitations}
                    onPress={canOpenPetInvitations ? onOpenPetInvitations : undefined}
                    style={{
                      backgroundColor: "rgba(236,253,245,0.9)",
                      borderColor: "rgba(15,118,110,0.18)",
                      borderRadius: 14,
                      borderWidth: 1,
                      padding: 10,
                      gap: 8
                    }}
                  >
                    <Text style={{ color: "#115e59", fontSize: 11, fontWeight: "800", lineHeight: 16 }}>
                      {closureCopy}
                    </Text>
                    {canOpenPetInvitations ? (
                      <View
                        style={{
                          alignSelf: "flex-start",
                          backgroundColor: colorTokens.accent,
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 6
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>
                          Ir a invitaciones
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ) : null}
                {currentApplication.status === "submitted" || currentApplication.status === "in_review" ? (
                  <View style={{ alignSelf: "flex-start" }}>
                    <Button
                      disabled={isSubmittingApplication}
                      label="Retirar solicitud"
                      onPress={() => void withdrawAdoptionApplication(currentApplication.id)}
                      tone="secondary"
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <>
                <Button
                  disabled={isSubmittingApplication}
                  label={isApplicationFormOpen ? "Ocultar formulario" : "Solicitar adopcion"}
                  onPress={toggleApplicationForm}
                />
                {isApplicationFormOpen ? (
                  <View style={{ gap: 10 }}>
                    <TextInput
                      onChangeText={(value) => updateApplicationInput({ applicantName: value })}
                      placeholder="Nombre completo"
                      placeholderTextColor={colorTokens.muted}
                      style={inputStyle}
                      value={applicationInput.applicantName}
                    />
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={(value) => updateApplicationInput({ applicantEmail: value })}
                      placeholder="Correo"
                      placeholderTextColor={colorTokens.muted}
                      style={inputStyle}
                      value={applicationInput.applicantEmail}
                    />
                    <TextInput
                      keyboardType="phone-pad"
                      onChangeText={(value) => updateApplicationInput({ applicantPhone: value })}
                      placeholder="Telefono opcional"
                      placeholderTextColor={colorTokens.muted}
                      style={inputStyle}
                      value={applicationInput.applicantPhone ?? ""}
                    />
                    <TextInput
                      onChangeText={(value) => updateApplicationInput({ housingType: value })}
                      placeholder="Tipo de vivienda"
                      placeholderTextColor={colorTokens.muted}
                      style={inputStyle}
                      value={applicationInput.housingType}
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <FilterChip
                        isActive={applicationInput.hasChildren === true}
                        label="Hay ninos"
                        onPress={() => updateApplicationInput({ hasChildren: applicationInput.hasChildren === true ? null : true })}
                      />
                      <FilterChip
                        isActive={applicationInput.hasChildren === false}
                        label="Sin ninos"
                        onPress={() => updateApplicationInput({ hasChildren: applicationInput.hasChildren === false ? null : false })}
                      />
                      <FilterChip
                        isActive={applicationInput.hasOtherPets === true}
                        label="Tengo mascotas"
                        onPress={() => updateApplicationInput({ hasOtherPets: applicationInput.hasOtherPets === true ? null : true })}
                      />
                      <FilterChip
                        isActive={applicationInput.hasOtherPets === false}
                        label="Sin mascotas"
                        onPress={() => updateApplicationInput({ hasOtherPets: applicationInput.hasOtherPets === false ? null : false })}
                      />
                    </View>
                    <TextInput
                      multiline
                      onChangeText={(value) => updateApplicationInput({ petExperience: value })}
                      placeholder="Experiencia con mascotas"
                      placeholderTextColor={colorTokens.muted}
                      style={[inputStyle, { minHeight: 74, textAlignVertical: "top" }]}
                      value={applicationInput.petExperience}
                    />
                    <TextInput
                      multiline
                      onChangeText={(value) => updateApplicationInput({ motivation: value })}
                      placeholder="Motivacion para adoptar"
                      placeholderTextColor={colorTokens.muted}
                      style={[inputStyle, { minHeight: 86, textAlignVertical: "top" }]}
                      value={applicationInput.motivation}
                    />
                    <TextInput
                      multiline
                      onChangeText={(value) => updateApplicationInput({ availabilityNotes: value })}
                      placeholder="Disponibilidad o notas opcionales"
                      placeholderTextColor={colorTokens.muted}
                      style={[inputStyle, { minHeight: 64, textAlignVertical: "top" }]}
                      value={applicationInput.availabilityNotes ?? ""}
                    />
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: applicationInput.commitmentAcknowledged }}
                      onPress={() => updateApplicationInput({ commitmentAcknowledged: !applicationInput.commitmentAcknowledged })}
                      style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                    >
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: applicationInput.commitmentAcknowledged ? colorTokens.accent : "#ffffff",
                          borderColor: "rgba(0,151,143,0.28)",
                          borderRadius: 8,
                          borderWidth: 1,
                          height: 22,
                          justifyContent: "center",
                          width: 22
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>
                          {applicationInput.commitmentAcknowledged ? "OK" : ""}
                        </Text>
                      </View>
                      <Text style={{ color: colorTokens.muted, flex: 1, fontSize: 11, lineHeight: 16 }}>
                        Entiendo que adoptar implica cuidado responsable y una revision previa por la familia protectora.
                      </Text>
                    </Pressable>
                    <Button disabled={isSubmittingApplication} label="Enviar solicitud" onPress={() => void submitAdoptionApplication()} />
                  </View>
                ) : null}
              </>
            )}
          </View>
          {selectedAdoptionListing.publicSlug ? (
            <Button label="Compartir ficha" onPress={() => void shareAdoptionListing(selectedAdoptionListing)} tone="secondary" />
          ) : null}
          <Button label="Volver a mascotas publicadas" onPress={() => setCurrentView("list")} tone="secondary" />
              </>
            );
          })()}
        </View>
      ) : null}

      <Modal animationType="fade" transparent visible={Boolean(photoViewer)} onRequestClose={() => setPhotoViewer(null)}>
        <View style={{ backgroundColor: "rgba(15,23,42,0.88)", flex: 1, justifyContent: "center", padding: 18 }}>
          {photoViewer ? (
            <View style={{ gap: 14 }}>
              <View style={{ alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>
                    {photoViewer.title}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700", marginTop: 2 }}>
                    Foto {photoViewer.index + 1} de {photoViewer.photos.length}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Cerrar visor de fotos"
                  accessibilityRole="button"
                  onPress={() => setPhotoViewer(null)}
                  style={{
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    borderRadius: 999,
                    height: 38,
                    justifyContent: "center",
                    width: 38
                  }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>X</Text>
                </Pressable>
              </View>

              <View style={{ backgroundColor: "#020617", borderRadius: 22, overflow: "hidden" }}>
                <Image
                  resizeMode="contain"
                  source={{ uri: photoViewer.photos[photoViewer.index]?.signedUrl }}
                  style={{ height: 430, width: "100%" }}
                />
              </View>

              {photoViewer.photos.length > 1 ? (
                <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
                  <Button label="Anterior" onPress={() => movePhotoViewer("previous")} tone="secondary" />
                  <Button label="Siguiente" onPress={() => movePhotoViewer("next")} tone="secondary" />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
