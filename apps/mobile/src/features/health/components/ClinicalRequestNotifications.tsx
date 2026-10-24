import { useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { getMobileClinicalAccessApiClient, getMobileHouseholdsApiClient, getMobilePetsApiClient } from "../../core/services/supabase-mobile";
import { loadPendingClinicalRequests, type PendingClinicalRequest } from "../services/pendingClinicalRequests";
import { ClinicalAccessCard } from "./ClinicalAccessCard";

export function ClinicalRequestNotifications() {
  const [pending, setPending] = useState<PendingClinicalRequest[]>([]);
  const [notice, setNotice] = useState<PendingClinicalRequest | null>(null);
  const [review, setReview] = useState<PendingClinicalRequest | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    let running = false;
    async function refresh() {
      if (running || AppState.currentState !== "active") return;
      running = true;
      try {
        const results = await loadPendingClinicalRequests({
          getHouseholdsSnapshot: () => getMobileHouseholdsApiClient().getHouseholdsSnapshot(),
          listHouseholdPets: (id) => getMobilePetsApiClient().listHouseholdPets(id),
          listPetClinicalWriteRequests: (id) => getMobileClinicalAccessApiClient().listPetClinicalWriteRequests(id)
        });
        if (!cancelled && AppState.currentState === "active") setPending(results);
      } catch {
        // The actionable review loads independently and exposes errors with retry.
      } finally { running = false; }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { cancelled = true; clearInterval(interval); subscription.remove(); };
  }, []);

  useEffect(() => {
    if (review) return;
    if (notice && pending.some((item) => item.request.id === notice.request.id)) return;
    const next = pending.find((item) => !seen.current.has(item.request.id)) ?? null;
    if (next) seen.current.add(next.request.id);
    setNotice(next);
  }, [pending, notice, review]);

  function close() { setNotice(null); setReview(null); }

  return <>
    {pending.length ? <Pressable accessibilityRole="button" onPress={() => { setNotice(null); setReview(pending[0]); }} style={{ backgroundColor: "#ccfbf1", padding: 12 }}>
      <Text style={{ color: "#134e4a", fontWeight: "800" }}>{pending.length} solicitud(es) profesional(es) pendiente(s). Revisar</Text>
    </Pressable> : null}
    <Modal visible={Boolean(notice || review)} transparent animationType="fade" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(15,23,42,.55)", justifyContent: "center", padding: 16 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, maxHeight: "90%", gap: 12 }}>
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            {review ? <ClinicalAccessCard key={review.petId} petId={review.petId} petName={review.petName} requestsOnly /> : notice ? <>
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "800" }}>Solicitud de acceso profesional</Text>
              <Text>{notice.request.professionalName} solicita permiso para agregar informacion al expediente de {notice.petName}.</Text>
              <Text>Revisa las acciones solicitadas antes de aprobar.</Text>
              <Pressable accessibilityRole="button" onPress={() => { setReview(notice); setNotice(null); }} style={{ backgroundColor: "#0f766e", borderRadius: 10, padding: 14 }}>
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>Revisar solicitud</Text>
              </Pressable>
            </> : null}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={close} style={{ padding: 12 }}><Text style={{ textAlign: "center", color: "#0f766e", fontWeight: "800" }}>{review ? "Cerrar" : "Ahora no"}</Text></Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
