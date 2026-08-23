import type { PetAlertApparentSex, PetAlertApparentSize, PetAlertCommunityClaim, PetAlertCommunitySighting, PublicPetAlertCommunitySighting } from "@pet/types";
import { colorTokens, visualTokens } from "@pet/ui";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Share, Text, TextInput, View } from "react-native";

import { getMobilePetAlertApiClient } from "../../core/services/supabase-mobile";

type FormState = {
  apparentBreed: string;
  apparentSex: PetAlertApparentSex;
  apparentSize: PetAlertApparentSize;
  behaviorNotes: string;
  city: string;
  collarDescription: string;
  country: string;
  distinctiveMarks: string;
  locationReference: string;
  observedSituation: string;
  primaryColor: string;
  region: string;
  sightedAt: string;
  species: string;
};

const initialForm: FormState = {
  apparentBreed: "",
  apparentSex: "unknown",
  apparentSize: "unknown",
  behaviorNotes: "",
  city: "",
  collarDescription: "",
  country: "PA",
  distinctiveMarks: "",
  locationReference: "",
  observedSituation: "",
  primaryColor: "",
  region: "",
  sightedAt: new Date().toISOString(),
  species: "Perro"
};

const operationalStatuses = new Set(["sighting_open", "sheltered_by_reporter", "possible_owner_claim", "owner_verified"]);
type PendingPhoto = { fileName: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; uri: string };

function Choice({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        backgroundColor: selected ? colorTokens.accentSoft : colorTokens.surface,
        borderColor: selected ? colorTokens.accent : colorTokens.line,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 11,
        paddingVertical: 8
      }}
    >
      <Text style={{ color: selected ? colorTokens.accentDark : colorTokens.ink, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, multiline, onChange, value }: { label: string; multiline?: boolean; onChange: (value: string) => void; value: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: colorTokens.mutedStrong, fontSize: 10, fontWeight: "900" }}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChange}
        placeholderTextColor={colorTokens.muted}
        style={{
          backgroundColor: colorTokens.surface,
          borderColor: colorTokens.line,
          borderRadius: 14,
          borderWidth: 1,
          color: colorTokens.ink,
          fontSize: 13,
          minHeight: multiline ? 82 : 46,
          padding: 12,
          textAlignVertical: multiline ? "top" : "center"
        }}
        value={value}
      />
    </View>
  );
}

function publicStatusLabel(status: PublicPetAlertCommunitySighting["status"]) {
  if (status === "sheltered_by_reporter") return "Bajo resguardo temporal";
  if (status === "possible_owner_claim") return "Posible familia localizada";
  if (status === "owner_verified") return "Familia verificada";
  if (status === "reunited") return "Reunida con su familia";
  if (status === "closed") return "Reporte cerrado";
  return "Vista aparentemente perdida";
}

