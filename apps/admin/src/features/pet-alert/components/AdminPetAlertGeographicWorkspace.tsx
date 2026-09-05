"use client";

import type {
  PetAlertAdminGeographicLocation,
  PetAlertGeographicLocationState,
  PetAlertGeographicModerationAction,
  PetAlertGeographicTargetType
} from "@pet/types";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getAdminPetAlertApiClient } from "../../core/services/supabase-admin";

const panel = { background: "#fff", border: "1px solid rgba(15,23,42,.1)", borderRadius: "12px", display: "grid", gap: "12px", padding: "16px" } as const;
const control = { background: "#fff", border: "1px solid rgba(15,23,42,.14)", borderRadius: "9px", font: "inherit", padding: "9px 11px" } as const;

function locationState(item: PetAlertAdminGeographicLocation) {
  if (item.privateLatitude === null) return "Sin coordenada confirmada";
  return item.publicLocationVisible ? "Visible en mapa" : "Oculta del mapa";
}

function coordinate(latitude: number | null, longitude: number | null) {
  return latitude === null || longitude === null ? "No disponible" : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function AdminPetAlertGeographicWorkspace() {
  const [items, setItems] = useState<PetAlertAdminGeographicLocation[]>([]);
  const [targetType, setTargetType] = useState<PetAlertGeographicTargetType | "all">("all");
  const [locationFilter, setLocationFilter] = useState<PetAlertGeographicLocationState>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<PetAlertGeographicModerationAction>("hide");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => items.find((item) => item.targetId === selectedId) ?? items[0] ?? null, [items, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminPetAlertApiClient().listAdminPetAlertGeographicLocations({
        limit: 150,
        locationState: locationFilter,
        targetType
      });
      setItems(result);
      setSelectedId((current) => result.some((item) => item.targetId === current) ? current : result[0]?.targetId ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible cargar ubicaciones PET ALERT.");
    } finally {
      setLoading(false);
    }
  }, [locationFilter, targetType]);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!selected || selected.privateLatitude === null) return;
    if (reason.trim().length < 8) {
      setError("Explica la decision geografica en al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await getAdminPetAlertApiClient().moderatePetAlertGeographicLocation(selected.targetType, selected.targetId, action, reason.trim());
      setReason("");
      setMessage(action === "hide" ? "Punto retirado del mapa publico." : action === "restore" ? "Punto restaurado en el mapa publico." : "Punto publico regenerado y auditado.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible moderar la ubicacion.");
    } finally {
      setBusy(false);
    }
  }

  return <section style={{ ...panel, background: "#f6fbfa" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", flexWrap: "wrap" }}>
      <div><span style={{ color: "#0f766e", fontSize: "10px", fontWeight: 900 }}>MODERACION GEOGRAFICA</span><h3 style={{ fontSize: "18px", margin: "5px 0" }}>Ubicaciones PET ALERT</h3><p style={{ color: "#52525b", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>Datos sensibles. Consulta el punto exacto solo para validar seguridad y coherencia del boletin.</p></div>
      <button onClick={() => void load()} style={control} type="button">Actualizar</button>
    </header>
    {error ? <div style={{ ...panel, borderColor: "#fecaca", color: "#991b1b", padding: "11px" }}>{error}</div> : null}
    {message ? <div style={{ ...panel, borderColor: "#bbf7d0", color: "#166534", padding: "11px" }}>{message}</div> : null}
    <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
      <select onChange={(event) => setTargetType(event.target.value as PetAlertGeographicTargetType | "all")} style={control} value={targetType}><option value="all">Todos los reportes</option><option value="lost_pet">Mascotas extraviadas</option><option value="community_sighting">Mascotas vistas</option></select>
      <select onChange={(event) => setLocationFilter(event.target.value as PetAlertGeographicLocationState)} style={control} value={locationFilter}><option value="all">Todos los estados</option><option value="visible">Visibles en mapa</option><option value="hidden">Ocultos del mapa</option><option value="missing">Sin coordenada</option></select>
    </div>
    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "minmax(230px,.75fr) minmax(0,1.25fr)" }}>
      <aside style={{ ...panel, maxHeight: "430px", minWidth: 0, overflowY: "auto" }}>
        {loading ? <span>Cargando ubicaciones...</span> : items.length ? items.map((item) => <button key={`${item.targetType}-${item.targetId}`} onClick={() => { setSelectedId(item.targetId); setError(null); setMessage(null); }} style={{ ...control, background: item.targetId === selected?.targetId ? "#e2f7f3" : "#fff", cursor: "pointer", display: "grid", gap: "4px", textAlign: "left" }} type="button"><strong>{item.title}</strong><span style={{ color: "#0f766e", fontSize: "11px" }}>{item.targetType === "lost_pet" ? "Extraviada" : "Vista"} - {item.city}</span><small>{locationState(item)}</small></button>) : <span style={{ color: "#52525b", fontSize: "12px" }}>No hay ubicaciones con estos filtros.</span>}
      </aside>
      <article style={panel}>
        {selected ? <>
          <div><strong style={{ fontSize: "17px" }}>{selected.title}</strong><div style={{ color: "#52525b", fontSize: "12px", marginTop: "4px" }}>{selected.species} - {selected.city} - {locationState(selected)}</div></div>
          <div style={{ background: "#fff4e8", border: "1px solid #fed7aa", borderRadius: "9px", color: "#9a3412", fontSize: "12px", lineHeight: 1.5, padding: "11px" }}><strong>Coordenada privada sensible</strong><br/>{coordinate(selected.privateLatitude, selected.privateLongitude)}{selected.accuracyMeters !== null ? ` - Precision ${Math.round(selected.accuracyMeters)} m` : ""}</div>
          <div style={{ background: "#f8fafc", borderRadius: "9px", display: "grid", gap: "4px", fontSize: "12px", padding: "11px" }}><strong>Punto publico generalizado</strong><span>{coordinate(selected.publicLatitude, selected.publicLongitude)}</span><span>Fuente: {selected.source} - Captura: {selected.capturedAt ? new Date(selected.capturedAt).toLocaleString("es-PA") : "No disponible"}</span></div>
          {selected.privateLatitude !== null ? <><select onChange={(event) => setAction(event.target.value as PetAlertGeographicModerationAction)} style={control} value={action}><option value="hide">Ocultar del mapa</option><option disabled={selected.publicLatitude === null} value="restore">Restaurar punto existente</option><option value="regenerate">Regenerar punto aproximado</option></select><textarea onChange={(event) => setReason(event.target.value)} placeholder="Motivo obligatorio; no incluyas coordenadas" rows={3} style={{ ...control, resize: "vertical" }} value={reason}/><button disabled={busy} onClick={() => void submit()} style={{ ...control, background: "#0f766e", color: "#fff", fontWeight: 800 }} type="button">{busy ? "Guardando..." : "Registrar decision geografica"}</button></> : <p style={{ color: "#52525b", fontSize: "12px" }}>Este boletin permanece en la lista, pero no puede mostrarse en el mapa hasta que su responsable confirme una ubicacion.</p>}
        </> : <p style={{ color: "#52525b", margin: 0 }}>Selecciona una ubicacion para revisar.</p>}
      </article>
    </div>
  </section>;
}
