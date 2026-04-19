import * as DocumentPicker from "expo-document-picker";
import {
  bookingStatusLabels,
  providerApprovalDocumentTypeLabels,
  providerApprovalDocumentTypeOrder,
  providerApprovalStatusLabels,
  providerDayOfWeekLabels,
  providerDayOfWeekOrder,
  providerServiceCategoryLabels,
  providerServiceCategoryOrder
} from "@pet/config";
import { colorTokens } from "@pet/ui";
import type {
  BookingMode,
  ProviderApprovalDocumentType,
  ProviderServiceCategory,
  UpdateProviderOrganizationInput,
  UpdateProviderServiceInput,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { getMobileProvidersApiClient } from "../../core/services/supabase-mobile";
import { useProvidersWorkspace } from "../hooks/useProvidersWorkspace";

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(28,25,23,0.14)",
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  backgroundColor: "#fffdf8",
  color: "#1c1917"
} as const;

type OrganizationFormState = Required<UpdateProviderOrganizationInput>;
type PublicProfileFormState = {
  headline: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
};
type ServiceFormState = {
  id?: Uuid;
  name: string;
  category: ProviderServiceCategory;
  shortDescription: string;
  speciesServedText: string;
  durationMinutes: string;
  bookingMode: BookingMode;
  basePrice: string;
  currencyCode: string;
  cancellationWindowHours: string;
  isPublic: boolean;
  isActive: boolean;
};
type AvailabilityFormState = {
  id?: Uuid;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};
type PickedDocument = {
  fileName: string;
  mimeType: string | null;
  uri: string;
};
type DocumentFormState = {
  title: string;
  documentType: ProviderApprovalDocumentType;
  selectedDocument: PickedDocument | null;
};

const emptyOrganizationForm: OrganizationFormState = {
  name: "",
  slug: "",
  city: "",
  countryCode: "PA",
  isPublic: true
};

const emptyPublicProfileForm: PublicProfileFormState = {
  headline: "",
  bio: "",
  avatarUrl: "",
  isPublic: true
};

const emptyServiceForm: ServiceFormState = {
  name: "",
  category: "walking",
  shortDescription: "",
  speciesServedText: "",
  durationMinutes: "",
  bookingMode: "instant",
  basePrice: "0",
  currencyCode: "USD",
  cancellationWindowHours: "24",
  isPublic: true,
  isActive: true
};

const emptyAvailabilityForm: AvailabilityFormState = {
  dayOfWeek: 1,
  startsAt: "09:00",
  endsAt: "17:00",
  isActive: true
};

const emptyDocumentForm: DocumentFormState = {
  title: "",
  documentType: "other",
  selectedDocument: null
};

