import { formatHouseholdPermissions, providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type {
  BookingSlot,
  MarketplaceProviderSummary,
  MarketplaceSearchFilters,
  MarketplaceServiceSelection,
  ProviderAvailabilitySlot,
  ProviderDayOfWeek,
  ProviderServiceCategory
} from "@pet/types";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Image, Modal, Pressable, Text, TextInput, View } from "react-native";

import { StatusChip } from "../../core/components/StatusChip";
import { getMobileBookingsApiClient } from "../../core/services/supabase-mobile";
import { BookingSlotsCalendar } from "../../bookings/components/BookingSlotsCalendar";
import { useMarketplaceWorkspace } from "../hooks/useMarketplaceWorkspace";

const inputStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colorTokens.line,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: colorTokens.surface,
  color: colorTokens.ink
} as const;

const cardStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colorTokens.line,
  backgroundColor: colorTokens.surface,
  padding: 14,
  gap: 10,
  ...visualTokens.mobile.softShadow
} as const;

const weekDays: ProviderDayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const weekDayShortLabels: Record<ProviderDayOfWeek, string> = {
  0: "DOM",
  1: "LUN",
  2: "MAR",
  3: "MIE",
  4: "JUE",
  5: "VIE",
  6: "SAB"
};

type DistanceOrigin =
  | { type: "none"; id: "none"; label: string; detail: string; latitude: null; longitude: null }
  | { type: "address"; id: string; label: string; detail: string; latitude: number; longitude: number }
  | { type: "zone"; id: string; label: string; detail: string; latitude: number; longitude: number };

const noDistanceOrigin: DistanceOrigin = {
  type: "none",
  id: "none",
  label: "Sin distancia",
  detail: "Mostrar solo ubicacion publica",
  latitude: null,
  longitude: null
};

const controlledDistanceZones: DistanceOrigin[] = [
  { type: "zone", id: "panama", label: "Panama", detail: "Zona aproximada", latitude: 8.9824, longitude: -79.5199 },
  { type: "zone", id: "san-miguelito", label: "San Miguelito", detail: "Zona aproximada", latitude: 9.033, longitude: -79.5 },
  { type: "zone", id: "arraijan", label: "Arraijan", detail: "Zona aproximada", latitude: 8.95, longitude: -79.65 },
  { type: "zone", id: "la-chorrera", label: "La Chorrera", detail: "Zona aproximada", latitude: 8.8803, longitude: -79.7833 },
  { type: "zone", id: "colon", label: "Colon", detail: "Zona aproximada", latitude: 9.3592, longitude: -79.9014 },
  { type: "zone", id: "david", label: "David", detail: "Zona aproximada", latitude: 8.4273, longitude: -82.4308 }
];

const preferredSearchCategories: Array<{ category: ProviderServiceCategory; helper: string; label: string }> = [
  { category: "veterinary", label: "Veterinaria", helper: "salud" },
  { category: "walking", label: "Paseadores", helper: "paseos" },
  { category: "grooming", label: "Grooming", helper: "belleza" },
  { category: "daycare", label: "Guarderia", helper: "cuidado" },
  { category: "training", label: "Entrenamiento", helper: "conducta" },
  { category: "boarding", label: "Hospedaje", helper: "estadia" }
];

const controlledRecentSearches = ["Veterinaria general", "Paseadores cerca de mi", "Peluqueria canina"];
const controlledQuickFilterLabels = ["Disponible hoy", "Mejor valorados", "Con cupos"];

const marketplaceMapStyleUrl = "https://demotiles.maplibre.org/style.json";
const defaultMarketplaceMapCenter: [number, number] = [-79.5199, 8.9824];

type MapLibreComponentProps = Record<string, unknown> & { children?: ReactNode };
type MapLibreComponents = {
  Camera: ComponentType<MapLibreComponentProps>;
  MapView: ComponentType<MapLibreComponentProps>;
  PointAnnotation: ComponentType<MapLibreComponentProps>;
};

function formatSpeciesLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatTimeRange(startsAt: string, endsAt: string) {
  return `${startsAt.slice(0, 5)} - ${endsAt.slice(0, 5)}`;
}

function getProviderInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.slice(0, 1).toUpperCase())
      .join("") || "PV"
  );
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Button({ disabled, label, onPress, tone = "primary" }: { disabled?: boolean; label: string; onPress: () => void; tone?: "primary" | "secondary" }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: tone === "primary" ? colorTokens.accent : colorTokens.surface,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(0,151,143,0.26)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: disabled ? 0.65 : 1,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function SectionSelector({
  count,
  isActive,
  label,
  onPress,
  subtitle
}: {
  count: number;
  isActive: boolean;
  label: string;
  onPress: () => void;
  subtitle: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 16,
        backgroundColor: isActive ? "rgba(15,118,110,0.08)" : "rgba(247,250,252,0.92)",
        borderColor: isActive ? "rgba(15,118,110,0.22)" : "rgba(15,23,42,0.06)",
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900" }}>{label}</Text>
        <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 11 }}>
          {count} registro(s) - {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

const providerPublishedLocationLabel = "Ubicacion exacta publicada";

function formatProviderDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== "number") {
    return null;
  }

  return `Aprox. ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
}

function hasProviderMapLocation(provider: MarketplaceProviderSummary) {
  return (
    Boolean(provider.publicLocation) &&
    Number.isFinite(provider.publicLocation?.latitude) &&
    Number.isFinite(provider.publicLocation?.longitude) &&
    !(provider.publicLocation?.latitude === 0 && provider.publicLocation?.longitude === 0)
  );
}

function SearchShell({
  onChangeText,
  onFocus,
  onOpenFilters,
  onSubmit,
  value
}: {
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onOpenFilters: () => void;
  onSubmit: () => void;
  value: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderColor: "rgba(15,23,42,0.08)",
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        minHeight: 52,
        paddingHorizontal: 12,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: colorTokens.muted, fontSize: 20, fontWeight: "400" }}>⌕</Text>
      <TextInput
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmit}
        placeholder="¿Qué servicio necesitas para tu mascota?"
        placeholderTextColor="#8b8b93"
        returnKeyType="search"
        style={{
          color: colorTokens.ink,
          flex: 1,
          fontSize: 13,
          minHeight: 48,
          paddingVertical: 0
        }}
        value={value}
      />
      {value ? (
        <Pressable accessibilityLabel="Limpiar busqueda" accessibilityRole="button" onPress={() => onChangeText("")}>
          <Text style={{ color: colorTokens.muted, fontSize: 18, fontWeight: "800" }}>×</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel="Abrir filtros de busqueda"
        accessibilityRole="button"
        onPress={onOpenFilters}
        style={{
          alignItems: "center",
          borderColor: "rgba(15,118,110,0.2)",
          borderRadius: 14,
          borderWidth: 1,
          height: 36,
          justifyContent: "center",
          width: 36
        }}
      >
        <Text style={{ color: colorTokens.accentDark, fontSize: 16, fontWeight: "900" }}>☷</Text>
      </Pressable>
    </View>
  );
}

function FilterChip({
  isActive,
  label,
  onPress
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: isActive ? colorTokens.accent : "#ffffff",
        borderColor: isActive ? colorTokens.accent : "rgba(15,23,42,0.12)",
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9
      }}
    >
      <Text style={{ color: isActive ? "#ffffff" : colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function ProviderVisualCard({
  ctaLabel,
  onPress,
  provider,
  variant = "default"
}: {
  ctaLabel: string;
  onPress: () => void;
  provider: MarketplaceProviderSummary;
  variant?: "default" | "featured";
}) {
  const distanceLabel = formatProviderDistance(provider.distanceKm);
  const publicLocation = provider.publicLocation;
  const categoryLabel = provider.categories[0] ? providerServiceCategoryLabels[provider.categories[0]] : "Servicios pet";

  return (
    <Pressable
      accessibilityLabel={`Abrir proveedor ${provider.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        borderColor: variant === "featured" ? "rgba(0,151,143,0.58)" : "rgba(15,23,42,0.08)",
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: "#ffffff",
        flexDirection: "row",
        gap: 9,
        padding: 10,
        ...visualTokens.mobile.softShadow
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(20,184,166,0.12)",
          borderRadius: 16,
          height: 68,
          justifyContent: "center",
          overflow: "hidden",
          width: 68
        }}
      >
        {provider.avatarUrl ? (
          <Image source={{ uri: provider.avatarUrl }} style={{ height: 68, width: 68 }} />
        ) : (
          <Text style={{ color: colorTokens.accentDark, fontSize: 14, fontWeight: "900" }}>{getProviderInitials(provider.name)}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        {variant === "featured" ? (
          <View style={{ alignSelf: "flex-start" }}>
            <StatusChip label="Recomendado" tone="active" />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8, justifyContent: "space-between" }}>
          <Text numberOfLines={2} style={{ color: "#1c1917", flex: 1, fontSize: 13, fontWeight: "900", lineHeight: 16 }}>
            {provider.name}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10.5, fontWeight: "700" }}>
          {categoryLabel}
        </Text>
        <Text numberOfLines={1} style={{ color: colorTokens.muted, fontSize: 10 }}>
          {publicLocation ? `${publicLocation.city}, ${publicLocation.countryCode}` : provider.city}
          {distanceLabel ? ` - ${distanceLabel}` : ""}
        </Text>
        <Text numberOfLines={1} style={{ color: "#f59e0b", fontSize: 9.5, fontWeight: "900" }}>
          Perfil publicado - reseñas en piloto
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <StatusChip label={`${provider.serviceCount} servicio(s)`} tone="neutral" />
          {provider.availableDays.length ? <StatusChip label="Disponibilidad" tone="active" /> : null}
        </View>
        <View style={{ alignSelf: "flex-start", marginTop: 2 }}>
          <Button label={ctaLabel} onPress={onPress} />
        </View>
      </View>
    </Pressable>
  );
}

function getProviderMapCoordinate(provider: MarketplaceProviderSummary): [number, number] {
  return [provider.publicLocation?.longitude ?? defaultMarketplaceMapCenter[0], provider.publicLocation?.latitude ?? defaultMarketplaceMapCenter[1]];
}

function getMarketplaceMapCenter(providers: MarketplaceProviderSummary[], origin: DistanceOrigin): [number, number] {
  if (origin.type !== "none") {
    return [origin.longitude, origin.latitude];
  }

  const providersWithLocation = providers.filter(hasProviderMapLocation);

  if (!providersWithLocation.length) {
    return defaultMarketplaceMapCenter;
  }

  const totals = providersWithLocation.reduce(
    (accumulator, provider) => ({
      latitude: accumulator.latitude + (provider.publicLocation?.latitude ?? 0),
      longitude: accumulator.longitude + (provider.publicLocation?.longitude ?? 0)
    }),
    { latitude: 0, longitude: 0 }
  );

  return [totals.longitude / providersWithLocation.length, totals.latitude / providersWithLocation.length];
}

function ProviderLocationSummary({ provider }: { provider: MarketplaceProviderSummary }) {
  const publicLocation = provider.publicLocation;

  if (!publicLocation) {
    return (
      <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14, marginTop: 4 }}>
        Ubicacion publica no configurada
      </Text>
    );
  }

  const distanceLabel = formatProviderDistance(provider.distanceKm);

  return (
    <View style={{ marginTop: 6, gap: 4 }}>
      <Text style={{ color: "#1c1917", fontSize: 10, fontWeight: "900", lineHeight: 14 }} numberOfLines={1}>
        {publicLocation.displayLabel || `Ubicacion publica: ${publicLocation.city}, ${publicLocation.countryCode}`}
      </Text>
      <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }} numberOfLines={1}>
        {distanceLabel
          ? `${distanceLabel} - ${publicLocation.city}, ${publicLocation.countryCode}`
          : `Ubicacion publica: ${publicLocation.city}, ${publicLocation.countryCode}`}
      </Text>
      <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>
        {providerPublishedLocationLabel}
      </Text>
    </View>
  );
}

function MarketplaceProviderMiniCard({
  onOpenProvider,
  provider
}: {
  onOpenProvider: (providerId: string) => void;
  provider: MarketplaceProviderSummary;
}) {
  const distanceLabel = formatProviderDistance(provider.distanceKm);
  const publicLocation = provider.publicLocation;

  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "rgba(15,23,42,0.08)",
        borderWidth: 1,
        padding: 12,
        gap: 8
      }}
    >
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ alignItems: "center", backgroundColor: "rgba(20,184,166,0.12)", borderRadius: 20, height: 40, justifyContent: "center", width: 40 }}>
          {provider.avatarUrl ? (
            <Image source={{ uri: provider.avatarUrl }} style={{ borderRadius: 20, height: 40, width: 40 }} />
          ) : (
            <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>{getProviderInitials(provider.name)}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }} numberOfLines={1}>
            {provider.name}
          </Text>
          <Text style={{ color: colorTokens.muted, fontSize: 10, marginTop: 3 }} numberOfLines={1}>
            {publicLocation ? `${publicLocation.city}, ${publicLocation.countryCode}` : provider.city}
          </Text>
        </View>
        <StatusChip label={`${provider.serviceCount} servicio(s)`} tone="neutral" />
      </View>
      <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "800", lineHeight: 14 }}>
        {publicLocation ? providerPublishedLocationLabel : "Ubicacion publica no configurada"}
      </Text>
      {distanceLabel ? (
        <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>{distanceLabel}</Text>
      ) : null}
      <View style={{ alignSelf: "flex-start" }}>
        <Button label="Ver proveedor" onPress={() => onOpenProvider(provider.organizationId)} />
      </View>
    </View>
  );
}

