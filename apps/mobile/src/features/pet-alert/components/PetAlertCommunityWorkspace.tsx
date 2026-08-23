import type { PetAlertApparentSex, PetAlertApparentSize, PetAlertCommunitySighting, PublicPetAlertCommunitySighting } from "@pet/types";
import { colorTokens, visualTokens } from "@pet/ui";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, Text, TextInput, View } from "react-native";

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

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [publicReports, ownReports] = await Promise.all([
        getMobilePetAlertApiClient().listPublicPetAlertCommunitySightings({ country: "PA" }),
        getMobilePetAlertApiClient().listMyPetAlertCommunitySightings()
      ]);
      setReports(publicReports);
      setMyReports(ownReports);
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
      setForm({ ...initialForm, sightedAt: new Date().toISOString() });
      setIsFormVisible(false);
      await load();
      Alert.alert("Reporte publicado", "Gracias. La ubicacion se muestra solo de forma aproximada.", [
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
          <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>No indiques domicilios privados. La primera version no solicita GPS ni foto.</Text>
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
              <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "900" }}>{report.animalSpecies} - {report.city}</Text>
              <Text style={{ color: colorTokens.mutedStrong, fontSize: 10 }}>{publicStatusLabel(report.status)}</Text>
              {operationalStatuses.has(report.status) ? <Pressable onPress={() => Alert.alert("Cerrar reporte", "Confirma por que deseas cerrarlo.", [{ text: "Cancelar", style: "cancel" }, { text: "Se reunio con su familia", onPress: () => void getMobilePetAlertApiClient().closePetAlertCommunitySighting(report.id, "reunited").then(load) }, { text: "Ya no esta en la zona", onPress: () => void getMobilePetAlertApiClient().closePetAlertCommunitySighting(report.id, "animal_left_area").then(load) }])}><Text style={{ color: "#9a3412", fontSize: 10, fontWeight: "900" }}>Cerrar reporte</Text></Pressable> : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={{ color: colorTokens.ink, fontSize: 15, fontWeight: "900" }}>Reportes recientes</Text>
        {isLoading ? <ActivityIndicator color={colorTokens.accent} /> : reports.length ? reports.map((report) => (
          <View key={report.reportSlug} style={{ backgroundColor: colorTokens.surface, borderColor: colorTokens.line, borderRadius: 18, borderWidth: 1, gap: 5, padding: 13, ...visualTokens.mobile.softShadow }}>
            <Text style={{ color: colorTokens.ink, fontSize: 14, fontWeight: "900" }}>{report.animalSpecies}{report.apparentBreed ? ` - ${report.apparentBreed}` : ""}</Text>
            <Text style={{ color: "#c2410c", fontSize: 11, fontWeight: "800" }}>{report.city}{report.region ? `, ${report.region}` : ""}</Text>
            <Text numberOfLines={3} style={{ color: colorTokens.mutedStrong, fontSize: 11, lineHeight: 16 }}>{report.observedSituation}</Text>
          </View>
        )) : <Text style={{ color: colorTokens.muted, fontSize: 12 }}>Aun no hay reportes comunitarios activos.</Text>}
      </View>
    </View>
  );
}
