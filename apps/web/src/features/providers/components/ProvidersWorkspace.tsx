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
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
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
      { label: "Perfil del negocio guardado", done: Boolean(selectedPublicProfile) },
      { label: "Al menos un servicio configurado", done: selectedServices.length > 0 },
      { label: "Disponibilidad configurada", done: selectedAvailability.length > 0 },
      { label: "Documentos de aprobacion cargados", done: selectedDocuments.length > 0 }
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
        title="Onboarding de proveedor, perfil publico y readiness de aprobacion"
        description="Este alcance del MVP cubre la configuracion del proveedor y la operacion minima de reservas para servicios con aprobacion: organizacion, perfil publico, servicios, disponibilidad, documentos, estado de aprobacion y revision de reservas entrantes."
      >
        {!hasProviderRole ? (
          <p style={{ margin: 0, color: "#57534e" }}>
            Este espacio permanece bloqueado hasta que el usuario tenga el rol de proveedor provisionado en core.
          </p>
        ) : isLoading && !organizations.length && !selectedOrganizationDetail ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando organizaciones de proveedores desde Supabase...</p>
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
                  <h3 style={{ margin: 0 }}>Organizaciones</h3>
                  <StatusPill label={`${organizations.length} en total`} tone="neutral" />
                </div>
                {!providerRoleActive ? (
                  <p style={{ margin: 0, color: "#57534e" }}>
                    Este espacio funciona con cualquier rol de proveedor provisionado, pero cambiar el rol activo a <strong>provider</strong> mantiene la sesion alineada con este contexto.
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
                  <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay organizaciones de proveedores. Crea la primera abajo.</p>
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
                    Nueva organizacion
                  </Button>
                  <Button disabled={isSubmitting} onClick={() => void refresh(selectedOrganizationId)} tone="secondary">
                    Actualizar
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
                  <h3 style={{ margin: 0 }}>{organizationMode === "create" ? "Crear negocio" : "Editar negocio"}</h3>
                  <StatusPill label={organizationMode === "create" ? "crear" : "editar"} tone="neutral" />
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
                        "Organizacion de proveedor actualizada."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                      });
                      return;
                    }

                    void runAction(
                      () => getBrowserProvidersApiClient().createProviderOrganization(payload),
                      "Organizacion de proveedor creada."
                    ).then(async (organization) => {
                      await refresh(organization.id);
                    });
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <Field label="Nombre del negocio" onChange={(value) => setOrganizationForm((current) => ({ ...current, name: value }))} value={organizationForm.name} />
                  <Field label="Slug" onChange={(value) => setOrganizationForm((current) => ({ ...current, slug: value }))} value={organizationForm.slug} />
                  <Field label="Ciudad" onChange={(value) => setOrganizationForm((current) => ({ ...current, city: value }))} value={organizationForm.city} />
                  <Field label="Codigo de pais" onChange={(value) => setOrganizationForm((current) => ({ ...current, countryCode: value }))} value={organizationForm.countryCode} />
                  <CheckField checked={organizationForm.isPublic} label="Permitir publicacion publica al aprobarse" onChange={(value) => setOrganizationForm((current) => ({ ...current, isPublic: value }))} />
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} type="submit">
                      {organizationMode === "create" ? "Crear organizacion" : "Guardar organizacion"}
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
                        Crear otra
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
                  <h3 style={{ margin: 0 }}>Aprobacion y publicacion</h3>
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
                        <strong>Visibilidad del negocio</strong>
                        <span style={{ color: "#57534e" }}>{selectedOrganization.isPublic ? "Publico al aprobarse" : "Privado incluso si se aprueba"}</span>
                      </div>
                      <div style={{ ...controlStyle, display: "grid", gap: "6px" }}>
                        <strong>Estado en el marketplace</strong>
                        <span style={{ color: "#57534e" }}>{isMarketplaceVisible ? "Visible en el marketplace" : "Oculto en el marketplace"}</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      {reviewReadiness.map((item) => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                          <span style={{ color: "#44403c" }}>{item.label}</span>
                          <StatusPill label={item.done ? "listo" : "pendiente"} tone={item.done ? "active" : "pending"} />
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                      La visibilidad publica permanece bloqueada hasta que la organizacion se apruebe, el negocio sea publico, el perfil publico este visible y al menos un servicio sea publico y activo.
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Crea o selecciona una organizacion para revisar su estado de aprobacion.</p>
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
                  <h3 style={{ margin: 0 }}>Reservas entrantes</h3>
                  <StatusPill label={`${providerBookings.length} en total`} tone="neutral" />
                </div>
                {selectedOrganization ? (
                  <>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <StatusPill label={`${pendingProviderBookings.length} pendientes`} tone={pendingProviderBookings.length ? "pending" : "neutral"} />
                      <StatusPill label={`${confirmedProviderBookings.length} confirmadas`} tone={confirmedProviderBookings.length ? "active" : "neutral"} />
                      <StatusPill label={`${completedProviderBookings.length} completadas`} tone={completedProviderBookings.length ? "active" : "neutral"} />
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
                              {booking.householdName}  -  {booking.customerDisplayName}
                            </span>
                            <span style={{ color: "#57534e" }}>
                              {booking.petName}  -  {formatDateTime(booking.scheduledStartAt)}
                            </span>
                            <span style={{ color: "#57534e" }}>
                              {formatMoney(booking.totalPriceCents, booking.currencyCode)}  -  {booking.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                            </span>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              <Button disabled={isSubmitting} onClick={() => void openProviderBookingDetail(booking.id)} tone="secondary">
                                Ver detalle
                              </Button>
                              {booking.status === "pending_approval" ? (
                                <>
                                  <Button disabled={isSubmitting} onClick={() => void approveProviderBooking(booking.id)}>Aprobar</Button>
                                  <Button
                                    disabled={isSubmitting}
                                    onClick={() => void rejectProviderBooking(booking.id, "Solicitud de reserva rechazada por el proveedor")}
                                    tone="secondary"
                                  >
                                    Rechazar
                                  </Button>
                                </>
                              ) : null}
                              {booking.status === "confirmed" ? (
                                <Button disabled={isSubmitting} onClick={() => void completeProviderBooking(booking.id)}>Marcar como completada</Button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>
                        Todavia no existen reservas para esta organizacion. Cuando se reserve un servicio publico aprobado, aqui apareceran solicitudes y reservas confirmadas.
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
                          <strong>Detalle de la reserva</strong>
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
                          {selectedProviderBookingDetail.booking.householdName}  -  {selectedProviderBookingDetail.booking.customerDisplayName}
                        </span>
                        <span style={{ color: "#57534e" }}>
                          {selectedProviderBookingDetail.booking.petName}  -  {formatDateTime(selectedProviderBookingDetail.booking.scheduledStartAt)}
                        </span>
                        <span style={{ color: "#57534e" }}>
                          Metodo de pago:{" "}
                          {selectedProviderBookingDetail.paymentMethodSummary
                            ? `${selectedProviderBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedProviderBookingDetail.paymentMethodSummary.last4}`
                            : "Sin metodo de pago guardado vinculado"}
                        </span>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {selectedProviderBookingDetail.statusHistory.map((change) => (
                            <div key={change.id} style={{ ...controlStyle, display: "grid", gap: "6px" }}>
                              <strong>{bookingStatusLabels[change.toStatus]}</strong>
                              <span style={{ color: "#57534e" }}>{formatDateTime(change.createdAt)}</span>
                              <span style={{ color: "#57534e" }}>{change.changeReason ?? "Sin razon adicional registrada."}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
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
                  <h3 style={{ margin: 0 }}>Perfil publico</h3>
                  {selectedPublicProfile ? <StatusPill label={selectedPublicProfile.isPublic ? "publico" : "oculto"} tone={selectedPublicProfile.isPublic ? "active" : "neutral"} /> : null}
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
                        "Perfil publico guardado."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                      });
                    }}
                    style={{ display: "grid", gap: "12px" }}
                  >
                    <Field label="Titular" onChange={(value) => setPublicProfileForm((current) => ({ ...current, headline: value }))} value={publicProfileForm.headline} />
                    <TextArea label="Bio del negocio" onChange={(value) => setPublicProfileForm((current) => ({ ...current, bio: value }))} value={publicProfileForm.bio} />
                    <Field label="URL del avatar" onChange={(value) => setPublicProfileForm((current) => ({ ...current, avatarUrl: value }))} value={publicProfileForm.avatarUrl} />
                    <CheckField checked={publicProfileForm.isPublic} label="Publicar este perfil cuando la organizacion sea elegible" onChange={(value) => setPublicProfileForm((current) => ({ ...current, isPublic: value }))} />
                    <Button disabled={isSubmitting} type="submit">
                      Guardar perfil publico
                    </Button>
                  </form>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
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
                  <h3 style={{ margin: 0 }}>Servicios</h3>
                  <StatusPill label={`${selectedServices.length} en total`} tone="neutral" />
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
                            "Servicio del proveedor actualizado."
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
                          "Servicio del proveedor creado."
                        ).then(async () => {
                          setServiceForm(emptyServiceForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                      style={{ display: "grid", gap: "12px" }}
                    >
                      <Field label="Nombre del servicio" onChange={(value) => setServiceForm((current) => ({ ...current, name: value }))} value={serviceForm.name} />
                      <SelectField<ProviderServiceCategory>
                        label="Categoria"
                        onChange={(value) => setServiceForm((current) => ({ ...current, category: value }))}
                        options={providerServiceCategoryOrder.map((category) => ({ label: providerServiceCategoryLabels[category], value: category }))}
                        value={serviceForm.category}
                      />
                      <TextArea label="Descripcion corta" onChange={(value) => setServiceForm((current) => ({ ...current, shortDescription: value }))} value={serviceForm.shortDescription} />
                      <Field label="Especies atendidas (separadas por comas)" onChange={(value) => setServiceForm((current) => ({ ...current, speciesServedText: value }))} value={serviceForm.speciesServedText} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "12px" }}>
                        <Field label="Duracion (min)" onChange={(value) => setServiceForm((current) => ({ ...current, durationMinutes: value }))} type="number" value={serviceForm.durationMinutes} />
                        <Field label="Precio base (USD)" onChange={(value) => setServiceForm((current) => ({ ...current, basePrice: value }))} type="number" value={serviceForm.basePrice} />
                        <Field label="Ventana de cancelacion (hrs)" onChange={(value) => setServiceForm((current) => ({ ...current, cancellationWindowHours: value }))} type="number" value={serviceForm.cancellationWindowHours} />
                      </div>
                      <SelectField<BookingMode>
                        label="Modo de reserva"
                        onChange={(value) => setServiceForm((current) => ({ ...current, bookingMode: value }))}
                        options={[
                          { label: "Reserva inmediata", value: "instant" },
                          { label: "Requiere aprobacion", value: "approval_required" }
                        ]}
                        value={serviceForm.bookingMode}
                      />
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <CheckField checked={serviceForm.isPublic} label="Servicio publico" onChange={(value) => setServiceForm((current) => ({ ...current, isPublic: value }))} />
                        <CheckField checked={serviceForm.isActive} label="Servicio activo" onChange={(value) => setServiceForm((current) => ({ ...current, isActive: value }))} />
                      </div>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <Button disabled={isSubmitting} type="submit">
                          {serviceForm.id ? "Guardar servicio" : "Crear servicio"}
                        </Button>
                        {serviceForm.id ? (
                          <Button disabled={isSubmitting} onClick={() => setServiceForm(emptyServiceForm)} tone="secondary">
                            Cancelar edicion
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
                              <StatusPill label={service.isPublic ? "publico" : "oculto"} tone={service.isPublic ? "active" : "neutral"} />
                            </div>
                            <span style={{ color: "#57534e" }}>
                              {providerServiceCategoryLabels[service.category]}  -  {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                            </span>
                            <span style={{ color: "#57534e" }}>
                              {formatMoney(service.basePriceCents, service.currencyCode)}  -  {service.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                            </span>
                            <span style={{ color: "#57534e" }}>{service.shortDescription ?? "Todavia no hay descripcion."}</span>
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
                                Editar
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay servicios configurados.</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
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
                  <h3 style={{ margin: 0 }}>Disponibilidad</h3>
                  <StatusPill label={`${selectedAvailability.length} bloques`} tone="neutral" />
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
                            "Bloque de disponibilidad actualizado."
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
                          "Bloque de disponibilidad creado."
                        ).then(async () => {
                            setAvailabilityForm(emptyAvailabilityForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                      style={{ display: "grid", gap: "12px" }}
                    >
                      <SelectField<AvailabilityFormState["dayOfWeek"]>
                        label="Dia"
                        onChange={(value) => setAvailabilityForm((current) => ({ ...current, dayOfWeek: value }))}
                        options={providerDayOfWeekOrder.map((dayOfWeek) => ({ label: providerDayOfWeekLabels[dayOfWeek], value: dayOfWeek }))}
                        value={availabilityForm.dayOfWeek}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Field label="Empieza a" onChange={(value) => setAvailabilityForm((current) => ({ ...current, startsAt: value }))} type="time" value={availabilityForm.startsAt} />
                        <Field label="Termina a" onChange={(value) => setAvailabilityForm((current) => ({ ...current, endsAt: value }))} type="time" value={availabilityForm.endsAt} />
                      </div>
                      <CheckField checked={availabilityForm.isActive} label="Bloque activo" onChange={(value) => setAvailabilityForm((current) => ({ ...current, isActive: value }))} />
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <Button disabled={isSubmitting} type="submit">
                          {availabilityForm.id ? "Guardar bloque" : "Crear bloque"}
                        </Button>
                        {availabilityForm.id ? (
                          <Button disabled={isSubmitting} onClick={() => setAvailabilityForm(emptyAvailabilityForm)} tone="secondary">
                            Cancelar edicion
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
                              <StatusPill label={slot.isActive ? "activo" : "inactivo"} tone={slot.isActive ? "active" : "neutral"} />
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
                                Editar
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay disponibilidad configurada.</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
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
                  <h3 style={{ margin: 0 }}>Documentos de aprobacion</h3>
                  <StatusPill label={`${selectedDocuments.length} cargados`} tone="neutral" />
                </div>
                {selectedOrganization ? (
                  <>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        clearMessages();
                        void runAction(
                          async () => {
                            const selectedArchivo = documentForm.file;

                            if (!selectedArchivo) {
                              throw new Error("Elige un archivo antes de cargarlo.");
                            }

                            const fileBytes = await selectedArchivo.arrayBuffer();

                            return getBrowserProvidersApiClient().uploadProviderApprovalDocument(selectedOrganization.id, {
                              title: documentForm.title.trim() || selectedArchivo.name,
                              documentType: documentForm.documentType,
                              fileName: selectedArchivo.name,
                              mimeType: selectedArchivo.type || null,
                              fileBytes
                            });
                          },
                          "Documento de aprobacion cargado."
                        ).then(async () => {
                          setDocumentForm(emptyDocumentForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                      style={{ display: "grid", gap: "12px" }}
                    >
                      <Field label="Titulo del documento" onChange={(value) => setDocumentForm((current) => ({ ...current, title: value }))} value={documentForm.title} />
                      <SelectField<ProviderApprovalDocumentType>
                        label="Tipo de documento"
                        onChange={(value) => setDocumentForm((current) => ({ ...current, documentType: value }))}
                        options={providerApprovalDocumentTypeOrder.map((documentType) => ({
                          label: providerApprovalDocumentTypeLabels[documentType],
                          value: documentType
                        }))}
                        value={documentForm.documentType}
                      />
                      <label style={{ display: "grid", gap: "6px" }}>
                        <span style={fieldLabelStyle}>Archivo</span>
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
                        Cargar documento de aprobacion
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
                              {document.mimeType ?? "Tipo de archivo desconocido"}  -  {formatFileSize(document.fileSizeBytes)}
                            </span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay documentos de aprobacion cargados.</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
                )}
              </article>
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}




