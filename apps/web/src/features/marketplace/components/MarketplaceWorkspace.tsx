"use client";

import { formatHouseholdPermissions, providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";
import type {
  MarketplaceProviderSummary,
  MarketplaceSearchFilters,
  MarketplaceServiceSelection,
  ProviderDayOfWeek,
  ProviderServiceCategory
} from "@pet/types";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useMarketplaceWorkspace } from "../hooks/useMarketplaceWorkspace";

const cardStyle: CSSProperties = {
  borderRadius: "18px",
  background: "rgba(247,242,231,0.78)",
  padding: "14px",
  display: "grid",
  gap: "10px",
  border: "1px solid rgba(28,25,23,0.06)"
};

const inputStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(28,25,23,0.14)",
  padding: "9px 11px",
  background: "#fffdf8",
  fontSize: "11px"
};

const marketplacePanelStyle: CSSProperties = {
  ...cardStyle,
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(15,118,110,0.12)",
  boxShadow: "0 16px 42px rgba(15,23,42,0.06)"
};

const marketplaceRailStyle: CSSProperties = {
  ...cardStyle,
  background: "rgba(247,242,231,0.9)",
  border: "1px solid rgba(15,118,110,0.14)"
};

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

type DistanceOrigin =
  | { type: "none"; id: "none"; label: string; detail: string; latitude: null; longitude: null }
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

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

function formatProviderDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== "number") {
    return null;
  }

  return `Aprox. ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
}

function Button({
  children,
  disabled,
  onClick,
  tone = "primary"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      style={{
        borderRadius: "999px",
        border: tone === "primary" ? "none" : "1px solid rgba(15,118,110,0.24)",
        background: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.86)",
        color: tone === "primary" ? "#f8fafc" : "#0f766e",
        padding: "8px 12px",
        fontSize: "10px",
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
    </button>
  );
}

function FilterChip({ isActive, label, onClick }: { isActive: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        borderRadius: "999px",
        border: isActive ? "1px solid #0f766e" : "1px solid rgba(28,25,23,0.12)",
        background: isActive ? "#0f766e" : "#ffffff",
        color: isActive ? "#ffffff" : "#0f766e",
        cursor: "pointer",
        fontSize: "10px",
        fontWeight: 800,
        padding: "8px 11px"
      }}
    >
      {label}
    </button>
  );
}

function SearchShell({
  onClear,
  onFocus,
  onOpenFilters,
  onSubmit,
  setValue,
  value
}: {
  onClear: () => void;
  onFocus: () => void;
  onOpenFilters: () => void;
  onSubmit: () => void;
  setValue: (value: string) => void;
  value: string;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        background: "#ffffff",
        border: "1px solid rgba(15,118,110,0.16)",
        borderRadius: "16px",
        display: "flex",
        gap: "8px",
        minHeight: "44px",
        padding: "0 10px"
      }}
    >
      <span style={{ color: "#0f766e", fontSize: "12px", fontWeight: 900 }}>Buscar</span>
      <input
        onChange={(event) => setValue(event.target.value)}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSubmit();
          }
        }}
        placeholder="Que servicio necesitas para tu mascota?"
        style={{ border: "none", outline: "none", flex: 1, fontSize: "12px", minHeight: "40px" }}
        value={value}
      />
      {value ? (
        <button onClick={onClear} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#78716c", fontSize: "16px", fontWeight: 800 }} type="button">
          x
        </button>
      ) : null}
      <button
        onClick={onOpenFilters}
        style={{
          border: "1px solid rgba(15,118,110,0.22)",
          borderRadius: "12px",
          background: "#ffffff",
          color: "#0f766e",
          cursor: "pointer",
          fontSize: "10px",
          fontWeight: 900,
          minHeight: "30px",
          padding: "0 10px"
        }}
        type="button"
      >
        Filtros
      </button>
    </div>
  );
}

function ProviderVisualCard({
  ctaLabel,
  onOpen,
  provider,
  variant = "default"
}: {
  ctaLabel: string;
  onOpen: () => void;
  provider: MarketplaceProviderSummary;
  variant?: "default" | "featured";
}) {
  const distanceLabel = formatProviderDistance(provider.distanceKm);
  const publicLocation = provider.publicLocation;
  const categoryLabel = provider.categories[0] ? providerServiceCategoryLabels[provider.categories[0]] : "Servicios pet";

  return (
    <button
      onClick={onOpen}
      type="button"
      style={{
        ...inputStyle,
        border: variant === "featured" ? "1px solid rgba(15,118,110,0.42)" : inputStyle.border,
        borderRadius: "16px",
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "58px minmax(0, 1fr)",
        gap: "10px",
        textAlign: "left",
        background: "#ffffff"
      }}
    >
      <span
        style={{
          alignItems: "center",
          background: "rgba(20,184,166,0.12)",
          borderRadius: "14px",
          color: "#0f766e",
          display: "flex",
          fontSize: "14px",
          fontWeight: 900,
          height: "58px",
          justifyContent: "center",
          overflow: "hidden",
          width: "58px"
        }}
      >
        {provider.avatarUrl ? (
          <img alt="" src={provider.avatarUrl} style={{ height: "58px", objectFit: "cover", width: "58px" }} />
        ) : (
          getProviderInitials(provider.name)
        )}
      </span>
      <span style={{ display: "grid", gap: "5px", minWidth: 0 }}>
        <span style={{ display: "flex", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{provider.name}</strong>
          {variant === "featured" ? <StatusPill label="recomendado" tone="active" /> : null}
        </span>
        <span style={{ color: "#57534e", fontSize: "10px", fontWeight: 700 }}>{categoryLabel}</span>
        <span style={{ color: "#57534e", fontSize: "10px" }}>
          {publicLocation ? `${publicLocation.city}, ${publicLocation.countryCode}` : provider.city}
          {distanceLabel ? ` - ${distanceLabel}` : ""}
        </span>
        <span style={{ color: "#b45309", fontSize: "9px", fontWeight: 800 }}>Perfil publicado - reservas en piloto</span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <StatusPill label={`${provider.serviceCount} servicio(s)`} tone="neutral" />
          {provider.availableDays.length ? <StatusPill label="disponibilidad" tone="active" /> : null}
        </span>
        <span style={{ justifySelf: "start", marginTop: "2px" }}>
          <Button>{ctaLabel}</Button>
        </span>
      </span>
    </button>
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
    openProvider,
    clearSelectedProvider
  } = useMarketplaceWorkspace(enabled);
  const [currentView, setCurrentView] = useState<"home" | "search" | "results" | "provider" | "selection">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProviderServiceCategory | "">("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [selectedDistanceOrigin, setSelectedDistanceOrigin] = useState<DistanceOrigin>(noDistanceOrigin);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const selectedService = selectedProviderDetail?.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedProviderSource = useMemo(
    () => providers.find((provider) => provider.organizationId === selectedProviderDetail?.organizationId) ?? null,
    [providers, selectedProviderDetail]
  );
  const canOpenBookingPreview = Boolean(onSelectBookingService);
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

  if (!enabled) {
    return null;
  }

  const buildFilters = (overrides: Partial<MarketplaceSearchFilters> = {}) => ({
    query: overrides.query ?? searchQuery,
    category: overrides.category !== undefined ? overrides.category : selectedCategory ? selectedCategory : null,
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
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedCity("");
    setSelectedSpecies("");
    setSelectedDistanceOrigin(noDistanceOrigin);
    setActiveQuickFilters([]);
  }

  async function handleOpenProvider(providerId: string) {
    clearMessages();
    setSelectedServiceId(null);
    await openProvider(providerId);
    setCurrentView("provider");
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        density="compact"
        eyebrow="EP-05 / Marketplace"
        title="Buscar servicios"
        description="Explora proveedores aprobados, filtra por servicio, ciudad, especie y prepara una reserva sin perder el contexto del hogar."
      >
        {isLoading && !homeSnapshot ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando catalogo publico de servicios desde Supabase...</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            <article style={marketplacePanelStyle}>
              <SearchShell
                onClear={() => setSearchQuery("")}
                onFocus={() => setCurrentView("search")}
                onOpenFilters={() => setFilterPanelOpen((isOpen) => !isOpen)}
                onSubmit={() => void runSearch()}
                setValue={setSearchQuery}
                value={searchQuery}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {availableQuickCategories.map((item) => (
                  <FilterChip
                    isActive={selectedCategory === item.category}
                    key={item.category}
                    label={item.label}
                    onClick={() => void runSearch({ category: item.category, query: searchQuery })}
                  />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {controlledQuickFilterLabels.map((label) => (
                    <FilterChip key={label} isActive={activeQuickFilters.includes(label)} label={label} onClick={() => toggleQuickFilter(label)} />
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <Button disabled={isLoading} onClick={() => void runSearch()}>
                    Buscar proveedores
                  </Button>
                  <Button
                    disabled={isLoading}
                    onClick={() => {
                      clearMarketplaceFilters();
                      clearMessages();
                      clearSelectedProvider();
                      setSelectedServiceId(null);
                      setCurrentView("home");
                    }}
                    tone="secondary"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
              {activeFilterLabels.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {activeFilterLabels.map((label) => (
                    <StatusPill key={label} label={label} tone="neutral" />
                  ))}
                </div>
              ) : null}
              {filterPanelOpen ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
                  <select style={inputStyle} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as ProviderServiceCategory | "")}>
                    <option value="">Todas las categorias</option>
                    {homeSnapshot?.categoryHighlights.map((highlight) => (
                      <option key={highlight.category} value={highlight.category}>
                        {providerServiceCategoryLabels[highlight.category]}
                      </option>
                    ))}
                  </select>
                  <select style={inputStyle} value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
                    <option value="">Todas las ciudades</option>
                    {homeSnapshot?.cityHighlights.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <select style={inputStyle} value={selectedSpecies} onChange={(event) => setSelectedSpecies(event.target.value)}>
                    <option value="">Todas las especies</option>
                    {homeSnapshot?.speciesHighlights.map((species) => (
                      <option key={species} value={species}>
                        {formatSpeciesLabel(species)}
                      </option>
                    ))}
                  </select>
                  <select
                    style={inputStyle}
                    value={selectedDistanceOrigin.id}
                    onChange={(event) => {
                      const origin = [noDistanceOrigin, ...controlledDistanceZones].find((item) => item.id === event.target.value) ?? noDistanceOrigin;
                      void selectDistanceOrigin(origin);
                    }}
                  >
                    {[noDistanceOrigin, ...controlledDistanceZones].map((origin) => (
                      <option key={origin.id} value={origin.id}>
                        {origin.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </article>

            <div className="marketplace-owner-grid" style={{ display: "grid", gridTemplateColumns: "minmax(190px, 250px) minmax(0, 1fr)", gap: "14px", alignItems: "start" }}>
              <div style={{ display: "grid", gap: "14px" }}>
                <article style={marketplaceRailStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "15px" }}>Contexto</h3>
                    <StatusPill label={selectedPet ? "mascota" : "hogar"} tone="neutral" />
                  </div>
                  {householdSnapshot?.households.length ? (
                    <>
                      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                        {householdSnapshot.households.map((household) => (
                          <button
                            key={household.id}
                            onClick={() => void selectHousehold(household.id)}
                            type="button"
                            style={{
                              ...inputStyle,
                              minWidth: "180px",
                              textAlign: "left",
                              cursor: "pointer",
                              background: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "#fffdf8"
                            }}
                          >
                            <strong style={{ fontSize: "10px" }}>{household.name}</strong>
                            <div style={{ color: "#57534e", marginTop: "5px", fontSize: "9px" }}>
                              {household.memberCount} integrante(s) - {formatHouseholdPermissions(household.myPermissions)}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "grid", gap: "8px" }}>
                        <Button onClick={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"}>
                          Todas las mascotas
                        </Button>
                        {pets.map((pet) => (
                          <Button key={pet.id} onClick={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"}>
                            {pet.name}
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>
                      Puedes explorar sin hogar. Para reservar se importara el contexto cuando exista.
                    </p>
                  )}
                </article>

                <article style={marketplaceRailStyle}>
                  <h3 style={{ margin: 0, fontSize: "13px" }}>Busquedas rapidas</h3>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {controlledRecentSearches.map((recentSearch) => (
                      <button
                        key={recentSearch}
                        onClick={() => void runSearch({ query: recentSearch })}
                        style={{ ...inputStyle, background: "#ffffff", cursor: "pointer", fontSize: "10px", textAlign: "left" }}
                        type="button"
                      >
                        {recentSearch}
                      </button>
                    ))}
                  </div>
                </article>
              </div>

              <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
                {currentView === "home" ? (
                  <>
                    <article style={marketplacePanelStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "16px" }}>Explora servicios</h3>
                        <StatusPill label={homeSnapshot?.featuredProviders.length ? `${homeSnapshot.featuredProviders.length} destacados` : "catalogo vacio"} tone="active" />
                      </div>
                      <p style={{ margin: 0, color: "#57534e", fontSize: "11px", lineHeight: 1.55 }}>
                        Usa la barra superior como en mobile: busca, aplica chips rapidos o abre filtros para afinar por ciudad, especie y distancia aproximada.
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px" }}>
                        {availableQuickCategories.map((item) => (
                          <button key={item.category} onClick={() => void runSearch({ category: item.category })} type="button" style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}>
                            <strong style={{ fontSize: "12px" }}>{item.label}</strong>
                            <div style={{ color: "#57534e", fontSize: "10px", marginTop: "5px" }}>{item.helper}</div>
                          </button>
                        ))}
                      </div>
                    </article>

                    <article style={marketplacePanelStyle}>
                      <h3 style={{ margin: 0, fontSize: "16px" }}>Proveedores destacados</h3>
                      {homeSnapshot?.featuredProviders.length ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "10px" }}>
                          {homeSnapshot.featuredProviders.map((provider) => (
                            <ProviderVisualCard
                              ctaLabel="Ver proveedor"
                              key={provider.organizationId}
                              onOpen={() => void handleOpenProvider(provider.organizationId)}
                              provider={provider}
                              variant="featured"
                            />
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Todavia no hay proveedores publicos publicados.</p>
                      )}
                    </article>
                  </>
                ) : null}

                {currentView === "search" ? (
                  <article style={marketplacePanelStyle}>
                    <h3 style={{ margin: 0, fontSize: "16px" }}>Busqueda enfocada</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "12px" }}>
                      <div style={{ display: "grid", gap: "8px", alignContent: "start" }}>
                        <strong style={{ fontSize: "11px" }}>Busquedas recientes</strong>
                        {controlledRecentSearches.map((recentSearch) => (
                          <button
                            key={recentSearch}
                            onClick={() => void runSearch({ query: recentSearch })}
                            style={{ ...inputStyle, cursor: "pointer", textAlign: "left" }}
                            type="button"
                          >
                            {recentSearch}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "grid", gap: "8px" }}>
                        <strong style={{ fontSize: "11px" }}>Sugerencias</strong>
                        {searchSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => {
                              if (suggestion.category) {
                                void runSearch({ category: suggestion.category, query: searchQuery });
                                return;
                              }

                              void runSearch({ query: suggestion.label });
                            }}
                            style={{ ...inputStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", gap: "10px", textAlign: "left" }}
                            type="button"
                          >
                            <strong style={{ fontSize: "11px" }}>{suggestion.label}</strong>
                            <span style={{ color: "#57534e", fontSize: "10px" }}>{suggestion.type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button disabled={isLoading} onClick={() => void runSearch()}>
                      Ver resultados
                    </Button>
                  </article>
                ) : null}

                {currentView === "results" ? (
                  <article style={marketplacePanelStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "16px" }}>Resultados</h3>
                      <StatusPill label={`${visibleProviders.length} resultado(s)`} tone="neutral" />
                    </div>
                    {visibleProviders.length ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "10px" }}>
                        {visibleProviders.map((provider) => (
                          <ProviderVisualCard
                            ctaLabel="Abrir"
                            key={provider.organizationId}
                            onOpen={() => void handleOpenProvider(provider.organizationId)}
                            provider={provider}
                          />
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...inputStyle, display: "grid", gap: "8px" }}>
                        <strong>No encontramos proveedores con esos filtros.</strong>
                        <span style={{ color: "#57534e", fontSize: "10px" }}>Prueba limpiar filtros o buscar por una categoria mas amplia.</span>
                        <div>
                          <Button onClick={() => void runSearch({ query: "", category: null, city: null, species: null, nearLatitude: null, nearLongitude: null })}>
                            Ver todos
                          </Button>
                        </div>
                      </div>
                    )}
                  </article>
                ) : null}

                {currentView === "provider" && selectedProviderDetail ? (
                  <>
                    <article style={marketplacePanelStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "16px" }}>{selectedProviderDetail.name}</h3>
                          <p style={{ color: "#57534e", fontSize: "10px", margin: "2px 0 0" }}>{selectedProviderDetail.publicLocation ? `${selectedProviderDetail.publicLocation.city}, ${selectedProviderDetail.publicLocation.countryCode}` : selectedProviderDetail.city}</p>
                        </div>
                        <StatusPill label={selectedProviderSource ? "desde resultados" : "destacados"} tone="active" />
                      </div>
                      <div style={{ color: "#57534e", fontSize: "11px", fontWeight: 700 }}>{selectedProviderDetail.headline}</div>
                      <p style={{ margin: 0, color: "#57534e", fontSize: "11px", lineHeight: 1.6 }}>{selectedProviderDetail.bio}</p>
                    </article>

                    <article style={marketplacePanelStyle}>
                      <h3 style={{ margin: 0, fontSize: "16px" }}>Servicios</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "10px" }}>
                        {selectedProviderDetail.services.map((service) => (
                          <div key={service.id} style={inputStyle}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                              <strong style={{ fontSize: "12px" }}>{service.name}</strong>
                              <StatusPill label={providerServiceCategoryLabels[service.category]} tone="neutral" />
                            </div>
                            <div style={{ color: "#57534e", marginTop: "6px", fontSize: "10px" }}>{service.shortDescription ?? "Todavia no hay una descripcion publica."}</div>
                            <div style={{ color: "#57534e", marginTop: "6px", fontSize: "10px" }}>
                              Especies: {service.speciesServed.map((species) => formatSpeciesLabel(species)).join(", ") || "No especificadas"}
                            </div>
                            <div style={{ color: "#57534e", marginTop: "6px", fontSize: "10px" }}>
                              {service.durationMinutes ? `${service.durationMinutes} min` : "Horario flexible"} - {formatMoney(service.basePriceCents, service.currencyCode)}
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                              <Button
                                onClick={() => {
                                  setSelectedServiceId(service.id);
                                  setCurrentView("selection");
                                }}
                                tone="secondary"
                              >
                                Seleccionar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article style={marketplacePanelStyle}>
                      <h3 style={{ margin: 0, fontSize: "16px" }}>Disponibilidad publicada</h3>
                      {selectedProviderDetail.availability.length ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "8px" }}>
                          {selectedProviderDetail.availability.map((slot) => (
                            <div key={slot.id} style={inputStyle}>
                              <strong style={{ fontSize: "10px" }}>{providerDayOfWeekLabels[slot.dayOfWeek]}</strong>
                              <div style={{ color: "#57534e", marginTop: "5px", fontSize: "10px" }}>{formatTimeRange(slot.startsAt, slot.endsAt)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Todavia no hay bloques publicos de disponibilidad.</p>
                      )}
                    </article>
                  </>
                ) : null}

                {currentView === "selection" && selectedProviderDetail && selectedService ? (
                  <article style={marketplacePanelStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "16px" }}>Servicio seleccionado</h3>
                      <StatusPill label={canOpenBookingPreview ? "lista para reserva" : "inicia sesion"} tone="active" />
                    </div>
                    <div style={{ ...inputStyle, display: "grid", gap: "6px" }}>
                      <strong style={{ fontSize: "12px" }}>{selectedProviderDetail.name}</strong>
                      <span style={{ color: "#57534e", fontSize: "10px" }}>{selectedService.name}</span>
                      <span style={{ color: "#57534e", fontSize: "10px" }}>
                        {providerServiceCategoryLabels[selectedService.category]}
                        {selectedService.durationMinutes ? ` - ${selectedService.durationMinutes} min` : ""}
                      </span>
                      <span style={{ color: "#57534e", fontSize: "10px" }}>
                        {formatMoney(selectedService.basePriceCents, selectedService.currencyCode)} - {selectedService.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "10px" }}>
                      <div style={inputStyle}>
                        <strong style={{ fontSize: "11px" }}>Hogar</strong>
                        <div style={{ color: "#57534e", marginTop: "5px", fontSize: "10px" }}>{selectedHousehold?.name ?? "Sin contexto de hogar seleccionado"}</div>
                      </div>
                      <div style={inputStyle}>
                        <strong style={{ fontSize: "11px" }}>Mascota</strong>
                        <div style={{ color: "#57534e", marginTop: "5px", fontSize: "10px" }}>{selectedPet?.name ?? "Todas las mascotas del hogar"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <Button
                        disabled={!canOpenBookingPreview}
                        onClick={() => {
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
                            selectedAt: new Date().toISOString()
                          });
                        }}
                      >
                        {canOpenBookingPreview ? "Abrir vista previa de la reserva" : "Iniciar sesion para reservar"}
                      </Button>
                      <Button onClick={() => setCurrentView("provider")} tone="secondary">
                        Volver
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedServiceId(null);
                          setCurrentView("results");
                        }}
                        tone="secondary"
                      >
                        Buscar de nuevo
                      </Button>
                    </div>
                  </article>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </CoreSection>
      <style>{`
        @media (max-width: 900px) {
          .marketplace-owner-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
