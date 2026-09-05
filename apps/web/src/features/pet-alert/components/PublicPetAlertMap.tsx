"use client";

import type { PetAlertPublicDirectoryView, PublicPetAlertMapPoint } from "@pet/types";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getBrowserPetAlertApiClient } from "../../core/services/supabase-browser";
import styles from "./PublicPetAlertMap.module.css";

type Bounds = { minLatitude: number; minLongitude: number; maxLatitude: number; maxLongitude: number };
type MapFeatureProperties = { eventType: string; publicSlug: string; statusGroup: string; title: string };

function statusLabel(point: PublicPetAlertMapPoint) {
  if (point.statusGroup === "found") return "Encontrada";
  return point.eventType === "community_sighting" ? "Vista recientemente" : "Extraviada";
}

function hasValidPublicLocation(point: PublicPetAlertMapPoint) {
  return Number.isFinite(point.publicLatitude)
    && Number.isFinite(point.publicLongitude)
    && point.publicLatitude >= -90
    && point.publicLatitude <= 90
    && point.publicLongitude >= -180
    && point.publicLongitude <= 180;
}

function toGeoJson(points: PublicPetAlertMapPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point, MapFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.publicLongitude, point.publicLatitude] },
      properties: {
        eventType: point.eventType,
        publicSlug: point.publicSlug,
        statusGroup: point.statusGroup,
        title: point.title
      }
    }))
  };
}

