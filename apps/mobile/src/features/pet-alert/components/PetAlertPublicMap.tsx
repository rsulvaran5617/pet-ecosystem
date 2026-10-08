import type { PublicPetAlertMapFilters, PublicPetAlertMapPoint } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type MapLibrary = typeof import("@maplibre/maplibre-react-native");

export function PetAlertPublicMap({ points, onSelect, onBounds }: {
  points: PublicPetAlertMapPoint[];
  onSelect: (slug: string) => void;
  onBounds: (bounds: NonNullable<PublicPetAlertMapFilters["bounds"]>) => void;
}) {
  const [library, setLibrary] = useState<MapLibrary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void import("@maplibre/maplibre-react-native").then((module) => {
      if (active) setLibrary(module);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  const shape = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      properties: { slug: point.publicSlug },
      geometry: { type: "Point" as const, coordinates: [point.publicLongitude, point.publicLatitude] }
    }))
  }), [points]);
  if (failed) return <Text accessibilityRole="alert">No pudimos cargar el mapa. Puedes seguir consultando los boletines en Lista.</Text>;
  if (!library) return <ActivityIndicator accessibilityLabel="Cargando mapa" />;
  const { MapView, Camera, ShapeSource, CircleLayer } = library;
  return <View style={{ height: 360, borderRadius: 16, overflow: "hidden" }}>
    <MapView
      style={{ flex: 1 }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      attributionEnabled
      onDidFailLoadingMap={() => setFailed(true)}
      onRegionDidChange={(event) => {
        const [ne, sw] = event.properties.visibleBounds;
        if (ne && sw && [...ne, ...sw].every(Number.isFinite) && sw[0] <= ne[0]) {
          onBounds({ minLatitude: sw[1], minLongitude: sw[0], maxLatitude: ne[1], maxLongitude: ne[0] });
        }
      }}
    >
      <Camera defaultSettings={{ centerCoordinate: [-80.15, 8.65], zoomLevel: 6.4 }} />
      <ShapeSource id="pet-alert-public" shape={shape} onPress={(event) => {
        const slug: unknown = event.features[0]?.properties?.slug;
        if (typeof slug === "string") onSelect(slug);
      }}>
        <CircleLayer id="pet-alert-public-points" style={{ circleRadius: 9, circleColor: "#c2410c", circleStrokeColor: "#ffffff", circleStrokeWidth: 2 }} />
      </ShapeSource>
    </MapView>
  </View>;
}
