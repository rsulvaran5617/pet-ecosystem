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
  BookingStatus,
  BookingSlot,
  CreateProviderAvailabilityRuleInput,
  ProviderApprovalDocumentType,
  ProviderLocationPrecision,
  ProviderServiceCategory,
  UpdateProviderAvailabilityRuleInput,
  UpdateProviderOrganizationInput,
  UpdateProviderServiceInput,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { getBrowserBookingsApiClient, getBrowserProvidersApiClient } from "../../core/services/supabase-browser";
import { type ProviderBusinessOverview, type ProviderMoneyIndicator, useProvidersWorkspace } from "../hooks/useProvidersWorkspace";

const fieldLabelStyle = {
  fontSize: "10px",
  textTransform: "uppercase" as const,
  color: "#78716c"
};

const controlStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(28, 25, 23, 0.14)",
  padding: "7px 9px",
  fontSize: "11px",
  background: "#fffdf8"
};

const compactScheduleControlStyle = {
  ...controlStyle,
  borderRadius: "10px",
  fontSize: "10px",
  minWidth: 0,
  padding: "6px 7px",
  width: "100%"
};

type OrganizationFormState = Required<UpdateProviderOrganizationInput>;
type PublicProfileFormState = {
  headline: string;
  bio: string;
  isPublic: boolean;
};
type PublicLocationFormState = {
  displayLabel: string;
  addressLinePublic: string;
  city: string;
  stateRegion: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  locationPrecision: ProviderLocationPrecision;
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
  serviceId: Uuid | "";
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startsAt: string;
  endsAt: string;
  capacity: string;
  isActive: boolean;
};
type DocumentFormState = {
  title: string;
  documentType: ProviderApprovalDocumentType;
  file: File | null;
};

const providerConsoleSections = [
  { id: "provider-web-panel", label: "Panel", detail: "Resumen ejecutivo" },
  { id: "provider-web-organizations", label: "Negocios", detail: "Gestion multinegocio" },
  { id: "provider-web-services", label: "Servicios", detail: "Catalogo y precios" },
  { id: "provider-web-bookings", label: "Reservas", detail: "Operacion diaria" },
  { id: "provider-web-availability", label: "Agenda/Capacidad", detail: "Capacidad y cupos" },
  { id: "provider-web-publication", label: "Publicacion", detail: "Readiness marketplace" },
  { id: "provider-web-business", label: "Documentos", detail: "Expediente maestro" }
] as const;

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
  isPublic: true
};

const emptyPublicLocationForm: PublicLocationFormState = {
  displayLabel: "",
  addressLinePublic: "",
  city: "",
  stateRegion: "",
  countryCode: "PA",
  latitude: "",
  longitude: "",
  locationPrecision: "approximate",
  isPublic: false
};

const providerLocationPrecisionLabels: Record<ProviderLocationPrecision, string> = {
  exact: "Exacta",
  approximate: "Aproximada",
  city: "Solo ciudad"
};

const approximateProviderCityCoordinates: Record<string, { latitude: string; longitude: string; stateRegion: string }> = {
  "ciudad de panama": { latitude: "8.9824", longitude: "-79.5199", stateRegion: "Panama" },
  panama: { latitude: "8.9824", longitude: "-79.5199", stateRegion: "Panama" },
  "san miguelito": { latitude: "9.0330", longitude: "-79.5000", stateRegion: "Panama" },
  arraijan: { latitude: "8.9500", longitude: "-79.6500", stateRegion: "Panama Oeste" },
  chorrera: { latitude: "8.8803", longitude: "-79.7833", stateRegion: "Panama Oeste" },
  "la chorrera": { latitude: "8.8803", longitude: "-79.7833", stateRegion: "Panama Oeste" },
  colon: { latitude: "9.3592", longitude: "-79.9014", stateRegion: "Colon" },
  david: { latitude: "8.4273", longitude: "-82.4308", stateRegion: "Chiriqui" },
  santiago: { latitude: "8.1000", longitude: "-80.9833", stateRegion: "Veraguas" },
  chitre: { latitude: "7.9667", longitude: "-80.4333", stateRegion: "Herrera" },
  penonome: { latitude: "8.5167", longitude: "-80.3667", stateRegion: "Cocle" }
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
  serviceId: "",
  dayOfWeek: 1,
  startsAt: "09:00",
  endsAt: "17:00",
  capacity: "1",
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

function normalizeLocationKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getApproximateProviderCityCoordinates(city: string) {
  return approximateProviderCityCoordinates[normalizeLocationKey(city)] ?? null;
}

function hasUsablePublicCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0);
}

function buildPublicLocationFormState(detail: NonNullable<ReturnType<typeof useProvidersWorkspace>["selectedOrganizationDetail"]>): PublicLocationFormState {
  const publicLocation = detail.publicLocation;
  const fallbackCoordinates = getApproximateProviderCityCoordinates(publicLocation?.city ?? detail.organization.city);
  const hasStoredCoordinates = publicLocation ? hasUsablePublicCoordinates(publicLocation.latitude, publicLocation.longitude) : false;

  return {
    displayLabel: publicLocation?.displayLabel ?? detail.organization.name,
    addressLinePublic: publicLocation?.addressLinePublic ?? "",
    city: publicLocation?.city ?? detail.organization.city,
    stateRegion: publicLocation?.stateRegion ?? fallbackCoordinates?.stateRegion ?? "",
    countryCode: publicLocation?.countryCode ?? detail.organization.countryCode,
    latitude: hasStoredCoordinates ? String(publicLocation?.latitude) : fallbackCoordinates?.latitude ?? "",
    longitude: hasStoredCoordinates ? String(publicLocation?.longitude) : fallbackCoordinates?.longitude ?? "",
    locationPrecision: publicLocation?.locationPrecision ?? (fallbackCoordinates ? "city" : "approximate"),
    isPublic: publicLocation?.isPublic ?? false
  };
}

function validatePublicLocationForm(form: PublicLocationFormState) {
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);

  if (!form.displayLabel.trim()) {
    return "Indica como se mostrara esta ubicacion publica.";
  }

  if (!form.city.trim()) {
    return "Indica la ciudad de la ubicacion publica.";
  }

  if (!form.countryCode.trim()) {
    return "Indica el pais de la ubicacion publica.";
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return "La latitud debe ser un numero entre -90 y 90.";
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return "La longitud debe ser un numero entre -180 y 180.";
  }

  return null;
}

function formatMoney(priceCents: number, currencyCode: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currencyCode
  }).format(priceCents / 100);
}

function mergeMoneyIndicators(indicators: ProviderMoneyIndicator[]): ProviderMoneyIndicator {
  return indicators.reduce<ProviderMoneyIndicator>(
    (mergedIndicator, indicator) => {
      mergedIndicator.bookingCount += indicator.bookingCount;

      Object.entries(indicator.totalsByCurrency).forEach(([currencyCode, totalPriceCents]) => {
        mergedIndicator.totalsByCurrency[currencyCode] = (mergedIndicator.totalsByCurrency[currencyCode] ?? 0) + totalPriceCents;
      });

      return mergedIndicator;
    },
    {
      bookingCount: 0,
      totalsByCurrency: {}
    }
  );
}

function formatMoneyIndicatorValue(indicator: ProviderMoneyIndicator) {
  const currencyTotals = Object.entries(indicator.totalsByCurrency).sort(([leftCurrency], [rightCurrency]) =>
    leftCurrency.localeCompare(rightCurrency)
  );

  if (!currencyTotals.length) {
    return formatMoney(0, "USD");
  }

  return currencyTotals.map(([currencyCode, totalPriceCents]) => formatMoney(totalPriceCents, currencyCode)).join(" / ");
}

function getPercentValue(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatCalendarDay(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit"
  }).format(new Date(`${value}T00:00:00`));
}

function formatCalendarWeekday(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function formatSlotTime(value: string) {
  return value.slice(0, 5);
}

function formatAvailabilityRuleTone(rule: { capacity: number; isActive: boolean }) {
  if (!rule.isActive) {
    return {
      background: "rgba(254, 226, 226, 0.54)",
      border: "rgba(220, 38, 38, 0.18)",
      color: "#b91c1c",
      label: "Inactivo"
    };
  }

  if (rule.capacity === 1) {
    return {
      background: "rgba(255, 247, 237, 0.84)",
      border: "rgba(249, 115, 22, 0.24)",
      color: "#c2410c",
      label: "Ultimo cupo"
    };
  }

  if (rule.capacity <= 2) {
    return {
      background: "rgba(240, 253, 244, 0.78)",
      border: "rgba(34, 197, 94, 0.2)",
      color: "#15803d",
      label: `${rule.capacity} cupos`
    };
  }

  return {
    background: "rgba(236, 253, 245, 0.88)",
    border: "rgba(15, 118, 110, 0.22)",
    color: "#0f766e",
    label: `${rule.capacity} cupos disponibles`
  };
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

const bookingSlotStatusLabels: Record<BookingSlot["status"], string> = {
  available: "Disponible",
  expired: "Expirado",
  full: "Lleno",
  low_capacity: "Ultimo cupo",
  unavailable: "No disponible"
};

function scrollToProviderSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getProviderReadinessAction(label: string) {
  if (label.includes("Perfil")) {
    return { sectionId: "provider-web-profile", actionLabel: "Editar perfil" };
  }

  if (label.includes("servicio")) {
    return { sectionId: "provider-web-services", actionLabel: "Gestionar servicios" };
  }

  if (label.includes("Disponibilidad")) {
    return { sectionId: "provider-web-availability", actionLabel: "Gestionar agenda" };
  }

  if (label.includes("Documentos")) {
    return { sectionId: "provider-web-business", actionLabel: "Editar expediente" };
  }

  return { sectionId: "provider-web-business", actionLabel: "Revisar negocio" };
}

function getBusinessPublicationChecklist(overview: ProviderBusinessOverview) {
  return [
    { label: "Aprobacion", done: overview.organization.approvalStatus === "approved" },
    { label: "Visibilidad", done: overview.organization.isPublic },
    { label: "Perfil", done: overview.hasPublicProfile },
    { label: "Servicios", done: overview.hasService },
    { label: "Agenda", done: overview.hasAvailability },
    { label: "Docs", done: overview.hasDocuments }
  ];
}

function validateAvailabilityRuleForm(form: AvailabilityFormState) {
  const capacity = Number(form.capacity);

  if (!form.serviceId) {
    return "Selecciona un servicio para configurar horarios.";
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    return "La capacidad debe ser mayor que cero.";
  }

  if (!Number.isInteger(capacity)) {
    return "La capacidad debe ser un numero entero.";
  }

  if (form.startsAt >= form.endsAt) {
    return "La hora final debe ser posterior a la hora inicial.";
  }

  return null;
}

function buildAvailabilityRulePayload(form: AvailabilityFormState) {
  const validationError = validateAvailabilityRuleForm(form);

  if (validationError) {
    throw new Error(validationError);
  }

  return {
    serviceId: form.serviceId,
    dayOfWeek: form.dayOfWeek,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    capacity: Number(form.capacity),
    isActive: form.isActive
  };
}

function normalizePositiveIntegerInput(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "";
  }

  return String(Math.max(1, Math.floor(parsedValue)));
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
        fontSize: "11px",
        padding: "8px 12px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
    </button>
  );
}

type ProviderVisualTone = "primary" | "neutral" | "success" | "warning" | "danger";
type ProviderIconName =
  | "agenda"
  | "alert"
  | "booking"
  | "business"
  | "capacity"
  | "chart"
  | "document"
  | "funnel"
  | "health"
  | "money"
  | "panel"
  | "publication"
  | "service"
  | "support";

const providerVisualPalette: Record<
  ProviderVisualTone,
  { background: string; border: string; color: string; soft: string }
> = {
  primary: { background: "#0f766e", border: "rgba(15, 118, 110, 0.28)", color: "#ffffff", soft: "rgba(15, 118, 110, 0.1)" },
  neutral: { background: "#ffffff", border: "rgba(28, 25, 23, 0.1)", color: "#1c1917", soft: "rgba(120, 113, 108, 0.09)" },
  success: { background: "#ecfdf5", border: "rgba(15, 118, 110, 0.2)", color: "#0f766e", soft: "rgba(15, 118, 110, 0.1)" },
  warning: { background: "#fff7ed", border: "rgba(217, 119, 6, 0.22)", color: "#b45309", soft: "rgba(245, 158, 11, 0.12)" },
  danger: { background: "#fef2f2", border: "rgba(220, 38, 38, 0.18)", color: "#b91c1c", soft: "rgba(220, 38, 38, 0.08)" }
};

const providerSectionIcons: Record<(typeof providerConsoleSections)[number]["id"], ProviderIconName> = {
  "provider-web-panel": "panel",
  "provider-web-organizations": "business",
  "provider-web-services": "service",
  "provider-web-bookings": "booking",
  "provider-web-availability": "agenda",
  "provider-web-publication": "publication",
  "provider-web-business": "document"
};

function ProviderIcon({
  name,
  size = 18,
  strokeWidth = 2
}: {
  name: ProviderIconName;
  size?: number;
  strokeWidth?: number;
}) {
  const commonProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth
  };

  const paths: Record<ProviderIconName, ReactNode> = {
    agenda: (
      <>
        <rect {...commonProps} height="15" rx="2" width="16" x="4" y="5" />
        <path {...commonProps} d="M8 3v4M16 3v4M4 10h16" />
        <path {...commonProps} d="M8 14h3M14 14h2M8 17h2" />
      </>
    ),
    alert: (
      <>
        <path {...commonProps} d="M12 3 3 20h18L12 3Z" />
        <path {...commonProps} d="M12 9v5M12 17h.01" />
      </>
    ),
    booking: (
      <>
        <path {...commonProps} d="M8 6h13v13H8z" />
        <path {...commonProps} d="M5 3h13v3M5 3v13h3" />
        <path {...commonProps} d="m12 13 2 2 4-5" />
      </>
    ),
    business: (
      <>
        <path {...commonProps} d="M4 21V7l8-4 8 4v14" />
        <path {...commonProps} d="M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01" />
      </>
    ),
    capacity: (
      <>
        <path {...commonProps} d="M4 19V9M10 19V5M16 19v-8M22 19H2" />
        <path {...commonProps} d="M4 9h4M10 5h4M16 11h4" />
      </>
    ),
    chart: (
      <>
        <path {...commonProps} d="M4 19V5M4 19h16" />
        <path {...commonProps} d="M8 16v-5M12 16V8M16 16v-7" />
      </>
    ),
    document: (
      <>
        <path {...commonProps} d="M7 3h7l4 4v14H7z" />
        <path {...commonProps} d="M14 3v5h5M10 12h5M10 16h7" />
      </>
    ),
    funnel: (
      <>
        <path {...commonProps} d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
      </>
    ),
    health: (
      <>
        <path {...commonProps} d="M12 21s-7-4.4-9-9.2C1.4 8 3.8 5 7 5c2 0 3.2 1.1 5 3 1.8-1.9 3-3 5-3 3.2 0 5.6 3 4 6.8C19 16.6 12 21 12 21Z" />
        <path {...commonProps} d="M12 10v5M9.5 12.5h5" />
      </>
    ),
    money: (
      <>
        <circle {...commonProps} cx="12" cy="12" r="8" />
        <path {...commonProps} d="M12 7v10M15 9.5c-.8-.8-2.7-1.2-3.8-.5-1.3.8-.8 2.4.7 2.8l1.9.5c1.7.5 2.1 2.2.7 3-1.2.7-3.4.3-4.3-.7" />
      </>
    ),
    panel: (
      <>
        <rect {...commonProps} height="7" rx="2" width="7" x="3" y="3" />
        <rect {...commonProps} height="7" rx="2" width="7" x="14" y="3" />
        <rect {...commonProps} height="7" rx="2" width="7" x="3" y="14" />
        <rect {...commonProps} height="7" rx="2" width="7" x="14" y="14" />
      </>
    ),
    publication: (
      <>
        <path {...commonProps} d="M4 12h4l8-5v10l-8-5H4Z" />
        <path {...commonProps} d="M8 12v6M18 9c1 .8 1.5 1.8 1.5 3S19 14.2 18 15" />
      </>
    ),
    service: (
      <>
        <path {...commonProps} d="M7 14a4 4 0 1 1 3.5-5.9A4 4 0 1 1 17 14H7Z" />
        <path {...commonProps} d="M8 14v5M16 14v5M10 19h4" />
      </>
    ),
    support: (
      <>
        <path {...commonProps} d="M5 12a7 7 0 0 1 14 0v4a3 3 0 0 1-3 3h-2" />
        <path {...commonProps} d="M5 12v3a2 2 0 0 0 2 2h1v-6H7a2 2 0 0 0-2 2ZM19 12v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
      </>
    )
  };

  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
      {paths[name]}
    </svg>
  );
}

function ProviderActionButton({
  children,
  disabled,
  onClick,
  tone = "primary",
  type = "button"
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
}) {
  const palette =
    tone === "primary"
      ? { background: "#0f766e", border: "rgba(15, 118, 110, 0.28)", color: "#ffffff" }
      : tone === "secondary"
        ? { background: "#ffffff", border: "rgba(15, 118, 110, 0.22)", color: "#0f766e" }
        : { background: "transparent", border: "rgba(15, 118, 110, 0.14)", color: "#334155" };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type}
      style={{
        alignItems: "center",
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: "999px",
        color: palette.color,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        fontSize: "9px",
        fontWeight: 800,
        gap: "5px",
        justifyContent: "center",
        lineHeight: 1,
        minHeight: "26px",
        opacity: disabled ? 0.62 : 1,
        padding: "6px 10px",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </button>
  );
}