export function PublicPetAlertMap({
  city,
  query,
  species,
  view
}: {
  city: string;
  query: string;
  species: string;
  view: PetAlertPublicDirectoryView;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pointsRef = useRef<PublicPetAlertMapPoint[]>([]);
  const requestSequenceRef = useRef(0);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [points, setPoints] = useState<PublicPetAlertMapPoint[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styleUrl = process.env.NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL?.trim() ?? "";
  const usesDemoStyle = process.env.NODE_ENV === "production" && styleUrl.includes("demotiles.maplibre.org");
  const selected = points.find((point) => point.publicSlug === selectedSlug) ?? null;

  const load = useCallback(async (nextBounds: Bounds | null) => {
    const requestSequence = ++requestSequenceRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getBrowserPetAlertApiClient().listPublicPetAlertMapPoints({
        bounds: nextBounds,
        city: city || null,
        limit: 500,
        query: query || null,
        species: species || null,
        view
      });
      if (requestSequence !== requestSequenceRef.current) return;
      const validPoints = result.filter(hasValidPublicLocation);
      setPoints(validPoints);
      setSelectedSlug((current) => validPoints.some((point) => point.publicSlug === current) ? current : null);
    } catch (reason) {
      if (requestSequence !== requestSequenceRef.current) return;
      setError(reason instanceof Error ? reason.message : "No fue posible cargar el mapa comunitario.");
    } finally {
      if (requestSequence === requestSequenceRef.current) setLoading(false);
    }
  }, [city, query, species, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(bounds); }, bounds ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [bounds, load]);

  useEffect(() => {
    if (!styleUrl || usesDemoStyle || !containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      center: [-80.15, 8.65],
      container: containerRef.current,
      style: styleUrl,
      zoom: 6.4
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("pet-alert-points", { type: "geojson", data: toGeoJson(pointsRef.current), cluster: true, clusterMaxZoom: 13, clusterRadius: 48 });
      map.addLayer({ id: "pet-alert-clusters", type: "circle", source: "pet-alert-points", filter: ["has", "point_count"], paint: { "circle-color": "#116f66", "circle-radius": ["step", ["get", "point_count"], 19, 20, 24, 75, 30], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.addLayer({ id: "pet-alert-cluster-count", type: "symbol", source: "pet-alert-points", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 }, paint: { "text-color": "#ffffff" } });
      map.addLayer({ id: "pet-alert-point", type: "circle", source: "pet-alert-points", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["case", ["==", ["get", "statusGroup"], "found"], "#278a52", ["==", ["get", "eventType"], "community_sighting"], "#147d72", "#d35c22"], "circle-radius": 10, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
      map.on("click", "pet-alert-clusters", async (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ["pet-alert-clusters"] })[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource("pet-alert-points") as GeoJSONSource;
        if (typeof clusterId === "number") map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom: await source.getClusterExpansionZoom(clusterId) });
      });
      map.on("click", "pet-alert-point", (event) => {
        const slug = event.features?.[0]?.properties?.publicSlug;
        if (typeof slug === "string") setSelectedSlug(slug);
      });
      map.on("mouseenter", "pet-alert-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseenter", "pet-alert-point", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "pet-alert-clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseleave", "pet-alert-point", () => { map.getCanvas().style.cursor = ""; });
      map.on("moveend", () => {
        const visible = map.getBounds();
        setBounds({ minLatitude: visible.getSouth(), minLongitude: visible.getWest(), maxLatitude: visible.getNorth(), maxLongitude: visible.getEast() });
      });
    });
    map.on("error", () => setError("El proveedor cartografico no esta disponible. Puedes seguir usando la lista."));
    return () => { map.remove(); mapRef.current = null; };
  }, [styleUrl, usesDemoStyle]);

  const geoJson = useMemo(() => toGeoJson(points), [points]);
  useEffect(() => {
    pointsRef.current = points;
    const source = mapRef.current?.getSource("pet-alert-points") as GeoJSONSource | undefined;
    source?.setData(geoJson);
  }, [geoJson, points]);

  if (!styleUrl) return <div className={styles.state}><strong>Mapa no configurado en este ambiente.</strong><span>Puedes consultar todos los boletines desde la vista Lista.</span></div>;
  if (usesDemoStyle) return <div className={styles.state}><strong>Mapa temporalmente no disponible.</strong><span>El proveedor cartografico de demostracion no se utiliza en produccion.</span><a href="/pet-alert">Ver boletines en lista</a></div>;

  return <section className={styles.shell} aria-label="Mapa publico de PET ALERT">
    <div className={styles.legend}><span><i className={`${styles.dot} ${styles.lost}`}/>Extraviada</span><span><i className={`${styles.dot} ${styles.seen}`}/>Vista</span><span><i className={`${styles.dot} ${styles.found}`}/>Encontrada</span></div>
    <div className={styles.mapFrame}><div aria-live="polite" className={styles.overlay}>{loading ? "Actualizando puntos visibles..." : `${points.length} puntos aproximados en esta vista`}</div><div aria-label="Mapa interactivo con ubicaciones aproximadas. Usa la lista de puntos para una navegacion accesible." className={styles.map} ref={containerRef}/></div>
    {error ? <div className={styles.state} role="alert"><strong>No pudimos cargar el mapa.</strong><span>{error}</span><div className={styles.stateActions}><button onClick={() => void load(bounds)} type="button">Reintentar</button><a href="/pet-alert">Usar vista Lista</a></div></div> : null}
    {selected ? <article className={styles.selected}>{selected.photoUrl ? <img alt={selected.title} src={selected.photoUrl}/> : <span className={styles.placeholder}>Sin foto</span>}<div className={styles.selectedCopy}><small>{statusLabel(selected)}</small><strong>{selected.title}</strong><span>{selected.species} - {selected.city}</span></div><a href={selected.publicPath}>Ver boletin</a></article> : null}
    {points.length ? <div className={styles.accessible}><h3>Puntos visibles</h3><div className={styles.pointList}>{points.slice(0, 12).map((point) => <button aria-pressed={point.publicSlug === selectedSlug} className={styles.point} key={`${point.eventType}-${point.publicSlug}`} onClick={() => setSelectedSlug(point.publicSlug)} type="button">{statusLabel(point)}: {point.title}</button>)}</div><ul className={styles.screenReaderPoints}>{points.map((point) => <li key={`accessible-${point.eventType}-${point.publicSlug}`}><a href={point.publicPath}>{statusLabel(point)}: {point.title}, {point.species}, {point.city}</a></li>)}</ul></div> : !loading && !error ? <div className={styles.state}><strong>No hay ubicaciones confirmadas en esta zona.</strong><span>Los boletines sin coordenadas permanecen disponibles en Lista.</span></div> : null}
  </section>;
}