export function PetAlertCommunityWorkspace({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reports, setReports] = useState<PublicPetAlertCommunitySighting[]>([]);
  const [myReports, setMyReports] = useState<PetAlertCommunitySighting[]>([]);
  const [receivedClaims, setReceivedClaims] = useState<PetAlertCommunityClaim[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [publicReports, ownReports, claims] = await Promise.all([
        getMobilePetAlertApiClient().listPublicPetAlertCommunitySightings({ country: "PA" }),
        getMobilePetAlertApiClient().listMyPetAlertCommunitySightings(),
        getMobilePetAlertApiClient().listClaimsForMyPetAlertCommunitySightings()
      ]);
      setReports(publicReports);
      setMyReports(ownReports);
      setReceivedClaims(claims);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar PET ALERT.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!form.species.trim() || !form.city.trim() || form.observedSituation.trim().length < 10) {
      setErrorMessage("Indica especie, ciudad y una descripcion breve de lo observado.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const created = await getMobilePetAlertApiClient().createPetAlertCommunitySighting({
        animalSpecies: form.species,
        apparentBreed: form.apparentBreed,
        apparentSex: form.apparentSex,
        apparentSize: form.apparentSize,
        behaviorNotes: form.behaviorNotes,
        city: form.city,
        collarDescription: form.collarDescription,
        country: form.country,
        distinctiveMarks: form.distinctiveMarks,
        locationPrecision: "approximate",
        locationReference: form.locationReference,
        observedSituation: form.observedSituation,
        primaryColor: form.primaryColor,
        region: form.region,
        sightedAt: form.sightedAt
      });
      let uploadedPhotos = 0;
      for (const [displayOrder, photo] of pendingPhotos.entries()) {
        try {
          const response = await fetch(photo.uri);
          await getMobilePetAlertApiClient().uploadPetAlertCommunityPhoto({
            displayOrder,
            fileBytes: await response.arrayBuffer(),
            fileName: photo.fileName,
            mimeType: photo.mimeType,
            reportId: created.id,
            reportSlug: created.reportSlug
          });
          uploadedPhotos += 1;
        } catch {
          // The report remains valid even when one optional photo cannot be uploaded.
        }
      }
      setForm({ ...initialForm, sightedAt: new Date().toISOString() });
      setPendingPhotos([]);
      setIsFormVisible(false);
      await load();
      const photoMessage = pendingPhotos.length && uploadedPhotos < pendingPhotos.length
        ? ` ${uploadedPhotos} de ${pendingPhotos.length} fotos pudieron cargarse.`
        : "";
      Alert.alert("Reporte publicado", `Gracias. La ubicacion se muestra solo de forma aproximada.${photoMessage}`, [
        {
          text: "Compartir",
          onPress: () => void Share.share({ message: `Vi una mascota aparentemente perdida. Consulta PET ALERT: https://petecosyst.com/pet-alert/mascota-vista/${created.reportSlug}` })
        },
        { text: "Cerrar" }
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible publicar el reporte.");
    } finally {
      setIsSaving(false);
    }
  }

  async function pickPhoto(source: "camera" | "gallery") {
    if (pendingPhotos.length >= 3) {
      Alert.alert("Limite alcanzado", "Puedes agregar hasta 3 fotos por reporte.");
      return;
    }
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", source === "camera" ? "Habilita la camara para tomar la foto." : "Habilita el acceso a fotos para elegir una imagen.");
      return;
    }
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.78 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.78 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (mimeType !== "image/jpeg" && mimeType !== "image/png" && mimeType !== "image/webp") {
      Alert.alert("Formato no compatible", "Usa una imagen JPG, PNG o WebP.");
      return;
    }
    setPendingPhotos((current) => [...current, {
      fileName: asset.fileName ?? `pet-alert-${Date.now()}.jpg`,
      mimeType,
      uri: asset.uri
    }]);
  }

  function addPhoto() {
    Alert.alert("Agregar foto", "Elige de donde tomar la imagen.", [
      { text: "Tomar foto", onPress: () => void pickPhoto("camera") },
      { text: "Elegir de galeria", onPress: () => void pickPhoto("gallery") },
      { text: "Cancelar", style: "cancel" }
    ]);
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ backgroundColor: "#9a3412", borderRadius: 24, gap: 10, padding: 17, ...visualTokens.mobile.shadow }}>
        <Text style={{ color: "#ffedd5", fontSize: 11, fontWeight: "900" }}>PET ALERT COMUNITARIO</Text>
        <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", lineHeight: 28 }}>Vi una mascota aparentemente perdida</Text>
        <Text style={{ color: "#ffedd5", fontSize: 12, lineHeight: 17 }}>Ayuda sin asumir abandono ni propiedad. No te pongas en riesgo.</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={onBack} style={{ backgroundColor: "#ffffff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 }}>
            <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "900" }}>Volver a Inicio</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setIsFormVisible((value) => !value)} style={{ backgroundColor: "#ea580c", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 }}>
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>{isFormVisible ? "Cerrar formulario" : "Crear reporte"}</Text>
          </Pressable>
        </View>
      </View>

      {errorMessage ? <View style={{ backgroundColor: colorTokens.dangerSoft, borderRadius: 14, padding: 12 }}><Text style={{ color: "#991b1b", fontSize: 12 }}>{errorMessage}</Text></View> : null}

      {isFormVisible ? (
        <View style={{ backgroundColor: colorTokens.surface, borderRadius: 20, gap: 12, padding: 14, ...visualTokens.mobile.softShadow }}>
          <Text style={{ color: colorTokens.ink, fontSize: 17, fontWeight: "900" }}>Reporte seguro</Text>
          <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>No indiques domicilios privados. No solicitamos GPS; las fotos son opcionales.</Text>
          <View style={{ gap: 8 }}>
            <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colorTokens.mutedStrong, fontSize: 10, fontWeight: "900" }}>FOTOS (OPCIONAL)</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 10 }}>Hasta 3. Evita personas, placas y domicilios.</Text>
              </View>
              <Pressable accessibilityLabel="Agregar foto al reporte" accessibilityRole="button" disabled={pendingPhotos.length >= 3} onPress={addPhoto} style={{ borderColor: colorTokens.accent, borderRadius: 999, borderWidth: 1, opacity: pendingPhotos.length >= 3 ? 0.45 : 1, paddingHorizontal: 11, paddingVertical: 8 }}>
                <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>Agregar foto</Text>
              </Pressable>
            </View>
            {pendingPhotos.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {pendingPhotos.map((photo, index) => <View key={`${photo.uri}-${index}`} style={{ gap: 4 }}>
                <Image source={{ uri: photo.uri }} style={{ borderRadius: 12, height: 82, width: 98 }} />
                <Pressable accessibilityLabel={`Quitar foto ${index + 1}`} accessibilityRole="button" onPress={() => setPendingPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}>
                  <Text style={{ color: "#991b1b", fontSize: 10, fontWeight: "800", textAlign: "center" }}>Quitar</Text>
                </Pressable>
              </View>)}
            </View> : null}
          </View>
          <Field label="ESPECIE" onChange={(value) => setForm((current) => ({ ...current, species: value }))} value={form.species} />
          <Field label="RAZA APARENTE (OPCIONAL)" onChange={(value) => setForm((current) => ({ ...current, apparentBreed: value }))} value={form.apparentBreed} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {(["small", "medium", "large", "unknown"] as PetAlertApparentSize[]).map((size) => <Choice key={size} label={{ small: "Pequena", medium: "Mediana", large: "Grande", unknown: "No se" }[size]} onPress={() => setForm((current) => ({ ...current, apparentSize: size }))} selected={form.apparentSize === size} />)}
          </View>
          <Field label="COLOR PRINCIPAL" onChange={(value) => setForm((current) => ({ ...current, primaryColor: value }))} value={form.primaryColor} />
          <Field label="COLLAR O SENAS DISTINTIVAS" multiline onChange={(value) => setForm((current) => ({ ...current, distinctiveMarks: value }))} value={form.distinctiveMarks} />
          <Field label="CIUDAD" onChange={(value) => setForm((current) => ({ ...current, city: value }))} value={form.city} />
          <Field label="ZONA O REFERENCIA APROXIMADA" onChange={(value) => setForm((current) => ({ ...current, locationReference: value }))} value={form.locationReference} />
          <Field label="QUE OBSERVASTE" multiline onChange={(value) => setForm((current) => ({ ...current, observedSituation: value }))} value={form.observedSituation} />
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void submit()} style={{ alignItems: "center", backgroundColor: "#c2410c", borderRadius: 999, minHeight: 46, justifyContent: "center" }}>
            {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>Publicar reporte comunitario</Text>}
          </Pressable>
        </View>
      ) : null}

      {myReports.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colorTokens.ink, fontSize: 15, fontWeight: "900" }}>Tus reportes</Text>
          {myReports.map((report) => (
            <View key={report.id} style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderRadius: 16, borderWidth: 1, gap: 4, padding: 12 }}>
              {report.photoUrls[0] ? <Image source={{ uri: report.photoUrls[0] }} style={{ borderRadius: 12, height: 150, width: "100%" }} /> : null}
              <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "900" }}>{report.animalSpecies} - {report.city}</Text>
              <Text style={{ color: colorTokens.mutedStrong, fontSize: 10 }}>{publicStatusLabel(report.status)}</Text>
              {operationalStatuses.has(report.status) ? <Pressable onPress={() => Alert.alert("Cerrar reporte", "Confirma por que deseas cerrarlo.", [{ text: "Cancelar", style: "cancel" }, { text: "Se reunio con su familia", onPress: () => void getMobilePetAlertApiClient().closePetAlertCommunitySighting(report.id, "reunited").then(load) }, { text: "Ya no esta en la zona", onPress: () => void getMobilePetAlertApiClient().closePetAlertCommunitySighting(report.id, "animal_left_area").then(load) }])}><Text style={{ color: "#9a3412", fontSize: 10, fontWeight: "900" }}>Cerrar reporte</Text></Pressable> : null}
              {receivedClaims.filter((claim) => claim.communitySightingId === report.id).map((claim) => (
                <View key={claim.id} style={{ backgroundColor: "#ffffff", borderRadius: 12, gap: 6, marginTop: 7, padding: 10 }}>
                  <Text style={{ color: colorTokens.ink, fontSize: 11, fontWeight: "900" }}>Solicitud de {claim.claimantName}</Text>
                  <Text style={{ color: colorTokens.mutedStrong, fontSize: 10, lineHeight: 14 }}>{claim.privateDetails}</Text>
                  <Text style={{ color: "#9a3412", fontSize: 10, fontWeight: "800" }}>{claim.status === "pending" ? "Pendiente de tu revision" : claim.status === "approved" ? "Contacto autorizado" : "Solicitud rechazada"}</Text>
                  {claim.status === "pending" ? <View style={{ flexDirection: "row", gap: 7 }}>
                    <Pressable accessibilityRole="button" onPress={() => void getMobilePetAlertApiClient().reviewPetAlertCommunityClaim(claim.id, "approved").then(load)} style={{ backgroundColor: colorTokens.accent, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>Autorizar contacto</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => void getMobilePetAlertApiClient().reviewPetAlertCommunityClaim(claim.id, "rejected", "La informacion no permite confirmar una coincidencia.").then(load)} style={{ borderColor: colorTokens.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 }}><Text style={{ color: colorTokens.mutedStrong, fontSize: 10, fontWeight: "900" }}>Rechazar</Text></Pressable>
                  </View> : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={{ color: colorTokens.ink, fontSize: 15, fontWeight: "900" }}>Reportes recientes</Text>
        {isLoading ? <ActivityIndicator color={colorTokens.accent} /> : reports.length ? reports.map((report) => (
          <View key={report.reportSlug} style={{ backgroundColor: colorTokens.surface, borderColor: colorTokens.line, borderRadius: 18, borderWidth: 1, gap: 5, padding: 13, ...visualTokens.mobile.softShadow }}>
            {report.photoUrls[0] ? <Image source={{ uri: report.photoUrls[0] }} style={{ borderRadius: 13, height: 170, width: "100%" }} /> : null}
            <Text style={{ color: colorTokens.ink, fontSize: 14, fontWeight: "900" }}>{report.animalSpecies}{report.apparentBreed ? ` - ${report.apparentBreed}` : ""}</Text>
            <Text style={{ color: "#c2410c", fontSize: 11, fontWeight: "800" }}>{report.city}{report.region ? `, ${report.region}` : ""}</Text>
            <Text numberOfLines={3} style={{ color: colorTokens.mutedStrong, fontSize: 11, lineHeight: 16 }}>{report.observedSituation}</Text>
          </View>
        )) : <Text style={{ color: colorTokens.muted, fontSize: 12 }}>Aun no hay reportes comunitarios activos.</Text>}
      </View>
    </View>
  );
}