function ProviderStatusChip({ label, tone = "neutral" }: { label: string; tone?: ProviderVisualTone }) {
  const palette = providerVisualPalette[tone];

  return (
    <span
      style={{
        alignItems: "center",
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: "999px",
        color: palette.color,
        display: "inline-flex",
        fontSize: "8px",
        fontWeight: 900,
        letterSpacing: "0.06em",
        lineHeight: 1,
        minHeight: "24px",
        padding: "6px 9px",
        textTransform: "uppercase",
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </span>
  );
}

function ProviderCard({
  children,
  id,
  style
}: {
  children: ReactNode;
  id?: string;
  style?: CSSProperties;
}) {
  return (
    <article
      id={id}
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(15, 118, 110, 0.12)",
        borderRadius: "20px",
        boxShadow: "0 16px 34px rgba(15, 23, 42, 0.07)",
        display: "grid",
        gap: "14px",
        padding: "18px",
        ...style
      }}
    >
      {children}
    </article>
  );
}

function ProviderMetricCard({
  label,
  note,
  surface = "light",
  tone = "neutral",
  value
}: {
  label: string;
  note: string;
  surface?: "light" | "dark";
  tone?: ProviderVisualTone;
  value: ReactNode;
}) {
  const palette = providerVisualPalette[tone];
  const isDark = surface === "dark";

  return (
    <div
      style={{
        background: isDark ? "rgba(255,255,255,0.13)" : palette.background,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.16)" : palette.border}`,
        borderRadius: "16px",
        display: "grid",
        gap: "5px",
        minHeight: "92px",
        padding: "12px"
      }}
    >
      <span
        style={{
          color: isDark ? "#ccfbf1" : palette.color,
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}
      >
        {label}
      </span>
      <strong style={{ color: isDark ? "#f8fafc" : "#111827", fontSize: "22px", lineHeight: 1 }}>{value}</strong>
      <span style={{ color: isDark ? "rgba(248,250,252,0.76)" : "#667085", fontSize: "12px", lineHeight: 1.35 }}>{note}</span>
    </div>
  );
}

function ProviderSidebar({
  activeSectionId,
  onNavigate,
  sections
}: {
  activeSectionId: string;
  onNavigate: (sectionId: string) => void;
  sections: typeof providerConsoleSections;
}) {
  return (
    <aside
      style={{
        alignSelf: "start",
        background: "linear-gradient(180deg, #101828 0%, #172033 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "20px",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
        display: "grid",
        gap: "13px",
        padding: "14px",
        position: "sticky",
        top: "16px",
        width: "100%"
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: "8px", minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.94)",
            borderRadius: "14px",
            display: "inline-flex",
            flexShrink: 0,
            height: "36px",
            justifyContent: "center",
            overflow: "hidden",
            width: "36px"
          }}
        >
          <img alt="" src="/brand/pet-ecosystem-logo-mark.png" style={{ height: "29px", objectFit: "contain", width: "29px" }} />
        </span>
        <div style={{ display: "grid", gap: "2px", minWidth: 0 }}>
          <strong style={{ color: "#f8fafc", fontSize: "11px", lineHeight: 1.12 }}>Pet Ecosystem</strong>
          <span style={{ color: "rgba(248,250,252,0.68)", fontSize: "8.5px" }}>Consola proveedor</span>
        </div>
      </div>

      <nav aria-label="Secciones de consola proveedor" style={{ display: "grid", gap: "7px" }}>
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;

          return (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            style={{
              background: isActive ? "rgba(20, 184, 166, 0.18)" : "rgba(255, 255, 255, 0.04)",
              border: isActive ? "1px solid rgba(45, 212, 191, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              color: "#f8fafc",
              cursor: "pointer",
              display: "grid",
              gap: "3px",
              gridTemplateColumns: "18px minmax(0, 1fr)",
              padding: "8px 9px",
              textAlign: "left"
            }}
            type="button"
          >
            <span style={{ color: isActive ? "#99f6e4" : "rgba(248,250,252,0.78)", paddingTop: "1px" }}>
              <ProviderIcon name={providerSectionIcons[section.id]} size={14} />
            </span>
            <span style={{ display: "grid", gap: "3px" }}>
              <strong style={{ color: isActive ? "#99f6e4" : "#f8fafc", fontSize: "9.5px", lineHeight: 1.08 }}>
                {section.label}
              </strong>
              <span style={{ color: "rgba(248,250,252,0.64)", fontSize: "7.8px", lineHeight: 1.18 }}>{section.detail}</span>
            </span>
          </button>
          );
        })}
      </nav>
    </aside>
  );
}

