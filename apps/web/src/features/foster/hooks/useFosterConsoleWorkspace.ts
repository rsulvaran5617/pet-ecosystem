"use client";

import type {
  ApplicationCommitmentDocument,
  AdoptionCommitmentDocumentStatus,
  HouseholdSummary,
  PetAdoptionApplication,
  PetAdoptionClosureDetail,
  PetAdoptionListingInput,
  PetAdoptionApplicationStatus,
  PetAdoptionApplicationStatusHistory,
  PetAdoptionListing,
  PetAdoptionListingMedia,
  CreatePetInput,
  PetTransferRecord,
  PetSummary,
  ProtectiveAdoptionCommitmentTemplate,
  ProtectiveAdoptionCommitmentTemplateUploadInput,
  ProtectivePublicProfileInput,
  ProtectiveHouseholdOrganizationType,
  ProtectiveHouseholdProfile,
  ProtectivePublicProfile,
  Uuid
} from "@pet/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getBrowserFosterApiClient,
  getBrowserHouseholdsApiClient,
  getBrowserPetsApiClient,
  getBrowserSupabaseClient
} from "../../core/services/supabase-browser";

type AuthState = "checking" | "signed_out" | "signed_in";

export type FosterConsoleApplicationDetail = {
  application: PetAdoptionApplication;
  closureDetail: PetAdoptionClosureDetail | null;
  commitmentDocument: ApplicationCommitmentDocument | null;
  history: PetAdoptionApplicationStatusHistory[];
};

export type FosterConsoleHouseholdContext = {
  applications: PetAdoptionApplication[];
  listings: PetAdoptionListing[];
  pets: PetSummary[];
  profile: ProtectiveHouseholdProfile | null;
  publicProfile: ProtectivePublicProfile | null;
  commitmentTemplate: ProtectiveAdoptionCommitmentTemplate | null;
  transfers: PetTransferRecord[];
};

type FosterConsoleData = Record<Uuid, FosterConsoleHouseholdContext>;

export type CreateProtectiveHouseholdInput = {
  city: string;
  contactNotes?: string | null;
  countryCode: string;
  displayName: string;
  householdName: string;
  organizationType: ProtectiveHouseholdOrganizationType;
  publicNotes?: string | null;
  stateRegion?: string | null;
};

function toHumanFosterError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();
  const originalMessage = error.message;

  if (message.includes("auth") || message.includes("session") || message.includes("jwt")) {
    return "Tu sesion expiro. Inicia sesion nuevamente para continuar.";
  }

  if (message.includes("adoption_media_permission_failed") || message.includes("adoption_media_permission_check_failed")) {
    return "La sesion activa no tiene permiso admin para subir fotos en esta publicacion. Verifica la cuenta activa y los permisos de la Familia Protectora.";
  }

  if (message.includes("adoption_media_storage_upload_failed")) {
    return `No fue posible guardar el archivo de la foto en Storage. Detalle: ${originalMessage.replace("adoption_media_storage_upload_failed: ", "")}`;
  }

  if (message.includes("adoption_media_metadata_insert_failed")) {
    return `La foto no pudo registrarse en la galeria de adopcion. Detalle: ${originalMessage.replace("adoption_media_metadata_insert_failed: ", "")}`;
  }

  if (message.includes("duplicate") || message.includes("already") || message.includes("unique")) {
    return "Ya existe una solicitud o familia protectora con esos datos.";
  }

  if (message.includes("permission") || message.includes("policy") || message.includes("rls")) {
    return "No tienes permisos para completar esta accion con la sesion actual. Verifica que estes usando la cuenta administradora de esta Familia Protectora.";
  }

  return error.message || fallback;
}

function normalizeAdoptionPhotoFile(file: File) {
  const extension = file.name.split(".").pop()?.trim().toLowerCase() ?? "";
  const mimeByExtension: Record<string, string> = {
    jpeg: "image/jpeg",
    jfif: "image/jpeg",
    jpe: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  };
  const normalizedMimeType = file.type === "image/jpg" ? "image/jpeg" : file.type || mimeByExtension[extension] || "";

  if (!["image/jpeg", "image/png", "image/webp"].includes(normalizedMimeType)) {
    return {
      error: "Formato no compatible. Sube fotos en JPG, JPEG, PNG o WebP.",
      mimeType: null
    };
  }

  return {
    error: null,
    mimeType: normalizedMimeType
  };
}

