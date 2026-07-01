import { colorTokens, visualTokens } from "@pet/ui";
import type { PetAdoptionApplication, PetAdoptionApplicationInput, PetAdoptionListing } from "@pet/types";
import { useEffect, useState } from "react";
import { Image, Pressable, Share, Text, TextInput, View } from "react-native";

import { StatusChip } from "../../core/components/StatusChip";
import { getMobileFosterApiClient } from "../../core/services/supabase-mobile";

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
  in_review: "En revision",
  rejected: "Rechazada",
  submitted: "Enviada",
  withdrawn: "Retirada"
};

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

function getPublicAdoptionUrl(slug: string) {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const publicWebUrl = env?.EXPO_PUBLIC_WEB_URL ?? "https://petecosyst.com";
  return `${publicWebUrl.replace(/\/$/, "")}/adopciones/${slug}`;
}

export function AdoptionDiscoveryWorkspace({ enabled, onBackHome }: { enabled: boolean; onBackHome: () => void }) {
  const [adoptionListings, setAdoptionListings] = useState<PetAdoptionListing[]>([]);
  const [myApplications, setMyApplications] = useState<PetAdoptionApplication[]>([]);
  const [selectedAdoptionListing, setSelectedAdoptionListing] = useState<PetAdoptionListing | null>(null);
  const [currentView, setCurrentView] = useState<"list" | "detail">("list");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
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

  async function loadAdoptionListings() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fosterApi = getMobileFosterApiClient();
      const [listings, applications] = await Promise.all([
        fosterApi.listPublishedPetAdoptionListings(),
        fosterApi.listMyPetAdoptionApplications()
      ]);
      setAdoptionListings(listings);
      setMyApplications(applications);
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
      setSelectedAdoptionListing(detail ?? adoptionListings.find((listing) => listing.id === listingId) ?? null);
      setCurrentView("detail");
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

    void loadAdoptionListings();
  }, [enabled]);

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
                  <Image source={{ uri: cover.signedUrl }} style={{ height: 132, width: "100%" }} />
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

          {(() => {
            const cover = getAdoptionListingCover(selectedAdoptionListing);

            return cover?.signedUrl ? (
              <Image source={{ uri: cover.signedUrl }} style={{ borderRadius: 18, height: 190, width: "100%" }} />
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
                  <Image key={media.id} source={{ uri: media.signedUrl }} style={{ borderRadius: 12, height: 56, width: 70 }} />
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
            {hasActiveApplication && currentApplication ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>
                  Ya enviaste una solicitud para {currentApplication.petName}.
                </Text>
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
                  onPress={() => setIsApplicationFormOpen((current) => !current)}
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
    </View>
  );
}