function normalizeSpeciesServed(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((segment) => segment.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatFileSize(fileSizeBytes: number) {
  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`;
  }

  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: disabled ? 0.65 : 1
      }}
    >
      <Text style={{ color: tone === "primary" ? "#f8fafc" : "#1c1917", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function Field({
  keyboardType = "default",
  label,
  onChange,
  value
}: {
  keyboardType?: "default" | "numeric";
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput autoCapitalize="none" keyboardType={keyboardType} onChangeText={onChange} style={inputStyle} value={value} />
    </View>
  );
}

function MultilineField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput multiline numberOfLines={4} onChangeText={onChange} style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]} value={value} />
    </View>
  );
}

function ChoiceBar<TValue extends string | number>({
  onChange,
  options,
  value
}: {
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isActive ? "rgba(15,118,110,0.3)" : "rgba(28,25,23,0.14)",
              backgroundColor: isActive ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.86)",
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: isActive ? "#0f766e" : "#1c1917", fontWeight: "600" }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Notice({ message, tone }: { message: string; tone: "error" | "info" }) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: tone === "error" ? "rgba(127,29,29,0.18)" : "rgba(15,118,110,0.2)",
        backgroundColor: tone === "error" ? "rgba(127,29,29,0.08)" : "rgba(15,118,110,0.1)",
        padding: 14
      }}
    >
      <Text style={{ color: tone === "error" ? "#991b1b" : "#0f766e", fontWeight: "600" }}>{message}</Text>
    </View>
  );
}

export function ProvidersWorkspace({
  enabled,
  hasProviderRole,
  providerRoleActive
}: {
  enabled: boolean;
  hasProviderRole: boolean;
  providerRoleActive: boolean;
}) {
  const {
    organizations,
    selectedOrganizationId,
    selectedOrganizationDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    providerBookings,
    selectedProviderBookingDetail,
    clearMessages,
    selectOrganization,
    openProviderBookingDetail,
    approveProviderBooking,
    rejectProviderBooking,
    completeProviderBooking,
    refresh,
    runAction
  } = useProvidersWorkspace(enabled && hasProviderRole);
  const [organizationMode, setOrganizationMode] = useState<"create" | "edit">("create");
  const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
  const [publicProfileForm, setPublicProfileForm] = useState(emptyPublicProfileForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailabilityForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);

  useEffect(() => {
    if (!selectedOrganizationDetail) {
      return;
    }

    setOrganizationForm({
      name: selectedOrganizationDetail.organization.name,
      slug: selectedOrganizationDetail.organization.slug,
      city: selectedOrganizationDetail.organization.city,
      countryCode: selectedOrganizationDetail.organization.countryCode,
      isPublic: selectedOrganizationDetail.organization.isPublic
    });
    setPublicProfileForm({
      headline: selectedOrganizationDetail.publicProfile?.headline ?? "",
      bio: selectedOrganizationDetail.publicProfile?.bio ?? "",
      avatarUrl: selectedOrganizationDetail.publicProfile?.avatarUrl ?? "",
      isPublic: selectedOrganizationDetail.publicProfile?.isPublic ?? true
    });
    setServiceForm(emptyServiceForm);
    setAvailabilityForm(emptyAvailabilityForm);
    setDocumentForm(emptyDocumentForm);
    setOrganizationMode("edit");
  }, [selectedOrganizationDetail]);

  const selectedOrganization = selectedOrganizationDetail?.organization ?? null;
  const selectedPublicProfile = selectedOrganizationDetail?.publicProfile ?? null;
  const selectedServices = selectedOrganizationDetail?.services ?? [];
  const selectedAvailability = selectedOrganizationDetail?.availability ?? [];
  const selectedDocuments = selectedOrganizationDetail?.approvalDocuments ?? [];
  const pendingProviderBookings = providerBookings.filter((booking) => booking.status === "pending_approval");
  const confirmedProviderBookings = providerBookings.filter((booking) => booking.status === "confirmed");
  const completedProviderBookings = providerBookings.filter((booking) => booking.status === "completed");
  const hasPublishedService = selectedServices.some((service) => service.isPublic && service.isActive);
  const isMarketplaceVisible =
    selectedOrganization?.approvalStatus === "approved" &&
    Boolean(selectedOrganization?.isPublic) &&
    Boolean(selectedPublicProfile?.isPublic) &&
    hasPublishedService;
  const reviewReadiness = useMemo(
    () => [
      { label: "Business profile saved", done: Boolean(selectedPublicProfile) },
      { label: "At least one service configured", done: selectedServices.length > 0 },
      { label: "Availability configured", done: selectedAvailability.length > 0 },
      { label: "Approval docs uploaded", done: selectedDocuments.length > 0 }
    ],
    [selectedAvailability.length, selectedDocuments.length, selectedPublicProfile, selectedServices.length]
  );

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSectionCard
        eyebrow="Providers / MVP"
        title="Provider onboarding, public profile and approval readiness"
        description="This MVP slice covers provider setup plus the minimum booking operation needed for approval-based services: organization, public profile, services, availability, approval documents, approval status and incoming booking review."
      >
        {!hasProviderRole ? (
          <Text style={{ color: colorTokens.muted }}>
            This workspace stays locked until the user has the provider role provisioned in core.
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {!providerRoleActive ? (
              <Notice
                message="The provider workspace works with any provisioned provider role, but switching the active role to provider keeps the session aligned with this context."
                tone="info"
              />
            ) : null}

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Organizations</Text>
                <StatusChip label={`${organizations.length} total`} tone="neutral" />
              </View>
              {isLoading && !organizations.length && !selectedOrganizationDetail ? (
                <Text style={{ color: colorTokens.muted }}>Loading provider organizations from Supabase...</Text>
              ) : organizations.length ? (
                organizations.map((organization) => (
                  <Pressable
                    key={organization.id}
                    onPress={() => void selectOrganization(organization.id)}
                    style={{
                      borderRadius: 16,
                      backgroundColor:
                        organization.id === selectedOrganizationId ? "rgba(15,118,110,0.08)" : "rgba(255,255,255,0.78)",
                      borderWidth: 1,
                      borderColor:
                        organization.id === selectedOrganizationId ? "rgba(15,118,110,0.24)" : "rgba(28,25,23,0.08)",
                      padding: 12,
                      gap: 8
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{organization.name}</Text>
                      <StatusChip
                        label={providerApprovalStatusLabels[organization.approvalStatus]}
                        tone={
                          organization.approvalStatus === "approved"
                            ? "active"
                            : organization.approvalStatus === "rejected"
                              ? "neutral"
                              : "pending"
                        }
                      />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>{organization.city}</Text>
                    <Text style={{ color: colorTokens.muted }}>{organization.slug}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: colorTokens.muted }}>No provider organizations yet. Create the first one below.</Text>
              )}
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button
                  disabled={isSubmitting}
                  label="New organization"
                  onPress={() => {
                    clearMessages();
                    setOrganizationMode("create");
                    setOrganizationForm(emptyOrganizationForm);
                  }}
                  tone="secondary"
                />
                <Button disabled={isSubmitting} label="Refresh" onPress={() => void refresh(selectedOrganizationId)} tone="secondary" />
              </View>
            </View>

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>
                  {organizationMode === "create" ? "Create business" : "Edit business"}
                </Text>
                <StatusChip label={organizationMode === "create" ? "create" : "edit"} tone="neutral" />
              </View>
              <Field label="Business name" onChange={(value) => setOrganizationForm((current) => ({ ...current, name: value }))} value={organizationForm.name} />
              <Field label="Slug" onChange={(value) => setOrganizationForm((current) => ({ ...current, slug: value }))} value={organizationForm.slug} />
              <Field label="City" onChange={(value) => setOrganizationForm((current) => ({ ...current, city: value }))} value={organizationForm.city} />
              <Field label="Country code" onChange={(value) => setOrganizationForm((current) => ({ ...current, countryCode: value }))} value={organizationForm.countryCode} />
              <ChoiceBar
                onChange={(value) => setOrganizationForm((current) => ({ ...current, isPublic: value === "public" }))}
                options={[
                  { label: "Public when approved", value: "public" },
                  { label: "Keep private", value: "private" }
                ]}
                value={organizationForm.isPublic ? "public" : "private"}
              />
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button
                  disabled={isSubmitting}
                  label={organizationMode === "create" ? "Create organization" : "Save organization"}
                  onPress={() => {
                    clearMessages();
                    const payload = {
                      name: organizationForm.name.trim(),
                      slug: organizationForm.slug.trim().toLowerCase(),
                      city: organizationForm.city.trim(),
                      countryCode: organizationForm.countryCode.trim().toUpperCase(),
                      isPublic: organizationForm.isPublic
                    } satisfies UpdateProviderOrganizationInput;

                    if (organizationMode === "edit" && selectedOrganization) {
                      void runAction(
                        () => getMobileProvidersApiClient().updateProviderOrganization(selectedOrganization.id, payload),
                        "Provider organization updated."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                      });
                      return;
                    }

                    void runAction(
                      () => getMobileProvidersApiClient().createProviderOrganization(payload),
                      "Provider organization created."
                    ).then(async (organization) => {
                      await refresh(organization.id);
                    });
                  }}
                />
                {organizationMode === "edit" ? (
                  <Button
                    disabled={isSubmitting}
                    label="Create another"
                    onPress={() => {
                      setOrganizationMode("create");
                      setOrganizationForm(emptyOrganizationForm);
                    }}
                    tone="secondary"
                  />
                ) : null}
              </View>
            </View>

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Approval and publication</Text>
                {selectedOrganization ? (
                  <StatusChip
                    label={providerApprovalStatusLabels[selectedOrganization.approvalStatus]}
                    tone={
                      selectedOrganization.approvalStatus === "approved"
                        ? "active"
                        : selectedOrganization.approvalStatus === "rejected"
                          ? "neutral"
                          : "pending"
                    }
                  />
                ) : null}
              </View>
              {selectedOrganization ? (
                <>
                  <Text style={{ color: colorTokens.muted }}>
                    Business visibility: {selectedOrganization.isPublic ? "Public when approved" : "Private even if approved"}
                  </Text>
                  <Text style={{ color: colorTokens.muted }}>
                    Marketplace status: {isMarketplaceVisible ? "Visible in discovery" : "Hidden from discovery"}
                  </Text>
                  {reviewReadiness.map((item) => (
                    <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ color: "#1c1917", flex: 1 }}>{item.label}</Text>
                      <StatusChip label={item.done ? "ready" : "missing"} tone={item.done ? "active" : "pending"} />
                    </View>
                  ))}
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Create or select an organization to inspect its approval status.</Text>
              )}
            </View>

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Incoming bookings</Text>
                <StatusChip label={`${providerBookings.length} total`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <StatusChip label={`${pendingProviderBookings.length} pending`} tone={pendingProviderBookings.length ? "pending" : "neutral"} />
                    <StatusChip label={`${confirmedProviderBookings.length} confirmed`} tone={confirmedProviderBookings.length ? "active" : "neutral"} />
                    <StatusChip label={`${completedProviderBookings.length} completed`} tone={completedProviderBookings.length ? "active" : "neutral"} />
                  </View>
                  {providerBookings.length ? (
                    <View style={{ gap: 8 }}>
                      {providerBookings.map((booking) => (
                        <View key={booking.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{booking.serviceName}</Text>
                            <StatusChip
                              label={bookingStatusLabels[booking.status]}
                              tone={booking.status === "pending_approval" ? "pending" : booking.status === "cancelled" ? "neutral" : "active"}
                            />
                          </View>
                          <Text style={{ color: colorTokens.muted }}>
                            {booking.householdName} · {booking.customerDisplayName}
                          </Text>
                          <Text style={{ color: colorTokens.muted }}>
                            {booking.petName} · {formatDateTime(booking.scheduledStartAt)}
                          </Text>
                          <Text style={{ color: colorTokens.muted }}>
                            {formatMoney(booking.totalPriceCents, booking.currencyCode)} · {booking.bookingMode === "instant" ? "Instant booking" : "Approval required"}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                            <Button disabled={isSubmitting} label="View detail" onPress={() => void openProviderBookingDetail(booking.id)} tone="secondary" />
                            {booking.status === "pending_approval" ? (
                              <>
                                <Button disabled={isSubmitting} label="Approve" onPress={() => void approveProviderBooking(booking.id)} />
                                <Button
                                  disabled={isSubmitting}
                                  label="Reject"
                                  onPress={() => void rejectProviderBooking(booking.id, "Booking request declined by provider")}
                                  tone="secondary"
                                />
                              </>
                            ) : null}
                            {booking.status === "confirmed" ? (
                              <Button disabled={isSubmitting} label="Mark completed" onPress={() => void completeProviderBooking(booking.id)} />
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: colorTokens.muted }}>
                      No bookings exist yet for this provider organization. Once an approved public service is booked, requests and confirmed reservations will appear here.
                    </Text>
                  )}

                  {selectedProviderBookingDetail ? (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>Booking detail</Text>
                        <StatusChip
                          label={bookingStatusLabels[selectedProviderBookingDetail.booking.status]}
                          tone={
                            selectedProviderBookingDetail.booking.status === "pending_approval"
                              ? "pending"
                              : selectedProviderBookingDetail.booking.status === "cancelled"
                                ? "neutral"
                                : "active"
                          }
                        />
                      </View>
                      <Text style={{ color: colorTokens.muted }}>
                        {selectedProviderBookingDetail.booking.householdName} · {selectedProviderBookingDetail.booking.customerDisplayName}
                      </Text>
                      <Text style={{ color: colorTokens.muted }}>
                        {selectedProviderBookingDetail.booking.petName} · {formatDateTime(selectedProviderBookingDetail.booking.scheduledStartAt)}
                      </Text>
                      <Text style={{ color: colorTokens.muted }}>
                        Payment method:{" "}
                        {selectedProviderBookingDetail.paymentMethodSummary
                          ? `${selectedProviderBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedProviderBookingDetail.paymentMethodSummary.last4}`
                          : "No saved payment method linked"}
                      </Text>
                      {selectedProviderBookingDetail.statusHistory.map((change) => (
                        <View key={change.id} style={[inputStyle, { gap: 6 }]}>
                          <Text style={{ fontWeight: "600", color: "#1c1917" }}>{bookingStatusLabels[change.toStatus]}</Text>
                          <Text style={{ color: colorTokens.muted }}>{formatDateTime(change.createdAt)}</Text>
                          <Text style={{ color: colorTokens.muted }}>{change.changeReason ?? "No extra reason captured."}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Select an organization first.</Text>
              )}
            </View>

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Public profile</Text>
              {selectedOrganization ? (
                <>
                  <Field label="Headline" onChange={(value) => setPublicProfileForm((current) => ({ ...current, headline: value }))} value={publicProfileForm.headline} />
                  <MultilineField label="Business bio" onChange={(value) => setPublicProfileForm((current) => ({ ...current, bio: value }))} value={publicProfileForm.bio} />
                  <Field label="Avatar URL" onChange={(value) => setPublicProfileForm((current) => ({ ...current, avatarUrl: value }))} value={publicProfileForm.avatarUrl} />
                  <ChoiceBar
                    onChange={(value) => setPublicProfileForm((current) => ({ ...current, isPublic: value === "public" }))}
                    options={[
                      { label: "Public profile", value: "public" },
                      { label: "Hidden profile", value: "hidden" }
                    ]}
                    value={publicProfileForm.isPublic ? "public" : "hidden"}
                  />
                  <Button
                    disabled={isSubmitting}
                    label="Save public profile"
                    onPress={() => {
                      clearMessages();
                      void runAction(
                        () =>
                          getMobileProvidersApiClient().upsertProviderPublicProfile(selectedOrganization.id, {
                            headline: publicProfileForm.headline.trim(),
                            bio: publicProfileForm.bio.trim(),
                            avatarUrl: publicProfileForm.avatarUrl.trim() || null,
                            isPublic: publicProfileForm.isPublic
                          }),
                        "Public profile saved."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                      });
                    }}
                  />
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Select an organization first.</Text>
              )}
            </View>

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Services</Text>
                <StatusChip label={`${selectedServices.length} total`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <Field label="Service name" onChange={(value) => setServiceForm((current) => ({ ...current, name: value }))} value={serviceForm.name} />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, category: value }))}
                    options={providerServiceCategoryOrder.map((category) => ({
                      label: providerServiceCategoryLabels[category],
                      value: category
                    }))}
                    value={serviceForm.category}
                  />
                  <MultilineField label="Short description" onChange={(value) => setServiceForm((current) => ({ ...current, shortDescription: value }))} value={serviceForm.shortDescription} />
                  <Field label="Species served (comma separated)" onChange={(value) => setServiceForm((current) => ({ ...current, speciesServedText: value }))} value={serviceForm.speciesServedText} />
                  <Field keyboardType="numeric" label="Duration (min)" onChange={(value) => setServiceForm((current) => ({ ...current, durationMinutes: value }))} value={serviceForm.durationMinutes} />
                  <Field keyboardType="numeric" label="Base price (USD)" onChange={(value) => setServiceForm((current) => ({ ...current, basePrice: value }))} value={serviceForm.basePrice} />
                  <Field keyboardType="numeric" label="Cancel window (hrs)" onChange={(value) => setServiceForm((current) => ({ ...current, cancellationWindowHours: value }))} value={serviceForm.cancellationWindowHours} />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, bookingMode: value }))}
                    options={[
                      { label: "Instant booking", value: "instant" },
                      { label: "Needs approval", value: "approval_required" }
                    ]}
                    value={serviceForm.bookingMode}
                  />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, isPublic: value === "public" }))}
                    options={[
                      { label: "Public", value: "public" },
                      { label: "Hidden", value: "hidden" }
                    ]}
                    value={serviceForm.isPublic ? "public" : "hidden"}
                  />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, isActive: value === "active" }))}
                    options={[
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" }
                    ]}
                    value={serviceForm.isActive ? "active" : "inactive"}
                  />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      label={serviceForm.id ? "Save service" : "Create service"}
                      onPress={() => {
                        clearMessages();
                        const payload = {
                          name: serviceForm.name.trim(),
                          category: serviceForm.category,
                          shortDescription: serviceForm.shortDescription.trim() || null,
                          speciesServed: normalizeSpeciesServed(serviceForm.speciesServedText),
                          durationMinutes: serviceForm.durationMinutes ? Number(serviceForm.durationMinutes) : null,
                          bookingMode: serviceForm.bookingMode,
                          basePriceCents: Math.max(0, Math.round(Number(serviceForm.basePrice || "0") * 100)),
                          currencyCode: serviceForm.currencyCode.trim().toUpperCase() || "USD",
                          cancellationWindowHours: Number(serviceForm.cancellationWindowHours || "24"),
                          isPublic: serviceForm.isPublic,
                          isActive: serviceForm.isActive
                        } satisfies UpdateProviderServiceInput;

                        if (serviceForm.id) {
                          void runAction(
                            () => getMobileProvidersApiClient().updateProviderService(serviceForm.id!, payload),
                            "Provider service updated."
                          ).then(async () => {
                            setServiceForm(emptyServiceForm);
                            await refresh(selectedOrganization.id);
                          });
                          return;
                        }

                        void runAction(
                          () =>
                            getMobileProvidersApiClient().createProviderService({
                              organizationId: selectedOrganization.id,
                              ...payload
                            }),
                          "Provider service created."
                        ).then(async () => {
                          setServiceForm(emptyServiceForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                    />
                    {serviceForm.id ? <Button disabled={isSubmitting} label="Cancel edit" onPress={() => setServiceForm(emptyServiceForm)} tone="secondary" /> : null}
                  </View>
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Select an organization first.</Text>
              )}
            </View>

            {selectedServices.length ? (
              <View style={{ gap: 8 }}>
                {selectedServices.map((service) => (
                  <View key={service.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{service.name}</Text>
                      <StatusChip label={service.isPublic ? "public" : "hidden"} tone={service.isPublic ? "active" : "neutral"} />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>
                      {providerServiceCategoryLabels[service.category]} · {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                    </Text>
                    <Text style={{ color: colorTokens.muted }}>
                      {formatMoney(service.basePriceCents, service.currencyCode)} · {service.bookingMode === "instant" ? "Instant booking" : "Approval required"}
                    </Text>
                    <Text style={{ color: colorTokens.muted }}>{service.shortDescription ?? "No description yet."}</Text>
                    <Button
                      disabled={isSubmitting}
                      label="Edit"
                      onPress={() =>
                        setServiceForm({
                          id: service.id,
                          name: service.name,
                          category: service.category,
                          shortDescription: service.shortDescription ?? "",
                          speciesServedText: service.speciesServed.join(", "),
                          durationMinutes: service.durationMinutes?.toString() ?? "",
                          bookingMode: service.bookingMode,
                          basePrice: (service.basePriceCents / 100).toFixed(2),
                          currencyCode: service.currencyCode,
                          cancellationWindowHours: service.cancellationWindowHours.toString(),
                          isPublic: service.isPublic,
                          isActive: service.isActive
                        })
                      }
                      tone="secondary"
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Availability</Text>
                <StatusChip label={`${selectedAvailability.length} slot(s)`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <ChoiceBar
                    onChange={(value) => setAvailabilityForm((current) => ({ ...current, dayOfWeek: value }))}
                    options={providerDayOfWeekOrder.map((dayOfWeek) => ({
                      label: providerDayOfWeekLabels[dayOfWeek],
                      value: dayOfWeek
                    }))}
                    value={availabilityForm.dayOfWeek}
                  />
                  <Field label="Starts at" onChange={(value) => setAvailabilityForm((current) => ({ ...current, startsAt: value }))} value={availabilityForm.startsAt} />
                  <Field label="Ends at" onChange={(value) => setAvailabilityForm((current) => ({ ...current, endsAt: value }))} value={availabilityForm.endsAt} />
                  <ChoiceBar
                    onChange={(value) => setAvailabilityForm((current) => ({ ...current, isActive: value === "active" }))}
                    options={[
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" }
                    ]}
                    value={availabilityForm.isActive ? "active" : "inactive"}
                  />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      label={availabilityForm.id ? "Save slot" : "Create slot"}
                      onPress={() => {
                        clearMessages();

                        if (availabilityForm.id) {
                          void runAction(
                            () =>
                              getMobileProvidersApiClient().updateProviderAvailabilitySlot(availabilityForm.id!, {
                                dayOfWeek: availabilityForm.dayOfWeek,
                                startsAt: availabilityForm.startsAt,
                                endsAt: availabilityForm.endsAt,
                                isActive: availabilityForm.isActive
                              }),
                            "Availability slot updated."
                          ).then(async () => {
                            setAvailabilityForm(emptyAvailabilityForm);
                            await refresh(selectedOrganization.id);
                          });
                          return;
                        }

                        void runAction(
                          () =>
                            getMobileProvidersApiClient().addProviderAvailabilitySlot({
                              organizationId: selectedOrganization.id,
                              dayOfWeek: availabilityForm.dayOfWeek,
                              startsAt: availabilityForm.startsAt,
                              endsAt: availabilityForm.endsAt,
                              isActive: availabilityForm.isActive
                            }),
                          "Availability slot created."
                        ).then(async () => {
                          setAvailabilityForm(emptyAvailabilityForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                    />
                    {availabilityForm.id ? <Button disabled={isSubmitting} label="Cancel edit" onPress={() => setAvailabilityForm(emptyAvailabilityForm)} tone="secondary" /> : null}
                  </View>
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Select an organization first.</Text>
              )}
            </View>

            {selectedAvailability.length ? (
              <View style={{ gap: 8 }}>
                {selectedAvailability.map((slot) => (
                  <View key={slot.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{providerDayOfWeekLabels[slot.dayOfWeek]}</Text>
                      <StatusChip label={slot.isActive ? "active" : "inactive"} tone={slot.isActive ? "active" : "neutral"} />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>{slot.startsAt.slice(0, 5)} - {slot.endsAt.slice(0, 5)}</Text>
                    <Button
                      disabled={isSubmitting}
                      label="Edit"
                      onPress={() =>
                        setAvailabilityForm({
                          id: slot.id,
                          dayOfWeek: slot.dayOfWeek,
                          startsAt: slot.startsAt,
                          endsAt: slot.endsAt,
                          isActive: slot.isActive
                        })
                      }
                      tone="secondary"
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Approval documents</Text>
                <StatusChip label={`${selectedDocuments.length} uploaded`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <Field label="Document title" onChange={(value) => setDocumentForm((current) => ({ ...current, title: value }))} value={documentForm.title} />
                  <ChoiceBar
                    onChange={(value) => setDocumentForm((current) => ({ ...current, documentType: value }))}
                    options={providerApprovalDocumentTypeOrder.map((documentType) => ({
                      label: providerApprovalDocumentTypeLabels[documentType],
                      value: documentType
                    }))}
                    value={documentForm.documentType}
                  />
                  <Button
                    disabled={isSubmitting}
                    label={documentForm.selectedDocument ? `Selected: ${documentForm.selectedDocument.fileName}` : "Choose approval document"}
                    onPress={() => {
                      void DocumentPicker.getDocumentAsync({
                        multiple: false,
                        copyToCacheDirectory: true,
                        type: "*/*"
                      }).then((result) => {
                        if (result.canceled) {
                          return;
                        }

                        const asset = result.assets[0];

                        if (!asset) {
                          return;
                        }

                        setDocumentForm((current) => ({
                          ...current,
                          selectedDocument: {
                            fileName: asset.name,
                            mimeType: asset.mimeType ?? null,
                            uri: asset.uri
                          }
                        }));
                      });
                    }}
                    tone="secondary"
                  />
                  <Button
                    disabled={isSubmitting}
                    label="Upload approval document"
                    onPress={() => {
                      clearMessages();
                      const selectedDocument = documentForm.selectedDocument;

                      void runAction(
                        async () => {
                          if (!selectedDocument) {
                            throw new Error("Choose a document before uploading.");
                          }

                          const response = await fetch(selectedDocument.uri);
                          const fileBytes = await response.arrayBuffer();

                          return getMobileProvidersApiClient().uploadProviderApprovalDocument(selectedOrganization.id, {
                            title: documentForm.title.trim() || selectedDocument.fileName,
                            documentType: documentForm.documentType,
                            fileName: selectedDocument.fileName,
                            mimeType: selectedDocument.mimeType,
                            fileBytes
                          });
                        },
                        "Approval document uploaded."
                      ).then(async () => {
                        setDocumentForm(emptyDocumentForm);
                        await refresh(selectedOrganization.id);
                      });
                    }}
                  />
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Select an organization first.</Text>
              )}
            </View>

            {selectedDocuments.length ? (
              <View style={{ gap: 8 }}>
                {selectedDocuments.map((document) => (
                  <View key={document.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{document.title}</Text>
                      <StatusChip label={providerApprovalDocumentTypeLabels[document.documentType]} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>{document.fileName}</Text>
                    <Text style={{ color: colorTokens.muted }}>
                      {document.mimeType ?? "Unknown file type"} · {formatFileSize(document.fileSizeBytes)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </CoreSectionCard>
    </View>
  );
}
