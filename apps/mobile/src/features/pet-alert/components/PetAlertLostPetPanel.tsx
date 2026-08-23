import { colorTokens, visualTokens } from "@pet/ui";
import type {
  CreatePetAlertLostPetInput,
  PetAlertLostPet,
  PetAlertLostPetSighting,
  PetAlertLocationPrecision,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Share, Text, TextInput, View } from "react-native";

import { getMobilePetAlertApiClient } from "../../core/services/supabase-mobile";

type AlertStep = 1 | 2 | 3 | 4;

type AlertForm = {
  behaviorNotes: string;
  city: string;
  country: string;
  date: string;
  distinctiveMarks: string;
  medicalPublicNotes: string;
  publicDescription: string;
  reference: string;
  region: string;
  time: string;
};

const openStatuses = new Set<PetAlertLostPet["status"]>([
  "draft",
  "active",
  "sighting_received",
  "possible_match",
  "flagged"
]);

const statusLabels: Record<PetAlertLostPet["status"], string> = {
  active: "Alerta activa",
  closed: "Cerrada",
  draft: "Borrador",
  expired: "Vencida",
  flagged: "En revision",
  found: "Encontrada",
  possible_match: "Posible coincidencia",
  sighting_received: "Informacion recibida"
};

const sightingStatusLabels: Record<PetAlertLostPetSighting["status"], string> = {
  discarded: "Descartado",
  flagged: "En revision",
  new: "Nuevo",
  possible_lead: "Posible pista",
  reviewed: "Revisado"
};

const inputStyle = {
  backgroundColor: "#ffffff",
  borderColor: "rgba(15,23,42,0.12)",
  borderRadius: 14,
  borderWidth: 1,
  color: "#0f172a",
  fontSize: 13,
  paddingHorizontal: 12,
  paddingVertical: 11
} as const;

function getPanamaDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Panama",
    year: "numeric"
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`
  };
}

function emptyForm(): AlertForm {
  const now = getPanamaDateParts();
  return {
    behaviorNotes: "",
    city: "",
    country: "PA",
    date: now.date,
    distinctiveMarks: "",
    medicalPublicNotes: "",
    publicDescription: "",
    reference: "",
    region: "",
    time: now.time
  };
}

function toForm(alert: PetAlertLostPet): AlertForm {
  const date = new Date(alert.lastSeenAt);
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Panama",
    year: "numeric"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((part) => part.type === type)?.value ?? "";

  return {
    behaviorNotes: alert.behaviorNotes ?? "",
    city: alert.lastSeenCity,
    country: alert.lastSeenCountry,
    date: `${value("year")}-${value("month")}-${value("day")}`,
    distinctiveMarks: alert.distinctiveMarks ?? "",
    medicalPublicNotes: alert.medicalPublicNotes ?? "",
    publicDescription: alert.publicDescription,
    reference: alert.lastSeenReference ?? "",
    region: alert.lastSeenRegion ?? "",
    time: `${value("hour")}:${value("minute")}`
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Panama"
  }).format(new Date(value));
}

function fieldError(form: AlertForm, step: AlertStep) {
  if (step === 1) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) {
      return "Revisa la fecha (AAAA-MM-DD) y la hora (HH:MM).";
    }
    if (new Date(`${form.date}T${form.time}:00-05:00`).getTime() > Date.now() + 60_000) {
      return "El ultimo avistamiento no puede estar en el futuro.";
    }
  }
  if (step === 2 && (!form.city.trim() || !form.country.trim())) {
    return "Indica al menos la ciudad y el pais.";
  }
  if (step === 3 && form.publicDescription.trim().length < 12) {
    return "Describe a la mascota con al menos 12 caracteres.";
  }
  return null;
}

function toInput(petId: Uuid, form: AlertForm): CreatePetAlertLostPetInput {
  return {
    behaviorNotes: form.behaviorNotes.trim() || null,
    contactConsent: false,
    contactMode: "internal",
    distinctiveMarks: form.distinctiveMarks.trim() || null,
    lastSeenAt: `${form.date}T${form.time}:00-05:00`,
    lastSeenCity: form.city.trim(),
    lastSeenCountry: form.country.trim().toUpperCase(),
    lastSeenReference: form.reference.trim() || null,
    lastSeenRegion: form.region.trim() || null,
    locationPrecision: "approximate" satisfies PetAlertLocationPrecision,
    medicalPublicNotes: form.medicalPublicNotes.trim() || null,
    petId,
    publicDescription: form.publicDescription.trim(),
    shareEnabled: true
  };
}

function ActionButton({
  disabled,
  label,
  onPress,
  tone = "primary"
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "danger" | "primary" | "secondary";
}) {
  const backgroundColor = tone === "primary" ? "#0f8f83" : tone === "danger" ? "#fff1f2" : "#ffffff";
  const borderColor = tone === "danger" ? "#fecdd3" : "rgba(15,118,110,0.22)";
  const color = tone === "primary" ? "#ffffff" : tone === "danger" ? "#9f1239" : "#0f766e";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor,
        borderColor,
        borderRadius: 999,
        borderWidth: tone === "primary" ? 0 : 1,
        justifyContent: "center",
        minHeight: 42,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 14
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function FormField({
  label,
  multiline,
  onChangeText,
  placeholder,
  value
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: "#334155", fontSize: 10, fontWeight: "900" }}>{label.toUpperCase()}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={[inputStyle, multiline ? { minHeight: 82, textAlignVertical: "top" } : null]}
        value={value}
      />
    </View>
  );
}

export function PetAlertLostPetPanel({
  avatarUrl,
  canManage,
  petId,
  petName,
  petSpecies,
  petStatus
}: {
  avatarUrl: string | null;
  canManage: boolean;
  petId: Uuid;
  petName: string;
  petSpecies: string;
  petStatus: "active" | "in_memory";
}) {
  const [alerts, setAlerts] = useState<PetAlertLostPet[]>([]);
  const [form, setForm] = useState<AlertForm>(emptyForm);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sightings, setSightings] = useState<PetAlertLostPetSighting[]>([]);
  const [step, setStep] = useState<AlertStep>(1);

  const currentAlert = useMemo(
    () => alerts.find((alert) => openStatuses.has(alert.status)) ?? null,
    [alerts]
  );
  const isPublished = currentAlert ? currentAlert.status !== "draft" : false;

  async function load() {
    setIsLoading(true);
    setMessage(null);
    try {
      const nextAlerts = await getMobilePetAlertApiClient().listPetAlertLostPetsForPet(petId);
      setAlerts(nextAlerts);
      const nextCurrent = nextAlerts.find((alert) => openStatuses.has(alert.status)) ?? null;
      if (nextCurrent) {
        setForm(toForm(nextCurrent));
        if (nextCurrent.status !== "draft") {
          setSightings(await getMobilePetAlertApiClient().listSightingsForPetAlertLostPet(nextCurrent.id));
        } else {
          setSightings([]);
        }
      } else {
        setForm(emptyForm());
        setSightings([]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar PET ALERT.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setIsExpanded(false);
    setStep(1);
    void load();
  }, [petId]);

  function goNext() {
    const error = fieldError(form, step);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage(null);
    setStep((current) => Math.min(4, current + 1) as AlertStep);
  }

  async function save(publish: boolean) {
    for (const candidate of [1, 2, 3] as AlertStep[]) {
      const error = fieldError(form, candidate);
      if (error) {
        setStep(candidate);
        setMessage(error);
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      let savedAlert: PetAlertLostPet;
      if (currentAlert) {
        savedAlert = await getMobilePetAlertApiClient().updatePetAlertLostPet(currentAlert.id, toInput(petId, form));
        if (publish && savedAlert.status === "draft") {
          savedAlert = await getMobilePetAlertApiClient().publishPetAlertLostPet(savedAlert.id);
        }
      } else {
        savedAlert = await getMobilePetAlertApiClient().createPetAlertLostPet({
          ...toInput(petId, form),
          publish
        });
      }
      setAlerts((current) => [savedAlert, ...current.filter((alert) => alert.id !== savedAlert.id)]);
      setMessage(publish ? "PET ALERT publicada por 30 dias." : "Borrador guardado.");
      if (publish) {
        setStep(4);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible guardar PET ALERT.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markFound(source: "other" | "pet_alert") {
    if (!currentAlert) return;
    setIsSubmitting(true);
    try {
      await getMobilePetAlertApiClient().markPetAlertLostPetFound(currentAlert.id, source);
      setMessage(`${petName} fue marcada como encontrada.`);
      await load();
      setIsExpanded(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cerrar la alerta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmFound() {
    Alert.alert(
      `¿${petName} ya esta contigo?`,
      "Esto cerrara la alerta publica y conservara su historial.",
      [
        { style: "cancel", text: "Aun no" },
        { onPress: () => void markFound("other"), text: "Si, por otros medios" },
        { onPress: () => void markFound("pet_alert"), text: "Si, gracias a PET ALERT" }
      ]
    );
  }

  function confirmCloseWithoutFinding() {
    if (!currentAlert) return;
    Alert.alert(
      "¿Cerrar la alerta?",
      `La alerta de ${petName} dejara de estar activa. Usa esta opcion solo si deseas cerrar la busqueda sin marcarla como encontrada.`,
      [
        { style: "cancel", text: "Volver" },
        {
          onPress: () => {
            setIsSubmitting(true);
            getMobilePetAlertApiClient()
              .closePetAlertLostPet(currentAlert.id, "closed_not_found")
              .then(async () => {
                setMessage("La alerta fue cerrada y su historial se conservo.");
                await load();
                setIsExpanded(false);
              })
              .catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : "No fue posible cerrar la alerta.");
              })
              .finally(() => setIsSubmitting(false));
          },
          style: "destructive",
          text: "Cerrar alerta"
        }
      ]
    );
  }

  async function shareAlert() {
    if (!currentAlert) return;
    await Share.share({
      message: `${petName} esta extraviada. Ultima vez vista en ${currentAlert.lastSeenCity}${currentAlert.lastSeenReference ? `, cerca de ${currentAlert.lastSeenReference}` : ""}. Si tienes informacion, comunicate de forma segura mediante Pet Ecosystem. Referencia: ${currentAlert.alertSlug}`,
      title: `PET ALERT: ${petName}`
    });
  }

  if (!canManage || petStatus !== "active") {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: "#fff7ed",
        borderColor: "#fed7aa",
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
        padding: 14
      }}
    >
      <Pressable
        accessibilityLabel={isExpanded ? "Ocultar PET ALERT" : `Abrir PET ALERT para ${petName}`}
        accessibilityRole="button"
        onPress={() => setIsExpanded((current) => !current)}
        style={{ alignItems: "center", flexDirection: "row", gap: 10 }}
      >
        <View style={{ alignItems: "center", backgroundColor: "#ffedd5", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }}>
          <Text style={{ fontSize: 18 }}>!</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "900" }}>PET ALERT</Text>
          <Text style={{ color: "#7c2d12", fontSize: 11, fontWeight: "700" }}>
            {currentAlert ? statusLabels[currentAlert.status] : "Reportar a mi mascota como extraviada"}
          </Text>
        </View>
        <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "900" }}>{isExpanded ? "Ocultar" : "Abrir"}</Text>
      </Pressable>

      {message ? (
        <View style={{ backgroundColor: "rgba(255,255,255,0.76)", borderRadius: 12, padding: 10 }}>
          <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "800", lineHeight: 16 }}>{message}</Text>
        </View>
      ) : null}

      {isExpanded ? (
        isLoading ? (
          <ActivityIndicator color="#c2410c" />
        ) : isPublished && currentAlert ? (
          <View style={{ gap: 12 }}>
            <View style={{ alignItems: "center", backgroundColor: "#ffffff", borderRadius: 16, flexDirection: "row", gap: 10, padding: 12, ...visualTokens.mobile.softShadow }}>
              {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ borderRadius: 25, height: 50, width: 50 }} /> : null}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: "#0f172a", fontSize: 15, fontWeight: "900" }}>{petName}</Text>
                <Text style={{ color: "#64748b", fontSize: 11 }}>{formatDateTime(currentAlert.lastSeenAt)}</Text>
                <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "800" }}>{currentAlert.lastSeenCity}, {currentAlert.lastSeenCountry}</Text>
              </View>
            </View>
            <Text style={{ color: "#7c2d12", fontSize: 11, lineHeight: 17 }}>
              La ubicacion se comparte de forma aproximada. Tu direccion y expediente privado no se publican.
            </Text>
            {sightings.length ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "900" }}>Informacion recibida ({sightings.length})</Text>
                {sightings.map((sighting) => (
                  <View key={sighting.id} style={{ backgroundColor: "#ffffff", borderRadius: 14, gap: 4, padding: 10 }}>
                    <Text style={{ color: "#0f172a", fontSize: 11, fontWeight: "900" }}>{sighting.city} · {sightingStatusLabels[sighting.status]}</Text>
                    <Text style={{ color: "#64748b", fontSize: 10 }}>{formatDateTime(sighting.sightedAt)}</Text>
                    <Text style={{ color: "#334155", fontSize: 11, lineHeight: 15 }}>{sighting.notes}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: "#64748b", fontSize: 11 }}>Aun no se ha recibido informacion.</Text>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ActionButton label="Compartir alerta" onPress={() => void shareAlert()} />
              <ActionButton label="Actualizar" onPress={() => void load()} tone="secondary" />
              <ActionButton disabled={isSubmitting} label="Marcar encontrada" onPress={confirmFound} tone="secondary" />
              <ActionButton disabled={isSubmitting} label="Cerrar sin encontrar" onPress={confirmCloseWithoutFinding} tone="danger" />
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1, 2, 3, 4].map((candidate) => (
                <View
                  key={candidate}
                  style={{
                    backgroundColor: candidate <= step ? "#c2410c" : "#ffedd5",
                    borderRadius: 999,
                    flex: 1,
                    height: 5
                  }}
                />
              ))}
            </View>
            <Text style={{ color: "#7c2d12", fontSize: 14, fontWeight: "900" }}>
              {step === 1 ? "¿Cuando fue la ultima vez?" : step === 2 ? "¿En que zona?" : step === 3 ? "¿Como reconocerla?" : "Revisa antes de publicar"}
            </Text>
            {step === 1 ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><FormField label="Fecha" onChangeText={(date) => setForm((current) => ({ ...current, date }))} placeholder="AAAA-MM-DD" value={form.date} /></View>
                <View style={{ width: 98 }}><FormField label="Hora" onChangeText={(time) => setForm((current) => ({ ...current, time }))} placeholder="HH:MM" value={form.time} /></View>
              </View>
            ) : null}
            {step === 2 ? (
              <View style={{ gap: 10 }}>
                <FormField label="Ciudad" onChangeText={(city) => setForm((current) => ({ ...current, city }))} placeholder="Ej. Panama" value={form.city} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><FormField label="Region" onChangeText={(region) => setForm((current) => ({ ...current, region }))} placeholder="Provincia o zona" value={form.region} /></View>
                  <View style={{ width: 76 }}><FormField label="Pais" onChangeText={(country) => setForm((current) => ({ ...current, country }))} value={form.country} /></View>
                </View>
                <FormField label="Referencia publica aproximada" onChangeText={(reference) => setForm((current) => ({ ...current, reference }))} placeholder="Ej. cerca del parque" value={form.reference} />
                <Text style={{ color: "#9a3412", fontSize: 10, lineHeight: 14 }}>No escribas tu direccion residencial ni una ubicacion exacta.</Text>
              </View>
            ) : null}
            {step === 3 ? (
              <View style={{ gap: 10 }}>
                <FormField label="Descripcion publica" multiline onChangeText={(publicDescription) => setForm((current) => ({ ...current, publicDescription }))} placeholder={`Describe a ${petName}, su color y aspecto.`} value={form.publicDescription} />
                <FormField label="Señas distintivas" onChangeText={(distinctiveMarks) => setForm((current) => ({ ...current, distinctiveMarks }))} placeholder="Collar, manchas o rasgos" value={form.distinctiveMarks} />
                <FormField label="Comportamiento" onChangeText={(behaviorNotes) => setForm((current) => ({ ...current, behaviorNotes }))} placeholder="Timida, amigable, no acercarse..." value={form.behaviorNotes} />
                <FormField label="Nota medica publica opcional" onChangeText={(medicalPublicNotes) => setForm((current) => ({ ...current, medicalPublicNotes }))} placeholder="Solo lo necesario para ayudarla de forma segura" value={form.medicalPublicNotes} />
              </View>
            ) : null}
            {step === 4 ? (
              <View style={{ backgroundColor: "#ffffff", borderRadius: 16, gap: 10, padding: 12, ...visualTokens.mobile.softShadow }}>
                <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
                  {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ borderRadius: 25, height: 50, width: 50 }} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#0f172a", fontSize: 15, fontWeight: "900" }}>{petName}</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{petSpecies}</Text>
                  </View>
                </View>
                <Text style={{ color: "#334155", fontSize: 11, lineHeight: 16 }}>{form.publicDescription}</Text>
                <Text style={{ color: "#9a3412", fontSize: 11, fontWeight: "800" }}>{form.city}{form.reference ? ` · ${form.reference}` : ""}</Text>
                <Text style={{ color: "#64748b", fontSize: 10 }}>Contacto interno y ubicacion aproximada. Vigencia: 30 dias.</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {step > 1 ? <ActionButton label="Volver" onPress={() => setStep((current) => Math.max(1, current - 1) as AlertStep)} tone="secondary" /> : null}
              {step < 4 ? <ActionButton label="Continuar" onPress={goNext} /> : null}
              {step === 4 ? (
                <>
                  <ActionButton disabled={isSubmitting} label="Guardar borrador" onPress={() => void save(false)} tone="secondary" />
                  <ActionButton disabled={isSubmitting} label="Publicar PET ALERT" onPress={() => void save(true)} />
                </>
              ) : null}
            </View>
            <Text style={{ color: "#9a3412", fontSize: 10, lineHeight: 14 }}>
              PET ALERT no es un servicio de emergencia. No publiques datos privados ni pidas a otras personas que se pongan en riesgo.
            </Text>
          </View>
        )
      ) : null}
    </View>
  );
}
