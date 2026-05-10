import { formatHouseholdPermissions, providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type {
  BookingSlot,
  MarketplaceProviderSummary,
  MarketplaceSearchFilters,
  MarketplaceServiceSelection,
  ProviderAvailabilitySlot,
  ProviderDayOfWeek,
  ProviderLocationPrecision,
  ProviderServiceCategory
} from "@pet/types";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

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

const providerLocationPrecisionLabels: Record<ProviderLocationPrecision, string> = {
  exact: "Ubicacion exacta",
  approximate: "Ubicacion aproximada",
  city: "Zona declarada por ciudad"
};

function formatProviderDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== "number") {
    return null;
  }

  return `Aprox. ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
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
        {providerLocationPrecisionLabels[publicLocation.locationPrecision]}
      </Text>
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
  const [currentView, setCurrentView] = useState<"home" | "results" | "provider" | "selection">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProviderServiceCategory | "">("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAvailabilityDay, setSelectedAvailabilityDay] = useState<ProviderDayOfWeek>(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<BookingSlot | null>(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
  const [isLoadingBookingSlots, setIsLoadingBookingSlots] = useState(false);
  const [slotErrorMessage, setSlotErrorMessage] = useState<string | null>(null);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const selectedService = selectedProviderDetail?.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedProviderSource = useMemo(
    () => providers.find((provider) => provider.organizationId === selectedProviderDetail?.organizationId) ?? null,
    [providers, selectedProviderDetail]
  );
  const activeFilterLabels = [
    selectedCategory ? providerServiceCategoryLabels[selectedCategory] : null,
    selectedCity || null,
    selectedSpecies ? formatSpeciesLabel(selectedSpecies) : null
  ].filter((label): label is string => Boolean(label));
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
    species: overrides.species !== undefined ? overrides.species : selectedSpecies || null
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

    clearMessages();
    setSelectedServiceId(null);
    await search(nextFilters);
    setCurrentView("results");
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
          <Text style={{ color: colorTokens.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>
            Buscar
          </Text>
          <Text style={{ color: colorTokens.ink, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
            {currentView === "home" ? "Encuentra un servicio" : "Servicios para tus mascotas"}
          </Text>
          <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 16 }}>
            Explora proveedores aprobados y prepara la reserva desde el contexto de tu hogar.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {isLoading && !homeSnapshot ? <Text style={{ color: colorTokens.muted }}>Preparando proveedores aprobados...</Text> : null}

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
              <StatusChip label={currentView === "home" ? "explorar" : currentView} tone="active" />
            </View>
            <View style={{ gap: 8 }}>
              <SectionSelector
                count={homeSnapshot?.categoryHighlights.length ?? 0}
                isActive={currentView === "home"}
                label="Explorar"
                onPress={() => setCurrentView("home")}
                subtitle="Categorias y filtros"
              />
              <SectionSelector
                count={providers.length}
                isActive={currentView === "results"}
                label="Resultados"
                onPress={() => setCurrentView("results")}
                subtitle="Proveedores encontrados"
              />
              <SectionSelector
                count={selectedProviderDetail?.services.length ?? 0}
                isActive={currentView === "provider" || currentView === "selection"}
                label="Proveedor"
                onPress={() => selectedProviderDetail ? setCurrentView("provider") : setCurrentView("home")}
                subtitle="Servicios y disponibilidad"
              />
            </View>
          </View>

          {currentView === "home" ? (
            <>
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
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Busqueda y filtros</Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TextInput
                    onChangeText={setSearchQuery}
                    placeholder="Buscar proveedor o servicio"
                    placeholderTextColor="#a8a29e"
                    style={[inputStyle, { flex: 1, fontSize: 12 }]}
                    value={searchQuery}
                  />
                  <Button disabled={isLoading} label="Buscar" onPress={() => void runSearch()} />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {(activeFilterLabels.length ? activeFilterLabels : ["Sin filtros activos"]).map((label) => (
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
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label={filtersOpen ? "Ocultar filtros" : "Ajustar filtros"} onPress={() => setFiltersOpen((currentValue) => !currentValue)} tone="secondary" />
                  {activeFilterLabels.length ? (
                    <Button
                      label="Limpiar"
                      onPress={() => {
                        setSelectedCategory("");
                        setSelectedCity("");
                        setSelectedSpecies("");
                      }}
                      tone="secondary"
                    />
                  ) : null}
                </View>
                {filtersOpen ? (
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(247,250,252,0.92)", padding: 10, gap: 10 }}>
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Categoria</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Button label="Todas" onPress={() => setSelectedCategory("")} tone={selectedCategory === "" ? "primary" : "secondary"} />
                        {homeSnapshot?.categoryHighlights.map((highlight) => (
                          <Button
                            key={highlight.category}
                            label={providerServiceCategoryLabels[highlight.category]}
                            onPress={() => setSelectedCategory(highlight.category)}
                            tone={selectedCategory === highlight.category ? "primary" : "secondary"}
                          />
                        ))}
                      </View>
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Ciudad</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Button label="Todas" onPress={() => setSelectedCity("")} tone={selectedCity === "" ? "primary" : "secondary"} />
                        {homeSnapshot?.cityHighlights.map((city) => (
                          <Button key={city} label={city} onPress={() => setSelectedCity(city)} tone={selectedCity === city ? "primary" : "secondary"} />
                        ))}
                      </View>
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "900" }}>Especie</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Button label="Todas" onPress={() => setSelectedSpecies("")} tone={selectedSpecies === "" ? "primary" : "secondary"} />
                        {homeSnapshot?.speciesHighlights.map((species) => (
                          <Button
                            key={species}
                            label={formatSpeciesLabel(species)}
                            onPress={() => setSelectedSpecies(species)}
                            tone={selectedSpecies === species ? "primary" : "secondary"}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}
                <Button disabled={isLoading} label="Buscar proveedores" onPress={() => void runSearch()} />
              </View>

              <View style={cardStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917", flex: 1 }}>Explora por categoria</Text>
                  <StatusChip label={homeSnapshot?.featuredProviders.length ? `${homeSnapshot.featuredProviders.length} destacados` : "catalogo vacio"} tone="active" />
                </View>
                <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>
                  Elige una categoria o proveedor destacado para preparar una reserva con el contexto de hogar y mascota.
                </Text>
                {homeSnapshot?.categoryHighlights.map((highlight) => (
                  <Pressable key={highlight.category} onPress={() => void runSearch({ category: highlight.category })} style={inputStyle}>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917" }}>{providerServiceCategoryLabels[highlight.category]}</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>
                      {highlight.providerCount} proveedor(es) - {highlight.serviceCount} servicio(s)
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917" }}>Proveedores destacados</Text>
                {homeSnapshot?.featuredProviders.length ? homeSnapshot.featuredProviders.map((provider) => (
                  <Pressable key={provider.organizationId} onPress={() => void handleOpenProvider(provider.organizationId)} style={inputStyle}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <View style={{ alignItems: "center", backgroundColor: "rgba(20,184,166,0.12)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 }}>
                        {provider.avatarUrl ? (
                          <Image source={{ uri: provider.avatarUrl }} style={{ borderRadius: 22, height: 44, width: 44 }} />
                        ) : (
                          <Text style={{ color: colorTokens.accentDark, fontSize: 12, fontWeight: "900" }}>{getProviderInitials(provider.name)}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", flex: 1 }}>{provider.name}</Text>
                          <StatusChip label={`${provider.serviceCount} servicio(s)`} tone="neutral" />
                        </View>
                        <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>{provider.city}</Text>
                      </View>
                    </View>
                    <ProviderLocationSummary provider={provider} />
                    <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>{provider.headline}</Text>
                    <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>
                      {provider.categories.map((category) => providerServiceCategoryLabels[category]).join(", ")}
                    </Text>
                  </Pressable>
                )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay proveedores publicos aprobados. Cuando un proveedor complete su aprobacion, aparecera aqui.</Text>}
              </View>
            </>
          ) : null}

          {currentView === "results" ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1c1917", flex: 1 }}>Resultados</Text>
                <StatusChip label={`${providers.length} resultado(s)`} tone="neutral" />
              </View>
              <Button label="Modificar busqueda" onPress={() => setCurrentView("home")} tone="secondary" />
              {providers.length ? providers.map((provider) => (
                <View key={provider.organizationId} style={inputStyle}>
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <View style={{ alignItems: "center", backgroundColor: "rgba(20,184,166,0.12)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 }}>
                      {provider.avatarUrl ? (
                        <Image source={{ uri: provider.avatarUrl }} style={{ borderRadius: 22, height: 44, width: 44 }} />
                      ) : (
                        <Text style={{ color: colorTokens.accentDark, fontSize: 12, fontWeight: "900" }}>{getProviderInitials(provider.name)}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 12, fontWeight: "900", color: "#1c1917", flex: 1 }}>{provider.name}</Text>
                        <StatusChip label={`${provider.serviceCount} servicio(s)`} tone="neutral" />
                      </View>
                      <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>{provider.city}</Text>
                    </View>
                  </View>
                  <ProviderLocationSummary provider={provider} />
                  <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>{provider.headline}</Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 11, marginTop: 4 }}>
                    Especies: {provider.speciesServed.map((species) => formatSpeciesLabel(species)).join(", ") || "No especificadas"}
                  </Text>
                  <View style={{ marginTop: 10 }}>
                    <Button label="Ver proveedor" onPress={() => void handleOpenProvider(provider.organizationId)} />
                  </View>
                </View>
              )) : <Text style={{ color: colorTokens.muted }}>Ningun proveedor publico coincide con la busqueda y los filtros actuales.</Text>}
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
                <ProviderLocationSummary provider={selectedProviderDetail} />
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
                ) : <Text style={{ color: colorTokens.muted }}>Todavia no hay bloques publicos de disponibilidad.</Text>}
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
              <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>
                Esta seleccion transfiere el proveedor, el servicio, la mascota opcional y el horario elegido directamente al espacio de Reservas.
              </Text>
              <View style={[cardStyle, { backgroundColor: "rgba(247,250,252,0.92)", gap: 10 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ color: "#1c1917", flex: 1, fontSize: 13, fontWeight: "900" }}>Horarios con cupo</Text>
                  <StatusChip label={selectedBookingSlot ? "horario listo" : `${bookingSlots.length} slot(s)`} tone={selectedBookingSlot ? "active" : "neutral"} />
                </View>
                <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                  Marketplace solo consulta y prepara el contexto. La reserva se crea despues en Reservas.
                </Text>
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







