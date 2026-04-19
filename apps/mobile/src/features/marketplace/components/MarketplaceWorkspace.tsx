import { providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";
import { colorTokens } from "@pet/ui";
import type { MarketplaceSearchFilters, MarketplaceServiceSelection, ProviderServiceCategory } from "@pet/types";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { useMarketplaceWorkspace } from "../hooks/useMarketplaceWorkspace";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(28,25,23,0.14)",
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "#fffdf8",
  color: "#1c1917"
} as const;

const cardStyle = { borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 } as const;

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
        backgroundColor: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.92)",
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: "rgba(28,25,23,0.14)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: disabled ? 0.65 : 1
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : "#1c1917", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
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
    openProvider,
    clearSelectedProvider
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
        eyebrow="EP-05 / Marketplace"
        title="Discovery and booking handoff"
        description="Marketplace home, search, filters, public provider profile and service selection. Booking handoff is active; checkout and payment capture stay deferred."
      >
        <View style={{ gap: 12 }}>
          {isLoading && !homeSnapshot ? <Text style={{ color: colorTokens.muted }}>Loading public marketplace catalog from Supabase...</Text> : null}

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Discovery context</Text>
            <StatusChip label={selectedPet ? "pet selected" : "household context"} tone="neutral" />
            {householdSnapshot?.households.length ? (
              <>
                {householdSnapshot.households.map((household) => (
                  <Pressable key={household.id} onPress={() => void selectHousehold(household.id)} style={[cardStyle, { backgroundColor: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)" }]}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>{household.name}</Text>
                    <Text style={{ color: colorTokens.muted }}>{household.memberCount} member(s) - {household.myPermissions.join(", ")}</Text>
                  </Pressable>
                ))}
                <Button label="All household pets" onPress={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"} />
                {pets.map((pet) => (
                  <Button key={pet.id} label={pet.name} onPress={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"} />
                ))}
              </>
            ) : (
              <Text style={{ color: colorTokens.muted }}>
                Household and pet context is optional here. Discovery still works before that setup exists.
              </Text>
            )}
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Search and filters</Text>
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Search provider, city or service"
              style={inputStyle}
              value={searchQuery}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Button label="All categories" onPress={() => setSelectedCategory("")} tone={selectedCategory === "" ? "primary" : "secondary"} />
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
              <Button label="All cities" onPress={() => setSelectedCity("")} tone={selectedCity === "" ? "primary" : "secondary"} />
              {homeSnapshot?.cityHighlights.map((city) => (
                <Button key={city} label={city} onPress={() => setSelectedCity(city)} tone={selectedCity === city ? "primary" : "secondary"} />
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Button label="All species" onPress={() => setSelectedSpecies("")} tone={selectedSpecies === "" ? "primary" : "secondary"} />
              {homeSnapshot?.speciesHighlights.map((species) => (
                <Button
                  key={species}
                  label={formatSpeciesLabel(species)}
                  onPress={() => setSelectedSpecies(species)}
                  tone={selectedSpecies === species ? "primary" : "secondary"}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={isLoading} label="Search providers" onPress={() => void runSearch()} />
              <Button
                disabled={isLoading}
                label="Home"
                onPress={() => {
                  clearMessages();
                  clearSelectedProvider();
                  setSelectedServiceId(null);
                  setCurrentView("home");
                }}
                tone="secondary"
              />
            </View>
          </View>

          <View style={cardStyle}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Navigation</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button disabled={currentView === "home"} label="Home" onPress={() => setCurrentView("home")} tone="secondary" />
              <Button disabled={!providers.length || currentView === "results"} label="Results" onPress={() => setCurrentView("results")} tone="secondary" />
              <Button disabled={!selectedProviderDetail || currentView === "provider"} label="Provider" onPress={() => setCurrentView("provider")} tone="secondary" />
              <Button disabled={!selectedService || currentView === "selection"} label="Selection" onPress={() => setCurrentView("selection")} tone="secondary" />
            </View>
          </View>

          {currentView === "home" ? (
            <>
              <View style={cardStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Marketplace home</Text>
                  <StatusChip label={homeSnapshot?.featuredProviders.length ? `${homeSnapshot.featuredProviders.length} featured` : "catalog empty"} tone="active" />
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  Discovery starts here. Selecting a service prepares provider, service and optional pet context for the Bookings workspace.
                </Text>
                {homeSnapshot?.categoryHighlights.map((highlight) => (
                  <Pressable key={highlight.category} onPress={() => void runSearch({ category: highlight.category })} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{providerServiceCategoryLabels[highlight.category]}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      {highlight.providerCount} provider(s) - {highlight.serviceCount} service(s)
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Featured providers</Text>
                {homeSnapshot?.featuredProviders.length ? homeSnapshot.featuredProviders.map((provider) => (
                  <Pressable key={provider.organizationId} onPress={() => void handleOpenProvider(provider.organizationId)} style={inputStyle}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{provider.name}</Text>
                      <StatusChip label={`${provider.serviceCount} service(s)`} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.city}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.headline}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      {provider.categories.map((category) => providerServiceCategoryLabels[category]).join(", ")}
                    </Text>
                  </Pressable>
                )) : <Text style={{ color: colorTokens.muted }}>No public providers have been published yet.</Text>}
              </View>
            </>
          ) : null}

          {currentView === "results" ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Search results</Text>
                <StatusChip label={`${providers.length} result(s)`} tone="neutral" />
              </View>
              {providers.length ? providers.map((provider) => (
                <Pressable key={provider.organizationId} onPress={() => void handleOpenProvider(provider.organizationId)} style={inputStyle}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{provider.name}</Text>
                    <StatusChip label={`${provider.serviceCount} service(s)`} tone="neutral" />
                  </View>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.city}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{provider.headline}</Text>
                  <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                    Species: {provider.speciesServed.map((species) => formatSpeciesLabel(species)).join(", ") || "Not specified"}
                  </Text>
                </Pressable>
              )) : <Text style={{ color: colorTokens.muted }}>No public provider matched the current query and filters.</Text>}
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
                  <StatusChip label={selectedProviderSource ? "from results" : "featured"} tone="active" />
                </View>
                <Text style={{ color: colorTokens.muted }}>{selectedProviderDetail.headline}</Text>
                <Text style={{ color: colorTokens.muted }}>{selectedProviderDetail.bio}</Text>
              </View>

              <View style={cardStyle}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Services</Text>
                {selectedProviderDetail.services.map((service) => (
                  <View key={service.id} style={inputStyle}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontWeight: "600", color: "#1c1917", flex: 1 }}>{service.name}</Text>
                      <StatusChip label={providerServiceCategoryLabels[service.category]} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{service.shortDescription ?? "No public description yet."}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      Duration: {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                    </Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>
                      Price: {formatMoney(service.basePriceCents, service.currencyCode)} - {service.bookingMode === "instant" ? "Instant booking" : "Needs approval"}
                    </Text>
                    <View style={{ marginTop: 10 }}>
                      <Button
                        label="Select service"
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
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Availability</Text>
                {selectedProviderDetail.availability.length ? selectedProviderDetail.availability.map((slot) => (
                  <View key={slot.id} style={inputStyle}>
                    <Text style={{ fontWeight: "600", color: "#1c1917" }}>{providerDayOfWeekLabels[slot.dayOfWeek]}</Text>
                    <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{formatTimeRange(slot.startsAt, slot.endsAt)}</Text>
                  </View>
                )) : <Text style={{ color: colorTokens.muted }}>No public availability slots published yet.</Text>}
              </View>
            </>
          ) : null}

          {currentView === "selection" && selectedProviderDetail && selectedService ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>Service selection</Text>
                <StatusChip label="ready for booking preview" tone="active" />
              </View>
              <Text style={{ fontWeight: "600", color: "#1c1917" }}>{selectedProviderDetail.name}</Text>
              <Text style={{ color: colorTokens.muted }}>{selectedService.name}</Text>
              <Text style={{ color: colorTokens.muted }}>
                {providerServiceCategoryLabels[selectedService.category]}
                {selectedService.durationMinutes ? ` - ${selectedService.durationMinutes} min` : ""}
              </Text>
              <Text style={{ color: colorTokens.muted }}>
                {formatMoney(selectedService.basePriceCents, selectedService.currencyCode)} - {selectedService.bookingMode === "instant" ? "Instant booking" : "Needs approval"}
              </Text>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Household</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedHousehold?.name ?? "No household context selected"}</Text>
              </View>
              <View style={inputStyle}>
                <Text style={{ fontWeight: "600", color: "#1c1917" }}>Pet</Text>
                <Text style={{ color: colorTokens.muted, marginTop: 6 }}>{selectedPet?.name ?? "All household pets / later decision"}</Text>
              </View>
              <Text style={{ color: colorTokens.muted }}>
                This selection hands off provider, service and optional pet context directly into the Bookings workspace.
              </Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button
                  label="Open booking preview"
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
                <Button label="Back to provider" onPress={() => setCurrentView("provider")} tone="secondary" />
                <Button
                  label="Search again"
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
