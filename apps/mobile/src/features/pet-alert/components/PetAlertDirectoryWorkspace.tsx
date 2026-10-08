import type { PetAlertPublicDirectoryView, PublicPetAlertDirectoryEvent, PublicPetAlertMapFilters, PublicPetAlertMapPoint } from "@pet/types";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from "react-native";
import { getMobilePetAlertApiClient } from "../../core/services/supabase-mobile";
import { PetAlertCommunityWorkspace } from "./PetAlertCommunityWorkspace";
import { PetAlertPublicMap } from "./PetAlertPublicMap";

const views: { id: PetAlertPublicDirectoryView; label: string }[] = [
  { id: "lost", label: "Extraviadas" }, { id: "seen", label: "Mascotas vistas" }, { id: "found", label: "Encontradas" }
];
function Button({ label, onPress, selected = false, disabled = false }: { label: string; onPress: () => void; selected?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={{ padding: 12, borderRadius: 12, backgroundColor: selected ? "#0f766e" : "#e6f4f1", opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: selected ? "white" : "#115e59", fontWeight: "700" }}>{label}</Text>
  </Pressable>;
}

export function PetAlertDirectoryWorkspace({ onBack }: { onBack: () => void }) {
  const [community, setCommunity] = useState(false);
  const [view, setView] = useState<PetAlertPublicDirectoryView>("lost");
  const [mode, setMode] = useState<"list" | "map">("list");
  const [items, setItems] = useState<PublicPetAlertDirectoryEvent[]>([]);
  const [points, setPoints] = useState<PublicPetAlertMapPoint[]>([]);
  const [bounds, setBounds] = useState<PublicPetAlertMapFilters["bounds"]>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (community) return;
    let active = true;
    setLoading(true); setError(null); setSelectedSlug(null); setItems([]); setPoints([]);
    const timer = setTimeout(() => {
      const api = getMobilePetAlertApiClient();
      const request = mode === "list"
        ? api.listPublicPetAlertDirectory({ view, offset, limit: 20 }).then((page) => { if (active) { setItems(page.items); setTotal(page.total); } })
        : api.listPublicPetAlertMapPoints({ view, bounds, limit: 500 }).then((result) => {
          if (active) setPoints(result.filter((p) => Number.isFinite(p.publicLatitude) && Math.abs(p.publicLatitude) <= 90 && Number.isFinite(p.publicLongitude) && Math.abs(p.publicLongitude) <= 180));
        });
      void request.catch(() => { if (active) setError("No pudimos cargar los boletines. Revisa tu conexión e inténtalo de nuevo."); })
        .finally(() => { if (active) setLoading(false); });
    }, mode === "map" ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [view, mode, offset, bounds, revision, community]);

  async function openBulletin(path: string) {
    // Public navigation never accepts another origin or arbitrary schemes.
    if (!/^\/pet-alert\/(mascota-perdida|mascota-vista)\/[a-z0-9-]+$/.test(path)) {
      setError("Este boletín no tiene un enlace válido."); return;
    }
    try { await Linking.openURL(`https://petecosyst.com${path}`); }
    catch { setError("No pudimos abrir el boletín en el navegador."); }
  }
  const selected = points.find((p) => p.publicSlug === selectedSlug);
  if (community) return <PetAlertCommunityWorkspace onBack={() => setCommunity(false)} />;
  return <View style={{ gap: 14 }}>
    <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "900", color: "#115e59" }}>PET ALERT · Mapa y boletines</Text>
    <Text>Ayuda a que más mascotas vuelvan a casa. Las ubicaciones son aproximadas.</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <Button label="Volver a Inicio" onPress={onBack} />
      <Button label="Vi una mascota perdida" onPress={() => setCommunity(true)} />
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{views.map((option) => <Button key={option.id} label={option.label} selected={view === option.id} onPress={() => { setView(option.id); setOffset(0); }} />)}</View>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Button label="Lista" selected={mode === "list"} onPress={() => setMode("list")} />
      <Button label="Mapa" selected={mode === "map"} onPress={() => { setBounds(null); setMode("map"); }} />
      <Button label="Actualizar" disabled={loading} onPress={() => setRevision((r) => r + 1)} />
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: "#991b1b" }}>{error}</Text> : null}
    {loading ? <ActivityIndicator accessibilityLabel="Cargando boletines" /> : null}
    {mode === "map" ? <>
      <PetAlertPublicMap key={revision} points={points} onSelect={setSelectedSlug} onBounds={setBounds} />
      {!loading && !error ? <Text>{points.length ? `${points.length} ubicaciones aproximadas en esta zona.` : "No hay ubicaciones confirmadas en esta zona. Consulta también la Lista."}</Text> : null}
      {points.length === 500 ? <Text>Acerca el mapa para consultar una zona más pequeña.</Text> : null}
      {selected ? <View style={{ padding: 14, gap: 8, backgroundColor: "white", borderRadius: 14 }}>
        <Text style={{ fontWeight: "800" }}>{selected.title} · {selected.city}</Text>
        <Button label="Ver boletín en navegador" onPress={() => void openBulletin(selected.publicPath)} />
      </View> : null}
      {points.length > 20 ? <Text>Primeros 20 puntos de esta zona. Acerca el mapa o usa Lista para explorar más boletines.</Text> : null}
      {points.slice(0, 20).map((point) => <Button key={`${point.eventType}-${point.publicSlug}`} label={`${point.title} · ${point.city}`} selected={selectedSlug === point.publicSlug} onPress={() => setSelectedSlug(point.publicSlug)} />)}
    </> : <>
      {!loading && !error && !items.length ? <Text>No hay boletines disponibles en esta categoría.</Text> : null}
      {items.map((item) => <View key={`${item.eventType}-${item.publicSlug}`} style={{ padding: 14, gap: 8, backgroundColor: "white", borderRadius: 14 }}>
        {item.photoUrl ? <Image accessibilityLabel={`Foto de ${item.title}`} source={{ uri: item.photoUrl }} style={{ height: 160, borderRadius: 12 }} /> : null}
        <Text style={{ fontSize: 18, fontWeight: "800" }}>{item.title}</Text>
        <Text>{item.species} · {item.city}</Text><Text>{item.summary}</Text>
        <Button label="Ver boletín en navegador" onPress={() => void openBulletin(item.publicPath)} />
      </View>)}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Anterior" disabled={loading || offset === 0} onPress={() => setOffset((n) => Math.max(0, n - 20))} />
        <Button label="Siguiente" disabled={loading || !!error || offset + 20 >= total} onPress={() => setOffset((n) => n + 20)} />
      </View>
    </>}
  </View>;
}
