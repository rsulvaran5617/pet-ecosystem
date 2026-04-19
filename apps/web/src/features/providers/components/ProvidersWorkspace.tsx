"use client";

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
import type {
  BookingMode,
  ProviderApprovalDocumentType,
  ProviderServiceCategory,
  UpdateProviderOrganizationInput,
  UpdateProviderServiceInput,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { getBrowserProvidersApiClient } from "../../core/services/supabase-browser";
import { useProvidersWorkspace } from "../hooks/useProvidersWorkspace";

const fieldLabelStyle = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#78716c"
};

const controlStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(28, 25, 23, 0.14)",
  padding: "12px 14px",
  fontSize: "15px",
  background: "#fffdf8"
};

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
type DocumentFormState = {
  title: string;
  documentType: ProviderApprovalDocumentType;
  file: File | null;
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
  file: null
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

function Button({
  children,
  disabled,
  onClick,
  tone = "primary",
  type = "button"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type}
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

function Field({
  label,
  onChange,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "number" | "text" | "time";
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} style={controlStyle} type={type} value={value} />
    </label>
  );
}

function SelectField<TValue extends string | number>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select
        onChange={(event) => onChange((typeof value === "number" ? Number(event.target.value) : event.target.value) as TValue)}
        style={controlStyle}
        value={String(value)}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        style={{ ...controlStyle, resize: "vertical" as const }}
        value={value}
      />
    </label>
  );
}