export function MarketplaceWorkspace({
  enabled,
  onSelectBookingService
}: {
  enabled: boolean;
  onSelectBookingService?: (selection: MarketplaceServiceSelection) => void;
}) {
  const {
    householdSnapshot,
    homeSnapshot,
    pets,
    providers,
    selectedProviderDetail,
    selectedHouseholdId,
    selectedPetId,
    errorMessage,
    infoMessage,
    isLoading,
    clearMessages,
    selectHousehold,
    selectPet,
    search,
    openProvider
  } = useMarketplaceWorkspace(enabled);
  const [currentView, setCurrentView] = useState<"home" | "search" | "results" | "provider" | "selection">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProviderServiceCategory | "">("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAvailabilityDay, setSelectedAvailabilityDay] = useState<ProviderDayOfWeek>(1);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [distanceOriginOpen, setDistanceOriginOpen] = useState(false);
  const [selectedDistanceOrigin, setSelectedDistanceOrigin] = useState<DistanceOrigin>(noDistanceOrigin);
  const [marketplaceResultsMode, setMarketplaceResultsMode] = useState<"list" | "map">("list");
  const [selectedMapProviderId, setSelectedMapProviderId] = useState<string | null>(null);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<BookingSlot | null>(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
  const [isLoadingBookingSlots, setIsLoadingBookingSlots] = useState(false);
  const [slotErrorMessage, setSlotErrorMessage] = useState<string | null>(null);
  const [mapLibreComponents, setMapLibreComponents] = useState<MapLibreComponents | null>(null);

  useEffect(() => {
    let isMounted = true;

    void import("@maplibre/maplibre-react-native")
      .then((moduleExports) => {
        if (!isMounted) {
          return;
        }

        setMapLibreComponents({
          Camera: moduleExports.Camera as unknown as ComponentType<MapLibreComponentProps>,
          MapView: moduleExports.MapView as unknown as ComponentType<MapLibreComponentProps>,
          PointAnnotation: moduleExports.PointAnnotation as unknown as ComponentType<MapLibreComponentProps>
        });
      })
      .catch(() => {
        if (isMounted) {
          setMapLibreComponents(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const selectedService = selectedProviderDetail?.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedProviderSource = useMemo(
    () => providers.find((provider) => provider.organizationId === selectedProviderDetail?.organizationId) ?? null,
    [providers, selectedProviderDetail]
  );
  const distanceOriginOptions = useMemo(
    () => [
      noDistanceOrigin,
      ...controlledDistanceZones
    ],
    []
  );
  const availableQuickCategories = useMemo(() => {
    const availableCategories = new Set(homeSnapshot?.categoryHighlights.map((highlight) => highlight.category) ?? []);
    const preferredAvailable = preferredSearchCategories.filter((item) => availableCategories.has(item.category));
    const fallbackAvailable = (homeSnapshot?.categoryHighlights ?? [])
      .filter((highlight) => !preferredAvailable.some((item) => item.category === highlight.category))
      .map((highlight) => ({
        category: highlight.category,
        helper: `${highlight.serviceCount} servicio(s)`,
        label: providerServiceCategoryLabels[highlight.category]
      }));

    return [...preferredAvailable, ...fallbackAvailable].slice(0, 6);
  }, [homeSnapshot?.categoryHighlights]);
  const MapViewComponent = mapLibreComponents?.MapView;
  const MapCamera = mapLibreComponents?.Camera;
  const MapPointAnnotation = mapLibreComponents?.PointAnnotation;
  const activeFilterLabels = [
    selectedCategory ? providerServiceCategoryLabels[selectedCategory] : null,
    selectedCity || null,
    selectedSpecies ? formatSpeciesLabel(selectedSpecies) : null,
    selectedDistanceOrigin.type === "none" ? null : `Distancia desde ${selectedDistanceOrigin.label}`,
    ...activeQuickFilters
  ].filter((label): label is string => Boolean(label));
  const visibleProviders = useMemo(() => {
    const today = new Date().getDay() as ProviderDayOfWeek;

    return providers.filter((provider) => {
      if (activeQuickFilters.includes("Disponible hoy") && !provider.availableDays.includes(today)) {
        return false;
      }

      return true;
    });
  }, [activeQuickFilters, providers]);
  const mapProviders = useMemo(() => visibleProviders.filter(hasProviderMapLocation), [visibleProviders]);
  const mapCenterCoordinate = useMemo(
    () => getMarketplaceMapCenter(mapProviders, selectedDistanceOrigin),
    [mapProviders, selectedDistanceOrigin]
  );
  const selectedMapProvider = useMemo(
    () => mapProviders.find((provider) => provider.organizationId === selectedMapProviderId) ?? mapProviders[0] ?? null,
    [mapProviders, selectedMapProviderId]
  );
  const searchSuggestions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const categorySuggestions = availableQuickCategories
      .filter((item) => !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery))
      .map((item) => ({ id: `category-${item.category}`, label: item.label, type: "Servicio", category: item.category as ProviderServiceCategory | null }));
    const providerSuggestions = (homeSnapshot?.featuredProviders ?? [])
      .filter((provider) => !normalizedQuery || provider.name.toLowerCase().includes(normalizedQuery) || provider.headline.toLowerCase().includes(normalizedQuery))
      .slice(0, 4)
      .map((provider) => ({ id: `provider-${provider.organizationId}`, label: provider.name, type: provider.headline, category: null }));

    return [...categorySuggestions, ...providerSuggestions].slice(0, 8);
  }, [availableQuickCategories, homeSnapshot?.featuredProviders, searchQuery]);
  const availabilityByDay = useMemo(
    () =>
      weekDays.reduce<Record<ProviderDayOfWeek, ProviderAvailabilitySlot[]>>((accumulator, day) => {
        accumulator[day] = selectedProviderDetail?.availability.filter((slot) => slot.dayOfWeek === day && slot.isActive) ?? [];
        return accumulator;
      }, {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: []
      }),
    [selectedProviderDetail]
  );
  const selectedAvailabilitySlots = availabilityByDay[selectedAvailabilityDay] ?? [];

  if (!enabled) {
    return null;
  }

  const buildFilters = (overrides: Partial<MarketplaceSearchFilters> = {}) => ({
    query: overrides.query ?? searchQuery,
    category:
      overrides.category !== undefined ? overrides.category : selectedCategory ? selectedCategory : null,
    city: overrides.city !== undefined ? overrides.city : selectedCity || null,
    species: overrides.species !== undefined ? overrides.species : selectedSpecies || null,
    nearLatitude:
      overrides.nearLatitude !== undefined
        ? overrides.nearLatitude
        : selectedDistanceOrigin.type === "none"
          ? null
          : selectedDistanceOrigin.latitude,
    nearLongitude:
      overrides.nearLongitude !== undefined
        ? overrides.nearLongitude
        : selectedDistanceOrigin.type === "none"
          ? null
          : selectedDistanceOrigin.longitude,
    maxDistanceKm: overrides.maxDistanceKm !== undefined ? overrides.maxDistanceKm : null
  });

  async function runSearch(overrides: Partial<MarketplaceSearchFilters> = {}) {
    const nextFilters = buildFilters(overrides);

    if (overrides.query !== undefined) {
      setSearchQuery(overrides.query ?? "");
    }
    if (overrides.category !== undefined) {
      setSelectedCategory((overrides.category as ProviderServiceCategory | null) ?? "");
    }
    if (overrides.city !== undefined) {
      setSelectedCity(overrides.city ?? "");
    }
    if (overrides.species !== undefined) {
      setSelectedSpecies(overrides.species ?? "");
    }
    if (overrides.nearLatitude === null || overrides.nearLongitude === null) {
      setSelectedDistanceOrigin(noDistanceOrigin);
    }

    clearMessages();
    setSelectedServiceId(null);
    setSelectedMapProviderId(null);
    await search(nextFilters);
    setCurrentView("results");
  }

  async function selectDistanceOrigin(origin: DistanceOrigin) {
    setSelectedDistanceOrigin(origin);
    await runSearch({
      nearLatitude: origin.type === "none" ? null : origin.latitude,
      nearLongitude: origin.type === "none" ? null : origin.longitude,
      maxDistanceKm: null
    });
  }

  function toggleQuickFilter(label: string) {
    setActiveQuickFilters((currentFilters) =>
      currentFilters.includes(label)
        ? currentFilters.filter((currentLabel) => currentLabel !== label)
        : [...currentFilters, label]
    );
  }

  function clearMarketplaceFilters() {
    setSelectedCategory("");
    setSelectedCity("");
    setSelectedSpecies("");
    setSelectedDistanceOrigin(noDistanceOrigin);
    setActiveQuickFilters([]);
  }

  async function handleOpenProvider(providerId: string) {
    clearMessages();
    setSelectedServiceId(null);
    setBookingSlots([]);
    setSelectedBookingSlot(null);
    setSelectedSlotDate(null);
    setSlotErrorMessage(null);
    const providerDetail = await openProvider(providerId);
    const nextAvailabilityDay = weekDays.find((day) => providerDetail.availability.some((slot) => slot.dayOfWeek === day && slot.isActive)) ?? 1;
    setSelectedAvailabilityDay(nextAvailabilityDay);
    setCurrentView("provider");
  }

  async function loadServiceBookingSlots(serviceId: string) {
    setIsLoadingBookingSlots(true);
    setSlotErrorMessage(null);
    setSelectedBookingSlot(null);

    try {
      const from = new Date();
      const to = new Date(from);
      to.setDate(to.getDate() + 21);
      const slots = await getMobileBookingsApiClient().listBookingSlots({
        serviceId,
        fromDate: formatDateOnly(from),
        toDate: formatDateOnly(to)
      });
      const firstAvailableSlot =
        slots.find((slot) => slot.status === "available" || slot.status === "low_capacity") ?? slots[0] ?? null;

      setBookingSlots(slots);
      setSelectedSlotDate(firstAvailableSlot?.slotDate ?? formatDateOnly(from));
    } catch (error) {
      setBookingSlots([]);
      setSelectedSlotDate(null);
      setSlotErrorMessage(error instanceof Error ? error.message : "No fue posible cargar horarios con cupo.");
    } finally {
      setIsLoadingBookingSlots(false);
    }
  }

  async function handleShowServiceSlots(serviceId: string) {
    setSelectedServiceId(serviceId);
    setBookingSlots([]);
    setSelectedBookingSlot(null);
    setSelectedSlotDate(null);
    setSlotErrorMessage(null);
    setCurrentView("selection");
    await loadServiceBookingSlots(serviceId);
  }

  return (
    <View style={{ gap: 20 }}>
      <Modal
        animationType="slide"
        onRequestClose={() => setFilterPanelOpen(false)}
        transparent
        visible={filterPanelOpen}
      >
        <View style={{ backgroundColor: "rgba(15,23,42,0.45)", flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              gap: 14,
              padding: 18,
              ...visualTokens.mobile.shadow
            }}
          >
            <View style={{ alignSelf: "center", backgroundColor: "rgba(15,23,42,0.12)", borderRadius: 999, height: 4, width: 44 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#1c1917", fontSize: 17, fontWeight: "900" }}>Filtrar busqueda</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 3 }}>
                  Ajusta solo lo necesario para encontrar el servicio ideal.
                </Text>
              </View>
              <Pressable accessibilityLabel="Cerrar filtros" accessibilityRole="button" onPress={() => setFilterPanelOpen(false)}>
                <Text style={{ color: colorTokens.muted, fontSize: 20, fontWeight: "900" }}>×</Text>
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Categoria de servicio</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button label="Todas" onPress={() => setSelectedCategory("")} tone={selectedCategory === "" ? "primary" : "secondary"} />
                {availableQuickCategories.map((item) => (
                  <Button
                    key={item.category}
                    label={item.label}
                    onPress={() => setSelectedCategory(item.category)}
                    tone={selectedCategory === item.category ? "primary" : "secondary"}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Zona u origen</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {distanceOriginOptions.map((origin) => {
                  const isSelected = selectedDistanceOrigin.type === origin.type && selectedDistanceOrigin.id === origin.id;

                  return (
                    <Button
                      key={`${origin.type}-${origin.id}`}
                      disabled={isLoading}
                      label={origin.label}
                      onPress={() => setSelectedDistanceOrigin(origin)}
                      tone={isSelected ? "primary" : "secondary"}
                    />
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Disponibilidad y orden</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {controlledQuickFilterLabels.map((label) => (
                  <FilterChip
                    key={label}
                    isActive={activeQuickFilters.includes(label)}
                    label={label}
                    onPress={() => toggleQuickFilter(label)}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Limpiar"
                  onPress={() => {
                    clearMarketplaceFilters();
                    setSearchQuery("");
                  }}
                  tone="secondary"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  disabled={isLoading}
                  label="Aplicar filtros"
                  onPress={() => {
                    setFilterPanelOpen(false);
                    void runSearch();
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <View
        style={{
          borderRadius: visualTokens.mobile.sectionRadius,
          borderWidth: 1,
          borderColor: colorTokens.line,
          backgroundColor: "rgba(255,255,255,0.96)",
          padding: 16,
          gap: 12,
          ...visualTokens.mobile.shadow
        }}
      >
        <View style={{ gap: 3 }}>
          <Text style={{ color: colorTokens.ink, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
            {currentView === "home" ? "Encuentra un servicio" : "Servicios para tus mascotas"}
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {isLoading && !homeSnapshot ? <Text style={{ color: colorTokens.muted }}>Preparando proveedores aprobados...</Text> : null}

          {currentView === "home" || currentView === "search" || currentView === "results" || currentView === "selection" ? null : (
          <View style={[cardStyle, { backgroundColor: "#ffffff" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: "#1c1917", fontSize: 15, fontWeight: "900" }}>
                  {selectedPet ? selectedPet.name : selectedHousehold?.name ?? "Explorar servicios"}
                </Text>
                <Text style={{ color: colorTokens.muted, fontSize: 12 }}>
                  {selectedPet ? "Mascota seleccionada" : selectedHousehold ? "Hogar completo" : "Sin contexto activo"}
                </Text>
              </View>
              <StatusChip label={currentView} tone="active" />
            </View>
            <View style={{ gap: 8 }}>
              <SectionSelector
                count={homeSnapshot?.categoryHighlights.length ?? 0}
                isActive={false}
                label="Explorar"
                onPress={() => setCurrentView("home")}
                subtitle="Categorias y filtros"
              />
              <SectionSelector
                count={providers.length}
                isActive={false}
                label="Resultados"
                onPress={() => setCurrentView("results")}
                subtitle="Proveedores encontrados"
              />
              <SectionSelector
                count={selectedProviderDetail?.services.length ?? 0}
                isActive
                label="Proveedor"
                onPress={() => selectedProviderDetail ? setCurrentView("provider") : setCurrentView("home")}
                subtitle="Servicios y disponibilidad"
              />
            </View>
          </View>
          )}

          {currentView === "home" ? (
            <>
              <View style={[cardStyle, { backgroundColor: "#fbfaf7", borderColor: "rgba(15,23,42,0.06)", gap: 14 }]}>
                <SearchShell
                  onChangeText={setSearchQuery}
                  onFocus={() => setCurrentView("search")}
                  onOpenFilters={() => setFilterPanelOpen(true)}
                  onSubmit={() => void runSearch()}
                  value={searchQuery}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <FilterChip
                    isActive={activeQuickFilters.includes("Disponible hoy")}
                    label="Hoy"
                    onPress={() => toggleQuickFilter("Disponible hoy")}
                  />
                  <FilterChip
                    isActive={selectedCategory === "walking"}
                    label="Paseo"
                    onPress={() => void runSearch({ category: "walking" })}
                  />
                  <FilterChip
                    isActive={selectedSpecies.toLowerCase() === "perros"}
                    label="Perros"
                    onPress={() => setSelectedSpecies(selectedSpecies.toLowerCase() === "perros" ? "" : "perros")}
                  />
                  <FilterChip
                    isActive={selectedDistanceOrigin.type !== "none"}
                    label={selectedDistanceOrigin.type === "none" ? "Zona" : selectedDistanceOrigin.label}
                    onPress={() => setDistanceOriginOpen((currentValue) => !currentValue)}
                  />
                  <FilterChip isActive={false} label="Ordenar" onPress={() => setFilterPanelOpen(true)} />
                </View>

                {distanceOriginOpen ? (
                  <View style={{ borderRadius: 18, backgroundColor: "rgba(240,253,250,0.72)", padding: 10, gap: 8 }}>
                    <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>Origen para distancia</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {distanceOriginOptions.map((origin) => {
                        const isSelected = selectedDistanceOrigin.type === origin.type && selectedDistanceOrigin.id === origin.id;

                        return (
                          <Button
                            key={`${origin.type}-${origin.id}`}
                            disabled={isLoading}
                            label={origin.label}
                            onPress={() => void selectDistanceOrigin(origin)}
                            tone={isSelected ? "primary" : "secondary"}
                          />
                        );
                      })}
                    </View>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                      Zonas controladas; no usamos GPS ni publicamos tu direccion.
                    </Text>
                  </View>
                ) : null}

                {availableQuickCategories.length ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: "#1c1917", fontSize: 15, fontWeight: "900" }}>Categorias rapidas</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                      {availableQuickCategories.map((item) => (
                        <Pressable
                          accessibilityRole="button"
                          key={item.category}
                          onPress={() => void runSearch({ category: item.category })}
                          style={{
                            backgroundColor: selectedCategory === item.category ? "rgba(0,151,143,0.14)" : "#ffffff",
                            borderColor: selectedCategory === item.category ? "rgba(0,151,143,0.42)" : "rgba(15,23,42,0.08)",
                            borderRadius: 18,
                            borderWidth: 1,
                            minWidth: "30%",
                            padding: 10,
                            gap: 4
                          }}
                        >
                          <Text style={{ color: colorTokens.accentDark, fontSize: 18, fontWeight: "900" }}>•</Text>
                          <Text style={{ color: "#1c1917", fontSize: 11, fontWeight: "900" }}>{item.label}</Text>
                          <Text style={{ color: colorTokens.muted, fontSize: 9, fontWeight: "700" }}>{item.helper}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {(activeFilterLabels.length ? activeFilterLabels : ["Busca por servicio, zona o proveedor"]).map((label) => (
                    <View
                      key={label}
                      style={{
                        borderRadius: 999,
                        backgroundColor: activeFilterLabels.length ? "rgba(15,118,110,0.1)" : "rgba(100,116,139,0.08)",
                        paddingHorizontal: 9,
                        paddingVertical: 5
                      }}
                    >
                      <Text style={{ color: activeFilterLabels.length ? colorTokens.accentDark : colorTokens.muted, fontSize: 10, fontWeight: "800" }}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Button disabled={isLoading} label="Buscar proveedores" onPress={() => void runSearch()} />
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Contexto</Text>
                <StatusChip label={selectedPet ? "mascota seleccionada" : "hogar completo"} tone="neutral" />
                {householdSnapshot?.households.length ? (
                  <>
                    {householdSnapshot.households.map((household) => (
                      <Pressable
                        key={household.id}
                        onPress={() => void selectHousehold(household.id)}
                        style={[
                          inputStyle,
                          {
                            backgroundColor:
                              household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "#fffdf8"
                          }
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917" }}>{household.name}</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>
                          {household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}
                        </Text>
                      </Pressable>
                    ))}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Button label="Todas las mascotas" onPress={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
                      {pets.map((pet) => (
                        <Button key={pet.id} label={pet.name} onPress={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"} />
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>
                    Puedes explorar proveedores antes de completar hogar y mascotas.
                  </Text>
                )}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Proveedores destacados</Text>
                {homeSnapshot?.featuredProviders.length ? homeSnapshot.featuredProviders.map((provider) => (
                  <ProviderVisualCard
                    ctaLabel="Ver servicios"
                    key={provider.organizationId}
                    onPress={() => void handleOpenProvider(provider.organizationId)}
                    provider={provider}
                    variant="default"
                  />
                )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay proveedores publicos aprobados. Cuando un proveedor complete su aprobacion, aparecera aqui.</Text>}
              </View>
            </>
          ) : null}

          {currentView === "search" ? (
            <View style={[cardStyle, { gap: 14 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable accessibilityLabel="Volver a buscar" accessibilityRole="button" onPress={() => setCurrentView("home")}>
                  <Text style={{ color: colorTokens.accentDark, fontSize: 20, fontWeight: "900" }}>‹</Text>
                </Pressable>
                <Text style={{ color: "#1c1917", flex: 1, fontSize: 15, fontWeight: "900", textAlign: "center" }}>Buscar servicios</Text>
                <Pressable accessibilityLabel="Abrir filtros" accessibilityRole="button" onPress={() => setFilterPanelOpen(true)}>
                  <Text style={{ color: colorTokens.accentDark, fontSize: 16, fontWeight: "900" }}>☷</Text>
                </Pressable>
              </View>
              <SearchShell
                onChangeText={setSearchQuery}
                onFocus={() => undefined}
                onOpenFilters={() => setFilterPanelOpen(true)}
                onSubmit={() => void runSearch()}
                value={searchQuery}
              />

              {!searchQuery.trim() ? (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Busquedas recientes</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "800" }}>Visual</Text>
                  </View>
                  {controlledRecentSearches.map((recentSearch) => (
                    <Pressable
                      accessibilityRole="button"
                      key={recentSearch}
                      onPress={() => {
                        setSearchQuery(recentSearch);
                        void runSearch({ query: recentSearch });
                      }}
                      style={{
                        alignItems: "center",
                        borderBottomColor: "rgba(15,23,42,0.06)",
                        borderBottomWidth: 1,
                        flexDirection: "row",
                        gap: 10,
                        paddingVertical: 10
                      }}
                    >
                      <Text style={{ color: colorTokens.muted, fontSize: 14 }}>○</Text>
                      <Text style={{ color: "#1c1917", flex: 1, fontSize: 12, fontWeight: "700" }}>{recentSearch}</Text>
                      <Text style={{ color: colorTokens.muted, fontSize: 13 }}>×</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={{ gap: 10 }}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>
                  {searchQuery.trim() ? "Sugerencias" : "Servicios populares"}
                </Text>
                <View style={{ gap: 4 }}>
                  {searchSuggestions.map((suggestion) => (
                    <Pressable
                      accessibilityRole="button"
                      key={suggestion.id}
                      onPress={() => {
                        if (suggestion.category) {
                          void runSearch({ category: suggestion.category, query: searchQuery });
                          return;
                        }

                        setSearchQuery(suggestion.label);
                        void runSearch({ query: suggestion.label });
                      }}
                      style={{ alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 9 }}
                    >
                      <Text style={{ color: colorTokens.accentDark, fontSize: 14 }}>•</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>{suggestion.label}</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10 }}>{suggestion.type}</Text>
                      </View>
                      <Text style={{ color: colorTokens.muted, fontSize: 16 }}>›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Filtros rapidos</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {controlledQuickFilterLabels.map((label) => (
                    <FilterChip
                      key={label}
                      isActive={activeQuickFilters.includes(label)}
                      label={label}
                      onPress={() => toggleQuickFilter(label)}
                    />
                  ))}
                </View>
              </View>
              <Button disabled={isLoading} label="Ver resultados" onPress={() => void runSearch()} />
            </View>
          ) : null}

          {currentView === "results" ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: "#1c1917" }}>Resultados de busqueda</Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 12 }}>
                    {visibleProviders.length} proveedor(es) disponibles
                  </Text>
                </View>
                <StatusChip label={`${visibleProviders.length} resultado(s)`} tone="neutral" />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button label="Modificar busqueda" onPress={() => setCurrentView("search")} tone="secondary" />
                <Button label="Lista" onPress={() => setMarketplaceResultsMode("list")} tone={marketplaceResultsMode === "list" ? "primary" : "secondary"} />
                <Button label="Mapa" onPress={() => setMarketplaceResultsMode("map")} tone={marketplaceResultsMode === "map" ? "primary" : "secondary"} />
              </View>
              {marketplaceResultsMode === "map" ? (
                <View style={{ borderRadius: 18, backgroundColor: "rgba(247,250,252,0.92)", padding: 10, gap: 10, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: "#1c1917", fontSize: 13, fontWeight: "900" }}>Mapa de proveedores</Text>
                      <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 14 }}>
                        Mostramos la ubicacion publica exacta declarada por cada proveedor. No usamos GPS ni direcciones privadas del owner.
                      </Text>
                    </View>
                    <StatusChip label={`${mapProviders.length} con ubicacion`} tone={mapProviders.length ? "active" : "neutral"} />
                  </View>
                  {mapProviders.length && MapViewComponent && MapCamera && MapPointAnnotation ? (
                    <>
                      <View style={{ borderRadius: 18, borderColor: "rgba(15,23,42,0.08)", borderWidth: 1, height: 280, overflow: "hidden" }}>
                        <MapViewComponent
                          attributionEnabled
                          logoEnabled={false}
                          mapStyle={marketplaceMapStyleUrl}
                          rotateEnabled={false}
                          style={{ flex: 1 }}
                        >
                          <MapCamera centerCoordinate={mapCenterCoordinate} zoomLevel={selectedDistanceOrigin.type === "none" ? 9 : 11} />
                          {mapProviders.map((provider) => {
                            const isSelected = selectedMapProvider?.organizationId === provider.organizationId;

                            return (
                              <MapPointAnnotation
                                key={provider.organizationId}
                                coordinate={getProviderMapCoordinate(provider)}
                                id={`provider-${provider.organizationId}`}
                                onSelected={() => setSelectedMapProviderId(provider.organizationId)}
                              >
                                <View
                                  style={{
                                    alignItems: "center",
                                    backgroundColor: isSelected ? colorTokens.accentDark : "#ffffff",
                                    borderColor: isSelected ? "#ffffff" : "rgba(0,122,107,0.28)",
                                    borderRadius: 18,
                                    borderWidth: 2,
                                    height: 36,
                                    justifyContent: "center",
                                    width: 36,
                                    ...visualTokens.mobile.softShadow
                                  }}
                                >
                                  <Text style={{ color: isSelected ? "#ffffff" : colorTokens.accentDark, fontSize: 10, fontWeight: "900" }}>
                                    {getProviderInitials(provider.name)}
                                  </Text>
                                </View>
                              </MapPointAnnotation>
                            );
                          })}
                        </MapViewComponent>
                      </View>
                      {selectedMapProvider ? (
                        <MarketplaceProviderMiniCard provider={selectedMapProvider} onOpenProvider={(providerId) => void handleOpenProvider(providerId)} />
                      ) : null}
                    </>
                  ) : (
                    <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                      {mapProviders.length
                        ? "El mapa requiere reconstruir la app mobile para registrar el modulo nativo de MapLibre. Puedes seguir usando la lista."
                        : "No hay proveedores con ubicacion publica en estos resultados. Puedes seguir usando la lista."}
                    </Text>
                  )}
                  <Text style={{ color: colorTokens.muted, fontSize: 9, lineHeight: 13 }}>
                    Vista piloto con MapLibre y estilo demo. Para piloto ampliado conviene configurar proveedor de tiles propio/controlado.
                  </Text>
                </View>
              ) : null}
              {visibleProviders.length && marketplaceResultsMode === "list" ? visibleProviders.map((provider, index) => (
                <ProviderVisualCard
                  ctaLabel="Ver servicios"
                  key={provider.organizationId}
                  onPress={() => void handleOpenProvider(provider.organizationId)}
                  provider={provider}
                  variant={index === 0 ? "featured" : "default"}
                />
              )) : null}
              {!visibleProviders.length ? (
                <View style={{ alignItems: "center", backgroundColor: "rgba(247,250,252,0.92)", borderRadius: 18, gap: 8, padding: 18 }}>
                  <Text style={{ color: "#1c1917", fontSize: 15, fontWeight: "900", textAlign: "center" }}>
                    No encontramos servicios con esos filtros
                  </Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17, textAlign: "center" }}>
                    Prueba otra categoria, zona o fecha.
                  </Text>
                  <Button
                    label="Limpiar busqueda"
                    onPress={() => {
                      clearMarketplaceFilters();
                      setSearchQuery("");
                      void runSearch({ query: "", category: null, city: null, species: null, nearLatitude: null, nearLongitude: null });
                    }}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {currentView === "provider" && selectedProviderDetail ? (
            <>
              <View style={cardStyle}>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View style={{ alignItems: "center", backgroundColor: "rgba(20,184,166,0.12)", borderRadius: 26, height: 52, justifyContent: "center", width: 52 }}>
                    {selectedProviderDetail.avatarUrl ? (
                      <Image source={{ uri: selectedProviderDetail.avatarUrl }} style={{ borderRadius: 26, height: 52, width: 52 }} />
                    ) : (
                      <Text style={{ color: colorTokens.accentDark, fontSize: 13, fontWeight: "900" }}>{getProviderInitials(selectedProviderDetail.name)}</Text>
                    )}
                  </View>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "900", color: "#1c1917" }}>{selectedProviderDetail.name}</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{selectedProviderDetail.city}</Text>
                  </View>
                  <StatusChip label={selectedProviderSource ? "desde resultados" : "destacados"} tone="active" />
                </View>
                <ProviderLocationSummary provider={selectedProviderSource ?? selectedProviderDetail} />
                <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>{selectedProviderDetail.headline}</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>{selectedProviderDetail.bio}</Text>
                <Button label="Volver a resultados" onPress={() => setCurrentView("results")} tone="secondary" />
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Servicios</Text>
                {selectedProviderDetail.services.map((service) => (
                  <View key={service.id} style={inputStyle}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", flex: 1 }}>{service.name}</Text>
                      <StatusChip label={providerServiceCategoryLabels[service.category]} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>{service.shortDescription ?? "Todavia no hay una descripcion publica."}</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>
                      Duracion: {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                    </Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>
                      Precio: {formatMoney(service.basePriceCents, service.currencyCode)} - {service.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                      <Button
                        disabled={isLoadingBookingSlots}
                        label="Ver horarios con cupo"
                        onPress={() => void handleShowServiceSlots(service.id)}
                      />
                      <Button
                        label="Seleccionar servicio"
                        onPress={() => {
                          setSelectedServiceId(service.id);
                          setBookingSlots([]);
                          setSelectedBookingSlot(null);
                          setSelectedSlotDate(null);
                          setSlotErrorMessage(null);
                          setCurrentView("selection");
                        }}
                        tone="secondary"
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={[cardStyle, { gap: 10 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Disponibilidad</Text>
                  <StatusChip label="Agenda semanal" tone="neutral" />
                </View>
                {selectedProviderDetail.availability.length ? (
                  <>
                    <View
                      style={{
                        borderRadius: 18,
                        backgroundColor: "#ffffff",
                        borderColor: "rgba(15,23,42,0.08)",
                        borderWidth: 1,
                        padding: 10,
                        gap: 8
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Semana publicada</Text>
                        <Text style={{ color: colorTokens.muted, fontSize: 10, fontWeight: "800" }}>Ver agenda</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {weekDays.map((day) => {
                          const daySlots = availabilityByDay[day] ?? [];
                          const isSelected = selectedAvailabilityDay === day;
                          const hasSlots = daySlots.length > 0;

                          return (
                            <Pressable
                              key={day}
                              disabled={!hasSlots}
                              onPress={() => setSelectedAvailabilityDay(day)}
                              style={{
                                alignItems: "center",
                                backgroundColor: isSelected ? colorTokens.accent : hasSlots ? "rgba(15,118,110,0.09)" : "rgba(148,163,184,0.08)",
                                borderRadius: 999,
                                flex: 1,
                                gap: 3,
                                minHeight: 44,
                                justifyContent: "center",
                                opacity: hasSlots ? 1 : 0.5,
                                paddingVertical: 7
                              }}
                            >
                              <Text style={{ color: isSelected ? "#ffffff" : "#64748b", fontSize: 8, fontWeight: "900" }}>
                                {weekDayShortLabels[day]}
                              </Text>
                              <Text style={{ color: isSelected ? "#ffffff" : hasSlots ? "#0f766e" : "#94a3b8", fontSize: 11, fontWeight: "900" }}>
                                {daySlots.length}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>
                        {providerDayOfWeekLabels[selectedAvailabilityDay]}
                      </Text>
                      <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>
                        {selectedAvailabilitySlots.length} horario(s)
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {selectedAvailabilitySlots.length ? selectedAvailabilitySlots.map((slot) => (
                        <View
                          key={slot.id}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(15,118,110,0.2)",
                            backgroundColor: "rgba(15,118,110,0.07)",
                            minWidth: "47%",
                            paddingHorizontal: 10,
                            paddingVertical: 9
                          }}
                        >
                          <Text style={{ color: "#1c1917", fontSize: 11, fontWeight: "900", textAlign: "center" }}>
                            {formatTimeRange(slot.startsAt, slot.endsAt)}
                          </Text>
                          <Text style={{ color: colorTokens.accentDark, fontSize: 9, fontWeight: "800", marginTop: 4, textAlign: "center" }}>
                            Disponible
                          </Text>
                        </View>
                      )) : (
                        <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>
                          No hay horarios publicados para este dia.
                        </Text>
                      )}
                    </View>
                  </>
                ) : selectedProviderDetail.services.length ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>
                      La agenda se consulta por servicio. Elige una opcion para ver horarios reales con cupo.
                    </Text>
                    <View style={{ gap: 8 }}>
                      {selectedProviderDetail.services.map((service) => (
                        <View
                          key={`availability-service-${service.id}`}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(15,118,110,0.16)",
                            backgroundColor: "rgba(15,118,110,0.06)",
                            padding: 10,
                            gap: 8
                          }}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                            <View style={{ flex: 1, gap: 3 }}>
                              <Text numberOfLines={2} style={{ color: "#1c1917", fontSize: 11, fontWeight: "900", lineHeight: 14 }}>
                                {service.name}
                              </Text>
                              <Text style={{ color: colorTokens.muted, fontSize: 10, lineHeight: 13 }}>
                                {service.durationMinutes ? `${service.durationMinutes} min` : "Horario flexible"} - {formatMoney(service.basePriceCents, service.currencyCode)}
                              </Text>
                            </View>
                            <StatusChip label={providerServiceCategoryLabels[service.category]} tone="neutral" />
                          </View>
                          <Button
                            disabled={isLoadingBookingSlots}
                            label="Ver cupos"
                            onPress={() => void handleShowServiceSlots(service.id)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>Todavia no hay servicios publicados para consultar cupos.</Text>
                )}
              </View>
            </>
          ) : null}

          {currentView === "selection" && selectedProviderDetail && selectedService ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917", flex: 1 }}>Prepara tu reserva</Text>
                <StatusChip label="lista para reserva" tone="active" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917" }}>{selectedProviderDetail.name}</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11 }}>{selectedService.name}</Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                {providerServiceCategoryLabels[selectedService.category]}
                {selectedService.durationMinutes ? ` - ${selectedService.durationMinutes} min` : ""}
              </Text>
              <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                {formatMoney(selectedService.basePriceCents, selectedService.currencyCode)} - {selectedService.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
              </Text>
              <View style={inputStyle}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917" }}>Hogar</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>{selectedHousehold?.name ?? "Sin contexto de hogar seleccionado"}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917" }}>Mascota</Text>
                <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>{selectedPet?.name ?? "Todas las mascotas del hogar"}</Text>
              </View>
              <View style={[cardStyle, { backgroundColor: "rgba(247,250,252,0.92)", gap: 10 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ color: "#1c1917", flex: 1, fontSize: 13, fontWeight: "900" }}>Horarios con cupo</Text>
                  <StatusChip label={selectedBookingSlot ? "horario listo" : `${bookingSlots.length} slot(s)`} tone={selectedBookingSlot ? "active" : "neutral"} />
                </View>
                {slotErrorMessage ? <Text style={{ color: "#991b1b", fontSize: 11, fontWeight: "700" }}>{slotErrorMessage}</Text> : null}
                {!bookingSlots.length && !isLoadingBookingSlots ? (
                  <Button
                    disabled={isLoadingBookingSlots}
                    label="Ver horarios con cupo"
                    onPress={() => void loadServiceBookingSlots(selectedService.id)}
                  />
                ) : null}
                {bookingSlots.length || isLoadingBookingSlots ? (
                  <BookingSlotsCalendar
                    isLoading={isLoadingBookingSlots}
                    onSelectDate={(slotDate) => {
                      setSelectedSlotDate(slotDate);
                      setSelectedBookingSlot(null);
                    }}
                    onSelectSlot={setSelectedBookingSlot}
                    selectedDate={selectedSlotDate}
                    selectedSlot={selectedBookingSlot}
                    slots={bookingSlots}
                  />
                ) : null}
              </View>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button
                  label="Abrir vista previa de la reserva"
                  onPress={() => {
                    onSelectBookingService?.({
                      householdId: selectedHouseholdId,
                      petId: selectedPetId,
                      providerId: selectedProviderDetail.organizationId,
                      serviceId: selectedService.id,
                      providerName: selectedProviderDetail.name,
                      serviceName: selectedService.name,
                      serviceDurationMinutes: selectedService.durationMinutes,
                      serviceBookingMode: selectedService.bookingMode,
                      serviceBasePriceCents: selectedService.basePriceCents,
                      serviceCurrencyCode: selectedService.currencyCode,
                      serviceCancellationWindowHours: selectedService.cancellationWindowHours,
                      selectedBookingSlot,
                      selectedAt: new Date().toISOString()
                    });
                  }}
                />
                <Button label="Volver al proveedor" onPress={() => setCurrentView("provider")} tone="secondary" />
                <Button
                  label="Buscar de nuevo"
                  onPress={() => {
                    setSelectedServiceId(null);
                    setCurrentView("results");
                  }}
                  tone="secondary"
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}







