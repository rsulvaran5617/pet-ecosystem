import type { ClinicalEntryType, ClinicalTimelineEncounter } from "@pet/types";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, Text, View } from "react-native";

import { getMobileClinicalAccessApiClient } from "../../core/services/supabase-mobile";

const typeLabels: Record<ClinicalEntryType, string> = { diagnosis: "Diagnostico", vaccine: "Vacuna", recommendation: "Indicacion", treatment: "Tratamiento", finding: "Hallazgo" };
const encounterLabels = { consultation: "Consulta", vaccination: "Vacunacion", follow_up: "Seguimiento", emergency: "Urgencia", other: "Atencion" } as const;
const formatDate = (value: string) => new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function ClinicalTimelineCard({ petId }: { petId: string }) {
  const [items, setItems] = useState<ClinicalTimelineEncounter[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setItems(await getMobileClinicalAccessApiClient().listPetClinicalTimeline(petId)); }
    catch { setError("No pudimos actualizar el historial profesional."); }
    finally { setIsLoading(false); }
  }, [petId]);

  useEffect(() => {
    setIsLoading(true); setOpenId(null); void load();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void load(); });
    return () => subscription.remove();
  }, [load]);

  async function openDocument(documentId: string) {
    try { await Linking.openURL(await getMobileClinicalAccessApiClient().getClinicalDocumentAccess(documentId)); }
    catch { setError("No pudimos abrir el documento. Intenta nuevamente."); }
  }

  return <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(15,118,110,.2)", backgroundColor: "#fff", padding: 14, gap: 10 }}>
    <View style={{ gap: 3 }}><Text style={{ color: "#134e4a", fontSize: 15, fontWeight: "900" }}>Historial profesional</Text><Text style={{ color: "#64748b", fontSize: 12, lineHeight: 17 }}>Atenciones incorporadas por profesionales autorizados.</Text></View>
    {items[0] && Date.now() - new Date(items[0].finalizedAt).getTime() < 7 * 24 * 60 * 60 * 1000 ? <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#ccfbf1", paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: "#0f766e", fontSize: 11, fontWeight: "900" }}>Nueva atencion profesional</Text></View> : null}
    {isLoading ? <ActivityIndicator color="#0f766e" /> : null}
    {error ? <Text style={{ color: "#991b1b", fontSize: 12, fontWeight: "700" }}>{error}</Text> : null}
    {!isLoading && !items.length ? <Text style={{ color: "#64748b", fontSize: 12 }}>Todavia no hay atenciones profesionales registradas.</Text> : null}
    {items.map((item) => {
      const open = openId === item.id;
      return <View key={item.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: "#dbe7e4", overflow: "hidden" }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpenId(open ? null : item.id)} style={{ padding: 12, gap: 4, backgroundColor: open ? "#f0fdfa" : "#fff" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Text style={{ flex: 1, color: "#1c1917", fontWeight: "900" }}>{encounterLabels[item.encounterType]}</Text><Text style={{ color: "#0f766e", fontWeight: "800" }}>{open ? "Ocultar" : "Abrir"}</Text></View>
          <Text style={{ color: "#475569", fontSize: 12 }}>{formatDate(item.attendedAt)} · {item.professionalName}</Text>
          <Text numberOfLines={2} style={{ color: "#334155", fontSize: 12 }}>{item.summary}</Text>
          <Text style={{ color: "#64748b", fontSize: 11 }}>{item.entries.length} registro(s) · {item.documents.length} documento(s){item.status === "corrected" ? " · Con rectificacion" : ""}</Text>
        </Pressable>
        {open ? <View style={{ borderTopWidth: 1, borderTopColor: "#dbe7e4", padding: 12, gap: 10 }}>
          <Text style={{ color: "#334155", fontSize: 12, fontWeight: "800" }}>{item.organizationName ?? "Profesional independiente"}</Text>
          {item.entries.map((entry) => <View key={entry.id} style={{ gap: 3 }}><Text style={{ color: "#0f766e", fontSize: 11, fontWeight: "900" }}>{typeLabels[entry.type]}{entry.correctsEntryId ? " · Rectificacion" : " · Registro original"}</Text><Text style={{ color: "#1c1917", fontWeight: "800" }}>{entry.title}</Text>{entry.details ? <Text style={{ color: "#475569", fontSize: 12 }}>{entry.details}</Text> : null}{entry.correctionReason ? <Text style={{ color: "#7c2d12", fontSize: 11 }}>Motivo: {entry.correctionReason}</Text> : null}</View>)}
          {item.documents.map((document) => <Pressable key={document.id} onPress={() => void openDocument(document.id)} style={{ alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "#0f766e", paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: "#0f766e", fontWeight: "800" }}>Abrir {document.title}</Text></Pressable>)}
          <Text style={{ color: "#64748b", fontSize: 11 }}>Autorizacion: {item.authorization.approvedScopes.length} permiso(s). Incorporada {formatDate(item.finalizedAt)}.</Text>
        </View> : null}
      </View>;
    })}
  </View>;
}
