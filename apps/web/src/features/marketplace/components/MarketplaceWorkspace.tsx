"use client";

import { providerDayOfWeekLabels, providerServiceCategoryLabels } from "@pet/config";
import type { MarketplaceSearchFilters, MarketplaceServiceSelection, ProviderServiceCategory } from "@pet/types";
import { useMemo, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useMarketplaceWorkspace } from "../hooks/useMarketplaceWorkspace";

const cardStyle = { borderRadius: "20px", background: "rgba(247,242,231,0.78)", padding: "18px", display: "grid", gap: "12px" } as const;
const inputStyle = { borderRadius: "12px", border: "1px solid rgba(28,25,23,0.14)", padding: "10px 12px", background: "#fffdf8" } as const;

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
        border: tone === "primary" ? "none" : "1px solid rgba(28, 25, 23, 0.14)",
        background: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.82)",
        color: tone === "primary" ? "#f8fafc" : "#1c1917",
        padding: "12px 18px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
    </button>
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
  const canOpenBookingPreview = Boolean(onSelectBookingService);

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

  function renderProviderCard(provider: {
    organizationId: string;
    name: string;
    city: string;
    headline: string;
    serviceCount: number;
    categories: ProviderServiceCategory[];
    speciesServed?: string[];
  }) {
    return (
      <button
        key={provider.organizationId}
        onClick={() => void handleOpenProvider(provider.organizationId)}
        type="button"
        style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "grid", gap: "8px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <strong>{provider.name}</strong>
          <StatusPill label={`${provider.serviceCount} service(s)`} tone="neutral" />
        </div>
        <div style={{ color: "#57534e" }}>{provider.city}</div>
        <div style={{ color: "#57534e" }}>{provider.headline}</div>
        <div style={{ color: "#57534e" }}>
          {provider.categories.map((category) => providerServiceCategoryLabels[category]).join(", ")}
        </div>
        {"speciesServed" in provider ? (
          <div style={{ color: "#57534e" }}>
            Species: {provider.speciesServed?.map((species) => formatSpeciesLabel(species)).join(", ") || "Not specified"}
          </div>
        ) : null}
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <div style={{ ...cardStyle, color: "#991b1b" }}>{errorMessage}</div> : null}
      {!errorMessage && infoMessage ? <div style={{ ...cardStyle, color: "#0f766e" }}>{infoMessage}</div> : null}
      <CoreSection
        eyebrow="EP-05 / Marketplace"
        title="Public discovery and booking handoff"
        description="Public marketplace home, search, filters, provider profile and service selection. Booking handoff is active; checkout and payment capture remain deferred."
      >
        {isLoading && !homeSnapshot ? (
          <p style={{ margin: 0, color: "#57534e" }}>Loading public marketplace catalog from Supabase...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,300px) minmax(0,1fr)", gap: "18px" }}>
            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Discovery context</h3>
                  <StatusPill label={selectedPet ? "pet selected" : "household context"} tone="neutral" />
                </div>
                {householdSnapshot?.households.length ? (
                  <>
                    {householdSnapshot.households.map((household) => (
                      <button
                        key={household.id}
                        onClick={() => void selectHousehold(household.id)}
                        type="button"
                        style={{
                          ...inputStyle,
                          textAlign: "left",
                          cursor: "pointer",
                          background: household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "#fffdf8"
                        }}
                      >
                        <strong>{household.name}</strong>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>
                          {household.memberCount} member(s) - {household.myPermissions.join(", ")}
                        </div>
                      </button>
                    ))}
                    <Button onClick={() => void selectPet(null)} tone={selectedPetId === null ? "primary" : "secondary"}>
                      All household pets
                    </Button>
                    {pets.map((pet) => (
                      <Button key={pet.id} onClick={() => void selectPet(pet.id)} tone={selectedPetId === pet.id ? "primary" : "secondary"}>
                        {pet.name}
                      </Button>
                    ))}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>
                    Household and pet context is optional here. Discovery still works before that setup exists.
                  </p>
                )}
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Search and filters</h3>
                <input
                  style={inputStyle}
                  placeholder="Search provider, city or service"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <select
                  style={inputStyle}
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value as ProviderServiceCategory | "")}
                >
                  <option value="">All categories</option>
                  {homeSnapshot?.categoryHighlights.map((highlight) => (
                    <option key={highlight.category} value={highlight.category}>
                      {providerServiceCategoryLabels[highlight.category]}
                    </option>
                  ))}
                </select>
                <select style={inputStyle} value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
                  <option value="">All cities</option>
                  {homeSnapshot?.cityHighlights.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select style={inputStyle} value={selectedSpecies} onChange={(event) => setSelectedSpecies(event.target.value)}>
                  <option value="">All species</option>
                  {homeSnapshot?.speciesHighlights.map((species) => (
                    <option key={species} value={species}>
                      {formatSpeciesLabel(species)}
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button disabled={isLoading} onClick={() => void runSearch()}>
                    Search providers
                  </Button>
                  <Button
                    disabled={isLoading}
                    onClick={() => {
                      clearMessages();
                      clearSelectedProvider();
                      setSelectedServiceId(null);
                      setCurrentView("home");
                    }}
                    tone="secondary"
                  >
                    Home
                  </Button>
                </div>
              </article>

              <article style={cardStyle}>
                <h3 style={{ margin: 0 }}>Navigation</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button disabled={currentView === "home"} onClick={() => setCurrentView("home")} tone="secondary">
                    Home
                  </Button>
                  <Button disabled={!providers.length || currentView === "results"} onClick={() => setCurrentView("results")} tone="secondary">
                    Results
                  </Button>
                  <Button disabled={!selectedProviderDetail || currentView === "provider"} onClick={() => setCurrentView("provider")} tone="secondary">
                    Provider
                  </Button>
                  <Button disabled={!selectedService || currentView === "selection"} onClick={() => setCurrentView("selection")} tone="secondary">
                    Selection
                  </Button>
                </div>
              </article>
            </div>

            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              {currentView === "home" ? (
                <>
                  <article style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <h3 style={{ margin: 0 }}>Marketplace home</h3>
                      <StatusPill label={homeSnapshot?.featuredProviders.length ? `${homeSnapshot.featuredProviders.length} featured` : "catalog empty"} tone="active" />
                    </div>
                    <p style={{ margin: 0, color: "#57534e" }}>
                      Public discovery stays open here. Selecting a service prepares provider, service and optional pet context for the Bookings workspace.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                      {homeSnapshot?.categoryHighlights.map((highlight) => (
                        <button
                          key={highlight.category}
                          onClick={() => void runSearch({ category: highlight.category })}
                          type="button"
                          style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}
                        >
                          <strong>{providerServiceCategoryLabels[highlight.category]}</strong>
                          <div style={{ color: "#57534e", marginTop: "6px" }}>
                            {highlight.providerCount} provider(s) - {highlight.serviceCount} service(s)
                          </div>
                        </button>
                      ))}
                    </div>
                  </article>

                  <article style={cardStyle}>
                    <h3 style={{ margin: 0 }}>Featured providers</h3>
                    {homeSnapshot?.featuredProviders.length ? homeSnapshot.featuredProviders.map(renderProviderCard) : <p style={{ margin: 0, color: "#57534e" }}>No public providers have been published yet.</p>}
                  </article>
                </>
              ) : null}

              {currentView === "results" ? (
                <article style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Search results</h3>
                    <StatusPill label={`${providers.length} result(s)`} tone="neutral" />
                  </div>
                  {providers.length ? providers.map(renderProviderCard) : <p style={{ margin: 0, color: "#57534e" }}>No public provider matched the current query and filters.</p>}
                </article>
              ) : null}

              {currentView === "provider" && selectedProviderDetail ? (
                <>
                  <article style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{selectedProviderDetail.name}</h3>
                        <div style={{ color: "#57534e" }}>{selectedProviderDetail.city}</div>
                      </div>
                      <StatusPill label={selectedProviderSource ? "from results" : "featured"} tone="active" />
                    </div>
                    <div style={{ color: "#57534e" }}>{selectedProviderDetail.headline}</div>
                    <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>{selectedProviderDetail.bio}</p>
                  </article>

                  <article style={cardStyle}>
                    <h3 style={{ margin: 0 }}>Services</h3>
                    {selectedProviderDetail.services.map((service) => (
                      <div key={service.id} style={inputStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                          <strong>{service.name}</strong>
                          <StatusPill label={providerServiceCategoryLabels[service.category]} tone="neutral" />
                        </div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>{service.shortDescription ?? "No public description yet."}</div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>
                          Species: {service.speciesServed.map((species) => formatSpeciesLabel(species)).join(", ") || "Not specified"}
                        </div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>
                          Duration: {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                        </div>
                        <div style={{ color: "#57534e", marginTop: "6px" }}>
                          Price: {formatMoney(service.basePriceCents, service.currencyCode)} - {service.bookingMode === "instant" ? "Instant booking" : "Needs approval"}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                          <Button
                            onClick={() => {
                              setSelectedServiceId(service.id);
                              setCurrentView("selection");
                            }}
                            tone="secondary"
                          >
                            Select service
                          </Button>
                        </div>
                      </div>
                    ))}
                  </article>

                  <article style={cardStyle}>
                    <h3 style={{ margin: 0 }}>Availability</h3>
                    {selectedProviderDetail.availability.length ? (
                      selectedProviderDetail.availability.map((slot) => (
                        <div key={slot.id} style={inputStyle}>
                          <strong>{providerDayOfWeekLabels[slot.dayOfWeek]}</strong>
                          <div style={{ color: "#57534e", marginTop: "6px" }}>{formatTimeRange(slot.startsAt, slot.endsAt)}</div>
                        </div>
                      ))
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>No public availability slots published yet.</p>
                    )}
                  </article>
                </>
              ) : null}

              {currentView === "selection" && selectedProviderDetail && selectedService ? (
                <article style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Service selection</h3>
                    <StatusPill label={canOpenBookingPreview ? "ready for booking preview" : "sign in to continue"} tone="active" />
                  </div>
                  <strong>{selectedProviderDetail.name}</strong>
                  <div style={{ color: "#57534e" }}>{selectedService.name}</div>
                  <div style={{ color: "#57534e" }}>
                    {providerServiceCategoryLabels[selectedService.category]}
                    {selectedService.durationMinutes ? ` - ${selectedService.durationMinutes} min` : ""}
                  </div>
                  <div style={{ color: "#57534e" }}>
                    {formatMoney(selectedService.basePriceCents, selectedService.currencyCode)} - {selectedService.bookingMode === "instant" ? "Instant booking" : "Needs approval"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
                    <div style={inputStyle}>
                      <strong>Household</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedHousehold?.name ?? "No household context selected"}</div>
                    </div>
                    <div style={inputStyle}>
                      <strong>Pet</strong>
                      <div style={{ color: "#57534e", marginTop: "6px" }}>{selectedPet?.name ?? "All household pets / later decision"}</div>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                    {canOpenBookingPreview
                      ? "This selection hands off provider, service and optional pet context directly into the Bookings workspace."
                      : "This public selection is visible without signing in. Sign in to continue into the Bookings workspace."}
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Button
                      disabled={!canOpenBookingPreview}
                      onClick={() => {
                        onSelectBookingService?.({
                          householdId: selectedHouseholdId,
                          petId: selectedPetId,
                          providerId: selectedProviderDetail.organizationId,
                          serviceId: selectedService.id,
                          selectedAt: new Date().toISOString()
                        });
                      }}
                    >
                      {canOpenBookingPreview ? "Open booking preview" : "Sign in to book"}
                    </Button>
                    <Button onClick={() => setCurrentView("provider")} tone="secondary">
                      Back to provider
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedServiceId(null);
                        setCurrentView("results");
                      }}
                      tone="secondary"
                    >
                      Search again
                    </Button>
                  </div>
                </article>
              ) : null}
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
