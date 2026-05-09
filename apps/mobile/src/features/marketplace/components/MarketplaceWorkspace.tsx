import { formatHouseholdPermissions, providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { MarketplaceSearchFilters, MarketplaceServiceSelection, ProviderServiceCategory } from "@pet/types";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
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
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: disabled ? 0.65 : 1,
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : colorTokens.accentDark, fontWeight: "800", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
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

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const selectedService = selectedProviderDetail?.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedProviderSource = useMemo(
    () => providers.find((provider) => provider.organizationId === selectedProviderDetail?.organizationId) ?? null,
    [providers, selectedProviderDetail]
  );

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
    await openProvider(providerId);
    setCurrentView("provider");
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <View style={cardStyle}><Text style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</Text></View> : null}
      {!errorMessage && infoMessage ? <View style={cardStyle}><Text style={{ color: "#0f766e", fontWeight: "600" }}>{infoMessage}</Text></View> : null}
      <CoreSectionCard
        eyebrow="Buscar"
        title={currentView === "home" ? "Encuentra un servicio" : "Servicios para tus mascotas"}
        description={
          currentView === "home"
            ? "Busca proveedores aprobados y prepara una reserva desde el contexto de tu hogar."
            : "Avanza paso a paso: resultados, proveedor, servicio y vista previa de reserva."
        }
      >
        <View style={{ gap: 12 }}>
          {isLoading && !homeSnapshot ? <Text style={{ color: colorTokens.muted }}>Preparando proveedores aprobados...</Text> : null}

          {currentView === "home" ? (
            <>
              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Contexto</Text>
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
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
                        <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
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
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Busqueda y filtros</Text>
                <TextInput
                  onChangeText={setSearchQuery}
                  placeholder="Buscar proveedor, ciudad o servicio"
                  style={inputStyle}
                  value={searchQuery}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label="Todas las categorias" onPress={() => setSelectedCategory("")} tone={selectedCategory === "" ? "primary" : "secondary"} />
                  {homeSnapshot?.categoryHighlights.map((highlight) => (
                    <Button
                      key={highlight.category}
                      label={providerServiceCategoryLabels[highlight.category]}
                      onPress={() => setSelectedCategory(highlight.category)}
                      tone={selectedCategory === highlight.category ? "primary" : "secondary"}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label="Todas las ciudades" onPress={() => setSelectedCity("")} tone={selectedCity === "" ? "primary" : "secondary"} />
                  {homeSnapshot?.cityHighlights.map((city) => (
                    <Button key={city} label={city} onPress={() => setSelectedCity(city)} tone={selectedCity === city ? "primary" : "secondary"} />
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button label="Todas las especies" onPress={() => setSelectedSpecies("")} tone={selectedSpecies === "" ? "primary" : "secondary"} />
                  {homeSnapshot?.speciesHighlights.map((species) => (
                    <Button
                      key={species}
                      label={formatSpeciesLabel(species)}
                      onPress={() => setSelectedSpecies(species)}
                      tone={selectedSpecies === species ? "primary" : "secondary"}
                    />
                  ))}
                </View>
                <Button disabled={isLoading} label="Buscar proveedores" onPress={() => void runSearch()} />
              </View>

              <View style={cardStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Explora por categoria</Text>
                  <StatusChip label={homeSnapshot?.featuredProviders.length ? `${homeSnapshot.featuredProviders.length} destacados` : "catalogo vacio"} tone="active" />
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  Elige una categoria o proveedor destacado para preparar una reserva con el contexto de hogar y mascota.
                </Text>
                {homeSnapshot?.categoryHighlights.map((highlight) => (
                  <Pressable key={highlight.category} onPress={() => void runSearch({ category: highlight.category })} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{providerServiceCategoryLabels[highlight.category]}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      {highlight.providerCount} proveedor(es) - {highlight.serviceCount} servicio(s)
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Proveedores destacados</Text>
                {homeSnapshot?.featuredProviders.length ? homeSnapshot.featuredProviders.map((provider) => (
                  <Pressable key={provider.organizationId} onPress={() => void handleOpenProvider(provider.organizationId)} style={inputStyle}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{provider.name}</Text>
                      <StatusChip label={`${provider.serviceCount} servicio(s)`} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.city}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.headline}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
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
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Resultados</Text>
                <StatusChip label={`${providers.length} resultado(s)`} tone="neutral" />
              </View>
              <Button label="Modificar busqueda" onPress={() => setCurrentView("home")} tone="secondary" />
              {providers.length ? providers.map((provider) => (
                <View key={provider.organizationId} style={inputStyle}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{provider.name}</Text>
                    <StatusChip label={`${provider.serviceCount} servicio(s)`} tone="neutral" />
                  </View>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.city}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.headline}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
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
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>{selectedProviderDetail.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>{selectedProviderDetail.city}</Text>
                  </View>
                  <StatusChip label={selectedProviderSource ? "desde resultados" : "destacados"} tone="active" />
                </View>
                <Text style={{ color: colorTokens.muted }}>{selectedProviderDetail.headline}</Text>
                <Text style={{ color: colorTokens.muted }}>{selectedProviderDetail.bio}</Text>
                <Button label="Volver a resultados" onPress={() => setCurrentView("results")} tone="secondary" />
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Servicios</Text>
                {selectedProviderDetail.services.map((service) => (
                  <View key={service.id} style={inputStyle}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{service.name}</Text>
                      <StatusChip label={providerServiceCategoryLabels[service.category]} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{service.shortDescription ?? "Todavia no hay una descripcion publica."}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      Duracion: {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                    </Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      Precio: {formatMoney(service.basePriceCents, service.currencyCode)} - {service.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                    </Text>
                    <View style={{ marginTop: 10 }}>
                      <Button
                        label="Seleccionar servicio"
                        onPress={() => {
                          setSelectedServiceId(service.id);
                          setCurrentView("selection");
                        }}
                        tone="secondary"
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Disponibilidad</Text>
                {selectedProviderDetail.availability.length ? selectedProviderDetail.availability.map((slot) => (
                  <View key={slot.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{providerDayOfWeekLabels[slot.dayOfWeek]}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatTimeRange(slot.startsAt, slot.endsAt)}</Text>
                  </View>
                )) : <Text style={{ color: colorTokens.muted }}>Todavia no hay bloques publicos de disponibilidad.</Text>}
              </View>
            </>
          ) : null}

          {currentView === "selection" && selectedProviderDetail && selectedService ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Prepara tu reserva</Text>
                <StatusChip label="lista para reserva" tone="active" />
              </View>
              <Text style={{ fontWeight: "600", color: "#1c1917" }}>{selectedProviderDetail.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{selectedService.name}</Text>
              <Text style={{ color: colorTokens.muted }}>
                {providerServiceCategoryLabels[selectedService.category]}
                {selectedService.durationMinutes ? ` - ${selectedService.durationMinutes} min` : ""}
              </Text>
              <Text style={{ color: colorTokens.muted }}>
                {formatMoney(selectedService.basePriceCents, selectedService.currencyCode)} - {selectedService.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
              </Text>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Hogar</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedHousehold?.name ?? "Sin contexto de hogar seleccionado"}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Mascota</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedPet?.name ?? "Todas las mascotas del hogar"}</Text>
              </View>
              <Text style={{ color: colorTokens.muted }}>
                Esta seleccion transfiere el proveedor, el servicio y la mascota opcional directamente al espacio de Reservas.
              </Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button
                  label="Abrir vista previa de la reserva"
                  onPress={() => {
                    onSelectBookingService?.({
                      householdId: selectedHouseholdId,
                      petId: selectedPetId,
                      providerId: selectedProviderDetail.organizationId,
                      serviceId: selectedService.id,
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
      </CoreSectionCard>
    </View>
  );
}







