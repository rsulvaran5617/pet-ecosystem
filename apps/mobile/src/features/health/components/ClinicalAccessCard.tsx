import type { ClinicalWriteRequest, ClinicalWriteScope, CreatedPetClinicalAccess, PetClinicalAccessDuration, PetClinicalAccessGrant } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { getMobileClinicalAccessApiClient } from "../../core/services/supabase-mobile";

const durations: Array<{ value: PetClinicalAccessDuration; label: string }> = [
  { value: "1_hour", label: "1 hora" },
  { value: "1_day", label: "1 dia" },
  { value: "1_week", label: "1 semana" }
];
const publicWebOrigin = "https://petecosyst.com";
const scopeLabels: Record<ClinicalWriteScope, string> = { create_encounter: "Registrar atencion", record_diagnosis: "Diagnostico", record_vaccine: "Vacuna", record_recommendation: "Indicaciones", record_treatment: "Tratamiento", upload_clinical_document: "Documento clinico" };

function formatExpiration(value: string) {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ClinicalAccessCard({ petId, petName }: { petId: string; petName: string }) {
  const [duration, setDuration] = useState<PetClinicalAccessDuration>("1_hour");
  const [createdAccess, setCreatedAccess] = useState<CreatedPetClinicalAccess | null>(null);
  const [activeGrant, setActiveGrant] = useState<PetClinicalAccessGrant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [writeRequests, setWriteRequests] = useState<ClinicalWriteRequest[]>([]);
  const accessUrl = useMemo(() => createdAccess ? `${publicWebOrigin}/clinical-access/${createdAccess.token}` : null, [createdAccess]);

  useEffect(() => {
    let active = true;
    setCreatedAccess(null);
    setIsLoading(true);
    setErrorMessage(null);
    void Promise.all([getMobileClinicalAccessApiClient().listPetClinicalAccessGrants(petId), getMobileClinicalAccessApiClient().listPetClinicalWriteRequests(petId)])
      .then(([grants, requests]) => { if (active) { setActiveGrant(grants.find((grant) => grant.status === "active") ?? null); setWriteRequests(requests); } })
      .catch(() => { if (active) setErrorMessage("No pudimos consultar los accesos temporales."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [petId]);

  async function createAccess() {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const access = await getMobileClinicalAccessApiClient().createPetClinicalAccess(petId, duration);
      setCreatedAccess(access);
      setActiveGrant(access);
    } catch {
      setErrorMessage("No pudimos generar el acceso. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revokeAccess() {
    if (!activeGrant) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await getMobileClinicalAccessApiClient().revokePetClinicalAccess(activeGrant.id);
      setActiveGrant(null);
      setCreatedAccess(null);
    } catch {
      setErrorMessage("No pudimos cerrar el acceso. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewRequest(request: ClinicalWriteRequest, decision: "approved" | "rejected") {
    setIsSubmitting(true); setErrorMessage(null);
    try {
      await getMobileClinicalAccessApiClient().reviewClinicalWriteRequest(request.id, decision, decision === "approved" ? request.requestedScopes : undefined);
      setWriteRequests(await getMobileClinicalAccessApiClient().listPetClinicalWriteRequests(petId));
    } catch { setErrorMessage("No pudimos responder la solicitud. Actualiza e intenta nuevamente."); }
    finally { setIsSubmitting(false); }
  }

  async function revokeWriteRequest(request: ClinicalWriteRequest) {
    setIsSubmitting(true); setErrorMessage(null);
    try { await getMobileClinicalAccessApiClient().revokeClinicalWriteAuthorization(request.id); setWriteRequests(await getMobileClinicalAccessApiClient().listPetClinicalWriteRequests(petId)); }
    catch { setErrorMessage("No pudimos revocar la autorizacion."); }
    finally { setIsSubmitting(false); }
  }

  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(15,118,110,0.2)", backgroundColor: "#f0fdfa", padding: 14, gap: 12 }}>
      <View style={{ gap: 3 }}>
        <Text style={{ color: "#134e4a", fontSize: 15, fontWeight: "900" }}>Acceso temporal al expediente</Text>
        <Text style={{ color: "#475569", fontSize: 12, lineHeight: 17 }}>Permite que un profesional consulte la salud de {petName} desde la web. El acceso es solo de lectura.</Text>
      </View>
      {isLoading ? <ActivityIndicator color="#0f766e" /> : null}
      {errorMessage ? <Text style={{ color: "#991b1b", fontSize: 12, fontWeight: "700" }}>{errorMessage}</Text> : null}
      {!isLoading && !activeGrant ? (
        <>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {durations.map((option) => {
              const selected = duration === option.value;
              return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={option.value} onPress={() => setDuration(option.value)} style={{ borderRadius: 999, borderWidth: 1, borderColor: selected ? "#0f766e" : "#cbd5e1", backgroundColor: selected ? "#ccfbf1" : "#ffffff", paddingHorizontal: 13, paddingVertical: 9 }}><Text style={{ color: "#134e4a", fontSize: 12, fontWeight: "800" }}>{option.label}</Text></Pressable>;
            })}
          </View>
          <Pressable disabled={isSubmitting} onPress={() => void createAccess()} style={{ borderRadius: 999, backgroundColor: "#0f766e", padding: 12, opacity: isSubmitting ? 0.6 : 1 }}><Text style={{ color: "#ffffff", fontWeight: "800", textAlign: "center" }}>{isSubmitting ? "Generando..." : "Generar codigo QR"}</Text></Pressable>
        </>
      ) : null}
      {activeGrant ? (
        <View style={{ alignItems: "center", gap: 10 }}>
          {accessUrl ? <View style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 12 }}><QRCode value={accessUrl} size={190} /></View> : null}
          <Text style={{ color: "#134e4a", fontSize: 12, fontWeight: "800", textAlign: "center" }}>Disponible hasta {formatExpiration(activeGrant.expiresAt)}</Text>
          {!accessUrl ? <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 17, textAlign: "center" }}>Este acceso sigue activo. Por seguridad, genera uno nuevo si necesitas mostrar nuevamente el QR.</Text> : <Pressable onPress={() => void Share.share({ message: `Expediente temporal de ${petName}: ${accessUrl}` })} style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: "#0f766e", fontWeight: "800" }}>Compartir enlace</Text></Pressable>}
          <Pressable disabled={isSubmitting} onPress={() => void revokeAccess()} style={{ borderRadius: 999, borderWidth: 1, borderColor: "#dc2626", paddingHorizontal: 16, paddingVertical: 10, opacity: isSubmitting ? 0.6 : 1 }}><Text style={{ color: "#b91c1c", fontWeight: "800" }}>{isSubmitting ? "Cerrando..." : "Revocar acceso"}</Text></Pressable>
        </View>
      ) : null}
      {writeRequests.filter((request) => request.status === "requested" || request.status === "approved").map((request) => (
        <View key={request.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: request.status === "requested" ? "#f59e0b" : "#0f766e", backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
          <Text style={{ color: "#1c1917", fontWeight: "900" }}>{request.status === "requested" ? "Solicitud profesional" : "Autorizacion activa"}</Text>
          <Text style={{ color: "#334155", fontWeight: "700" }}>{request.professionalName}{request.organizationName ? ` - ${request.organizationName}` : ""}</Text>
          <Text style={{ color: "#475569", fontSize: 12, lineHeight: 17 }}>{request.requestedScopes.map((scope) => scopeLabels[scope]).join(" · ")}</Text>
          {request.requestNote ? <Text style={{ color: "#475569", fontSize: 12 }}>{request.requestNote}</Text> : null}
          <Text style={{ color: "#64748b", fontSize: 11 }}>Vence {formatExpiration(request.expiresAt)}. Puedes revocar el permiso en cualquier momento.</Text>
          {request.status === "requested" ? <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}><Pressable disabled={isSubmitting} onPress={() => void reviewRequest(request, "approved")} style={{ borderRadius: 999, backgroundColor: "#0f766e", paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: "#fff", fontWeight: "800" }}>Aprobar</Text></Pressable><Pressable disabled={isSubmitting} onPress={() => void reviewRequest(request, "rejected")} style={{ borderRadius: 999, borderWidth: 1, borderColor: "#b91c1c", paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: "#b91c1c", fontWeight: "800" }}>Rechazar</Text></Pressable></View> : <Pressable disabled={isSubmitting} onPress={() => void revokeWriteRequest(request)} style={{ alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "#b91c1c", paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: "#b91c1c", fontWeight: "800" }}>Revocar permiso</Text></Pressable>}
        </View>
      ))}
      {writeRequests.some((request) => !["requested", "approved"].includes(request.status)) ? <View style={{ gap: 7 }}><Text style={{ color: "#134e4a", fontSize: 13, fontWeight: "900" }}>Historial de autorizaciones</Text>{writeRequests.filter((request) => !["requested", "approved"].includes(request.status)).map((request) => <View key={request.id} style={{ borderTopWidth: 1, borderTopColor: "#dbe7e4", paddingTop: 8, gap: 2 }}><Text style={{ color: "#334155", fontSize: 12, fontWeight: "800" }}>{request.professionalName}{request.organizationName ? ` · ${request.organizationName}` : ""}</Text><Text style={{ color: "#64748b", fontSize: 11 }}>{request.status === "completed" ? "Atencion completada" : request.status === "rejected" ? "Solicitud rechazada" : request.status === "revoked" ? "Permiso revocado" : "Permiso vencido"} · vence {formatExpiration(request.expiresAt)}</Text></View>)}</View> : null}
    </View>
  );
}