function ProviderTopbar({
  approvalLabel,
  bookingCount,
  businessCount,
  isMarketplaceVisible,
  onCreateBusiness,
  onCreateService,
  onRefresh,
  onSelectOrganization,
  organizations,
  refreshDisabled,
  selectedOrganizationId,
  selectedName
}: {
  approvalLabel: string;
  bookingCount: number;
  businessCount: number;
  isMarketplaceVisible: boolean;
  onCreateBusiness: () => void;
  onCreateService: () => void;
  onRefresh: () => void;
  onSelectOrganization: (organizationId: Uuid) => void;
  organizations: Array<{ id: Uuid; name: string }>;
  refreshDisabled?: boolean;
  selectedOrganizationId: Uuid | null;
  selectedName: string;
}) {
  return (
    <header
      style={{
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.88)",
        border: "1px solid rgba(15, 118, 110, 0.12)",
        borderRadius: "20px",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
        display: "flex",
        gap: "10px",
        justifyContent: "space-between",
        padding: "10px 12px",
        position: "relative",
        zIndex: 3
      }}
    >
      <div style={{ display: "grid", gap: "3px", minWidth: "120px" }}>
        <span style={{ color: "#0f766e", fontSize: "6px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Negocio activo
        </span>
        <strong style={{ color: "#101828", fontSize: "11px", lineHeight: 1.05, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedName}
        </strong>
      </div>
      <div style={{ alignItems: "center", display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
        <select
          aria-label="Seleccionar negocio activo"
          onChange={(event) => onSelectOrganization(event.target.value as Uuid)}
          style={{
            background: "#fffdf8",
            border: "1px solid rgba(15, 118, 110, 0.18)",
            borderRadius: "999px",
            color: "#101828",
            fontSize: "9px",
            fontWeight: 800,
            minHeight: "28px",
            minWidth: "142px",
            padding: "5px 9px"
          }}
          value={selectedOrganizationId ?? ""}
        >
          <option disabled={organizations.length > 0} value="">
            {organizations.length ? "Selecciona negocio" : "Sin negocios"}
          </option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <ProviderStatusChip label={approvalLabel} tone={isMarketplaceVisible ? "success" : "warning"} />
        <ProviderStatusChip label={`${businessCount} negocios`} tone="neutral" />
        <ProviderStatusChip label={`${bookingCount} reservas`} tone="neutral" />
        <ProviderActionButton disabled={refreshDisabled} onClick={onCreateBusiness} tone="primary">
          + Negocio
        </ProviderActionButton>
        <ProviderActionButton disabled={refreshDisabled || !selectedOrganizationId} onClick={onCreateService} tone="secondary">
          + Servicio
        </ProviderActionButton>
        <ProviderActionButton disabled={refreshDisabled} onClick={onRefresh} tone="secondary">
          Actualizar
        </ProviderActionButton>
      </div>
    </header>
  );
}

function ProviderShell({
  children,
  sidebar,
  topbar
}: {
  children: ReactNode;
  sidebar: ReactNode;
  topbar: ReactNode;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #fbfaf7 0%, #f7f2e7 100%)",
        border: "1px solid rgba(15, 118, 110, 0.08)",
        borderRadius: "28px",
        display: "grid",
        columnGap: "28px",
        rowGap: "18px",
        gridTemplateColumns: "minmax(148px, 174px) minmax(0, 1fr)",
        padding: "16px"
      }}
    >
      {sidebar}
      <main style={{ display: "grid", gap: "16px", minWidth: 0 }}>
        {topbar}
        {children}
      </main>
    </div>
  );
}

function Field({
  compact = false,
  min,
  label,
  onBlur,
  onChange,
  type = "text",
  value
}: {
  compact?: boolean;
  label: string;
  min?: number;
  onBlur?: (value: string) => void;
  onChange: (value: string) => void;
  type?: "number" | "text" | "time";
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        min={min}
        onBlur={(event) => onBlur?.(event.target.value)}
        onChange={(event) => onChange(event.target.value)}
        style={compact ? compactScheduleControlStyle : controlStyle}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField<TValue extends string | number>({
  compact = false,
  label,
  onChange,
  options,
  value
}: {
  compact?: boolean;
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
        style={compact ? compactScheduleControlStyle : controlStyle}
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

function isHiddenTechnicalAuthMessage(message: string | null) {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("auth-token") && normalizedMessage.includes("another request stole it");
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
    businessOverviews,
    selectedOrganizationId,
    selectedOrganizationDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    providerBookings,
    providerMessageThreads,
    selectedProviderMessageThreadDetail,
    providerMessageDraft,
    selectedProviderBookingDetail,
    clearMessages,
    selectOrganization,
    openProviderBookingDetail,
    openProviderMessageThread,
    sendProviderMessage,
    setProviderMessageDraft,
    approveProviderBooking,
    rejectProviderBooking,
    completeProviderBooking,
    refresh,
    runAction
  } = useProvidersWorkspace(enabled && hasProviderRole);
  const [organizationMode, setOrganizationMode] = useState<"create" | "edit">("create");
  const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
  const [publicProfileForm, setPublicProfileForm] = useState(emptyPublicProfileForm);
  const [publicLocationForm, setPublicLocationForm] = useState(emptyPublicLocationForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailabilityForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);
  const [isBusinessFormOpen, setIsBusinessFormOpen] = useState(false);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isAvailabilityFormOpen, setIsAvailabilityFormOpen] = useState(false);
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
  const [expandedProviderBookingId, setExpandedProviderBookingId] = useState<Uuid | null>(null);
  const [capacityServiceId, setCapacityServiceId] = useState<Uuid | null>(null);
  const [capacitySlots, setCapacitySlots] = useState<BookingSlot[]>([]);
  const [selectedCapacityDate, setSelectedCapacityDate] = useState<string | null>(null);
  const [capacitySlotsError, setCapacitySlotsError] = useState<string | null>(null);
  const [isLoadingCapacitySlots, setIsLoadingCapacitySlots] = useState(false);
  const [activeProviderSectionId, setActiveProviderSectionId] = useState<(typeof providerConsoleSections)[number]["id"]>("provider-web-panel");
  const [isPendingBookingsBreakdownOpen, setIsPendingBookingsBreakdownOpen] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus>("pending_approval");

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
      isPublic: selectedOrganizationDetail.publicProfile?.isPublic ?? true
    });
    setPublicLocationForm(buildPublicLocationFormState(selectedOrganizationDetail));
    setServiceForm(emptyServiceForm);
    setAvailabilityForm({
      ...emptyAvailabilityForm,
      serviceId: selectedOrganizationDetail.services.find((service) => service.isPublic && service.isActive)?.id ?? selectedOrganizationDetail.services[0]?.id ?? ""
    });
    setDocumentForm(emptyDocumentForm);
    setOrganizationMode("edit");
    setCapacityServiceId(selectedOrganizationDetail.services.find((service) => service.isPublic && service.isActive)?.id ?? selectedOrganizationDetail.services[0]?.id ?? null);
    setCapacitySlots([]);
    setSelectedCapacityDate(null);
    setCapacitySlotsError(null);
  }, [selectedOrganizationDetail]);

  const selectedOrganization = selectedOrganizationDetail?.organization ?? null;
  const selectedPublicProfile = selectedOrganizationDetail?.publicProfile ?? null;
  const selectedPublicLocation = selectedOrganizationDetail?.publicLocation ?? null;
  const selectedServices = selectedOrganizationDetail?.services ?? [];
  const selectedAvailability = selectedOrganizationDetail?.availability ?? [];
  const selectedAvailabilityRules = selectedOrganizationDetail?.availabilityRules ?? [];
  const selectedDocuments = selectedOrganizationDetail?.approvalDocuments ?? [];
  const activeCapacityService = selectedServices.find((service) => service.id === capacityServiceId) ?? selectedServices[0] ?? null;
  const bookingCountByServiceId = providerBookings.reduce<Record<string, number>>((counts, booking) => {
    counts[booking.providerServiceId] = (counts[booking.providerServiceId] ?? 0) + 1;
    return counts;
  }, {});
  const filteredAvailabilityRules = activeCapacityService
    ? selectedAvailabilityRules.filter((rule) => rule.serviceId === activeCapacityService.id)
    : selectedAvailabilityRules;
  const availabilityRulesByDay = providerDayOfWeekOrder.reduce<Record<AvailabilityFormState["dayOfWeek"], typeof selectedAvailabilityRules>>(
    (accumulator, dayOfWeek) => {
      accumulator[dayOfWeek] = filteredAvailabilityRules
        .filter((rule) => rule.dayOfWeek === dayOfWeek)
        .sort((leftRule, rightRule) => leftRule.startsAt.localeCompare(rightRule.startsAt));
      return accumulator;
    },
    {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: []
    }
  );
  const pendingProviderBookings = providerBookings.filter((booking) => booking.status === "pending_approval");
  const confirmedProviderBookings = providerBookings.filter((booking) => booking.status === "confirmed");
  const completedProviderBookings = providerBookings.filter((booking) => booking.status === "completed");
  const cancelledProviderBookings = providerBookings.filter((booking) => booking.status === "cancelled");
  const filteredProviderBookings = providerBookings.filter((booking) => booking.status === bookingStatusFilter);
  const selectedOrganizationMessageThreads = providerMessageThreads.filter(
    (thread) => thread.providerOrganizationId === selectedOrganizationId && thread.lastMessageAt
  );
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
      { label: "Disponibilidad configurada", done: selectedAvailability.length > 0 || selectedAvailabilityRules.some((rule) => rule.isActive) },
      { label: "Documentos de aprobacion cargados", done: selectedDocuments.length > 0 }
    ],
    [selectedAvailability.length, selectedAvailabilityRules, selectedDocuments.length, selectedPublicProfile, selectedServices.length]
  );
  const readyChecklistCount = reviewReadiness.filter((item) => item.done).length;
  const nextReadinessItem = reviewReadiness.find((item) => !item.done) ?? null;
  const pendingReadinessItems = reviewReadiness.filter((item) => !item.done);
  const capacitySlotsByDate = useMemo(() => {
    return capacitySlots.reduce<Record<string, BookingSlot[]>>((accumulator, slot) => {
      accumulator[slot.slotDate] = [...(accumulator[slot.slotDate] ?? []), slot];
      return accumulator;
    }, {});
  }, [capacitySlots]);
  const capacityCalendarDates = capacitySlots.length
    ? Array.from(
        new Set(
          capacitySlots
            .map((slot) => slot.slotDate)
            .sort((leftDate, rightDate) => leftDate.localeCompare(rightDate))
        )
      )
    : Array.from({ length: 7 }, (_, index) => formatDateValue(addDays(new Date(), index)));
  const activeCapacityDate = selectedCapacityDate ?? capacityCalendarDates[0] ?? null;
  const activeCapacityDateSlots = activeCapacityDate ? capacitySlotsByDate[activeCapacityDate] ?? [] : [];
  const loadCapacitySlots = async () => {
    if (!capacityServiceId) {
      setCapacitySlots([]);
      setCapacitySlotsError("Selecciona un servicio para ver cupos publicados.");
      return;
    }

    setIsLoadingCapacitySlots(true);
    setCapacitySlotsError(null);

    try {
      const today = new Date();
      const slots = await getBrowserBookingsApiClient().listBookingSlots({
        serviceId: capacityServiceId,
        fromDate: formatDateValue(today),
        toDate: formatDateValue(addDays(today, 14))
      });

      setCapacitySlots(slots);
      setSelectedCapacityDate(slots[0]?.slotDate ?? formatDateValue(today));
    } catch (error) {
      setCapacitySlots([]);
      setSelectedCapacityDate(null);
      setCapacitySlotsError(error instanceof Error ? error.message : "No fue posible cargar los cupos publicados.");
    } finally {
      setIsLoadingCapacitySlots(false);
    }
  };
  const nextProviderBooking = pendingProviderBookings[0] ?? confirmedProviderBookings[0] ?? providerBookings[0] ?? null;
  const completedMoneyIndicator = mergeMoneyIndicators(businessOverviews.map((overview) => overview.moneyIndicators.completed));
  const pendingServiceMoneyIndicator = mergeMoneyIndicators(businessOverviews.map((overview) => overview.moneyIndicators.pendingService));
  const providerCancelledMoneyIndicator = mergeMoneyIndicators(businessOverviews.map((overview) => overview.moneyIndicators.providerCancelled));
  const globalMoneyIndicatorCards = [
    {
      id: "completed-money",
      label: "Ingresado",
      value: formatMoneyIndicatorValue(completedMoneyIndicator),
      detail: `${completedMoneyIndicator.bookingCount} cita(s) cerrada(s)`,
      tone: "success"
    },
    {
      id: "pending-money",
      label: "Pendiente por atender",
      value: formatMoneyIndicatorValue(pendingServiceMoneyIndicator),
      detail: `${pendingServiceMoneyIndicator.bookingCount} cita(s) pendiente(s)`,
      tone: "warning"
    },
    {
      id: "provider-cancelled-money",
      label: "No ingresado",
      value: formatMoneyIndicatorValue(providerCancelledMoneyIndicator),
      detail: `${providerCancelledMoneyIndicator.bookingCount} cancelada(s) por proveedor`,
      tone: "danger"
    }
  ] as const;
  const globalActionCards = [
    {
      id: "pending-bookings",
      label: "Citas por aprobar",
      count: businessOverviews.reduce((total, overview) => total + overview.bookingCounts.pending_approval, 0),
      help: "Solicitudes que esperan respuesta.",
      sectionId: "provider-web-bookings",
      organizationId: businessOverviews.find((overview) => overview.bookingCounts.pending_approval > 0)?.organization.id ?? null
    },
    {
      id: "confirmed-bookings",
      label: "Reservas confirmadas",
      count: businessOverviews.reduce((total, overview) => total + overview.bookingCounts.confirmed, 0),
      help: "Servicios listos para operar.",
      sectionId: "provider-web-bookings",
      organizationId: businessOverviews.find((overview) => overview.bookingCounts.confirmed > 0)?.organization.id ?? null
    },
    {
      id: "message-threads",
      label: "Conversaciones activas",
      count: businessOverviews.reduce((total, overview) => total + overview.messageThreadCount, 0),
      help: "Chats vinculados a reservas.",
      sectionId: "provider-web-bookings",
      organizationId: businessOverviews.find((overview) => overview.messageThreadCount > 0)?.organization.id ?? null
    },
    {
      id: "publication-pending",
      label: "Negocios por completar",
      count: businessOverviews.filter((overview) => !overview.isMarketplaceVisible).length,
      help: "Pendientes antes de aparecer.",
      sectionId: "provider-web-publication",
      organizationId: businessOverviews.find((overview) => !overview.isMarketplaceVisible)?.organization.id ?? null
    },
    {
      id: "missing-services",
      label: "Sin servicios activos",
      count: businessOverviews.filter((overview) => !overview.hasService).length,
      help: "Necesitan oferta publicada.",
      sectionId: "provider-web-services",
      organizationId: businessOverviews.find((overview) => !overview.hasService)?.organization.id ?? null
    },
    {
      id: "missing-agenda",
      label: "Sin agenda",
      count: businessOverviews.filter((overview) => !overview.hasAvailability).length,
      help: "Necesitan horarios.",
      sectionId: "provider-web-availability",
      organizationId: businessOverviews.find((overview) => !overview.hasAvailability)?.organization.id ?? null
    },
    {
      id: "missing-documents",
      label: "Sin documentos",
      count: businessOverviews.filter((overview) => !overview.hasDocuments).length,
      help: "Falta soporte de aprobacion.",
      sectionId: "provider-web-business",
      organizationId: businessOverviews.find((overview) => !overview.hasDocuments)?.organization.id ?? null
    }
  ].filter((card) => card.count > 0);
  const pendingBookingsByBusiness = businessOverviews
    .map((overview) => ({
      organization: overview.organization,
      bookings: overview.pendingApprovalBookings
    }))
    .filter((group) => group.bookings.length > 0);
  const pendingApprovalTotal = pendingBookingsByBusiness.reduce((total, group) => total + group.bookings.length, 0);
  const selectedBusinessOverview = selectedOrganizationId
    ? businessOverviews.find((overview) => overview.organization.id === selectedOrganizationId) ?? null
    : null;
  const publishedBusinessCount = businessOverviews.filter((overview) => overview.isMarketplaceVisible).length;
  const pendingBusinessCount = businessOverviews.filter((overview) => !overview.isMarketplaceVisible).length;
  const activeServiceCount = businessOverviews.reduce((total, overview) => total + overview.activeServiceCount, 0);
  const activeConfiguredCapacity = selectedAvailabilityRules
    .filter((rule) => rule.isActive)
    .reduce((total, rule) => total + rule.capacity, 0);
  const upcomingAvailableCapacity = capacitySlots.length
    ? capacitySlots.reduce((total, slot) => total + Math.max(0, slot.availableCount), 0)
    : activeConfiguredCapacity;
  const alertCount =
    pendingProviderBookings.length +
    pendingReadinessItems.length +
    businessOverviews.filter((overview) => !overview.isMarketplaceVisible).length;
  const executiveMetrics = [
    { label: "Negocios", value: organizations.length, note: "total registrados", tone: "neutral" as const },
    { label: "Publicados", value: publishedBusinessCount, note: "visibles en marketplace", tone: "success" as const },
    { label: "Pendientes", value: pendingBusinessCount, note: "requieren accion", tone: pendingBusinessCount ? ("warning" as const) : ("neutral" as const) },
    { label: "Servicios activos", value: activeServiceCount, note: "oferta operativa", tone: "success" as const },
    { label: "Reservas pendientes", value: pendingProviderBookings.length, note: "por aprobar", tone: pendingProviderBookings.length ? ("warning" as const) : ("neutral" as const) },
    { label: "Cupos disponibles", value: upcomingAvailableCapacity, note: capacitySlots.length ? "proximos 14 dias" : "capacidad activa", tone: "primary" as const },
    { label: "Alertas", value: alertCount, note: alertCount ? "revisar acciones" : "sin alertas criticas", tone: alertCount ? ("warning" as const) : ("success" as const) }
  ];
  const activeBusinessHealth = [
    { label: "Perfil publico", done: Boolean(selectedPublicProfile), action: "Completar perfil", sectionId: "provider-web-profile" },
    { label: "Servicios configurados", done: selectedServices.length > 0, action: "Crear servicio", sectionId: "provider-web-services" },
    {
      label: "Horarios/capacidad",
      done: selectedAvailability.length > 0 || selectedAvailabilityRules.some((rule) => rule.isActive),
      action: "Definir horarios",
      sectionId: "provider-web-availability"
    },
    { label: "Documentos cargados", done: selectedDocuments.length > 0, action: "Cargar documentos", sectionId: "provider-web-business" },
    { label: "Ubicacion publica", done: Boolean(selectedPublicLocation?.isPublic), action: "Configurar ubicacion", sectionId: "provider-web-profile" }
  ];
  const activeMarketplaceLabel = isMarketplaceVisible
    ? "Visible"
    : selectedOrganization?.approvalStatus === "approved"
      ? "No visible"
      : "Pendiente";
  const totalProviderBookingCount = businessOverviews.reduce(
    (total, overview) =>
      total +
      overview.bookingCounts.pending_approval +
      overview.bookingCounts.confirmed +
      overview.bookingCounts.completed +
      overview.bookingCounts.cancelled,
    0
  );
  const totalMessageThreadCount = businessOverviews.reduce((total, overview) => total + overview.messageThreadCount, 0);
  const averagePublicationHealth = getPercentValue(
    businessOverviews.reduce((total, overview) => {
      const readinessItems = [overview.hasPublicProfile, overview.hasService, overview.hasAvailability, overview.hasDocuments, overview.hasPublicLocation];
      return total + getPercentValue(readinessItems.filter(Boolean).length, readinessItems.length);
    }, 0),
    Math.max(1, businessOverviews.length * 100)
  );
  const maxOverviewBookings = Math.max(
    1,
    ...businessOverviews.map(
      (overview) =>
        overview.bookingCounts.pending_approval +
        overview.bookingCounts.confirmed +
        overview.bookingCounts.completed +
        overview.bookingCounts.cancelled
    )
  );
  const selectedServiceRanking = selectedServices
    .map((service) => ({
      id: service.id,
      name: service.name,
      bookingCount: bookingCountByServiceId[service.id] ?? 0,
      income: providerBookings
        .filter((booking) => booking.providerServiceId === service.id)
        .reduce((total, booking) => total + booking.totalPriceCents, 0)
    }))
    .sort((leftService, rightService) => rightService.bookingCount - leftService.bookingCount || rightService.income - leftService.income)
    .slice(0, 5);
  const dashboardAlerts = [
    ...businessOverviews
      .filter((overview) => !overview.hasPublicProfile)
      .slice(0, 2)
      .map((overview) => ({
        id: `${overview.organization.id}-profile`,
        label: `${overview.organization.name} - perfil incompleto`,
        detail: "Completa la presentacion publica para mejorar visibilidad.",
        tone: "warning" as const
      })),
    ...businessOverviews
      .filter((overview) => overview.bookingCounts.pending_approval > 0)
      .slice(0, 2)
      .map((overview) => ({
        id: `${overview.organization.id}-bookings`,
        label: `${overview.organization.name} - ${overview.bookingCounts.pending_approval} reserva(s) pendiente(s)`,
        detail: "Hay solicitudes esperando respuesta del proveedor.",
        tone: "danger" as const
      })),
    ...businessOverviews
      .filter((overview) => !overview.hasAvailability)
      .slice(0, 2)
      .map((overview) => ({
        id: `${overview.organization.id}-capacity`,
        label: `${overview.organization.name} - sin capacidad`,
        detail: "Define horarios y cupos para recibir reservas.",
        tone: "warning" as const
      }))
  ].slice(0, 4);
  const capacityHeatmapDays = providerDayOfWeekOrder.slice(1).concat(0 as AvailabilityFormState["dayOfWeek"]);
  const capacityHeatmapRows = ["08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00"].map((slotLabel, slotIndex) => ({
    slotLabel,
    values: capacityHeatmapDays.map((dayOfWeek) => {
      const dayRules = selectedAvailabilityRules.filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek);
      const totalCapacity = dayRules.reduce((total, rule) => total + rule.capacity, 0);
      return Math.min(100, totalCapacity * 12 + slotIndex * 4);
    })
  }));
  const closeProviderForms = () => {
    setIsBusinessFormOpen(false);
    setIsProfileFormOpen(false);
    setIsServiceFormOpen(false);
    setIsAvailabilityFormOpen(false);
    setIsDocumentFormOpen(false);
  };
  const navigateProviderSection = (sectionId: (typeof providerConsoleSections)[number]["id"] | string) => {
    const nextSectionId = sectionId === "provider-web-profile" ? "provider-web-publication" : sectionId;

    if (nextSectionId === "provider-web-business") {
      setOrganizationMode("edit");
      setIsBusinessFormOpen(true);
    }

    setActiveProviderSectionId(nextSectionId as (typeof providerConsoleSections)[number]["id"]);
    scrollToProviderSection(sectionId);
  };
  const openCreateBusiness = () => {
    clearMessages();
    closeProviderForms();
    navigateProviderSection("provider-web-business");
    setOrganizationMode("create");
    setOrganizationForm(emptyOrganizationForm);
    setIsBusinessFormOpen(true);
  };
  const openCreateService = () => {
    clearMessages();
    closeProviderForms();
    setServiceForm(emptyServiceForm);
    setIsServiceFormOpen(true);
    navigateProviderSection("provider-web-services");
  };
  const openGlobalAction = (sectionId: string, organizationId: Uuid | null) => {
    closeProviderForms();

    if (sectionId === "provider-web-business") {
      setOrganizationMode("edit");
      setIsBusinessFormOpen(true);
    }

    if (sectionId === "provider-web-profile") {
      setIsProfileFormOpen(true);
    }
    if (sectionId === "provider-web-services") {
      setServiceForm(emptyServiceForm);
      setIsServiceFormOpen(true);
    }
    if (sectionId === "provider-web-availability") {
      setAvailabilityForm(emptyAvailabilityForm);
      setIsAvailabilityFormOpen(true);
    }
    if (organizationId && organizationId !== selectedOrganizationId) {
      void selectOrganization(organizationId).then(() => {
        window.setTimeout(() => navigateProviderSection(sectionId), 120);
      });
      return;
    }

    navigateProviderSection(sectionId);
  };
  const toggleProviderBookingAccordion = (bookingId: Uuid) => {
    if (expandedProviderBookingId === bookingId) {
      setExpandedProviderBookingId(null);
      return;
    }

    setExpandedProviderBookingId(bookingId);
    void openProviderBookingDetail(bookingId);
  };

  if (!enabled) {
    return null;
  }

  const visibleErrorMessage = isHiddenTechnicalAuthMessage(errorMessage) ? null : errorMessage;

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {visibleErrorMessage ? <Notice message={visibleErrorMessage} tone="error" /> : null}
      {!visibleErrorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSection
        eyebrow="Consola web proveedor"
        title="Centro de gestion de negocios"
        description="Administra tus negocios, servicios, agenda, documentos y reservas desde una consola enfocada en operacion diaria."
      >
        {!hasProviderRole ? (
          <p style={{ margin: 0, color: "#57534e" }}>
            Esta consola se activa cuando tu cuenta tiene rol de proveedor.
          </p>
        ) : isLoading && !organizations.length && !selectedOrganizationDetail ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando organizaciones de proveedores desde Supabase...</p>
        ) : (
          <ProviderShell
            sidebar={<ProviderSidebar activeSectionId={activeProviderSectionId} onNavigate={navigateProviderSection} sections={providerConsoleSections} />}
            topbar={
              <ProviderTopbar
                approvalLabel={selectedOrganization ? providerApprovalStatusLabels[selectedOrganization.approvalStatus] : "Sin negocio activo"}
                bookingCount={providerBookings.length}
                businessCount={organizations.length}
                isMarketplaceVisible={isMarketplaceVisible}
                onCreateBusiness={openCreateBusiness}
                onCreateService={openCreateService}
                onRefresh={() => void refresh(selectedOrganizationId)}
                onSelectOrganization={(organizationId) => {
                  closeProviderForms();
                  void selectOrganization(organizationId);
                }}
                organizations={organizations.map((organization) => ({ id: organization.id, name: organization.name }))}
                refreshDisabled={isSubmitting}
                selectedOrganizationId={selectedOrganizationId}
                selectedName={selectedOrganization?.name ?? "Selecciona un negocio"}
              />
            }
          >
            <div id="provider-web-panel" style={{ display: activeProviderSectionId === "provider-web-panel" ? "grid" : "none", gap: "14px" }}>
              <ProviderCard
                style={{
                  background: "#f8fafc",
                  borderColor: "rgba(15, 23, 42, 0.08)",
                  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.09)",
                  gap: "14px"
                }}
              >
                <div style={{ alignItems: "center", display: "flex", gap: "16px", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ alignItems: "center", display: "flex", gap: "12px", minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        alignItems: "center",
                        background: "#eef6ff",
                        borderRadius: "14px",
                        color: "#0f766e",
                        display: "inline-flex",
                        fontSize: "20px",
                        fontWeight: 900,
                        height: "46px",
                        justifyContent: "center",
                        width: "46px"
                      }}
                    >
                      <img alt="" src="/brand/pet-ecosystem-logo-mark.png" style={{ height: "34px", objectFit: "contain", width: "34px" }} />
                    </span>
                    <div style={{ display: "grid", gap: "3px", minWidth: 0 }}>
                      <h2 style={{ color: "#0b163f", fontSize: "17px", lineHeight: 1.12, margin: 0 }}>Panel de gestion multi-negocio</h2>
                      <span style={{ color: "#667085", fontSize: "11px" }}>Vision consolidada de tus operaciones</span>
                    </div>
                  </div>
                  <div style={{ alignItems: "center", display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <ProviderStatusChip label={`${alertCount} alertas`} tone={alertCount ? "warning" : "success"} />
                    <span
                      aria-hidden="true"
                      style={{
                        alignItems: "center",
                        background: "#0b163f",
                        borderRadius: "999px",
                        color: "#ffffff",
                        display: "inline-flex",
                        fontSize: "12px",
                        fontWeight: 900,
                        height: "38px",
                        justifyContent: "center",
                        width: "38px"
                      }}
                    >
                      <ProviderIcon name="business" size={18} />
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(130px, 1fr))", gap: "12px" }}>
                  {[
                    { label: "Reservas totales", value: totalProviderBookingCount, note: "datos consolidados", icon: "booking" as const, tone: "primary" as const },
                    { label: "Ingresos estimados", value: formatMoneyIndicatorValue(completedMoneyIndicator), note: "citas cerradas", icon: "money" as const, tone: "success" as const },
                    { label: "Salud promedio", value: `${averagePublicationHealth}%`, note: "readiness publicado", icon: "health" as const, tone: "primary" as const },
                    { label: "Servicios activos", value: activeServiceCount, note: "oferta disponible", icon: "service" as const, tone: "warning" as const },
                    { label: "Conversaciones activas", value: totalMessageThreadCount, note: "chats con actividad", icon: "support" as const, tone: "neutral" as const }
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      style={{
                        background: "#ffffff",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: "14px",
                        boxShadow: "0 12px 26px rgba(15, 23, 42, 0.06)",
                        display: "grid",
                        gap: "9px",
                        minHeight: "108px",
                        padding: "14px"
                      }}
                    >
                      <div style={{ alignItems: "center", display: "flex", gap: "10px" }}>
                        <span
                          style={{
                            alignItems: "center",
                            background: providerVisualPalette[metric.tone].soft,
                            borderRadius: "12px",
                            color: providerVisualPalette[metric.tone].color,
                            display: "inline-flex",
                            fontSize: "13px",
                            fontWeight: 900,
                            height: "34px",
                            justifyContent: "center",
                            width: "34px"
                          }}
                        >
                          <ProviderIcon name={metric.icon} size={17} />
                        </span>
                        <span style={{ color: "#344054", fontSize: "9px", fontWeight: 800 }}>{metric.label}</span>
                      </div>
                      <strong style={{ color: "#0b163f", fontSize: "21px", lineHeight: 1 }}>{metric.value}</strong>
                      <span style={{ color: "#667085", fontSize: "10px" }}>{metric.note}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "0.72fr 0.9fr 1.38fr", gap: "12px" }}>
                  <div style={{ background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "8px", display: "grid", gap: "8px", padding: "10px" }}>
                    <div style={{ display: "grid", gap: "3px" }}>
                      <strong style={{ alignItems: "center", color: "#0b163f", display: "flex", fontSize: "5.5px", gap: "4px" }}>
                        <ProviderIcon name="chart" size={10} />
                        Comparativo entre negocios
                      </strong>
                      <span style={{ color: "#667085", fontSize: "5.5px" }}>Reservas por negocio</span>
                    </div>
                    <div style={{ display: "grid", gap: "5px", maxHeight: "142px", overflowY: "auto", paddingRight: "2px" }}>
                      {businessOverviews.slice(0, 12).map((overview) => {
                        const totalBookings =
                          overview.bookingCounts.pending_approval +
                          overview.bookingCounts.confirmed +
                          overview.bookingCounts.completed +
                          overview.bookingCounts.cancelled;
                        const barWidth = `${Math.max(8, Math.round((totalBookings / maxOverviewBookings) * 100))}%`;

                        return (
                          <div
                            key={overview.organization.id}
                            style={{
                              alignItems: "center",
                              display: "grid",
                              gap: "5px",
                              gridTemplateColumns: "minmax(48px, 0.82fr) minmax(52px, 1fr) 16px"
                            }}
                          >
                            <span
                              title={overview.organization.name}
                              style={{
                                color: "#475467",
                                fontSize: "5.5px",
                                fontWeight: 800,
                                lineHeight: 1.12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {overview.organization.name}
                            </span>
                            <div
                              style={{
                                background: "rgba(15, 23, 42, 0.06)",
                                borderRadius: "5px",
                                height: "10px",
                                overflow: "hidden"
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{
                                  background: overview.isMarketplaceVisible ? "#0ea5a4" : "#7c3aed",
                                  borderRadius: "4px",
                                  display: "block",
                                  height: "100%",
                                  width: barWidth
                                }}
                              />
                            </div>
                            <strong style={{ color: "#0b163f", fontSize: "6px", lineHeight: 1, textAlign: "right" }}>{totalBookings}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "10px", display: "grid", gap: "8px", padding: "12px" }}>
                    <div style={{ display: "grid", gap: "3px" }}>
                      <strong style={{ alignItems: "center", color: "#0b163f", display: "flex", fontSize: "6px", gap: "4px" }}>
                        <ProviderIcon name="funnel" size={12} />
                        Embudo comercial consolidado
                      </strong>
                      <span style={{ color: "#667085", fontSize: "5.5px" }}>Derivado de publicacion y reservas</span>
                    </div>
                    {[
                      { label: "Negocios", value: organizations.length, width: "100%", color: "#102a56", shape: "polygon(4% 0, 96% 0, 88% 100%, 12% 100%)" },
                      { label: "Publicados", value: publishedBusinessCount, width: "84%", color: "#155e95", shape: "polygon(6% 0, 94% 0, 86% 100%, 14% 100%)" },
                      { label: "Servicios activos", value: activeServiceCount, width: "68%", color: "#0891b2", shape: "polygon(8% 0, 92% 0, 84% 100%, 16% 100%)" },
                      { label: "Reservas", value: totalProviderBookingCount, width: "52%", color: "#14b8a6", shape: "polygon(10% 0, 90% 0, 80% 100%, 20% 100%)" },
                      { label: "Completadas", value: completedMoneyIndicator.bookingCount, width: "38%", color: "#5eead4", shape: "polygon(14% 0, 86% 0, 74% 100%, 26% 100%)" }
                    ].map((step) => (
                      <div key={step.label} style={{ alignItems: "center", display: "grid", gap: "8px", gridTemplateColumns: "minmax(70px, 1fr) 32px" }}>
                        <div
                          style={{
                            background: step.color,
                            borderRadius: "3px",
                            clipPath: step.shape,
                            color: "#ffffff",
                            fontSize: "5.5px",
                            fontWeight: 800,
                            marginInline: "auto",
                            minHeight: "22px",
                            padding: "6px 10px",
                            textAlign: "center",
                            width: step.width
                          }}
                        >
                          {step.label}
                        </div>
                        <strong style={{ color: "#0b163f", fontSize: "7px", textAlign: "right" }}>{step.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "14px", display: "grid", gap: "10px", padding: "14px" }}>
                    <div style={{ display: "grid", gap: "3px" }}>
                      <strong style={{ alignItems: "center", color: "#0b163f", display: "flex", fontSize: "9px", gap: "6px" }}>
                        <ProviderIcon name="capacity" size={16} />
                        Capacidad y ocupacion
                      </strong>
                      <span style={{ color: "#667085", fontSize: "9px" }}>Capacidad activa por franja y dia</span>
                    </div>
                    <div style={{ display: "grid", gap: "4px" }}>
                      <div style={{ display: "grid", gap: "4px", gridTemplateColumns: "74px repeat(7, minmax(34px, 1fr))" }}>
                        <span />
                        {capacityHeatmapDays.map((day) => (
                          <strong key={day} style={{ color: "#344054", fontSize: "9px", textAlign: "center" }}>
                            {providerDayOfWeekLabels[day].slice(0, 3)}
                          </strong>
                        ))}
                      </div>
                      {capacityHeatmapRows.map((row) => (
                        <div key={row.slotLabel} style={{ display: "grid", gap: "4px", gridTemplateColumns: "74px repeat(7, minmax(34px, 1fr))" }}>
                          <span style={{ color: "#475467", fontSize: "9px" }}>{row.slotLabel}</span>
                          {row.values.map((value, index) => (
                            <span
                              key={`${row.slotLabel}-${capacityHeatmapDays[index]}`}
                              style={{
                                background:
                                  value >= 70 ? "#fed7aa" : value >= 45 ? "#fef3c7" : value > 0 ? "#ccfbf1" : "#f2f4f7",
                                borderRadius: "6px",
                                color: "#344054",
                                fontSize: "9px",
                                padding: "6px 2px",
                                textAlign: "center"
                              }}
                            >
                              {value || "-"}%
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "14px", display: "grid", gap: "10px", padding: "14px" }}>
                    <strong style={{ alignItems: "center", color: "#0b163f", display: "flex", fontSize: "9px", gap: "6px" }}>
                      <ProviderIcon name="service" size={16} />
                      Ranking de servicios
                    </strong>
                    {selectedServiceRanking.length ? (
                      selectedServiceRanking.map((service, index) => (
                        <div key={service.id} style={{ alignItems: "center", display: "grid", gap: "8px", gridTemplateColumns: "18px minmax(0, 1fr) 54px 70px" }}>
                          <span style={{ color: "#667085", fontSize: "10px" }}>{index + 1}</span>
                          <strong style={{ color: "#101828", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {service.name}
                          </strong>
                          <span style={{ color: "#475467", fontSize: "10px", textAlign: "right" }}>{service.bookingCount}</span>
                          <span style={{ color: "#475467", fontSize: "10px", textAlign: "right" }}>{formatMoney(service.income, "USD")}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#667085", fontSize: "12px" }}>No hay servicios con reservas para rankear.</span>
                    )}
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "14px", display: "grid", gap: "10px", padding: "14px" }}>
                    <strong style={{ alignItems: "center", color: "#0b163f", display: "flex", fontSize: "9px", gap: "6px" }}>
                      <ProviderIcon name="alert" size={16} />
                      Alertas por negocio
                    </strong>
                    {dashboardAlerts.length ? (
                      dashboardAlerts.map((alert) => (
                        <div key={alert.id} style={{ alignItems: "start", display: "grid", gap: "8px", gridTemplateColumns: "24px minmax(0, 1fr)" }}>
                          <span
                            style={{
                              alignItems: "center",
                              background: providerVisualPalette[alert.tone].soft,
                              borderRadius: "999px",
                              color: providerVisualPalette[alert.tone].color,
                              display: "inline-flex",
                              fontSize: "11px",
                              fontWeight: 900,
                              height: "22px",
                              justifyContent: "center",
                              width: "22px"
                            }}
                          >
                            <ProviderIcon name="alert" size={13} strokeWidth={2.3} />
                          </span>
                          <span style={{ display: "grid", gap: "2px" }}>
                            <strong style={{ color: "#101828", fontSize: "11px" }}>{alert.label}</strong>
                            <span style={{ color: "#667085", fontSize: "10px" }}>{alert.detail}</span>
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#667085", fontSize: "12px" }}>No hay alertas operativas relevantes.</span>
                    )}
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "14px", display: "grid", gap: "10px", padding: "14px" }}>
                    <strong style={{ alignItems: "center", color: "#0b163f", display: "flex", fontSize: "9px", gap: "6px" }}>
                      <ProviderIcon name="health" size={16} />
                      Estado por negocio
                    </strong>
                    {businessOverviews.slice(0, 5).map((overview) => {
                      const readinessItems = [overview.hasPublicProfile, overview.hasService, overview.hasAvailability, overview.hasDocuments, overview.hasPublicLocation];
                      const readiness = getPercentValue(readinessItems.filter(Boolean).length, readinessItems.length);

                      return (
                        <div key={overview.organization.id} style={{ alignItems: "center", display: "grid", gap: "8px", gridTemplateColumns: "minmax(0, 1fr) 48px 76px" }}>
                          <strong style={{ color: "#101828", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {overview.organization.name}
                          </strong>
                          <span style={{ color: readiness >= 80 ? "#0f766e" : readiness >= 50 ? "#b45309" : "#b91c1c", fontSize: "11px", fontWeight: 900 }}>
                            {readiness}%
                          </span>
                          <ProviderStatusChip label={overview.isMarketplaceVisible ? "Excelente" : readiness >= 60 ? "Bueno" : "En atencion"} tone={overview.isMarketplaceVisible ? "success" : readiness >= 60 ? "warning" : "danger"} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ProviderCard>

              <div
                style={{
                  display: "none"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: "6px" }}>
                    <p style={{ margin: 0, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#ccfbf1", fontWeight: 800 }}>
                      Centro de gestion
                    </p>
                    <h3 style={{ margin: 0, fontSize: "24px", lineHeight: 1.1 }}>
                      {selectedOrganization?.name ?? "Selecciona un negocio"}
                    </h3>
                    <p style={{ margin: 0, color: "rgba(248, 250, 252, 0.78)", fontSize: "14px", lineHeight: 1.45 }}>
                      Gestiona catalogo, agenda, documentos, publicacion y reservas sin mezclar datos de propietario.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span
                      style={{
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.16)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 800
                      }}
                    >
                      {organizations.length} negocio(s)
                    </span>
                    <span
                      style={{
                        borderRadius: "999px",
                        background: isMarketplaceVisible ? "rgba(204, 251, 241, 0.2)" : "rgba(254, 243, 199, 0.18)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 800
                      }}
                    >
                      {isMarketplaceVisible ? "Visible en marketplace" : "No visible aun"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "10px" }}>
                  <strong style={{ fontSize: "15px" }}>Negocio seleccionado</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                    {[
                      { label: "Servicios", value: selectedServices.length, note: hasPublishedService ? "oferta visible" : "configurar oferta" },
                      { label: "Agenda", value: selectedAvailability.length, note: selectedAvailability.length ? "horarios definidos" : "sin horarios" },
                      { label: "Publicacion", value: `${readyChecklistCount}/${reviewReadiness.length}`, note: nextReadinessItem?.label ?? "listo para revision" },
                      { label: "Reservas", value: providerBookings.length, note: nextProviderBooking ? "hay actividad reciente" : "sin reservas aun" }
                    ].map((metric) => (
                      <ProviderMetricCard
                        key={metric.label}
                        label={metric.label}
                        note={metric.note}
                        surface="dark"
                        tone="success"
                        value={metric.value}
                      />
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    display: "grid",
                    gap: "10px",
                    padding: "12px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "15px" }}>Indicadores globales</strong>
                    <span style={{ color: "rgba(248,250,252,0.72)", fontSize: "11px", fontWeight: 700 }}>
                      Referencia operativa, sin cobro real
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px" }}>
                    {globalMoneyIndicatorCards.map((indicator) => {
                      const color =
                        indicator.tone === "success" ? "#ccfbf1" : indicator.tone === "warning" ? "#fef3c7" : "#fee2e2";
                      const background =
                        indicator.tone === "success"
                          ? "rgba(20, 184, 166, 0.18)"
                          : indicator.tone === "warning"
                            ? "rgba(245, 158, 11, 0.18)"
                            : "rgba(239, 68, 68, 0.16)";

                      return (
                        <div
                          key={indicator.id}
                          style={{
                            borderRadius: "999px",
                            background,
                            border: "1px solid rgba(255,255,255,0.18)",
                            color,
                            display: "grid",
                            gap: "3px",
                            minHeight: "74px",
                            padding: "10px 14px"
                          }}
                        >
                          <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            {indicator.label}
                          </span>
                          <strong style={{ color: "#f8fafc", fontSize: "18px", lineHeight: 1.1 }}>{indicator.value}</strong>
                          <span style={{ color: "rgba(248,250,252,0.74)", fontSize: "11px" }}>{indicator.detail}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <section style={{ display: "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))", gap: "10px" }}>
                  {executiveMetrics.map((metric) => (
                    <ProviderMetricCard key={metric.label} label={metric.label} note={metric.note} tone={metric.tone} value={metric.value} />
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "14px" }}>
                  <ProviderCard>
                    <div style={{ alignItems: "center", display: "flex", gap: "12px", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <p style={{ color: "#0f766e", fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", margin: 0, textTransform: "uppercase" }}>
                          Gestion multinegocios
                        </p>
                        <h3 style={{ color: "#101828", fontSize: "18px", margin: 0 }}>Tus negocios</h3>
                      </div>
                      <ProviderActionButton disabled={isSubmitting} onClick={openCreateBusiness} tone="secondary">
                        + Nuevo negocio
                      </ProviderActionButton>
                    </div>

                    {businessOverviews.length ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {businessOverviews.map((overview) => {
                          const organization = overview.organization;
                          const isSelected = organization.id === selectedOrganizationId;
                          const approvalTone =
                            organization.approvalStatus === "approved"
                              ? "success"
                              : organization.approvalStatus === "rejected"
                                ? "danger"
                                : "warning";

                          return (
                            <article
                              key={organization.id}
                              style={{
                                alignItems: "center",
                                background: isSelected ? "rgba(15, 118, 110, 0.08)" : "#ffffff",
                                border: isSelected ? "1px solid rgba(15, 118, 110, 0.28)" : "1px solid rgba(28, 25, 23, 0.1)",
                                borderRadius: "16px",
                                display: "grid",
                                gap: "12px",
                                gridTemplateColumns: "minmax(0, 1.4fr) minmax(62px, 0.28fr) minmax(62px, 0.28fr) minmax(90px, 0.42fr) minmax(80px, 0.28fr)",
                                minWidth: 0,
                                padding: "12px"
                              }}
                            >
                              <button
                                onClick={() => {
                                  closeProviderForms();
                                  void selectOrganization(organization.id);
                                }}
                                style={{
                                  alignItems: "center",
                                  background: "transparent",
                                  border: "none",
                                  color: "#101828",
                                  cursor: "pointer",
                                  display: "flex",
                                  gap: "10px",
                                  minWidth: 0,
                                  padding: 0,
                                  textAlign: "left"
                                }}
                                type="button"
                              >
                                <span
                                  aria-hidden="true"
                                  style={{
                                    alignItems: "center",
                                    background: "rgba(15, 118, 110, 0.1)",
                                    borderRadius: "14px",
                                    color: "#0f766e",
                                    display: "inline-flex",
                                    flexShrink: 0,
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    height: "42px",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    width: "42px"
                                  }}
                                >
                                  {organization.avatarUrl ? (
                                    <img alt="" src={organization.avatarUrl} style={{ height: "100%", objectFit: "cover", width: "100%" }} />
                                  ) : (
                                    organization.name
                                      .split(/\s+/)
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map((part) => part[0])
                                      .join("")
                                      .toUpperCase()
                                  )}
                                </span>
                                <span style={{ display: "grid", gap: "3px", minWidth: 0 }}>
                                  <strong style={{ fontSize: "13px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {organization.name}
                                  </strong>
                                  <span style={{ color: "#667085", fontSize: "11px" }}>
                                    {organization.city}, {organization.countryCode}
                                  </span>
                                  <span style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    <ProviderStatusChip label={providerApprovalStatusLabels[organization.approvalStatus]} tone={approvalTone} />
                                    <ProviderStatusChip label={organization.isPublic ? "Publico" : "Privado"} tone={organization.isPublic ? "success" : "neutral"} />
                                  </span>
                                </span>
                              </button>

                              <div style={{ display: "grid", gap: "3px", minWidth: 0 }}>
                                <span style={{ color: "#667085", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Servicios</span>
                                <strong style={{ color: "#101828", fontSize: "16px" }}>{overview.serviceCount}</strong>
                              </div>
                              <div style={{ display: "grid", gap: "3px", minWidth: 0 }}>
                                <span style={{ color: "#667085", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Pendientes</span>
                                <strong style={{ color: overview.bookingCounts.pending_approval ? "#b45309" : "#101828", fontSize: "16px" }}>
                                  {overview.bookingCounts.pending_approval}
                                </strong>
                              </div>
                              <div style={{ display: "grid", gap: "3px", minWidth: 0 }}>
                                <span style={{ color: "#667085", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Publicacion</span>
                                <ProviderStatusChip label={overview.isMarketplaceVisible ? "Visible" : "Pendiente"} tone={overview.isMarketplaceVisible ? "success" : "warning"} />
                              </div>
                              <ProviderActionButton
                                onClick={() => {
                                  closeProviderForms();
                                  void selectOrganization(organization.id).then(() => {
                                    window.setTimeout(() => navigateProviderSection("provider-web-business"), 120);
                                  });
                                }}
                                tone={isSelected ? "primary" : "secondary"}
                              >
                                Gestionar
                              </ProviderActionButton>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        style={{
                          background: "rgba(15, 118, 110, 0.06)",
                          border: "1px solid rgba(15, 118, 110, 0.14)",
                          borderRadius: "16px",
                          color: "#475467",
                          padding: "16px"
                        }}
                      >
                        Todavia no hay negocios registrados. Crea el primero para preparar perfil, servicios, agenda y documentos.
                      </div>
                    )}
                  </ProviderCard>

                  <ProviderCard>
                    <div style={{ display: "grid", gap: "5px" }}>
                      <p style={{ color: "#0f766e", fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", margin: 0, textTransform: "uppercase" }}>
                        Salud del negocio activo
                      </p>
                      <h3 style={{ color: "#101828", fontSize: "18px", margin: 0 }}>
                        {selectedOrganization?.name ?? "Sin negocio seleccionado"}
                      </h3>
                      <ProviderStatusChip
                        label={`Marketplace: ${activeMarketplaceLabel}`}
                        tone={isMarketplaceVisible ? "success" : activeMarketplaceLabel === "Pendiente" ? "warning" : "neutral"}
                      />
                    </div>

                    <div style={{ display: "grid", gap: "8px" }}>
                      {activeBusinessHealth.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => openGlobalAction(item.sectionId, selectedOrganizationId)}
                          style={{
                            alignItems: "center",
                            background: item.done ? "rgba(15, 118, 110, 0.06)" : "rgba(245, 158, 11, 0.08)",
                            border: item.done ? "1px solid rgba(15, 118, 110, 0.14)" : "1px solid rgba(245, 158, 11, 0.2)",
                            borderRadius: "14px",
                            color: "#101828",
                            cursor: "pointer",
                            display: "flex",
                            gap: "10px",
                            justifyContent: "space-between",
                            padding: "10px",
                            textAlign: "left"
                          }}
                          type="button"
                        >
                          <span style={{ display: "grid", gap: "2px" }}>
                            <strong style={{ fontSize: "12px" }}>{item.label}</strong>
                            <span style={{ color: "#667085", fontSize: "10px" }}>{item.done ? "Completo" : item.action}</span>
                          </span>
                          <ProviderStatusChip label={item.done ? "OK" : "Pendiente"} tone={item.done ? "success" : "warning"} />
                        </button>
                      ))}
                    </div>

                    <div style={{ borderTop: "1px solid rgba(28,25,23,0.08)", display: "grid", gap: "8px", paddingTop: "10px" }}>
                      <strong style={{ color: "#101828", fontSize: "13px" }}>Proximas acciones</strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        <ProviderActionButton onClick={() => openGlobalAction("provider-web-profile", selectedOrganizationId)} tone="secondary">
                          Completar perfil
                        </ProviderActionButton>
                        <ProviderActionButton onClick={openCreateService} tone="secondary">
                          Crear servicio
                        </ProviderActionButton>
                        <ProviderActionButton onClick={() => openGlobalAction("provider-web-availability", selectedOrganizationId)} tone="secondary">
                          Definir horarios
                        </ProviderActionButton>
                        <ProviderActionButton onClick={() => openGlobalAction("provider-web-business", selectedOrganizationId)} tone="secondary">
                          Cargar documentos
                        </ProviderActionButton>
                        <ProviderActionButton onClick={() => openGlobalAction("provider-web-bookings", selectedOrganizationId)} tone="secondary">
                          Revisar reservas
                        </ProviderActionButton>
                        <ProviderActionButton onClick={() => openGlobalAction("provider-web-publication", selectedOrganizationId)} tone="primary">
                          Publicar negocio
                        </ProviderActionButton>
                      </div>
                      <span style={{ color: "#667085", fontSize: "11px" }}>
                        {selectedBusinessOverview
                          ? `${selectedBusinessOverview.activeServiceCount} servicio(s) activo(s), ${selectedBusinessOverview.documentCount} documento(s) y ${selectedBusinessOverview.availabilityRuleCount} regla(s) de agenda.`
                          : "Selecciona un negocio para ver su estado operativo."}
                      </span>
                    </div>
                  </ProviderCard>
                </div>
              </section>

              <ProviderCard>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <p style={{ margin: 0, color: "#0f766e", fontSize: "11px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Operacion general
                    </p>
                    <strong style={{ fontSize: "18px" }}>Pendientes de todos tus negocios</strong>
                  </div>
                  <span style={{ color: "#57534e", fontSize: "13px" }}>
                    {globalActionCards.length ? "Toca una caja para ir al negocio relacionado." : "No hay pendientes operativos relevantes."}
                  </span>
                </div>
                {globalActionCards.length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
                    {globalActionCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => {
                          if (card.id === "pending-bookings") {
                            setIsPendingBookingsBreakdownOpen((current) => !current);
                            return;
                          }

                          openGlobalAction(card.sectionId, card.organizationId);
                        }}
                        style={{
                          borderRadius: "14px",
                          border:
                            card.id === "pending-bookings" && isPendingBookingsBreakdownOpen
                              ? "1px solid rgba(15, 118, 110, 0.32)"
                              : "1px solid rgba(15, 118, 110, 0.16)",
                          background:
                            card.id === "pending-bookings" && isPendingBookingsBreakdownOpen
                              ? "linear-gradient(135deg, rgba(204, 251, 241, 0.9), rgba(255, 251, 235, 0.82))"
                              : "linear-gradient(135deg, rgba(240, 253, 250, 0.96), rgba(255, 251, 235, 0.82))",
                          color: "#1c1917",
                          cursor: "pointer",
                          display: "grid",
                          gap: "5px",
                          padding: "12px",
                          textAlign: "left"
                        }}
                        >
                        <span style={{ color: "#0f766e", fontSize: "11px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {card.label}
                        </span>
                        <strong style={{ color: "#0f766e", fontSize: "22px", lineHeight: 1 }}>{card.count}</strong>
                        <span style={{ color: "#57534e", fontSize: "12px", lineHeight: 1.35 }}>{card.help}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {isPendingBookingsBreakdownOpen ? (
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,253,250,0.78))",
                      border: "1px solid rgba(15, 118, 110, 0.16)",
                      borderRadius: "16px",
                      display: "grid",
                      gap: "12px",
                      padding: "14px"
                    }}
                  >
                    <div style={{ alignItems: "center", display: "flex", gap: "10px", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: "3px" }}>
                        <strong style={{ color: "#0f172a", fontSize: "13px" }}>Citas pendientes por negocio</strong>
                        <span style={{ color: "#667085", fontSize: "10px" }}>
                          {pendingApprovalTotal} solicitud(es) esperando aprobacion en todos tus negocios.
                        </span>
                      </div>
                      <ProviderStatusChip label={`${pendingBookingsByBusiness.length} negocio(s)`} tone={pendingBookingsByBusiness.length ? "warning" : "success"} />
                    </div>
                    {pendingBookingsByBusiness.length ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {pendingBookingsByBusiness.map((group) => (
                          <section
                            key={group.organization.id}
                            style={{
                              background: "#fffdf8",
                              border: "1px solid rgba(15, 118, 110, 0.12)",
                              borderRadius: "12px",
                              display: "grid",
                              gap: "8px",
                              padding: "10px"
                            }}
                          >
                            <div style={{ alignItems: "center", display: "flex", gap: "8px", justifyContent: "space-between" }}>
                              <div style={{ display: "grid", gap: "2px", minWidth: 0 }}>
                                <strong style={{ color: "#0f172a", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {group.organization.name}
                                </strong>
                                <span style={{ color: "#667085", fontSize: "8px" }}>{group.organization.city}</span>
                              </div>
                              <button
                                onClick={() => {
                                  void selectOrganization(group.organization.id).then(() => {
                                    navigateProviderSection("provider-web-bookings");
                                  });
                                }}
                                style={{
                                  background: "rgba(15, 118, 110, 0.1)",
                                  border: "1px solid rgba(15, 118, 110, 0.18)",
                                  borderRadius: "999px",
                                  color: "#0f766e",
                                  cursor: "pointer",
                                  fontSize: "7px",
                                  fontWeight: 900,
                                  padding: "5px 8px",
                                  textTransform: "uppercase"
                                }}
                                type="button"
                              >
                                Ver negocio
                              </button>
                            </div>
                            <div style={{ display: "grid", gap: "6px" }}>
                              {group.bookings.slice(0, 5).map((booking) => (
                                <article
                                  key={booking.id}
                                  style={{
                                    alignItems: "center",
                                    background: "rgba(240, 253, 250, 0.54)",
                                    border: "1px solid rgba(15, 118, 110, 0.1)",
                                    borderRadius: "10px",
                                    display: "grid",
                                    gap: "8px",
                                    gridTemplateColumns: "minmax(0, 1fr) auto",
                                    padding: "8px"
                                  }}
                                >
                                  <div style={{ display: "grid", gap: "3px", minWidth: 0 }}>
                                    <strong style={{ color: "#0f172a", fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {booking.serviceName} - {booking.petName}
                                    </strong>
                                    <span style={{ color: "#667085", fontSize: "8px" }}>
                                      {booking.customerDisplayName || booking.householdName} · {formatDateTime(booking.scheduledStartAt)}
                                    </span>
                                  </div>
                                  <strong style={{ color: "#0f766e", fontSize: "9px", whiteSpace: "nowrap" }}>
                                    {formatMoney(booking.totalPriceCents, booking.currencyCode)}
                                  </strong>
                                </article>
                              ))}
                              {group.bookings.length > 5 ? (
                                <span style={{ color: "#b45309", fontSize: "8px", fontWeight: 800 }}>
                                  + {group.bookings.length - 5} pendiente(s) adicional(es) en este negocio.
                                </span>
                              ) : null}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...controlStyle, background: "rgba(15, 118, 110, 0.08)", color: "#0f766e", fontWeight: 800 }}>
                        No hay citas pendientes de aprobacion en tus negocios.
                      </div>
                    )}
                  </div>
                ) : null}
              </ProviderCard>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                display: activeProviderSectionId === "provider-web-organizations" || activeProviderSectionId === "provider-web-business" ? "grid" : "none",
                gap: "18px",
                alignContent: "start"
              }}
            >
              <article
                id="provider-web-organizations"
                style={{
                  gridColumn: "1 / -1",
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: activeProviderSectionId === "provider-web-organizations" ? "grid" : "none",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "20px" }}>Mis negocios</h3>
                  <StatusPill label={`${organizations.length} en total`} tone="neutral" />
                </div>
                {!providerRoleActive ? (
                  <p style={{ margin: 0, color: "#57534e" }}>
                    Cambia a la vista de proveedor para trabajar solo con tus negocios y reservas.
                  </p>
                ) : null}
                {organizations.length ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      overflowX: "auto",
                      padding: "2px 2px 10px",
                      scrollSnapType: "x proximity"
                    }}
                  >
                    {organizations.map((organization) => {
                      const overview = businessOverviews.find((item) => item.organization.id === organization.id);
                      const publicationChecklist = overview ? getBusinessPublicationChecklist(overview) : [];

                      return (
                    <article
                      key={organization.id}
                      style={{
                        borderRadius: "14px",
                        border:
                          organization.id === selectedOrganizationId
                            ? "1px solid rgba(15, 118, 110, 0.28)"
                            : "1px solid rgba(28, 25, 23, 0.1)",
                        padding: "12px",
                        minWidth: "300px",
                        maxWidth: "330px",
                        scrollSnapAlign: "start",
                        textAlign: "left",
                        background:
                          organization.id === selectedOrganizationId
                            ? "rgba(15, 118, 110, 0.08)"
                            : "rgba(255,255,255,0.72)",
                        display: "grid",
                        gap: "7px",
                        position: "relative"
                      }}
                    >
                      <button
                        onClick={() => {
                          closeProviderForms();
                          void selectOrganization(organization.id);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "inherit",
                          cursor: "pointer",
                          display: "grid",
                          gap: "7px",
                          padding: 0,
                          textAlign: "left",
                          width: "100%"
                        }}
                      >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: "10px", minWidth: 0, alignItems: "center" }}>
                          <span
                            aria-hidden="true"
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "12px",
                              background: "rgba(15, 118, 110, 0.1)",
                              color: "#0f766e",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontSize: "11px",
                              fontWeight: 900,
                              overflow: "hidden"
                            }}
                          >
                            {organization.avatarUrl ? (
                              <img alt="" src={organization.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              organization.name
                                .split(/\s+/)
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join("")
                                .toUpperCase()
                            )}
                          </span>
                          <strong style={{ fontSize: "13px", lineHeight: 1.12, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {organization.name}
                          </strong>
                        </div>
                        <span
                          style={{
                            borderRadius: "999px",
                            border:
                              organization.approvalStatus === "approved"
                                ? "1px solid rgba(15, 118, 110, 0.24)"
                                : organization.approvalStatus === "rejected"
                                  ? "1px solid rgba(68, 64, 60, 0.14)"
                                  : "1px solid rgba(180, 83, 9, 0.24)",
                            background:
                              organization.approvalStatus === "approved"
                                ? "rgba(15, 118, 110, 0.12)"
                                : organization.approvalStatus === "rejected"
                                  ? "rgba(68, 64, 60, 0.08)"
                                  : "rgba(180, 83, 9, 0.12)",
                            color:
                              organization.approvalStatus === "approved"
                                ? "#0f766e"
                                : organization.approvalStatus === "rejected"
                                  ? "#44403c"
                                  : "#b45309",
                            flexShrink: 0,
                            fontSize: "6px",
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            padding: "4px 6px",
                            textTransform: "uppercase"
                          }}
                        >
                          {providerApprovalStatusLabels[organization.approvalStatus]}
                        </span>
                      </div>
                      <span style={{ color: "#57534e", fontSize: "11px", paddingLeft: "46px" }}>{organization.city}</span>
                      </button>
                      {publicationChecklist.length ? (
                        <div
                          aria-label={`Checklist de publicacion de ${organization.name}`}
                          style={{
                            display: "grid",
                            gap: "5px",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            paddingLeft: "46px"
                          }}
                        >
                          {publicationChecklist.map((item) => (
                            <span
                              key={item.label}
                              style={{
                                alignItems: "center",
                                color: item.done ? "#0f766e" : "#b45309",
                                display: "inline-flex",
                                fontSize: "8px",
                                fontWeight: 850,
                                gap: "5px",
                                letterSpacing: "0.02em",
                                minWidth: 0,
                                textTransform: "uppercase"
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{
                                  background: item.done ? "rgba(15, 118, 110, 0.16)" : "rgba(245, 158, 11, 0.18)",
                                  border: item.done ? "1px solid rgba(15, 118, 110, 0.24)" : "1px solid rgba(245, 158, 11, 0.28)",
                                  borderRadius: "999px",
                                  flexShrink: 0,
                                  height: "8px",
                                  width: "8px"
                                }}
                              />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.label}: {item.done ? "Listo" : "Pendiente"}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          aria-label={`Editar ${organization.name}`}
                          onClick={() => {
                            closeProviderForms();
                            setOrganizationMode("edit");
                            setOrganizationForm({
                              name: organization.name,
                              slug: organization.slug,
                              city: organization.city,
                              countryCode: organization.countryCode,
                              isPublic: organization.isPublic
                            });
                            setIsBusinessFormOpen(true);
                            void selectOrganization(organization.id);
                            window.setTimeout(() => navigateProviderSection("provider-web-business"), 120);
                          }}
                          style={{
                            borderRadius: "999px",
                            background: organization.id === selectedOrganizationId ? "#0f766e" : "rgba(15, 118, 110, 0.12)",
                            color: organization.id === selectedOrganizationId ? "#f8fafc" : "#0f766e",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "8px",
                            fontWeight: 900,
                            letterSpacing: "0.04em",
                            minHeight: "22px",
                            padding: "5px 8px",
                            textTransform: "uppercase"
                          }}
                          type="button"
                        >
                          Editar
                        </button>
                      </div>
                    </article>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Todavia no tienes negocios registrados. Crea el primero para preparar tu publicacion.</p>
                )}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    onClick={() => {
                      clearMessages();
                      navigateProviderSection("provider-web-business");
                      setOrganizationMode("create");
                      setOrganizationForm(emptyOrganizationForm);
                      setIsBusinessFormOpen(true);
                    }}
                    tone="secondary"
                  >
                    + Nuevo negocio
                  </Button>
                  <Button disabled={isSubmitting} onClick={() => void refresh(selectedOrganizationId)} tone="secondary">
                    Actualizar
                  </Button>
                </div>
              </article>

              <article
                id="provider-web-business"
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: activeProviderSectionId === "provider-web-business" && isBusinessFormOpen ? "grid" : "none",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <h3 style={{ margin: 0, fontSize: "20px" }}>{organizationMode === "create" ? "Nuevo negocio" : "Datos del negocio"}</h3>
                    <span style={{ color: "#57534e", fontSize: "13px" }}>
                      Edita los datos base que identifican tu negocio.
                    </span>
                  </div>
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      if (!isBusinessFormOpen && selectedOrganization) {
                        setOrganizationMode("edit");
                      }
                      setIsBusinessFormOpen((current) => !current);
                    }}
                    style={{
                      borderRadius: "999px",
                      border: "1px solid rgba(15, 118, 110, 0.22)",
                      background: isBusinessFormOpen ? "rgba(15, 118, 110, 0.1)" : "#0f766e",
                      color: isBusinessFormOpen ? "#0f766e" : "#f8fafc",
                      cursor: "pointer",
                      fontWeight: 800,
                      padding: "9px 13px"
                    }}
                    type="button"
                  >
                    Cerrar
                  </button>
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
                        "Negocio actualizado."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                        setIsBusinessFormOpen(false);
                      });
                      return;
                    }

                    void runAction(
                      () => getBrowserProvidersApiClient().createProviderOrganization(payload),
                      "Negocio creado."
                    ).then(async (organization) => {
                      await refresh(organization.id);
                      setIsBusinessFormOpen(false);
                    });
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <Field label="Nombre del negocio" onChange={(value) => setOrganizationForm((current) => ({ ...current, name: value }))} value={organizationForm.name} />
                  <Field label="Identificador publico" onChange={(value) => setOrganizationForm((current) => ({ ...current, slug: value }))} value={organizationForm.slug} />
                  <Field label="Ciudad" onChange={(value) => setOrganizationForm((current) => ({ ...current, city: value }))} value={organizationForm.city} />
                  <Field label="Pais" onChange={(value) => setOrganizationForm((current) => ({ ...current, countryCode: value }))} value={organizationForm.countryCode} />
                  <CheckField checked={organizationForm.isPublic} label="Permitir publicacion publica al aprobarse" onChange={(value) => setOrganizationForm((current) => ({ ...current, isPublic: value }))} />
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} type="submit">
                      {organizationMode === "create" ? "Crear negocio" : "Guardar negocio"}
                    </Button>
                    {organizationMode === "edit" ? (
                      <Button
                        disabled={isSubmitting}
                        onClick={() => {
                          setOrganizationMode("create");
                          setOrganizationForm(emptyOrganizationForm);
                          setIsBusinessFormOpen(true);
                        }}
                        tone="secondary"
                      >
                        Crear otra
                      </Button>
                    ) : null}
                  </div>
                </form>
                {organizationMode === "edit" && selectedOrganization ? (
                  <section
                    style={{
                      borderTop: "1px solid rgba(28, 25, 23, 0.1)",
                      display: "grid",
                      gap: "12px",
                      marginTop: "6px",
                      paddingTop: "16px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <h4 style={{ margin: 0, fontSize: "18px" }}>Documentos de aprobacion</h4>
                        <span style={{ color: "#57534e", fontSize: "13px" }}>Expediente maestro requerido para revision del negocio.</span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <StatusPill label={`${selectedDocuments.length} cargados`} tone="neutral" />
                        <button
                          disabled={isSubmitting}
                          onClick={() => setIsDocumentFormOpen((current) => !current)}
                          style={{
                            borderRadius: "999px",
                            border: "1px solid rgba(15, 118, 110, 0.22)",
                            background: isDocumentFormOpen ? "rgba(15, 118, 110, 0.1)" : "#0f766e",
                            color: isDocumentFormOpen ? "#0f766e" : "#f8fafc",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            fontWeight: 800,
                            padding: "9px 13px"
                          }}
                          type="button"
                        >
                          {isDocumentFormOpen ? "Cerrar" : "+ Documento"}
                        </button>
                      </div>
                    </div>
                    {isDocumentFormOpen ? (
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
                            setIsDocumentFormOpen(false);
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
                          Cargar documento
                        </Button>
                      </form>
                    ) : null}

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
                      <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay documentos de aprobacion cargados para este negocio.</p>
                    )}
                  </section>
                ) : null}
              </article>
            </div>

            <div
              style={{
                display: activeProviderSectionId === "provider-web-publication" || activeProviderSectionId === "provider-web-bookings" ? "grid" : "none",
                gap: "18px",
                alignContent: "start"
              }}
            >
              <article
                id="provider-web-publication"
                style={{
                  display: activeProviderSectionId === "provider-web-publication" ? "grid" : "none",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "12px" }}>Publicacion</h3>
                  {selectedOrganization ? (
                    <span
                      style={{
                        borderRadius: "999px",
                        border:
                          selectedOrganization.approvalStatus === "approved"
                            ? "1px solid rgba(15, 118, 110, 0.24)"
                            : selectedOrganization.approvalStatus === "rejected"
                              ? "1px solid rgba(68, 64, 60, 0.14)"
                              : "1px solid rgba(180, 83, 9, 0.24)",
                        background:
                          selectedOrganization.approvalStatus === "approved"
                            ? "rgba(15, 118, 110, 0.12)"
                            : selectedOrganization.approvalStatus === "rejected"
                              ? "rgba(68, 64, 60, 0.08)"
                              : "rgba(180, 83, 9, 0.12)",
                        color:
                          selectedOrganization.approvalStatus === "approved"
                            ? "#0f766e"
                            : selectedOrganization.approvalStatus === "rejected"
                              ? "#44403c"
                              : "#b45309",
                        fontSize: "7px",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        padding: "4px 7px",
                        textTransform: "uppercase"
                      }}
                    >
                      {providerApprovalStatusLabels[selectedOrganization.approvalStatus]}
                    </span>
                  ) : null}
                </div>
                {selectedOrganization ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "8px" }}>
                      <div style={{ ...controlStyle, display: "grid", gap: "5px", padding: "10px 12px" }}>
                        <strong style={{ fontSize: "10px" }}>Visibilidad</strong>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>{selectedOrganization.isPublic ? "Publico al aprobarse" : "Privado incluso si se aprueba"}</span>
                      </div>
                      <div style={{ ...controlStyle, display: "grid", gap: "5px", padding: "10px 12px" }}>
                        <strong style={{ fontSize: "10px" }}>Aparicion en busqueda</strong>
                        <span style={{ color: "#57534e", fontSize: "9px" }}>{isMarketplaceVisible ? "Visible en el marketplace" : "Oculto en el marketplace"}</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "10px" }}>Pendientes del negocio</strong>
                        <span
                          style={{
                            borderRadius: "999px",
                            border: pendingReadinessItems.length ? "1px solid rgba(180, 83, 9, 0.24)" : "1px solid rgba(15, 118, 110, 0.24)",
                            background: pendingReadinessItems.length ? "rgba(180, 83, 9, 0.12)" : "rgba(15, 118, 110, 0.12)",
                            color: pendingReadinessItems.length ? "#b45309" : "#0f766e",
                            fontSize: "7px",
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            padding: "4px 7px",
                            textTransform: "uppercase"
                          }}
                        >
                          {pendingReadinessItems.length ? `${pendingReadinessItems.length} pendiente(s)` : "todo listo"}
                        </span>
                      </div>
                      {pendingReadinessItems.length ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
                          {pendingReadinessItems.map((item) => {
                            const action = getProviderReadinessAction(item.label);

                            return (
                              <button
                                key={item.label}
                                onClick={() => {
                                  if (action.sectionId === "provider-web-profile") {
                                    setIsProfileFormOpen(true);
                                  }
                                  if (action.sectionId === "provider-web-services") {
                                    setServiceForm(emptyServiceForm);
                                    setIsServiceFormOpen(true);
                                  }
                                  if (action.sectionId === "provider-web-availability") {
                                    setAvailabilityForm(emptyAvailabilityForm);
                                    setIsAvailabilityFormOpen(true);
                                  }
                                  if (action.sectionId === "provider-web-business") {
                                    setOrganizationMode("edit");
                                    setIsBusinessFormOpen(true);
                                  }
                                  navigateProviderSection(action.sectionId);
                                }}
                                style={{
                                  borderRadius: "14px",
                                  border: "1px solid rgba(180, 83, 9, 0.16)",
                                  background: "rgba(254, 243, 199, 0.42)",
                                  color: "#1c1917",
                                  cursor: "pointer",
                                  display: "grid",
                                  gap: "6px",
                                  padding: "10px",
                                  textAlign: "left"
                                }}
                                type="button"
                              >
                                <span style={{ color: "#b45309", fontSize: "7px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                  Pendiente
                                </span>
                                <strong style={{ fontSize: "9px" }}>{item.label}</strong>
                                <span style={{ color: "#0f766e", fontSize: "13px", fontWeight: 800 }}>{action.actionLabel} &gt;</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ ...controlStyle, display: "grid", gap: "6px", background: "rgba(15, 118, 110, 0.08)" }}>
                          <strong>Tu negocio esta completo para revision.</strong>
                          <span style={{ color: "#57534e" }}>Manten servicios, agenda y documentos actualizados antes de operar nuevas reservas.</span>
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, color: "#57534e", lineHeight: 1.7 }}>
                      Tu negocio aparece para propietarios cuando esta aprobado, visible, con perfil publico y al menos un servicio activo.
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Crea o selecciona un negocio para revisar su publicacion.</p>
                )}
              </article>

              <article
                id="provider-web-bookings"
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: activeProviderSectionId === "provider-web-bookings" ? "grid" : "none",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "15px" }}>Reservas entrantes</h3>
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.72)",
                      border: "1px solid rgba(28, 25, 23, 0.12)",
                      borderRadius: "999px",
                      color: "#44403c",
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      padding: "5px 9px",
                      textTransform: "uppercase"
                    }}
                  >
                    {providerBookings.length} en total
                  </span>
                </div>
                {selectedOrganization ? (
                  <>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {[
                        { status: "pending_approval" as const, label: "Pendientes por aprobar", count: pendingProviderBookings.length, tone: "warning" as const },
                        { status: "confirmed" as const, label: "Confirmadas", count: confirmedProviderBookings.length, tone: "success" as const },
                        { status: "completed" as const, label: "Completadas", count: completedProviderBookings.length, tone: "success" as const },
                        { status: "cancelled" as const, label: "Canceladas", count: cancelledProviderBookings.length, tone: "neutral" as const }
                      ].map((filter) => {
                        const isActive = bookingStatusFilter === filter.status;

                        return (
                          <button
                            key={filter.status}
                            onClick={() => setBookingStatusFilter(filter.status)}
                            style={{
                              alignItems: "center",
                              background: isActive
                                ? filter.status === "pending_approval"
                                  ? "rgba(254, 243, 199, 0.88)"
                                  : "rgba(204, 251, 241, 0.78)"
                                : "rgba(255, 255, 255, 0.78)",
                              border: isActive
                                ? filter.status === "pending_approval"
                                  ? "1px solid rgba(180, 83, 9, 0.28)"
                                  : "1px solid rgba(15, 118, 110, 0.24)"
                                : "1px solid rgba(28, 25, 23, 0.12)",
                              borderRadius: "999px",
                              color: isActive
                                ? filter.status === "pending_approval"
                                  ? "#b45309"
                                  : "#0f766e"
                                : "#57534e",
                              cursor: "pointer",
                              display: "inline-flex",
                              fontSize: "6.5px",
                              fontWeight: 900,
                              gap: "5px",
                              letterSpacing: "0.05em",
                              minHeight: "22px",
                              padding: "5px 8px",
                              textTransform: "uppercase"
                            }}
                            type="button"
                          >
                            <span>{filter.count}</span>
                            <span>{filter.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {providerBookings.length ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {filteredProviderBookings.length ? (
                          filteredProviderBookings.map((booking) => {
                          const isExpanded = expandedProviderBookingId === booking.id;
                          const expandedDetail =
                            isExpanded && selectedProviderBookingDetail?.booking.id === booking.id ? selectedProviderBookingDetail : null;

                          return (
                            <article
                              key={booking.id}
                              style={{
                                borderRadius: "16px",
                                background: "rgba(255,255,255,0.72)",
                                border: isExpanded ? "1px solid rgba(15, 118, 110, 0.22)" : "1px solid rgba(28, 25, 23, 0.08)",
                                display: "grid",
                                overflow: "hidden"
                              }}
                            >
                              <button
                                onClick={() => toggleProviderBookingAccordion(booking.id)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#1c1917",
                                  cursor: "pointer",
                                  display: "grid",
                                  gap: "8px",
                                  padding: "10px 12px",
                                  textAlign: "left"
                                }}
                                type="button"
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                                  <strong style={{ fontSize: "8.5px", lineHeight: 1.15 }}>{booking.serviceName}</strong>
                                  <span
                                    style={{
                                      borderRadius: "999px",
                                      border:
                                        booking.status === "pending_approval"
                                          ? "1px solid rgba(180, 83, 9, 0.24)"
                                          : booking.status === "cancelled"
                                            ? "1px solid rgba(68, 64, 60, 0.14)"
                                            : "1px solid rgba(15, 118, 110, 0.24)",
                                      background:
                                        booking.status === "pending_approval"
                                          ? "rgba(180, 83, 9, 0.12)"
                                          : booking.status === "cancelled"
                                            ? "rgba(68, 64, 60, 0.08)"
                                            : "rgba(15, 118, 110, 0.12)",
                                      color:
                                        booking.status === "pending_approval"
                                          ? "#b45309"
                                          : booking.status === "cancelled"
                                            ? "#44403c"
                                            : "#0f766e",
                                      flexShrink: 0,
                                      fontSize: "5px",
                                      fontWeight: 800,
                                      letterSpacing: "0.08em",
                                      padding: "3px 6px",
                                      textTransform: "uppercase"
                                    }}
                                  >
                                    {bookingStatusLabels[booking.status]}
                                  </span>
                                </div>
                                <span style={{ color: "#57534e", fontSize: "7px", lineHeight: 1.35 }}>
                                  {booking.householdName} - {booking.customerDisplayName}
                                </span>
                                <span style={{ color: "#57534e", fontSize: "7px", lineHeight: 1.35 }}>
                                  {booking.petName} - {formatDateTime(booking.scheduledStartAt)}
                                </span>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                                  <strong style={{ fontSize: "7px" }}>{formatMoney(booking.totalPriceCents, booking.currencyCode)}</strong>
                                  <span style={{ color: "#0f766e", fontSize: "7px", fontWeight: 800 }}>
                                    {isExpanded ? "Ocultar" : "Ver detalle"}
                                  </span>
                                </div>
                              </button>

                              {isExpanded ? (
                                <div
                                  style={{
                                    borderTop: "1px solid rgba(28, 25, 23, 0.08)",
                                    display: "grid",
                                    gap: "10px",
                                    padding: "10px 12px"
                                  }}
                                >
                                  <span style={{ color: "#57534e", fontSize: "10px" }}>
                                    Modo: {booking.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                                  </span>
                                  {expandedDetail ? (
                                    <>
                                      <span style={{ color: "#57534e", fontSize: "10px" }}>
                                        Metodo de pago:{" "}
                                        {expandedDetail.paymentMethodSummary
                                          ? `${expandedDetail.paymentMethodSummary.brand.toUpperCase()} ${expandedDetail.paymentMethodSummary.last4}`
                                          : "Sin metodo de pago guardado vinculado"}
                                      </span>
                                      <div style={{ display: "grid", gap: "6px" }}>
                                        {expandedDetail.statusHistory.map((change) => (
                                          <div key={change.id} style={{ ...controlStyle, display: "grid", gap: "4px", padding: "8px 10px" }}>
                                            <strong style={{ fontSize: "9px" }}>{bookingStatusLabels[change.toStatus]}</strong>
                                            <span style={{ color: "#57534e", fontSize: "9px" }}>{formatDateTime(change.createdAt)}</span>
                                            <span style={{ color: "#57534e", fontSize: "9px" }}>
                                              {change.changeReason ?? "Sin razon adicional registrada."}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <span style={{ color: "#57534e", fontSize: "10px" }}>Cargando detalle de la reserva...</span>
                                  )}
                                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {booking.status === "pending_approval" ? (
                                      <>
                                        <Button disabled={isSubmitting} onClick={() => void approveProviderBooking(booking.id)}>
                                          Aprobar
                                        </Button>
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
                                      <Button disabled={isSubmitting} onClick={() => void completeProviderBooking(booking.id)}>
                                        Marcar como completada
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                            </article>
                          );
                        })
                        ) : (
                          <div
                            style={{
                              background: "rgba(255, 255, 255, 0.72)",
                              border: "1px solid rgba(28, 25, 23, 0.08)",
                              borderRadius: "14px",
                              color: "#57534e",
                              display: "grid",
                              gap: "4px",
                              padding: "14px"
                            }}
                          >
                            <strong style={{ color: "#1c1917", fontSize: "11px" }}>Sin reservas en este filtro</strong>
                            <span style={{ fontSize: "10px" }}>
                              No hay reservas con estado {bookingStatusLabels[bookingStatusFilter].toLowerCase()} para este negocio.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>
                        Todavia no existen reservas para esta organizacion. Cuando se reserve un servicio publico aprobado, aqui apareceran solicitudes y reservas confirmadas.
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
                )}
              </article>

              <article
                style={{
                  background: "rgba(247, 242, 231, 0.72)",
                  borderRadius: "22px",
                  display: activeProviderSectionId === "provider-web-bookings" ? "grid" : "none",
                  gap: "12px",
                  padding: "20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px" }}>Conversaciones activas</h3>
                    <span style={{ color: "#57534e", fontSize: "10px" }}>Chats vinculados a reservas del negocio activo.</span>
                  </div>
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.72)",
                      border: "1px solid rgba(28, 25, 23, 0.12)",
                      borderRadius: "999px",
                      color: "#44403c",
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      padding: "5px 9px",
                      textTransform: "uppercase"
                    }}
                  >
                    {selectedOrganizationMessageThreads.length} activa(s)
                  </span>
                </div>
                {selectedOrganization ? (
                  selectedOrganizationMessageThreads.length ? (
                    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "minmax(220px, 0.82fr) minmax(0, 1.18fr)" }}>
                      <div style={{ display: "grid", gap: "8px", alignContent: "start" }}>
                        {selectedOrganizationMessageThreads.map((thread) => {
                          const isSelected = selectedProviderMessageThreadDetail?.thread.id === thread.id;

                          return (
                            <button
                              key={thread.id}
                              onClick={() => void openProviderMessageThread(thread.id)}
                              style={{
                                background: isSelected ? "rgba(15, 118, 110, 0.1)" : "rgba(255,255,255,0.72)",
                                border: isSelected ? "1px solid rgba(15, 118, 110, 0.22)" : "1px solid rgba(28, 25, 23, 0.08)",
                                borderRadius: "14px",
                                color: "#1c1917",
                                cursor: "pointer",
                                display: "grid",
                                gap: "5px",
                                padding: "10px",
                                textAlign: "left"
                              }}
                              type="button"
                            >
                              <strong style={{ fontSize: "9px", lineHeight: 1.2 }}>{thread.customerDisplayName}</strong>
                              <span style={{ color: "#57534e", fontSize: "8px" }}>
                                {thread.petName} - {thread.serviceName}
                              </span>
                              <span style={{ color: "#0f766e", fontSize: "8px", fontWeight: 800 }}>
                                {thread.lastMessagePreview ?? "Sin preview disponible"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          background: "rgba(255,255,255,0.78)",
                          border: "1px solid rgba(28, 25, 23, 0.08)",
                          borderRadius: "16px",
                          display: "grid",
                          gap: "10px",
                          padding: "12px"
                        }}
                      >
                        {selectedProviderMessageThreadDetail ? (
                          <>
                            <div style={{ display: "grid", gap: "3px" }}>
                              <strong style={{ color: "#101828", fontSize: "10px" }}>
                                {selectedProviderMessageThreadDetail.thread.customerDisplayName}
                              </strong>
                              <span style={{ color: "#57534e", fontSize: "8px" }}>
                                {selectedProviderMessageThreadDetail.thread.petName} - {selectedProviderMessageThreadDetail.thread.serviceName}
                              </span>
                            </div>
                            <div style={{ display: "grid", gap: "7px", maxHeight: "240px", overflowY: "auto", paddingRight: "2px" }}>
                              {selectedProviderMessageThreadDetail.messages.map((message) => (
                                <div
                                  key={message.id}
                                  style={{
                                    justifySelf: message.senderRole === "provider" ? "end" : "start",
                                    maxWidth: "82%",
                                    background: message.senderRole === "provider" ? "rgba(15, 118, 110, 0.12)" : "rgba(247, 242, 231, 0.92)",
                                    border: "1px solid rgba(28, 25, 23, 0.08)",
                                    borderRadius: "12px",
                                    display: "grid",
                                    gap: "4px",
                                    padding: "8px"
                                  }}
                                >
                                  <span style={{ color: "#0f766e", fontSize: "7px", fontWeight: 900, textTransform: "uppercase" }}>
                                    {message.senderRole === "provider" ? "Proveedor" : message.senderDisplayName}
                                  </span>
                                  <span style={{ color: "#1c1917", fontSize: "9px", lineHeight: 1.35 }}>{message.messageText}</span>
                                  <span style={{ color: "#78716c", fontSize: "7px" }}>{formatDateTime(message.createdAt)}</span>
                                </div>
                              ))}
                            </div>
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                void sendProviderMessage();
                              }}
                              style={{ display: "grid", gap: "8px" }}
                            >
                              <textarea
                                onChange={(event) => setProviderMessageDraft(event.target.value)}
                                placeholder="Responder al propietario..."
                                style={{
                                  ...controlStyle,
                                  minHeight: "62px",
                                  resize: "vertical"
                                }}
                                value={providerMessageDraft}
                              />
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <ProviderActionButton disabled={isSubmitting || !providerMessageDraft.trim()} type="submit">
                                  Enviar respuesta
                                </ProviderActionButton>
                              </div>
                            </form>
                          </>
                        ) : (
                          <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Selecciona una conversacion para ver el hilo y responder.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>
                      No hay conversaciones con actividad para este negocio.
                    </p>
                  )
                ) : (
                  <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Selecciona primero una organizacion.</p>
                )}
              </article>

              <article
                id="provider-web-profile"
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: activeProviderSectionId === "provider-web-publication" ? "grid" : "none",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <h3 style={{ margin: 0, fontSize: "20px" }}>Perfil publico</h3>
                    <span style={{ color: "#57534e", fontSize: "13px" }}>Presentacion que veran los propietarios.</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {selectedPublicProfile ? <StatusPill label={selectedPublicProfile.isPublic ? "publico" : "oculto"} tone={selectedPublicProfile.isPublic ? "active" : "neutral"} /> : null}
                    <button
                      disabled={!selectedOrganization || isSubmitting}
                      onClick={() => setIsProfileFormOpen((current) => !current)}
                      style={{
                        borderRadius: "999px",
                        border: "1px solid rgba(15, 118, 110, 0.22)",
                        background: isProfileFormOpen ? "rgba(15, 118, 110, 0.1)" : "#0f766e",
                        color: isProfileFormOpen ? "#0f766e" : "#f8fafc",
                        cursor: selectedOrganization ? "pointer" : "not-allowed",
                        fontWeight: 800,
                        padding: "9px 13px"
                      }}
                      type="button"
                    >
                      {isProfileFormOpen ? "Cerrar" : "Editar"}
                    </button>
                  </div>
                </div>
                {selectedOrganization && isProfileFormOpen ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      void runAction(
                        () =>
                          getBrowserProvidersApiClient().upsertProviderPublicProfile(selectedOrganization.id, {
                            headline: publicProfileForm.headline.trim(),
                            bio: publicProfileForm.bio.trim(),
                            isPublic: publicProfileForm.isPublic
                          }),
                        "Perfil publico guardado."
                      ).then(async () => {
                        await refresh(selectedOrganization.id);
                        setIsProfileFormOpen(false);
                      });
                    }}
                    style={{ display: "grid", gap: "12px" }}
                  >
                    <Field label="Titular" onChange={(value) => setPublicProfileForm((current) => ({ ...current, headline: value }))} value={publicProfileForm.headline} />
                    <TextArea label="Bio del negocio" onChange={(value) => setPublicProfileForm((current) => ({ ...current, bio: value }))} value={publicProfileForm.bio} />
                    {selectedPublicProfile?.avatarUrl ? (
                      <div style={{ ...controlStyle, display: "grid", gap: "6px" }}>
                        <strong>Avatar publico</strong>
                        <span style={{ color: "#57534e" }}>Imagen cargada desde storage privado y servida con URL firmada temporal.</span>
                      </div>
                    ) : null}
                    <CheckField checked={publicProfileForm.isPublic} label="Publicar este perfil cuando la organizacion sea elegible" onChange={(value) => setPublicProfileForm((current) => ({ ...current, isPublic: value }))} />
                    <div
                      style={{
                        borderRadius: "16px",
                        border: "1px solid rgba(15, 118, 110, 0.14)",
                        background: "rgba(240, 253, 250, 0.5)",
                        display: "grid",
                        gap: "10px",
                        padding: "12px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ display: "grid", gap: "3px" }}>
                          <strong style={{ fontSize: "12px" }}>Ubicacion publica</strong>
                          <span style={{ color: "#57534e", fontSize: "10px" }}>
                            Coordenadas visibles para marketplace. No se pide GPS del navegador.
                          </span>
                        </div>
                        <StatusPill label={publicLocationForm.isPublic ? "publica" : "privada"} tone={publicLocationForm.isPublic ? "active" : "neutral"} />
                      </div>
                      {selectedPublicLocation ? (
                        <span style={{ color: "#57534e", fontSize: "10px" }}>
                          Actual: {selectedPublicLocation.displayLabel}, {selectedPublicLocation.city}, {selectedPublicLocation.countryCode} -{" "}
                          {providerLocationPrecisionLabels[selectedPublicLocation.locationPrecision]}
                        </span>
                      ) : (
                        <span style={{ color: "#57534e", fontSize: "10px" }}>Sin ubicacion publica configurada.</span>
                      )}
                      <Field
                        label="Nombre visible"
                        onChange={(value) => setPublicLocationForm((current) => ({ ...current, displayLabel: value }))}
                        value={publicLocationForm.displayLabel}
                      />
                      <Field
                        label="Direccion publica opcional"
                        onChange={(value) => setPublicLocationForm((current) => ({ ...current, addressLinePublic: value }))}
                        value={publicLocationForm.addressLinePublic}
                      />
                      <Button
                        disabled={isSubmitting}
                        onClick={() => {
                          const cityForCoordinates = publicLocationForm.city.trim() || selectedOrganization.city;
                          const approximateCoordinates = getApproximateProviderCityCoordinates(cityForCoordinates);

                          setPublicLocationForm((current) => ({
                            ...current,
                            displayLabel: current.displayLabel.trim() || selectedOrganization.name,
                            city: cityForCoordinates,
                            stateRegion: current.stateRegion.trim() || approximateCoordinates?.stateRegion || "",
                            countryCode: selectedOrganization.countryCode,
                            latitude: approximateCoordinates?.latitude ?? current.latitude,
                            longitude: approximateCoordinates?.longitude ?? current.longitude,
                            locationPrecision: approximateCoordinates ? "city" : current.locationPrecision
                          }));
                        }}
                        tone="secondary"
                      >
                        Usar ciudad del negocio
                      </Button>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "10px" }}>
                        <Field label="Ciudad" onChange={(value) => setPublicLocationForm((current) => ({ ...current, city: value }))} value={publicLocationForm.city} />
                        <Field label="Region" onChange={(value) => setPublicLocationForm((current) => ({ ...current, stateRegion: value }))} value={publicLocationForm.stateRegion} />
                        <Field label="Pais" onChange={(value) => setPublicLocationForm((current) => ({ ...current, countryCode: value }))} value={publicLocationForm.countryCode} />
                      </div>
                      <SelectField<ProviderLocationPrecision>
                        label="Precision publica"
                        onChange={(value) => setPublicLocationForm((current) => ({ ...current, locationPrecision: value }))}
                        options={[
                          { label: providerLocationPrecisionLabels.exact, value: "exact" },
                          { label: providerLocationPrecisionLabels.approximate, value: "approximate" },
                          { label: providerLocationPrecisionLabels.city, value: "city" }
                        ]}
                        value={publicLocationForm.locationPrecision}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "10px" }}>
                        <Field label="Latitud" onChange={(value) => setPublicLocationForm((current) => ({ ...current, latitude: value }))} type="number" value={publicLocationForm.latitude} />
                        <Field label="Longitud" onChange={(value) => setPublicLocationForm((current) => ({ ...current, longitude: value }))} type="number" value={publicLocationForm.longitude} />
                      </div>
                      <CheckField checked={publicLocationForm.isPublic} label="Publicar esta ubicacion en marketplace" onChange={(value) => setPublicLocationForm((current) => ({ ...current, isPublic: value }))} />
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <Button
                          disabled={isSubmitting}
                          onClick={() => {
                            clearMessages();
                            const validationError = validatePublicLocationForm(publicLocationForm);

                            if (validationError) {
                              void runAction(async () => {
                                throw new Error(validationError);
                              });
                              return;
                            }

                            void runAction(
                              () =>
                                getBrowserProvidersApiClient().upsertProviderPublicLocation(selectedOrganization.id, {
                                  displayLabel: publicLocationForm.displayLabel.trim(),
                                  addressLinePublic: publicLocationForm.addressLinePublic.trim() || null,
                                  city: publicLocationForm.city.trim(),
                                  stateRegion: publicLocationForm.stateRegion.trim() || null,
                                  countryCode: publicLocationForm.countryCode.trim().toUpperCase() || "PA",
                                  latitude: Number(publicLocationForm.latitude),
                                  longitude: Number(publicLocationForm.longitude),
                                  locationPrecision: publicLocationForm.locationPrecision,
                                  isPublic: publicLocationForm.isPublic
                                }),
                              "Ubicacion publica guardada."
                            ).then(async () => {
                              await refresh(selectedOrganization.id);
                            });
                          }}
                          tone="secondary"
                        >
                          Guardar ubicacion
                        </Button>
                      </div>
                    </div>
                    <Button disabled={isSubmitting} type="submit">
                      Guardar perfil publico
                    </Button>
                  </form>
                ) : selectedOrganization ? (
                  <div style={{ ...controlStyle, display: "grid", gap: "6px" }}>
                    <strong>{selectedPublicProfile?.headline || "Perfil publico pendiente"}</strong>
                    <span style={{ color: "#57534e" }}>{selectedPublicProfile?.bio || "Agrega una descripcion breve para presentarte ante propietarios."}</span>
                    <span style={{ color: "#57534e" }}>
                      {selectedPublicLocation
                        ? `Ubicacion: ${selectedPublicLocation.displayLabel}, ${selectedPublicLocation.city}, ${selectedPublicLocation.countryCode}`
                        : "Agrega la ubicacion publica del negocio para marketplace."}
                    </span>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
                )}
              </article>
            </div>

            <div
              style={{
                display: activeProviderSectionId === "provider-web-services" || activeProviderSectionId === "provider-web-availability" ? "grid" : "none",
                gap: "18px",
                alignContent: "start"
              }}
            >
              <article
                id="provider-web-services"
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: activeProviderSectionId === "provider-web-services" ? "grid" : "none",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <h3 style={{ margin: 0, fontSize: "12px" }}>Servicios</h3>
                    <span style={{ color: "#57534e", fontSize: "8px" }}>Oferta, duracion, precio y modo de reserva.</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        borderRadius: "999px",
                        border: "1px solid rgba(68, 64, 60, 0.14)",
                        background: "rgba(68, 64, 60, 0.08)",
                        color: "#44403c",
                        fontSize: "7px",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        padding: "4px 7px",
                        textTransform: "uppercase"
                      }}
                    >
                      {selectedServices.length} en total
                    </span>
                    <button
                      disabled={!selectedOrganization || isSubmitting}
                      onClick={() => {
                        setServiceForm(emptyServiceForm);
                        setIsServiceFormOpen((current) => !current);
                      }}
                      style={{
                        borderRadius: "999px",
                        border: "1px solid rgba(15, 118, 110, 0.22)",
                        background: isServiceFormOpen ? "rgba(15, 118, 110, 0.1)" : "#0f766e",
                        color: isServiceFormOpen ? "#0f766e" : "#f8fafc",
                        cursor: selectedOrganization ? "pointer" : "not-allowed",
                        fontSize: "8px",
                        fontWeight: 800,
                        padding: "6px 9px"
                      }}
                      type="button"
                    >
                      {isServiceFormOpen ? "Cerrar" : "+ Servicio"}
                    </button>
                  </div>
                </div>
                {selectedOrganization ? (
                  <>
                    {isServiceFormOpen ? (
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
                            setIsServiceFormOpen(false);
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
                          setIsServiceFormOpen(false);
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
                    ) : null}

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
                              <strong style={{ fontSize: "11px" }}>{service.name}</strong>
                              <span
                                style={{
                                  borderRadius: "999px",
                                  border: service.isPublic ? "1px solid rgba(15, 118, 110, 0.24)" : "1px solid rgba(68, 64, 60, 0.14)",
                                  background: service.isPublic ? "rgba(15, 118, 110, 0.12)" : "rgba(68, 64, 60, 0.08)",
                                  color: service.isPublic ? "#0f766e" : "#44403c",
                                  fontSize: "7px",
                                  fontWeight: 800,
                                  letterSpacing: "0.08em",
                                  padding: "4px 7px",
                                  textTransform: "uppercase"
                                }}
                              >
                                {service.isPublic ? "publico" : "oculto"}
                              </span>
                            </div>
                            <span style={{ color: "#57534e", fontSize: "9px" }}>
                              {providerServiceCategoryLabels[service.category]}  -  {service.durationMinutes ? `${service.durationMinutes} min` : "Flexible"}
                            </span>
                            <span style={{ color: "#57534e", fontSize: "9px" }}>
                              {formatMoney(service.basePriceCents, service.currencyCode)}  -  {service.bookingMode === "instant" ? "Reserva inmediata" : "Requiere aprobacion"}
                            </span>
                            <span style={{ color: "#57534e", fontSize: "9px" }}>{service.shortDescription ?? "Todavia no hay descripcion."}</span>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ color: "#78716c", fontSize: "8px" }}>
                                {bookingCountByServiceId[service.id]
                                  ? `${bookingCountByServiceId[service.id]} reserva(s): se conserva como historial`
                                  : "Sin reservas: puede eliminarse si fue creado por error"}
                              </span>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => {
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
                                    });
                                    setIsServiceFormOpen(true);
                                    navigateProviderSection("provider-web-services");
                                  }}
                                  style={{
                                    borderRadius: "999px",
                                    border: "1px solid rgba(28, 25, 23, 0.14)",
                                    background: "rgba(255,255,255,0.82)",
                                    color: "#1c1917",
                                    cursor: isSubmitting ? "not-allowed" : "pointer",
                                    fontSize: "8px",
                                    fontWeight: 800,
                                    opacity: isSubmitting ? 0.65 : 1,
                                    padding: "6px 10px"
                                  }}
                                  type="button"
                                >
                                  Editar
                                </button>
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => {
                                    clearMessages();

                                    const confirmed = window.confirm(
                                      bookingCountByServiceId[service.id]
                                        ? "Este servicio tiene historial de reservas y no se puede eliminar. Puedes editarlo para desactivarlo u ocultarlo."
                                        : `Eliminar "${service.name}"? Tambien se eliminaran sus horarios futuros si no tiene reservas.`
                                    );

                                    if (!confirmed || bookingCountByServiceId[service.id]) {
                                      return;
                                    }

                                    void runAction(
                                      () => getBrowserProvidersApiClient().deleteProviderService(service.id),
                                      "Servicio eliminado."
                                    ).then(async () => {
                                      if (serviceForm.id === service.id) {
                                        setServiceForm(emptyServiceForm);
                                        setIsServiceFormOpen(false);
                                      }

                                      if (capacityServiceId === service.id) {
                                        setCapacityServiceId(null);
                                      }

                                      await refresh(selectedOrganization.id);
                                    });
                                  }}
                                  style={{
                                    borderRadius: "999px",
                                    border: "1px solid rgba(185, 28, 28, 0.2)",
                                    background: "rgba(254, 242, 242, 0.84)",
                                    color: "#991b1b",
                                    cursor: isSubmitting ? "not-allowed" : "pointer",
                                    fontSize: "8px",
                                    fontWeight: 800,
                                    opacity: isSubmitting ? 0.65 : 1,
                                    padding: "6px 10px"
                                  }}
                                  type="button"
                                >
                                  Eliminar
                                </button>
                              </div>
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
                id="provider-web-availability"
                style={{
                  borderRadius: "18px",
                  padding: "14px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: activeProviderSectionId === "provider-web-availability" ? "grid" : "none",
                  gap: "9px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px" }}>Agenda</h3>
                    <span style={{ color: "#57534e", fontSize: "11px" }}>Planifica horarios y cupos por servicio.</span>
                  </div>
                  <StatusPill label={`${selectedAvailabilityRules.length} regla(s)`} tone="neutral" />
                </div>
                {selectedOrganization ? (
                  selectedServices.length ? (
                    <>
                      <div
                        style={{
                          alignItems: "end",
                          display: "grid",
                          gap: "8px",
                          gridTemplateColumns: "minmax(220px, 1fr) auto"
                        }}
                      >
                        <SelectField<Uuid>
                          label="Servicio"
                          onChange={(value) => {
                            setCapacityServiceId(value);
                            setCapacitySlots([]);
                            setSelectedCapacityDate(null);
                            setCapacitySlotsError(null);
                            setAvailabilityForm((current) => ({ ...current, serviceId: value }));
                          }}
                          options={selectedServices.map((service) => ({ label: service.name, value: service.id }))}
                          value={activeCapacityService?.id ?? selectedServices[0].id}
                        />
                        <Button
                          disabled={isSubmitting}
                          onClick={() => {
                            setAvailabilityForm({
                              ...emptyAvailabilityForm,
                              serviceId: activeCapacityService?.id ?? selectedServices[0]?.id ?? ""
                            });
                            setIsAvailabilityFormOpen(true);
                          }}
                        >
                          + Franja
                        </Button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: "6px",
                          gridTemplateColumns: "repeat(7, minmax(92px, 1fr))",
                          overflowX: "auto",
                          paddingBottom: "2px"
                        }}
                      >
                        {providerDayOfWeekOrder.map((dayOfWeek) => {
                          const dayRules = availabilityRulesByDay[dayOfWeek] ?? [];

                          return (
                            <section
                              key={dayOfWeek}
                              style={{
                                background: "rgba(255,255,255,0.66)",
                                border: "1px solid rgba(15,118,110,0.12)",
                                borderRadius: "13px",
                                display: "grid",
                                gap: "5px",
                                minHeight: "112px",
                                padding: "6px"
                              }}
                            >
                              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: "6px" }}>
                                <strong style={{ color: "#1c1917", fontSize: "10px" }}>{providerDayOfWeekLabels[dayOfWeek].slice(0, 3)}</strong>
                                <span style={{ color: "#0f766e", fontSize: "8px", fontWeight: 800 }}>{dayRules.length ? `${dayRules.length}` : "-"}</span>
                              </div>
                              {dayRules.length ? (
                                dayRules.map((rule) => {
                                  const tone = formatAvailabilityRuleTone(rule);

                                  return (
                                    <article
                                      key={rule.id}
                                      style={{
                                        background: tone.background,
                                        border: `1px solid ${tone.border}`,
                                        borderRadius: "10px",
                                        display: "grid",
                                        gap: "3px",
                                        padding: "5px"
                                      }}
                                    >
                                      <strong style={{ color: "#1c1917", fontSize: "9px" }}>
                                        {rule.startsAt.slice(0, 5)} - {rule.endsAt.slice(0, 5)}
                                      </strong>
                                      <span style={{ color: tone.color, fontSize: "7px", fontWeight: 800 }}>{tone.label}</span>
                                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                        <button
                                          disabled={isSubmitting}
                                          onClick={() => {
                                            setAvailabilityForm({
                                              id: rule.id,
                                              serviceId: rule.serviceId,
                                              dayOfWeek: rule.dayOfWeek,
                                              startsAt: rule.startsAt,
                                              endsAt: rule.endsAt,
                                              capacity: String(rule.capacity),
                                              isActive: rule.isActive
                                            });
                                            setIsAvailabilityFormOpen(true);
                                          }}
                                          style={{
                                            borderRadius: "999px",
                                            border: "1px solid rgba(28,25,23,0.12)",
                                            background: "rgba(255,255,255,0.82)",
                                            color: "#1c1917",
                                            cursor: isSubmitting ? "not-allowed" : "pointer",
                                            fontSize: "7px",
                                            fontWeight: 800,
                                            padding: "3px 6px"
                                          }}
                                          type="button"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          disabled={isSubmitting}
                                          onClick={() => {
                                            clearMessages();
                                            void runAction(
                                              () => getBrowserProvidersApiClient().setProviderAvailabilityRuleActive(rule.id, !rule.isActive),
                                              rule.isActive ? "Horario desactivado." : "Horario activado."
                                            ).then(async () => {
                                              await refresh(selectedOrganization.id);
                                            });
                                          }}
                                          style={{
                                            borderRadius: "999px",
                                            border: "1px solid rgba(28,25,23,0.12)",
                                            background: "rgba(255,255,255,0.82)",
                                            color: rule.isActive ? "#b45309" : "#0f766e",
                                            cursor: isSubmitting ? "not-allowed" : "pointer",
                                            fontSize: "7px",
                                            fontWeight: 800,
                                            padding: "3px 6px"
                                          }}
                                          type="button"
                                        >
                                          {rule.isActive ? "Pausar" : "Activar"}
                                        </button>
                                      </div>
                                    </article>
                                  );
                                })
                              ) : (
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => {
                                    setAvailabilityForm({
                                      ...emptyAvailabilityForm,
                                      serviceId: activeCapacityService?.id ?? selectedServices[0]?.id ?? "",
                                      dayOfWeek
                                    });
                                    setIsAvailabilityFormOpen(true);
                                  }}
                                  style={{
                                    alignItems: "center",
                                    background: "rgba(255,255,255,0.46)",
                                    border: "1px dashed rgba(15,118,110,0.28)",
                                    borderRadius: "13px",
                                    color: "#0f766e",
                                    cursor: isSubmitting ? "not-allowed" : "pointer",
                                    display: "flex",
                                    fontSize: "10px",
                                    fontWeight: 800,
                                    justifyContent: "center",
                                    minHeight: "54px",
                                    padding: "6px",
                                    textAlign: "center"
                                  }}
                                  type="button"
                                >
                                  + Agregar franja
                                </button>
                              )}
                            </section>
                          );
                        })}
                      </div>

                      {isAvailabilityFormOpen ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            clearMessages();

                            if (availabilityForm.id) {
                              const payload = buildAvailabilityRulePayload(availabilityForm) satisfies UpdateProviderAvailabilityRuleInput;
                              void runAction(
                                () => getBrowserProvidersApiClient().updateProviderAvailabilityRule(availabilityForm.id!, payload),
                                "Horario actualizado."
                              ).then(async () => {
                                setAvailabilityForm({
                                  ...emptyAvailabilityForm,
                                  serviceId: activeCapacityService?.id ?? selectedServices[0]?.id ?? ""
                                });
                                await refresh(selectedOrganization.id);
                                setIsAvailabilityFormOpen(false);
                              });
                              return;
                            }

                            const payload = {
                              organizationId: selectedOrganization.id,
                              ...buildAvailabilityRulePayload(availabilityForm)
                            } satisfies CreateProviderAvailabilityRuleInput;
                            void runAction(
                              () => getBrowserProvidersApiClient().createProviderAvailabilityRule(payload),
                              "Horario guardado."
                            ).then(async () => {
                              setAvailabilityForm({
                                ...emptyAvailabilityForm,
                                serviceId: activeCapacityService?.id ?? selectedServices[0]?.id ?? ""
                              });
                              await refresh(selectedOrganization.id);
                              setIsAvailabilityFormOpen(false);
                            });
                          }}
                          style={{
                            background: "rgba(255,255,255,0.76)",
                            border: "1px solid rgba(15,118,110,0.16)",
                            borderRadius: "14px",
                            display: "grid",
                            gap: "8px",
                            padding: "10px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                            <div style={{ display: "grid", gap: "3px" }}>
                              <strong style={{ fontSize: "11px" }}>{availabilityForm.id ? "Editar franja" : "Crear franja"}</strong>
                              <span style={{ color: "#57534e", fontSize: "9px" }}>Servicio, dia, horario y cupos.</span>
                            </div>
                            <button
                              onClick={() => setIsAvailabilityFormOpen(false)}
                              style={{
                                borderRadius: "999px",
                                border: "1px solid rgba(28,25,23,0.12)",
                                background: "rgba(255,255,255,0.84)",
                                cursor: "pointer",
                                fontWeight: 900,
                                height: "24px",
                                width: "24px"
                              }}
                              type="button"
                            >
                              ×
                            </button>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gap: "7px",
                              gridTemplateColumns: "minmax(150px, 1.25fr) minmax(82px, 0.7fr) minmax(96px, 0.7fr) minmax(96px, 0.7fr) minmax(70px, 0.45fr)"
                            }}
                          >
                            <SelectField<Uuid | "">
                              compact
                              label="Servicio"
                              onChange={(value) => setAvailabilityForm((current) => ({ ...current, serviceId: value }))}
                              options={selectedServices.map((service) => ({ label: service.name, value: service.id }))}
                              value={availabilityForm.serviceId || activeCapacityService?.id || selectedServices[0]?.id || ""}
                            />
                            <SelectField<AvailabilityFormState["dayOfWeek"]>
                              compact
                              label="Dia"
                              onChange={(value) => setAvailabilityForm((current) => ({ ...current, dayOfWeek: value }))}
                              options={providerDayOfWeekOrder.map((day) => ({ label: providerDayOfWeekLabels[day], value: day }))}
                              value={availabilityForm.dayOfWeek}
                            />
                            <Field compact label="Inicio" onChange={(value) => setAvailabilityForm((current) => ({ ...current, startsAt: value }))} type="time" value={availabilityForm.startsAt} />
                            <Field compact label="Fin" onChange={(value) => setAvailabilityForm((current) => ({ ...current, endsAt: value }))} type="time" value={availabilityForm.endsAt} />
                            <Field
                              compact
                              label="Cupos"
                              min={1}
                              onChange={(value) => setAvailabilityForm((current) => ({ ...current, capacity: value }))}
                              onBlur={(value) => setAvailabilityForm((current) => ({ ...current, capacity: normalizePositiveIntegerInput(value) }))}
                              type="number"
                              value={availabilityForm.capacity}
                            />
                          </div>
                          <CheckField checked={availabilityForm.isActive} label="Franja activa" onChange={(value) => setAvailabilityForm((current) => ({ ...current, isActive: value }))} />
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <Button disabled={isSubmitting} type="submit">
                              {availabilityForm.id ? "Guardar" : "Crear"}
                            </Button>
                            <Button disabled={isSubmitting} onClick={() => setIsAvailabilityFormOpen(false)} tone="secondary">
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      ) : null}

                      <div
                        style={{
                          borderRadius: "13px",
                          border: "1px solid rgba(15, 118, 110, 0.12)",
                          background: "rgba(240, 253, 250, 0.5)",
                          display: "grid",
                          gap: "6px",
                          padding: "8px"
                        }}
                      >
                        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: "2px" }}>
                            <strong style={{ fontSize: "10px" }}>Cupos proyectados</strong>
                            <span style={{ color: "#57534e", fontSize: "8px" }}>Validacion de reservas reales para los proximos 14 dias.</span>
                          </div>
                          <button
                            disabled={!capacityServiceId || isLoadingCapacitySlots}
                            onClick={() => void loadCapacitySlots()}
                            style={{
                              borderRadius: "999px",
                              border: "1px solid rgba(15, 118, 110, 0.22)",
                              background: "#0f766e",
                              color: "#f8fafc",
                              cursor: capacityServiceId && !isLoadingCapacitySlots ? "pointer" : "not-allowed",
                              fontSize: "8px",
                              fontWeight: 800,
                              opacity: capacityServiceId && !isLoadingCapacitySlots ? 1 : 0.65,
                              padding: "6px 10px"
                            }}
                            type="button"
                          >
                            {isLoadingCapacitySlots ? "Consultando" : "Ver cupos"}
                          </button>
                        </div>
                        {capacitySlotsError ? <span style={{ color: "#991b1b", fontSize: "10px" }}>{capacitySlotsError}</span> : null}
                        {!capacitySlotsError && !capacitySlots.length ? (
                          <span style={{ color: "#57534e", fontSize: "10px" }}>Consulta para validar cupos ocupados/disponibles; no crea reservas.</span>
                        ) : null}
                        {capacitySlots.length ? (
                          <div style={{ display: "grid", gap: "8px" }}>
                            <div style={{ display: "grid", gap: "5px", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                              {capacityCalendarDates.slice(0, 7).map((dateValue) => {
                                const dateSlots = capacitySlotsByDate[dateValue] ?? [];
                                const totalAvailable = dateSlots.reduce((total, slot) => total + slot.availableCount, 0);
                                const isSelected = dateValue === activeCapacityDate;

                                return (
                                  <button
                                    key={dateValue}
                                    onClick={() => setSelectedCapacityDate(dateValue)}
                                    style={{
                                      borderRadius: "12px",
                                      border: isSelected ? "1px solid rgba(15, 118, 110, 0.36)" : "1px solid rgba(15, 118, 110, 0.12)",
                                      background: isSelected ? "#0f766e" : "rgba(255,255,255,0.72)",
                                      color: isSelected ? "#f8fafc" : "#1c1917",
                                      cursor: "pointer",
                                      display: "grid",
                                      gap: "1px",
                                      minHeight: "48px",
                                      padding: "5px 3px",
                                      textAlign: "center"
                                    }}
                                    type="button"
                                  >
                                    <span style={{ fontSize: "7px", textTransform: "capitalize" }}>{formatCalendarWeekday(dateValue)}</span>
                                    <strong style={{ fontSize: "12px" }}>{formatCalendarDay(dateValue)}</strong>
                                    <span style={{ color: isSelected ? "rgba(248,250,252,0.78)" : "#0f766e", fontSize: "7px" }}>
                                      {dateSlots.length ? `${totalAvailable}` : "-"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {activeCapacityDateSlots.length ? (
                              <div style={{ display: "grid", gap: "5px", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                                {activeCapacityDateSlots.map((slot) => {
                                  const isFull = slot.status === "full";

                                  return (
                                    <div
                                      key={`${slot.availabilityRuleId}-${slot.slotDate}-${slot.slotStartAt}`}
                                      style={{
                                        borderRadius: "12px",
                                        border: isFull ? "1px solid rgba(220, 38, 38, 0.18)" : "1px solid rgba(15, 118, 110, 0.16)",
                                        background: isFull ? "rgba(254, 226, 226, 0.5)" : "rgba(255,255,255,0.76)",
                                        display: "grid",
                                        gap: "2px",
                                        padding: "7px 8px"
                                      }}
                                    >
                                      <strong style={{ fontSize: "9px" }}>
                                        {formatSlotTime(slot.slotStartAt)} - {formatSlotTime(slot.slotEndAt)}
                                      </strong>
                                      <span style={{ color: "#57534e", fontSize: "8px" }}>
                                        {slot.reservedCount}/{slot.capacityTotal} reservado(s)
                                      </span>
                                      <span style={{ color: isFull ? "#dc2626" : "#0f766e", fontSize: "9px", fontWeight: 800 }}>
                                        {slot.availableCount} cupo(s) · {bookingSlotStatusLabels[slot.status]}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: "#57534e", fontSize: "10px" }}>No hay horarios publicados para este dia.</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p style={{ margin: 0, color: "#57534e" }}>Primero crea un servicio para configurar horarios y cupos.</p>
                  )
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona primero una organizacion.</p>
                )}
              </article>

            </div>
          </ProviderShell>
        )}
      </CoreSection>
    </div>
  );
}