function normalizeProtectiveLogoFile(file: File) {
  const normalized = normalizeAdoptionPhotoFile(file);

  if (normalized.error) {
    return {
      error: "Formato no compatible. Sube el logo en JPG, JPEG, PNG o WebP.",
      mimeType: null
    };
  }

  return normalized;
}

function normalizeAdoptionCommitmentFile(file: File) {
  const extension = file.name.split(".").pop()?.trim().toLowerCase() ?? "";
  const mimeByExtension: Record<string, string> = {
    jpeg: "image/jpeg",
    jpe: "image/jpeg",
    jpg: "image/jpeg",
    pdf: "application/pdf",
    png: "image/png",
    webp: "image/webp"
  };
  const normalizedMimeType = file.type === "image/jpg" ? "image/jpeg" : file.type || mimeByExtension[extension] || "";

  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(normalizedMimeType)) {
    return {
      error: "Formato no compatible. Sube PDF, JPG, PNG o WebP.",
      mimeType: null
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      error: "El archivo no puede superar 10 MB.",
      mimeType: null
    };
  }

  return {
    error: null,
    mimeType: normalizedMimeType
  };
}

export function useFosterConsoleWorkspace() {
  const mountedRef = useRef(true);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<Uuid | null>(null);
  const [dataByHousehold, setDataByHousehold] = useState<FosterConsoleData>({});
  const [selectedApplicationDetail, setSelectedApplicationDetail] = useState<FosterConsoleApplicationDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionUserEmail, setSessionUserEmail] = useState<string | null>(null);

  const selectedHousehold = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId]
  );
  const selectedContext = selectedHouseholdId ? dataByHousehold[selectedHouseholdId] ?? null : null;
  const protectiveHouseholds = useMemo(
    () => households.filter((household) => household.householdType === "protective"),
    [households]
  );

  const loadHouseholdContext = useCallback(async (household: HouseholdSummary): Promise<FosterConsoleHouseholdContext> => {
    const [profile, publicProfile, listings, applications, transfers, pets, commitmentTemplate] = await Promise.all([
      getBrowserFosterApiClient().getProtectiveHouseholdProfile(household.id),
      getBrowserFosterApiClient().getProtectivePublicProfile(household.id),
      getBrowserFosterApiClient().listMyPetAdoptionListings(household.id),
      getBrowserFosterApiClient().listReceivedPetAdoptionApplications(household.id),
      getBrowserFosterApiClient().listOutgoingPetTransfers(household.id),
      getBrowserPetsApiClient().listHouseholdPets(household.id),
      getBrowserFosterApiClient().getProtectiveAdoptionCommitmentTemplate(household.id)
    ]);

    return {
      applications,
      commitmentTemplate,
      listings,
      pets,
      profile,
      publicProfile,
      transfers
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const sessionResult = await getBrowserSupabaseClient().auth.getSession();
      const hasSession = Boolean(sessionResult.data.session);

      if (!hasSession) {
        if (mountedRef.current) {
          setAuthState("signed_out");
          setHouseholds([]);
          setSelectedHouseholdId(null);
          setDataByHousehold({});
          setSelectedApplicationDetail(null);
          setSessionUserEmail(null);
        }
        return;
      }

      const snapshot = await getBrowserHouseholdsApiClient().getHouseholdsSnapshot();
      const nextHouseholds = snapshot.households;
      const nextProtectiveHouseholds = nextHouseholds.filter((household) => household.householdType === "protective");
      const nextSelectedHouseholdId =
        nextProtectiveHouseholds.find((household) => household.id === selectedHouseholdId)?.id ?? nextProtectiveHouseholds[0]?.id ?? null;
      const contextEntries = await Promise.all(
        nextProtectiveHouseholds.map(async (household) => [household.id, await loadHouseholdContext(household)] as const)
      );

      if (mountedRef.current) {
        setAuthState("signed_in");
        setHouseholds(nextHouseholds);
        setSelectedHouseholdId(nextSelectedHouseholdId);
        setDataByHousehold(Object.fromEntries(contextEntries));
        setSessionUserEmail(sessionResult.data.session?.user.email ?? null);
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar la consola Foster.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadHouseholdContext, selectedHouseholdId]);

  const reloadSelectedHousehold = useCallback(async () => {
    if (!selectedHousehold) {
      return;
    }

    const context = await loadHouseholdContext(selectedHousehold);

    if (mountedRef.current) {
      setDataByHousehold((current) => ({ ...current, [selectedHousehold.id]: context }));
    }
  }, [loadHouseholdContext, selectedHousehold]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  async function openApplication(application: PetAdoptionApplication) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const [detail, history, commitmentDocument, closureDetail] = await Promise.all([
        getBrowserFosterApiClient().getPetAdoptionApplicationDetail(application.id),
        getBrowserFosterApiClient().listPetAdoptionApplicationStatusHistory(application.id),
        getBrowserFosterApiClient().getApplicationCommitmentDocument(application.id),
        getBrowserFosterApiClient().getPetAdoptionClosureDetail(application.id)
      ]);

      if (mountedRef.current) {
        setSelectedApplicationDetail({ application: detail ?? application, closureDetail, commitmentDocument, history });
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible abrir la solicitud.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function updateApplicationStatus(
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const updated = await getBrowserFosterApiClient().updatePetAdoptionApplicationStatus({
        applicationId: application.id,
        notes: notes?.trim() || null,
        status
      });
      const [history, commitmentDocument, closureDetail] = await Promise.all([
        getBrowserFosterApiClient().listPetAdoptionApplicationStatusHistory(updated.id),
        getBrowserFosterApiClient().getApplicationCommitmentDocument(updated.id),
        getBrowserFosterApiClient().getPetAdoptionClosureDetail(updated.id)
      ]);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setSelectedApplicationDetail({ application: updated, closureDetail, commitmentDocument, history });
        setInfoMessage("Estado de solicitud actualizado.");
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible actualizar la solicitud.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function startTransfer(application: PetAdoptionApplication) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getBrowserFosterApiClient().startPetAdoptionTransfer(application.id);
      const [detail, history, commitmentDocument, closureDetail] = await Promise.all([
        getBrowserFosterApiClient().getPetAdoptionApplicationDetail(application.id),
        getBrowserFosterApiClient().listPetAdoptionApplicationStatusHistory(application.id),
        getBrowserFosterApiClient().getApplicationCommitmentDocument(application.id),
        getBrowserFosterApiClient().getPetAdoptionClosureDetail(application.id)
      ]);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setSelectedApplicationDetail({ application: detail ?? application, closureDetail, commitmentDocument, history });
        setInfoMessage("Transferencia privada iniciada. La familia receptora debe aceptarla.");
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible iniciar la transferencia.");
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function createProtectiveHousehold(input: CreateProtectiveHouseholdInput) {
    const householdName = input.householdName.trim();
    const displayName = input.displayName.trim() || householdName;
    const city = input.city.trim();
    const countryCode = input.countryCode.trim().toUpperCase() || "PA";

    if (!householdName || !displayName || !city) {
      setErrorMessage("Completa nombre, nombre visible y ciudad antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const household = await getBrowserHouseholdsApiClient().createHousehold({
        householdType: "protective",
        name: householdName
      });

      await getBrowserFosterApiClient().upsertProtectiveHouseholdProfile({
        city,
        contactNotes: input.contactNotes?.trim() || null,
        countryCode,
        displayName,
        householdId: household.id,
        organizationType: input.organizationType,
        publicNotes: input.publicNotes?.trim() || null,
        stateRegion: input.stateRegion?.trim() || null
      });

      const submittedProfile = await getBrowserFosterApiClient().submitProtectiveHouseholdProfile(household.id);
      const context = await loadHouseholdContext({ ...household, memberCount: 1, myMemberId: null, myPermissions: ["admin"], pendingInvitationCount: 0 });
      await refresh();

      if (mountedRef.current) {
        setSelectedHouseholdId(household.id);
        setDataByHousehold((current) => ({ ...current, [household.id]: { ...context, profile: submittedProfile } }));
        setInfoMessage("Solicitud enviada. Un administrador revisara tu Familia Protectora antes de habilitar publicaciones y solicitudes.");
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible crear la Familia Protectora."));
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function savePublicProfile(input: ProtectivePublicProfileInput) {
    if (!selectedHousehold) {
      setErrorMessage("Selecciona una Familia Protectora antes de guardar el perfil publico.");
      return null;
    }

    if (selectedContext?.profile?.status !== "approved") {
      setErrorMessage("Primero espera la aprobacion de tu Familia Protectora.");
      return null;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const savedProfile = await getBrowserFosterApiClient().upsertProtectivePublicProfile(input);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Perfil publico guardado. Recuerda enviarlo a revision para que pueda ser aprobado.");
      }

      return savedProfile;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible guardar el perfil publico."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function submitPublicProfile(profileId: Uuid) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const submittedProfile = await getBrowserFosterApiClient().submitProtectivePublicProfile(profileId);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Perfil publico enviado a revision. Admin debe aprobarlo antes de hacerlo publico.");
      }

      return submittedProfile;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible enviar el perfil publico a revision."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function uploadPublicProfileLogo(profile: ProtectivePublicProfile, file: File) {
    if (!selectedHousehold) {
      setErrorMessage("Selecciona una Familia Protectora antes de subir el logo.");
      return null;
    }

    if (selectedContext?.profile?.status !== "approved") {
      setErrorMessage("Primero espera la aprobacion de tu Familia Protectora.");
      return null;
    }

    const normalizedFile = normalizeProtectiveLogoFile(file);

    if (normalizedFile.error || !normalizedFile.mimeType) {
      setErrorMessage(normalizedFile.error ?? "El logo no tiene un formato compatible.");
      return null;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const savedProfile = await getBrowserFosterApiClient().uploadProtectivePublicProfileLogo({
        fileBody: file,
        fileName: file.name,
        fileSizeBytes: file.size,
        householdId: selectedHousehold.id,
        mimeType: normalizedFile.mimeType,
        profileId: profile.id
      });
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Logo guardado como borrador. Envia el perfil a revision para publicarlo nuevamente.");
      }

      return savedProfile;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible subir el logo de la Familia Protectora."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function uploadAdoptionCommitmentTemplate(
    input: Omit<ProtectiveAdoptionCommitmentTemplateUploadInput, "fileBody" | "fileName" | "fileSizeBytes" | "mimeType"> & { file: File }
  ) {
    const normalizedFile = normalizeAdoptionCommitmentFile(input.file);

    if (normalizedFile.error || !normalizedFile.mimeType) {
      setErrorMessage(normalizedFile.error ?? "El compromiso no tiene un formato compatible.");
      return null;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const template = await getBrowserFosterApiClient().uploadProtectiveAdoptionCommitmentTemplate({
        description: input.description ?? null,
        fileBody: input.file,
        fileName: input.file.name,
        fileSizeBytes: input.file.size,
        householdId: input.householdId,
        mimeType: normalizedFile.mimeType,
        requirementPolicy: input.requirementPolicy,
        title: input.title
      });
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Compromiso de adopcion actualizado.");
      }

      return template;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible subir el compromiso de adopcion."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function openAdoptionCommitmentTemplate(householdId: Uuid) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const template = await getBrowserFosterApiClient().getProtectiveAdoptionCommitmentTemplate(householdId);

      if (mountedRef.current) {
        setDataByHousehold((current) => {
          const currentContext = current[householdId];

          if (!currentContext) {
            return current;
          }

          return {
            ...current,
            [householdId]: {
              ...currentContext,
              commitmentTemplate: template
            }
          };
        });
      }

      if (!template?.signedUrl) {
        if (mountedRef.current) {
          setErrorMessage("No fue posible generar un enlace vigente para la planilla.");
        }

        return null;
      }

      window.open(template.signedUrl, "_blank", "noopener,noreferrer");

      return template;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible abrir la planilla de adopcion."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function reviewApplicationCommitmentDocument(
    applicationId: Uuid,
    status: Exclude<AdoptionCommitmentDocumentStatus, "pending" | "received">,
    notes?: string | null
  ) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const commitmentDocument = await getBrowserFosterApiClient().reviewApplicationCommitmentDocument({
        applicationId,
        notes: notes?.trim() || null,
        status
      });

      if (mountedRef.current && selectedApplicationDetail?.application.id === applicationId) {
        setSelectedApplicationDetail({
          ...selectedApplicationDetail,
          commitmentDocument
        });
        setInfoMessage(status === "reviewed" ? "Compromiso revisado." : "Se solicito correccion del compromiso.");
      }

      return commitmentDocument;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible revisar el compromiso."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function createFosterPet(input: Omit<CreatePetInput, "householdId">) {
    if (!selectedHousehold) {
      setErrorMessage("Selecciona una Familia Protectora antes de registrar una mascota.");
      return null;
    }

    if (selectedContext?.profile?.status !== "approved") {
      setErrorMessage("Primero espera la aprobacion de tu Familia Protectora.");
      return null;
    }

    const name = input.name.trim();
    const species = input.species.trim();

    if (!name || !species) {
      setErrorMessage("Completa nombre y especie antes de registrar la mascota.");
      return null;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const pet = await getBrowserPetsApiClient().createPet({
        ...input,
        breed: input.breed?.trim() || null,
        householdId: selectedHousehold.id,
        name,
        notes: input.notes?.trim() || null,
        species
      });
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Mascota registrada bajo esta Familia Protectora.");
      }

      return pet;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible registrar la mascota en acogida."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function prepareAdoptionListing(petId: Uuid) {
    if (!selectedHousehold) {
      setErrorMessage("Selecciona una Familia Protectora antes de preparar una publicacion.");
      return null;
    }

    if (selectedContext?.profile?.status !== "approved") {
      setErrorMessage("Primero espera la aprobacion de tu Familia Protectora.");
      return null;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const listing = await getBrowserFosterApiClient().createPetAdoptionListing(petId, selectedHousehold.id);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Publicacion preparada como borrador. Completa su historia, fotos y datos antes de publicarla bajo responsabilidad.");
      }

      return listing;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible preparar la publicacion de adopcion."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function saveAdoptionListing(input: PetAdoptionListingInput) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const listing = await getBrowserFosterApiClient().updatePetAdoptionListing(input);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Publicacion guardada. Cuando este completa, publicala bajo responsabilidad de la Familia Protectora.");
      }

      return listing;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible guardar la publicacion de adopcion."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function submitAdoptionListing(listingId: Uuid) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const listing = await getBrowserFosterApiClient().submitPetAdoptionListing(listingId);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Publicacion visible bajo responsabilidad de la Familia Protectora.");
      }

      return listing;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible enviar la publicacion a revision."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function uploadAdoptionListingPhoto(listingId: Uuid, file: File) {
    const normalizedFile = normalizeAdoptionPhotoFile(file);

    if (normalizedFile.error || !normalizedFile.mimeType) {
      setErrorMessage(normalizedFile.error);
      return null;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const contextListing = selectedContext?.listings.find((listing) => listing.id === listingId);
      const media = await getBrowserFosterApiClient().uploadPetAdoptionMedia({
        fileBody: file,
        fileName: file.name,
        fileSizeBytes: file.size,
        isCover: !contextListing?.media.some((item) => item.isCover && item.moderationStatus !== "rejected"),
        listingId,
        mimeType: normalizedFile.mimeType
      });
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Foto agregada a la galeria. Admin debe aprobarla antes de que sea visible publicamente.");
      }

      return media;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible subir la foto de adopcion."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function setAdoptionListingCover(mediaId: Uuid) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const media = await getBrowserFosterApiClient().setPetAdoptionListingCover(mediaId);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Foto marcada como portada de la publicacion.");
      }

      return media;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible marcar la portada."));
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function removeAdoptionListingPhoto(media: PetAdoptionListingMedia) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await getBrowserFosterApiClient().removePetAdoptionMedia(media.id);
      await reloadSelectedHousehold();

      if (mountedRef.current) {
        setInfoMessage("Foto retirada de la galeria publica.");
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toHumanFosterError(error, "No fue posible retirar la foto de adopcion."));
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  return {
    applications: selectedContext?.applications ?? [],
    authState,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    createFosterPet,
    createProtectiveHousehold,
    commitmentTemplate: selectedContext?.commitmentTemplate ?? null,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    listings: selectedContext?.listings ?? [],
    openApplication,
    openAdoptionCommitmentTemplate,
    pets: selectedContext?.pets ?? [],
    prepareAdoptionListing,
    profile: selectedContext?.profile ?? null,
    protectiveHouseholds,
    publicProfile: selectedContext?.publicProfile ?? null,
    refresh,
    reviewApplicationCommitmentDocument,
    selectedApplicationDetail,
    selectedHousehold,
    selectedHouseholdId,
    sessionUserEmail,
    savePublicProfile,
    saveAdoptionListing,
    selectHousehold(householdId: Uuid) {
      setSelectedHouseholdId(householdId);
      setSelectedApplicationDetail(null);
      setErrorMessage(null);
      setInfoMessage(null);
    },
    startTransfer,
    submitAdoptionListing,
    submitPublicProfile,
    uploadAdoptionCommitmentTemplate,
    uploadPublicProfileLogo,
    removeAdoptionListingPhoto,
    setAdoptionListingCover,
    transfers: selectedContext?.transfers ?? [],
    uploadAdoptionListingPhoto,
    updateApplicationStatus
  };
}