function CheckField({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", gap: "10px", alignItems: "center", color: "#44403c" }}>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function Notice({ message, tone }: { message: string; tone: "error" | "info" }) {
  const palette =
    tone === "error"
      ? { background: "rgba(127,29,29,0.08)", border: "rgba(127,29,29,0.18)", color: "#991b1b" }
      : { background: "rgba(15,118,110,0.1)", border: "rgba(15,118,110,0.2)", color: "#0f766e" };

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        padding: "14px 16px",
        fontWeight: 600
      }}
    >
      {message}
    </div>
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
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSection
        eyebrow="Providers / MVP"
        title="Provider onboarding, public profile and approval readiness"
        description="This MVP slice covers provider setup plus the minimum booking operation needed for approval-based services: organization, public profile, services, availability, approval documents, approval status and incoming booking review."
      >
        {!hasProviderRole ? (
          <p style={{ margin: 0, color: "#57534e" }}>
            This workspace stays locked until the user has the provider role provisioned in core.
          </p>
        ) : isLoading && !organizations.length && !selectedOrganizationDetail ? (
          <p style={{ margin: 0, color: "#57534e" }}>Loading provider organizations from Supabase...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(250px, 300px) minmax(280px, 360px) minmax(0, 1fr)",
              gap: "18px"
            }}
          >
            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Organizations</h3>
                  <StatusPill label={`${organizations.length} total`} tone="neutral" />
                </div>
                {!providerRoleActive ? (
                  <p style={{ margin: 0, color: "#57534e" }}>
                    The provider workspace works with any provisioned provider role, but switching the active role to <strong>provider</strong> keeps the session aligned with this context.
                  </p>
                ) : null}
                {organizations.length ? (
                  organizations.map((organization) => (
                    <button
                      key={organization.id}
                      onClick={() => void selectOrganization(organization.id)}
                      style={{
                        borderRadius: "18px",
                        border:
                          organization.id === selectedOrganizationId
                            ? "1px solid rgba(15, 118, 110, 0.28)"
                            : "1px solid rgba(28, 25, 23, 0.1)",
                        padding: "16px",
                        textAlign: "left",
                        background:
                          organization.id === selectedOrganizationId
                            ? "rgba(15, 118, 110, 0.08)"
                            : "rgba(255,255,255,0.72)",
                        display: "grid",
                        gap: "8px",
                        cursor: "pointer"
                      }}
                      type="button"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <strong>{organization.name}</strong>
                        <StatusPill
                          label={providerApprovalStatusLabels[organization.approvalStatus]}
                          tone={
                            organization.approvalStatus === "approved"
                              ? "active"
                              : organization.approvalStatus === "rejected"
                                ? "neutral"
                                : "pending"
                          }
                        />
                      </div>
                      <span style={{ color: "#57534e" }}>{organization.city}</span>
                      <span style={{ color: "#57534e" }}>{organization.slug}</span>
                    </button>
                  ))
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>No provider organizations yet. Create the first one below.</p>
                )}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    onClick={() => {
                      clearMessages();
                      setOrganizationMode("create");
                      setOrganizationForm(emptyOrganizationForm);
                    }}
                    tone="secondary"
                  >
                    New organization
                  </Button>
                  <Button disabled={isSubmitting} onClick={() => void refresh(selectedOrganizationId)} tone="secondary">
                    Refresh
                  </Button>
                </div>
              </article>

              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{organizationMode === "create" ? "Create business" : "Edit business"}</h3>
                  <StatusPill label={organizationMode === "create" ? "create" : "edit"} tone="neutral" />
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
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
                        () => getBrowserProvidersApiClient().updateProviderOrganization(selectedOrganization.id, payload),
                        "Provider organization updated."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                      });
                      return;
                    }

                    void runAction(
                      () => getBrowserProvidersApiClient().createProviderOrganization(payload),
                      "Provider organization created."
                    ).then(async (organization) => {
                      await refresh(organization.id);
                    });
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <Field label="Business name" onChange={(value) => setOrganizationForm((current) => ({ ...current, name: value }))} value={organizationForm.name} />
                  <Field label="Slug" onChange={(value) => setOrganizationForm((current) => ({ ...current, slug: value }))} value={organizationForm.slug} />
                  <Field label="City" onChange={(value) => setOrganizationForm((current) => ({ ...current, city: value }))} value={organizationForm.city} />
                  <Field label="Country code" onChange={(value) => setOrganizationForm((current) => ({ ...current, countryCode: value }))} value={organizationForm.countryCode} />
                  <CheckField checked={organizationForm.isPublic} label="Allow public publication when approved" onChange={(value) => setOrganizationForm((current) => ({ ...current, isPublic: value }))} />
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} type="submit">
                      {organizationMode === "create" ? "Create organization" : "Save organization"}
                    </Button>
                    {organizationMode === "edit" ? (
                      <Button
                        disabled={isSubmitting}
                        onClick={() => {
                          setOrganizationMode("create");
                          setOrganizationForm(emptyOrganizationForm);
                        }}
                        tone="secondary"
                      >
                        Create another
                      </Button>
                    ) : null}
                  </div>
                </form>
              </article>
            </div>

            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Approval and publication</h3>
                  {selectedOrganization ? (
                    <StatusPill
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
                </div>
                {selectedOrganization ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px" }}>
                      <div style={{ ...controlStyle, display: "grid", gap: "6px" }}>
                        <strong>Business visibility</strong>
                        <span style={{ color: "#57534e" }}>{selectedOrganization.isPublic ? "Public when approved" : "Private even if approved"}</span>
                      </div>
                      <div style={{ ...controlStyle, display: "grid", gap: "6px" }}>
                        <strong>Marketplace status</strong>
                        <span style={{ color: "#57534e" }}>{isMarketplaceVisible ? "Visible in discovery" : "Hidden from discovery"}</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      {reviewReadiness.map((item) => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                          <span style={{ color: "#44403c" }}>{item.label}</span>
                          <StatusPill label={item.done ? "ready" : "missing"} tone={item.done ? "active" : "pending"} />
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                      Public discovery remains locked until the organization is <strong>approved</strong>, the business is marked public, the public profile is public and at least one service is public plus active.
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Create or select an organization to inspect its approval status.</p>
                )}
              </article>

              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Incoming bookings</h3>
                  <StatusPill label={`${providerBookings.length} booking(s)`} tone="neutral" />
                </div>
                {selectedOrganization ? (
                  <>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <StatusPill label={`${pendingProviderBookings.length} pending`} tone={pendingProviderBookings.length ? "pending" : "neutral"} />
                      <StatusPill label={`${confirmedProviderBookings.length} confirmed`} tone={confirmedProviderBookings.length ? "active" : "neutral"} />
                      <StatusPill label={`${completedProviderBookings.length} completed`} tone={completedProviderBookings.length ? "active" : "neutral"} />
                    </div>
                    {providerBookings.length ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {providerBookings.map((booking) => (
                          <article
                            key={booking.id}
                            style={{
                              borderRadius: "18px",
                              padding: "14px 16px",
                              background: "rgba(255,255,255,0.72)",
                              display: "grid",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                              <strong>{booking.serviceName}</strong>
                              <StatusPill
                                label={bookingStatusLabels[booking.status]}
                                tone={booking.status === "pending_approval" ? "pending" : booking.status === "cancelled" ? "neutral" : "active"}
                              />
                            </div>
                            <span style={{ color: "#57534e" }}>
                              {booking.householdName} · {booking.customerDisplayName}
                            </span>
                            <span style={{ color: "#57534e" }}>
                              {booking.petName} · {formatDateTime(booking.scheduledStartAt)}
                            </span>
                            <span style={{ color: "#57534e" }}>
                              {formatMoney(booking.totalPriceCents, booking.currencyCode)} · {booking.bookingMode === "instant" ? "Instant booking" : "Approval required"}
                            </span>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              <Button disabled={isSubmitting} onClick={() => void openProviderBookingDetail(booking.id)} tone="secondary">
                                View detail
                              </Button>
                              {booking.status === "pending_approval" ? (
                                <>
                                  <Button disabled={isSubmitting} onClick={() => void approveProviderBooking(booking.id)}>
                                    Approve
                                  </Button>
                                  <Button
                                    disabled={isSubmitting}
                                    onClick={() => void rejectProviderBooking(booking.id, "Booking request declined by provider")}
                                    tone="secondary"
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : null}
                              {booking.status === "confirmed" ? (
                                <Button disabled={isSubmitting} onClick={() => void completeProviderBooking(booking.id)}>
                                  Mark completed
                                </Button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>
                        No bookings exist yet for this provider organization. Once an approved public service is booked, requests and confirmed reservations will appear here.
                      </p>
                    )}

                    {selectedProviderBookingDetail ? (
                      <div
                        style={{
                          borderRadius: "18px",
                          padding: "16px",
                          background: "rgba(255,255,255,0.72)",
                          display: "grid",
                          gap: "10px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                          <strong>Booking detail</strong>
                          <StatusPill
                            label={bookingStatusLabels[selectedProviderBookingDetail.booking.status]}
                            tone={
                              selectedProviderBookingDetail.booking.status === "pending_approval"
                                ? "pending"
                                : selectedProviderBookingDetail.booking.status === "cancelled"
                                  ? "neutral"
                                  : "active"
                            }
                          />
                        </div>
                        <span style={{ color: "#57534e" }}>
                          {selectedProviderBookingDetail.booking.householdName} · {selectedProviderBookingDetail.booking.customerDisplayName}
                        </span>
                        <span style={{ color: "#57534e" }}>
                          {selectedProviderBookingDetail.booking.petName} · {formatDateTime(selectedProviderBookingDetail.booking.scheduledStartAt)}
                        </span>
                        <span style={{ color: "#57534e" }}>
                          Payment method:{" "}
                          {selectedProviderBookingDetail.paymentMethodSummary
                            ? `${selectedProviderBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedProviderBookingDetail.paymentMethodSummary.last4}`
                            : "No saved payment method linked"}
                        </span>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {selectedProviderBookingDetail.statusHistory.map((change) => (
                            <div key={change.id} style={{ ...controlStyle, display: "grid", gap: "6px" }}>
                              <strong>{bookingStatusLabels[change.toStatus]}</strong>
                              <span style={{ color: "#57534e" }}>{formatDateTime(change.createdAt)}</span>
                              <span style={{ color: "#57534e" }}>{change.changeReason ?? "No extra reason captured."}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Select an organization first.</p>
                )}
              </article>

              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Public profile</h3>
                  {selectedPublicProfile ? <StatusPill label={selectedPublicProfile.isPublic ? "public" : "hidden"} tone={selectedPublicProfile.isPublic ? "active" : "neutral"} /> : null}
                </div>
                {selectedOrganization ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      void runAction(
                        () =>
                          getBrowserProvidersApiClient().upsertProviderPublicProfile(selectedOrganization.id, {
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
                    style={{ display: "grid", gap: "12px" }}
                  >
                    <Field label="Headline" onChange={(value) => setPublicProfileForm((current) => ({ ...current, headline: value }))} value={publicProfileForm.headline} />
                    <TextArea label="Business bio" onChange={(value) => setPublicProfileForm((current) => ({ ...current, bio: value }))} value={publicProfileForm.bio} />
                    <Field label="Avatar URL" onChange={(value) => setPublicProfileForm((current) => ({ ...current, avatarUrl: value }))} value={publicProfileForm.avatarUrl} />
                    <CheckField checked={publicProfileForm.isPublic} label="Publish this profile when the organization is eligible" onChange={(value) => setPublicProfileForm((current) => ({ ...current, isPublic: value }))} />
                    <Button disabled={isSubmitting} type="submit">
                      Save public profile
                    </Button>
                  </form>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Select an organization first.</p>
                )}
              </article>
            </div>

            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Services</h3>
                  <StatusPill label={`${selectedServices.length} total`} tone="neutral" />
                </div>
                {selectedOrganization ? (
                  <>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
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
                            () => getBrowserProvidersApiClient().updateProviderService(serviceForm.id!, payload),
                            "Provider service updated."
                          ).then(async () => {
                            setServiceForm(emptyServiceForm);
                            await refresh(selectedOrganization.id);
                          });
                          return;
                        }

                        void runAction(
                          () =>
                            getBrowserProvidersApiClient().createProviderService({
                              organizationId: selectedOrganization.id,
                              ...payload
                            }),
                          "Provider service created."
                        ).then(async () => {
                          setServiceForm(emptyServiceForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                      style={{ display: "grid", gap: "12px" }}
                    >
                      <Field label="Service name" onChange={(value) => setServiceForm((current) => ({ ...current, name: value }))} value={serviceForm.name} />
                      <SelectField<ProviderServiceCategory>
                        label="Category"
                        onChange={(value) => setServiceForm((current) => ({ ...current, category: value }))}
                        options={providerServiceCategoryOrder.map((category) => ({ label: providerServiceCategoryLabels[category], value: category }))}
                        value={serviceForm.category}
                      />
                      <TextArea label="Short description" onChange={(value) => setServiceForm((current) => ({ ...current, shortDescription: value }))} value={serviceForm.shortDescription} />
                      <Field label="Species served (comma separated)" onChange={(value) => setServiceForm((current) => ({ ...current, speciesServedText: value }))} value={serviceForm.speciesServedText} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "12px" }}>
                        <Field label="Duration (min)" onChange={(value) => setServiceForm((current) => ({ ...current, durationMinutes: value }))} type="number" value={serviceForm.durationMinutes} />
                        <Field label="Base price (USD)" onChange={(value) => setServiceForm((current) => ({ ...current, basePrice: value }))} type="number" value={serviceForm.basePrice} />
                        <Field label="Cancel window (hrs)" onChange={(value) => setServiceForm((current) => ({ ...current, cancellationWindowHours: value }))} type="number" value={serviceForm.cancellationWindowHours} />
                      </div>
                      <SelectField<BookingMode>
                        label="Booking mode"
                        onChange={(value) => setServiceForm((current) => ({ ...current, bookingMode: value }))}
                        options={[
                          { label: "Instant booking", value: "instant" },
                          { label: "Needs approval", value: "approval_required" }
                        ]}
                        value={serviceForm.bookingMode}
                      />
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <CheckField checked={serviceForm.isPublic} label="Public service" onChange={(value) => setServiceForm((current) => ({ ...current, isPublic: value }))} />
                        <CheckField checked={serviceForm.isActive} label="Active service" onChange={(value) => setServiceForm((current) => ({ ...current, isActive: value }))} />
                      </div>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <Button disabled={isSubmitting} type="submit">
                          {serviceForm.id ? "Save service" : "Create service"}
                        </Button>
                        {serviceForm.id ? (
                          <Button disabled={isSubmitting} onClick={() => setServiceForm(emptyServiceForm)} tone="secondary">
                            Cancel edit
                          </Button>
                        ) : null}
                      </div>
                    </form>

                    {selectedServices.length ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {selectedServices.map((service) => (
                          <article
                            key={service.id}
                            style={{
                              borderRadius: "18px",
                              padding: "14px 16px",
                              background: "rgba(255,255,255,0.72)",
                              display: "grid",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                              <strong>{service.name}</strong>
                              <StatusPill label={service.isPublic ? "public" : "hidden"} tone={service.isPublic ? "active" : "neutral"} />
                            </div>
                            <span style={{ color: "#57534e" }}>
                              {providerServiceCategoryLabels[service.category]} · {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                            </span>
                            <span style={{ color: "#57534e" }}>
                              {formatMoney(service.basePriceCents, service.currencyCode)} · {service.bookingMode === "instant" ? "Instant booking" : "Approval required"}
                            </span>
                            <span style={{ color: "#57534e" }}>{service.shortDescription ?? "No description yet."}</span>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <Button
                                disabled={isSubmitting}
                                onClick={() =>
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
                              >
                                Edit
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>No services configured yet.</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Select an organization first.</p>
                )}
              </article>

              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Availability</h3>
                  <StatusPill label={`${selectedAvailability.length} slot(s)`} tone="neutral" />
                </div>
                {selectedOrganization ? (
                  <>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        clearMessages();

                        if (availabilityForm.id) {
                          void runAction(
                            () =>
                              getBrowserProvidersApiClient().updateProviderAvailabilitySlot(availabilityForm.id!, {
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
                            getBrowserProvidersApiClient().addProviderAvailabilitySlot({
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
                      style={{ display: "grid", gap: "12px" }}
                    >
                      <SelectField<AvailabilityFormState["dayOfWeek"]>
                        label="Day"
                        onChange={(value) => setAvailabilityForm((current) => ({ ...current, dayOfWeek: value }))}
                        options={providerDayOfWeekOrder.map((dayOfWeek) => ({ label: providerDayOfWeekLabels[dayOfWeek], value: dayOfWeek }))}
                        value={availabilityForm.dayOfWeek}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Field label="Starts at" onChange={(value) => setAvailabilityForm((current) => ({ ...current, startsAt: value }))} type="time" value={availabilityForm.startsAt} />
                        <Field label="Ends at" onChange={(value) => setAvailabilityForm((current) => ({ ...current, endsAt: value }))} type="time" value={availabilityForm.endsAt} />
                      </div>
                      <CheckField checked={availabilityForm.isActive} label="Active slot" onChange={(value) => setAvailabilityForm((current) => ({ ...current, isActive: value }))} />
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <Button disabled={isSubmitting} type="submit">
                          {availabilityForm.id ? "Save slot" : "Create slot"}
                        </Button>
                        {availabilityForm.id ? (
                          <Button disabled={isSubmitting} onClick={() => setAvailabilityForm(emptyAvailabilityForm)} tone="secondary">
                            Cancel edit
                          </Button>
                        ) : null}
                      </div>
                    </form>

                    {selectedAvailability.length ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {selectedAvailability.map((slot) => (
                          <article
                            key={slot.id}
                            style={{
                              borderRadius: "18px",
                              padding: "14px 16px",
                              background: "rgba(255,255,255,0.72)",
                              display: "grid",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                              <strong>{providerDayOfWeekLabels[slot.dayOfWeek]}</strong>
                              <StatusPill label={slot.isActive ? "active" : "inactive"} tone={slot.isActive ? "active" : "neutral"} />
                            </div>
                            <span style={{ color: "#57534e" }}>
                              {slot.startsAt.slice(0, 5)} - {slot.endsAt.slice(0, 5)}
                            </span>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <Button
                                disabled={isSubmitting}
                                onClick={() =>
                                  setAvailabilityForm({
                                    id: slot.id,
                                    dayOfWeek: slot.dayOfWeek,
                                    startsAt: slot.startsAt,
                                    endsAt: slot.endsAt,
                                    isActive: slot.isActive
                                  })
                                }
                                tone="secondary"
                              >
                                Edit
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>No availability configured yet.</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Select an organization first.</p>
                )}
              </article>

              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Approval documents</h3>
                  <StatusPill label={`${selectedDocuments.length} uploaded`} tone="neutral" />
                </div>
                {selectedOrganization ? (
                  <>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        clearMessages();
                        void runAction(
                          async () => {
                            const selectedFile = documentForm.file;

                            if (!selectedFile) {
                              throw new Error("Choose a file before uploading.");
                            }

                            const fileBytes = await selectedFile.arrayBuffer();

                            return getBrowserProvidersApiClient().uploadProviderApprovalDocument(selectedOrganization.id, {
                              title: documentForm.title.trim() || selectedFile.name,
                              documentType: documentForm.documentType,
                              fileName: selectedFile.name,
                              mimeType: selectedFile.type || null,
                              fileBytes
                            });
                          },
                          "Approval document uploaded."
                        ).then(async () => {
                          setDocumentForm(emptyDocumentForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                      style={{ display: "grid", gap: "12px" }}
                    >
                      <Field label="Document title" onChange={(value) => setDocumentForm((current) => ({ ...current, title: value }))} value={documentForm.title} />
                      <SelectField<ProviderApprovalDocumentType>
                        label="Document type"
                        onChange={(value) => setDocumentForm((current) => ({ ...current, documentType: value }))}
                        options={providerApprovalDocumentTypeOrder.map((documentType) => ({
                          label: providerApprovalDocumentTypeLabels[documentType],
                          value: documentType
                        }))}
                        value={documentForm.documentType}
                      />
                      <label style={{ display: "grid", gap: "6px" }}>
                        <span style={fieldLabelStyle}>File</span>
                        <input
                          onChange={(event) =>
                            setDocumentForm((current) => ({
                              ...current,
                              file: event.target.files?.[0] ?? null
                            }))
                          }
                          style={{ ...controlStyle, padding: "10px 14px" }}
                          type="file"
                        />
                      </label>
                      <Button disabled={isSubmitting} type="submit">
                        Upload approval document
                      </Button>
                    </form>

                    {selectedDocuments.length ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {selectedDocuments.map((document) => (
                          <article
                            key={document.id}
                            style={{
                              borderRadius: "18px",
                              padding: "14px 16px",
                              background: "rgba(255,255,255,0.72)",
                              display: "grid",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                              <strong>{document.title}</strong>
                              <StatusPill label={providerApprovalDocumentTypeLabels[document.documentType]} tone="neutral" />
                            </div>
                            <span style={{ color: "#57534e" }}>{document.fileName}</span>
                            <span style={{ color: "#57534e" }}>
                              {document.mimeType ?? "Unknown file type"} · {formatFileSize(document.fileSizeBytes)}
                            </span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>No approval documents uploaded yet.</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Select an organization first.</p>
                )}
              </article>
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
