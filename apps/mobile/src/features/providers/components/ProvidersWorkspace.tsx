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
type DisponibilidadFormState = {
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
export type ProviderWorkspaceSection = "inicio" | "negocio" | "servicios" | "disponibilidad" | "reservas" | "estado";
type OrganizationView = "lista" | "crear" | "editar";

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

const emptyDisponibilidadForm: DisponibilidadFormState = {
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

function displayBookingValue(value: string, fallback: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue || normalizedValue.startsWith("unknown")) {
    return fallback;
  }

  return value;
}

function BookingInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 3, width: "100%" }}>
      <Text style={{ color: "#78716c", fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: "#1c1917", fontSize: 14, lineHeight: 20 }}>{value}</Text>
    </View>
  );
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
  helperText,
  keyboardType = "default",
  label,
  onChange,
  placeholder,
  value
}: {
  helperText?: string;
  keyboardType?: "default" | "numeric";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a8a29e"
        style={inputStyle}
        value={value}
      />
      {helperText ? <Text style={{ color: "#78716c", fontSize: 12, lineHeight: 17 }}>{helperText}</Text> : null}
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
  activeSection = "inicio",
  enabled,
  hasProviderRole,
  providerRoleActive
}: {
  activeSection?: ProviderWorkspaceSection;
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
  const [organizationView, setOrganizationView] = useState<OrganizationView>("lista");
  const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
  const [publicProfileForm, setPublicProfileForm] = useState(emptyPublicProfileForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [availabilityForm, setDisponibilidadForm] = useState(emptyDisponibilidadForm);
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
    setDisponibilidadForm(emptyDisponibilidadForm);
    setDocumentForm(emptyDocumentForm);
  }, [selectedOrganizationDetail]);

  const selectedOrganization = selectedOrganizationDetail?.organization ?? null;
  const selectedPublicProfile = selectedOrganizationDetail?.publicProfile ?? null;
  const selectedServicios = selectedOrganizationDetail?.services ?? [];
  const selectedDisponibilidad = selectedOrganizationDetail?.availability ?? [];
  const selectedDocuments = selectedOrganizationDetail?.approvalDocuments ?? [];
  const pendingProviderBookings = providerBookings.filter((booking) => booking.status === "pending_approval");
  const confirmedProviderBookings = providerBookings.filter((booking) => booking.status === "confirmed");
  const completedProviderBookings = providerBookings.filter((booking) => booking.status === "completed");
  const hasPublishedService = selectedServicios.some((service) => service.isPublic && service.isActive);
  const isMarketplaceVisible =
    selectedOrganization?.approvalStatus === "approved" &&
    Boolean(selectedOrganization?.isPublic) &&
    Boolean(selectedPublicProfile?.isPublic) &&
    hasPublishedService;
  const reviewReadiness = useMemo(
    () => [
      { label: "Perfil del negocio guardado", done: Boolean(selectedPublicProfile) },
      { label: "Al menos un servicio configurado", done: selectedServicios.length > 0 },
      { label: "Disponibilidad configurada", done: selectedDisponibilidad.length > 0 },
      { label: "Documentos de aprobacion cargados", done: selectedDocuments.length > 0 }
    ],
    [selectedDisponibilidad.length, selectedDocuments.length, selectedPublicProfile, selectedServicios.length]
  );
  const showHome = activeSection === "inicio";
  const showOrganization = activeSection === "inicio" || activeSection === "negocio";
  const showApproval = activeSection === "inicio" || activeSection === "estado";
  const showBookings = activeSection === "inicio" || activeSection === "reservas";
  const showProfile = activeSection === "negocio";
  const showServices = activeSection === "servicios";
  const showAvailability = activeSection === "disponibilidad";
  const showDocuments = activeSection === "estado";

  if (!enabled) {
    return null;
  }

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSectionCard
        eyebrow="Proveedor"
        title="Consola operativa"
        description="Gestiona publicacion, servicios, disponibilidad, documentos y reservas entrantes con las capacidades MVP ya existentes."
      >
        {!hasProviderRole ? (
          <Text style={{ color: colorTokens.muted }}>
            Este espacio permanece bloqueado hasta que el usuario tenga el rol de proveedor provisionado en core.
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {!providerRoleActive ? (
              <Notice
                message="Este espacio funciona con cualquier rol de proveedor provisionado, pero cambiar el rol activo a proveedor mantiene la sesion alineada con este contexto."
                tone="info"
              />
            ) : null}

            {showHome ? (
              <View style={{ borderRadius: 20, backgroundColor: "#1c1917", padding: 16, gap: 12 }}>
                <Text style={{ color: "#99f6e4", fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>Inicio proveedor</Text>
                <Text style={{ color: "#f8fafc", fontSize: 24, fontWeight: "800", lineHeight: 28 }}>
                  {selectedOrganization ? selectedOrganization.name : "Prepara tu negocio para operar"}
                </Text>
                <Text style={{ color: "#d6d3d1", lineHeight: 20 }}>
                  Prioriza aprobacion, reservas pendientes y configuracion publica antes de ajustar detalles secundarios.
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <StatusChip
                    label={selectedOrganization ? providerApprovalStatusLabels[selectedOrganization.approvalStatus] : "sin negocio"}
                    tone={selectedOrganization?.approvalStatus === "approved" ? "active" : selectedOrganization ? "pending" : "neutral"}
                  />
                  <StatusChip label={`${pendingProviderBookings.length} pendientes`} tone={pendingProviderBookings.length ? "pending" : "neutral"} />
                  <StatusChip label={`${selectedServicios.length} servicio(s)`} tone={selectedServicios.length ? "active" : "neutral"} />
                  <StatusChip label={isMarketplaceVisible ? "visible" : "no visible"} tone={isMarketplaceVisible ? "active" : "neutral"} />
                </View>
                {reviewReadiness.map((item) => (
                  <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <Text style={{ color: "#f8fafc", flex: 1 }}>{item.label}</Text>
                    <StatusChip label={item.done ? "listo" : "pendiente"} tone={item.done ? "active" : "pending"} />
                  </View>
                ))}
              </View>
            ) : null}

            {showOrganization ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>
                  {organizationView === "lista" ? "Negocios" : organizationView === "crear" ? "Crear negocio" : "Editar negocio"}
                </Text>
                <StatusChip label={`${organizations.length} total`} tone="neutral" />
              </View>

              {organizationView === "lista" ? (
                <>
                  <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
                    Selecciona el negocio activo para operar servicios, disponibilidad, reservas y estado, o crea uno nuevo si corresponde.
                  </Text>
                  {isLoading && !organizations.length && !selectedOrganizationDetail ? (
                    <Text style={{ color: colorTokens.muted }}>Preparando tus negocios de proveedor...</Text>
                  ) : organizations.length ? (
                    organizations.map((organization) => (
                      <View
                        key={organization.id}
                        style={{
                          borderRadius: 16,
                          backgroundColor:
                            organization.id === selectedOrganizationId ? "rgba(15,118,110,0.08)" : "rgba(255,255,255,0.78)",
                          borderWidth: 1,
                          borderColor:
                            organization.id === selectedOrganizationId ? "rgba(15,118,110,0.24)" : "rgba(28,25,23,0.08)",
                          padding: 12,
                          gap: 10
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
                        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                          <Button
                            disabled={isSubmitting}
                            label={organization.id === selectedOrganizationId ? "Seleccionado" : "Seleccionar"}
                            onPress={() => void selectOrganization(organization.id)}
                            tone={organization.id === selectedOrganizationId ? "primary" : "secondary"}
                          />
                          <Button
                            disabled={isSubmitting}
                            label="Editar"
                            onPress={() => {
                              void selectOrganization(organization.id);
                              setOrganizationView("editar");
                            }}
                            tone="secondary"
                          />
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 10 }}>
                      <Text style={{ color: "#1c1917", fontWeight: "700" }}>Todavia no hay negocios</Text>
                      <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
                        Crea el primer negocio para completar perfil, servicios, disponibilidad y revision administrativa.
                      </Text>
                      <Button
                        disabled={isSubmitting}
                        label="Crear negocio"
                        onPress={() => {
                          clearMessages();
                          setOrganizationForm(emptyOrganizationForm);
                          setOrganizationView("crear");
                        }}
                      />
                    </View>
                  )}
                  {organizations.length ? (
                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                      <Button
                        disabled={isSubmitting}
                        label="Crear negocio"
                        onPress={() => {
                          clearMessages();
                          setOrganizationForm(emptyOrganizationForm);
                          setOrganizationView("crear");
                        }}
                      />
                      <Button disabled={isSubmitting} label="Actualizar" onPress={() => void refresh(selectedOrganizationId)} tone="secondary" />
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>
                    {organizationView === "crear"
                      ? "Completa los datos basicos del negocio. La visibilidad publica dependera de la aprobacion administrativa."
                      : "Edita los datos basicos del negocio seleccionado sin cambiar su flujo de aprobacion."}
                  </Text>
                  <Field label="Nombre del negocio" onChange={(value) => setOrganizationForm((current) => ({ ...current, name: value }))} value={organizationForm.name} />
                  <Field label="Slug" onChange={(value) => setOrganizationForm((current) => ({ ...current, slug: value }))} value={organizationForm.slug} />
                  <Field label="Ciudad" onChange={(value) => setOrganizationForm((current) => ({ ...current, city: value }))} value={organizationForm.city} />
                  <Field label="Codigo de pais" onChange={(value) => setOrganizationForm((current) => ({ ...current, countryCode: value }))} value={organizationForm.countryCode} />
                  <ChoiceBar
                    onChange={(value) => setOrganizationForm((current) => ({ ...current, isPublic: value === "public" }))}
                    options={[
                      { label: "Publico al aprobarse", value: "public" },
                      { label: "Mantener privado", value: "private" }
                    ]}
                    value={organizationForm.isPublic ? "public" : "private"}
                  />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting || (organizationView === "editar" && !selectedOrganization)}
                      label={organizationView === "crear" ? "Crear negocio" : "Guardar cambios"}
                      onPress={() => {
                        clearMessages();
                        const payload = {
                          name: organizationForm.name.trim(),
                          slug: organizationForm.slug.trim().toLowerCase(),
                          city: organizationForm.city.trim(),
                          countryCode: organizationForm.countryCode.trim().toUpperCase(),
                          isPublic: organizationForm.isPublic
                        } satisfies UpdateProviderOrganizationInput;

                        if (organizationView === "editar" && selectedOrganization) {
                          void runAction(
                            () => getMobileProvidersApiClient().updateProviderOrganization(selectedOrganization.id, payload),
                            "Organizacion de proveedor actualizada."
                          ).then(async () => {
                            await refresh(selectedOrganization.id);
                            setOrganizationView("lista");
                          });
                          return;
                        }

                        void runAction(
                          () => getMobileProvidersApiClient().createProviderOrganization(payload),
                          "Organizacion de proveedor creada."
                        ).then(async (organization) => {
                          await refresh(organization.id);
                          setOrganizationView("lista");
                        });
                      }}
                    />
                    <Button
                      disabled={isSubmitting}
                      label={organizationView === "crear" ? "Cancelar" : "Volver a negocios"}
                      onPress={() => {
                        clearMessages();
                        if (selectedOrganizationDetail) {
                          setOrganizationForm({
                            name: selectedOrganizationDetail.organization.name,
                            slug: selectedOrganizationDetail.organization.slug,
                            city: selectedOrganizationDetail.organization.city,
                            countryCode: selectedOrganizationDetail.organization.countryCode,
                            isPublic: selectedOrganizationDetail.organization.isPublic
                          });
                        } else {
                          setOrganizationForm(emptyOrganizationForm);
                        }
                        setOrganizationView("lista");
                      }}
                      tone="secondary"
                    />
                  </View>
                </>
              )}
            </View>
            ) : null}

            {showApproval ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Aprobacion y publicacion</Text>
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
                    Visibilidad del negocio: {selectedOrganization.isPublic ? "Publico al aprobarse" : "Privado incluso si se aprueba"}
                  </Text>
                  <Text style={{ color: colorTokens.muted }}>
                    Estado en marketplace: {isMarketplaceVisible ? "Visible en la exploracion" : "Oculto en la exploracion"}
                  </Text>
                  {reviewReadiness.map((item) => (
                    <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ color: "#1c1917", flex: 1 }}>{item.label}</Text>
                      <StatusChip label={item.done ? "listo" : "pendiente"} tone={item.done ? "active" : "pending"} />
                    </View>
                  ))}
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Crea o selecciona una organizacion para revisar su estado de aprobacion.</Text>
              )}
            </View>
            ) : null}

            {showBookings ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Reservas entrantes</Text>
                <StatusChip label={`${providerBookings.length} total`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <StatusChip label={`${pendingProviderBookings.length} pendientes`} tone={pendingProviderBookings.length ? "pending" : "neutral"} />
                    <StatusChip label={`${confirmedProviderBookings.length} confirmadas`} tone={confirmedProviderBookings.length ? "active" : "neutral"} />
                    <StatusChip label={`${completedProviderBookings.length} completadas`} tone={completedProviderBookings.length ? "active" : "neutral"} />
                  </View>
                  {providerBookings.length ? (
                    <View style={{ gap: 8 }}>
                      {providerBookings.map((booking) => (
                        <View key={booking.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.82)", padding: 14, gap: 12, width: "100%" }}>
                          <View style={{ gap: 8, width: "100%" }}>
                            <Text style={{ fontSize: 17, fontWeight: "700", color: "#1c1917", lineHeight: 22 }}>
                              {displayBookingValue(booking.serviceName, "Servicio no disponible")}
                            </Text>
                            <StatusChip
                              label={bookingStatusLabels[booking.status]}
                              tone={booking.status === "pending_approval" ? "pending" : booking.status === "cancelled" ? "neutral" : "active"}
                            />
                          </View>

                          <View style={{ gap: 10, width: "100%" }}>
                            <BookingInfoRow label="Hogar" value={displayBookingValue(booking.householdName, "Hogar no disponible")} />
                            <BookingInfoRow label="Cliente" value={displayBookingValue(booking.customerDisplayName, "Cliente no disponible")} />
                            <BookingInfoRow
                              label="Mascota y horario"
                              value={`${displayBookingValue(booking.petName, "Mascota no disponible")} - ${formatDateTime(booking.scheduledStartAt)}`}
                            />
                            <BookingInfoRow
                              label="Servicio"
                              value={`${formatMoney(booking.totalPriceCents, booking.currencyCode)} - ${booking.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}`}
                            />
                          </View>

                          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", width: "100%" }}>
                            <Button disabled={isSubmitting} label="Ver detalle" onPress={() => void openProviderBookingDetail(booking.id)} tone="secondary" />
                            {booking.status === "pending_approval" ? (
                              <>
                                <Button disabled={isSubmitting} label="Aprobar" onPress={() => void approveProviderBooking(booking.id)} />
                                <Button
                                  disabled={isSubmitting}
                                  label="Rechazar"
                                  onPress={() => void rejectProviderBooking(booking.id, "Solicitud de reserva rechazada por el proveedor")}
                                  tone="secondary"
                                />
                              </>
                            ) : null}
                            {booking.status === "confirmed" ? (
                              <Button disabled={isSubmitting} label="Marcar como completada" onPress={() => void completeProviderBooking(booking.id)} />
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: colorTokens.muted }}>
                      Todavia no existen reservas para esta organizacion. Cuando se reserve un servicio publico aprobado, aqui apareceran solicitudes y reservas confirmadas.
                    </Text>
                  )}

                  {selectedProviderBookingDetail ? (
                    <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.82)", padding: 14, gap: 12, width: "100%" }}>
                      <View style={{ gap: 8, width: "100%" }}>
                        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1c1917", lineHeight: 22 }}>Detalle de la reserva</Text>
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
                      <View style={{ gap: 10, width: "100%" }}>
                        <BookingInfoRow label="Hogar" value={displayBookingValue(selectedProviderBookingDetail.booking.householdName, "Hogar no disponible")} />
                        <BookingInfoRow label="Cliente" value={displayBookingValue(selectedProviderBookingDetail.booking.customerDisplayName, "Cliente no disponible")} />
                        <BookingInfoRow
                          label="Mascota y horario"
                          value={`${displayBookingValue(selectedProviderBookingDetail.booking.petName, "Mascota no disponible")} - ${formatDateTime(selectedProviderBookingDetail.booking.scheduledStartAt)}`}
                        />
                        <BookingInfoRow
                          label="Metodo de pago"
                          value={
                            selectedProviderBookingDetail.paymentMethodSummary
                              ? `${selectedProviderBookingDetail.paymentMethodSummary.brand.toUpperCase()} ${selectedProviderBookingDetail.paymentMethodSummary.last4}`
                              : "Sin metodo de pago guardado vinculado"
                          }
                        />
                      </View>
                      <View style={{ gap: 8, width: "100%" }}>
                        <Text style={{ color: "#78716c", fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>Historial</Text>
                        {selectedProviderBookingDetail.statusHistory.map((change) => (
                          <View key={change.id} style={{ borderRadius: 14, backgroundColor: "#fffdf8", borderColor: "rgba(28,25,23,0.1)", borderWidth: 1, padding: 12, gap: 6, width: "100%" }}>
                            <Text style={{ fontWeight: "700", color: "#1c1917", lineHeight: 20 }}>{bookingStatusLabels[change.toStatus]}</Text>
                            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>{formatDateTime(change.createdAt)}</Text>
                            <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>{change.changeReason ?? "Sin razon adicional registrada."}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showProfile ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Perfil publico</Text>
              {selectedOrganization ? (
                <>
                  <Field label="Titular" onChange={(value) => setPublicProfileForm((current) => ({ ...current, headline: value }))} value={publicProfileForm.headline} />
                  <MultilineField label="Bio del negocio" onChange={(value) => setPublicProfileForm((current) => ({ ...current, bio: value }))} value={publicProfileForm.bio} />
                  <Field label="URL del avatar" onChange={(value) => setPublicProfileForm((current) => ({ ...current, avatarUrl: value }))} value={publicProfileForm.avatarUrl} />
                  <ChoiceBar
                    onChange={(value) => setPublicProfileForm((current) => ({ ...current, isPublic: value === "public" }))}
                    options={[
                      { label: "Perfil publico", value: "public" },
                      { label: "Perfil oculto", value: "hidden" }
                    ]}
                    value={publicProfileForm.isPublic ? "public" : "hidden"}
                  />
                  <Button
                    disabled={isSubmitting}
                    label="Guardar perfil publico"
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
                        "Perfil publico guardado."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                      });
                    }}
                  />
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showServices ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Servicios</Text>
                <StatusChip label={`${selectedServicios.length} total`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <Field label="Nombre del servicio" onChange={(value) => setServiceForm((current) => ({ ...current, name: value }))} value={serviceForm.name} />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, category: value }))}
                    options={providerServiceCategoryOrder.map((category) => ({
                      label: providerServiceCategoryLabels[category],
                      value: category
                    }))}
                    value={serviceForm.category}
                  />
                  <MultilineField label="Descripcion corta" onChange={(value) => setServiceForm((current) => ({ ...current, shortDescription: value }))} value={serviceForm.shortDescription} />
                  <Field label="Especies atendidas (separadas por comas)" onChange={(value) => setServiceForm((current) => ({ ...current, speciesServedText: value }))} value={serviceForm.speciesServedText} />
                  <Field keyboardType="numeric" label="Duracion (min)" onChange={(value) => setServiceForm((current) => ({ ...current, durationMinutes: value }))} value={serviceForm.durationMinutes} />
                  <Field keyboardType="numeric" label="Precio base (USD)" onChange={(value) => setServiceForm((current) => ({ ...current, basePrice: value }))} value={serviceForm.basePrice} />
                  <Field keyboardType="numeric" label="Ventana de cancelacion (hrs)" onChange={(value) => setServiceForm((current) => ({ ...current, cancellationWindowHours: value }))} value={serviceForm.cancellationWindowHours} />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, bookingMode: value }))}
                    options={[
                      { label: "Reserva inmediata", value: "instant" },
                      { label: "Requiere aprobacion", value: "approval_required" }
                    ]}
                    value={serviceForm.bookingMode}
                  />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, isPublic: value === "public" }))}
                    options={[
                      { label: "Publico", value: "public" },
                      { label: "Oculto", value: "hidden" }
                    ]}
                    value={serviceForm.isPublic ? "public" : "hidden"}
                  />
                  <ChoiceBar
                    onChange={(value) => setServiceForm((current) => ({ ...current, isActive: value === "active" }))}
                    options={[
                      { label: "Activo", value: "active" },
                      { label: "Inactivo", value: "inactive" }
                    ]}
                    value={serviceForm.isActive ? "active" : "inactive"}
                  />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      label={serviceForm.id ? "Guardar servicio" : "Crear servicio"}
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
                            "Servicio del proveedor actualizado."
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
                          "Servicio del proveedor creado."
                        ).then(async () => {
                          setServiceForm(emptyServiceForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                    />
                    {serviceForm.id ? <Button disabled={isSubmitting} label="Cancelar edicion" onPress={() => setServiceForm(emptyServiceForm)} tone="secondary" /> : null}
                  </View>
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showServices && selectedServicios.length ? (
              <View style={{ gap: 8 }}>
                {selectedServicios.map((service) => (
                  <View key={service.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{service.name}</Text>
                      <StatusChip label={service.isPublic ? "publico" : "oculto"} tone={service.isPublic ? "active" : "neutral"} />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>
                      {providerServiceCategoryLabels[service.category]} - {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                    </Text>
                    <Text style={{ color: colorTokens.muted }}>
                      {formatMoney(service.basePriceCents, service.currencyCode)} - {service.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                    </Text>
                    <Text style={{ color: colorTokens.muted }}>{service.shortDescription ?? "Todavia no hay descripcion."}</Text>
                    <Button
                      disabled={isSubmitting}
                      label="Editar"
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

            {showAvailability ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Disponibilidad</Text>
                <StatusChip label={`${selectedDisponibilidad.length} slot(s)`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <ChoiceBar
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, dayOfWeek: value }))}
                    options={providerDayOfWeekOrder.map((dayOfWeek) => ({
                      label: providerDayOfWeekLabels[dayOfWeek],
                      value: dayOfWeek
                    }))}
                    value={availabilityForm.dayOfWeek}
                  />
                  <Field
                    helperText="Hora local en formato 24 horas."
                    label="Empieza a"
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, startsAt: value }))}
                    placeholder="HH:mm"
                    value={availabilityForm.startsAt}
                  />
                  <Field
                    helperText="Debe ser posterior a la hora de inicio."
                    label="Termina a"
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, endsAt: value }))}
                    placeholder="HH:mm"
                    value={availabilityForm.endsAt}
                  />
                  <ChoiceBar
                    onChange={(value) => setDisponibilidadForm((current) => ({ ...current, isActive: value === "active" }))}
                    options={[
                      { label: "Activo", value: "active" },
                      { label: "Inactivo", value: "inactive" }
                    ]}
                    value={availabilityForm.isActive ? "active" : "inactive"}
                  />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      label={availabilityForm.id ? "Guardar bloque" : "Crear bloque"}
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
                            "Bloque de disponibilidad actualizado."
                          ).then(async () => {
                            setDisponibilidadForm(emptyDisponibilidadForm);
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
                          "Bloque de disponibilidad creado."
                        ).then(async () => {
                          setDisponibilidadForm(emptyDisponibilidadForm);
                          await refresh(selectedOrganization.id);
                        });
                      }}
                    />
                    {availabilityForm.id ? <Button disabled={isSubmitting} label="Cancelar edicion" onPress={() => setDisponibilidadForm(emptyDisponibilidadForm)} tone="secondary" /> : null}
                  </View>
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showAvailability && selectedDisponibilidad.length ? (
              <View style={{ gap: 8 }}>
                {selectedDisponibilidad.map((slot) => (
                  <View key={slot.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{providerDayOfWeekLabels[slot.dayOfWeek]}</Text>
                      <StatusChip label={slot.isActive ? "activo" : "inactivo"} tone={slot.isActive ? "active" : "neutral"} />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>{slot.startsAt.slice(0, 5)} - {slot.endsAt.slice(0, 5)}</Text>
                    <Button
                      disabled={isSubmitting}
                      label="Editar"
                      onPress={() =>
                        setDisponibilidadForm({
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

            {showDocuments ? (
            <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Documentos de aprobacion</Text>
                <StatusChip label={`${selectedDocuments.length} cargados`} tone="neutral" />
              </View>
              {selectedOrganization ? (
                <>
                  <Field label="Titulo del documento" onChange={(value) => setDocumentForm((current) => ({ ...current, title: value }))} value={documentForm.title} />
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
                    label={documentForm.selectedDocument ? `Seleccionado: ${documentForm.selectedDocument.fileName}` : "Elegir documento de aprobacion"}
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
                    label="Cargar documento de aprobacion"
                    onPress={() => {
                      clearMessages();
                      const selectedDocument = documentForm.selectedDocument;

                      void runAction(
                        async () => {
                          if (!selectedDocument) {
                            throw new Error("Elige un documento antes de cargarlo.");
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
                        "Documento de aprobacion cargado."
                      ).then(async () => {
                        setDocumentForm(emptyDocumentForm);
                        await refresh(selectedOrganization.id);
                      });
                    }}
                  />
                </>
              ) : (
                <Text style={{ color: colorTokens.muted }}>Selecciona primero una organizacion.</Text>
              )}
            </View>
            ) : null}

            {showDocuments && selectedDocuments.length ? (
              <View style={{ gap: 8 }}>
                {selectedDocuments.map((document) => (
                  <View key={document.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{document.title}</Text>
                      <StatusChip label={providerApprovalDocumentTypeLabels[document.documentType]} tone="neutral" />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>{document.fileName}</Text>
                    <Text style={{ color: colorTokens.muted }}>
                      {document.mimeType ?? "Tipo de archivo desconocido"} - {formatFileSize(document.fileSizeBytes)}
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






