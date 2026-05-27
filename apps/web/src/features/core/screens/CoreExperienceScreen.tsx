"use client";

import { coreMvpBoundaries, coreRoleLabels, coreSupportedPaymentMethodTypes } from "@pet/config";
import { colorTokens, spacingTokens } from "@pet/ui";
import type {
  AddPaymentMethodInput,
  AddressLabel,
  BookingSummary,
  CalendarEvent,
  ChatThreadSummary,
  CoreIdentitySnapshot,
  CoreRole,
  HouseholdsSnapshot,
  MarketplaceServiceSelection,
  PaymentMethodBrand,
  PetSummary,
  Reminder,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpsertAddressInput,
  Uuid
} from "@pet/types";
import { useEffect, useState, type ReactNode } from "react";

import { CoreSection } from "../components/CoreSection";
import { StatusPill } from "../components/StatusPill";
import { useCoreWorkspace } from "../hooks/useCoreWorkspace";
import {
  getBrowserBookingsApiClient,
  getBrowserCoreApiClient,
  getBrowserHouseholdsApiClient,
  getBrowserMessagingApiClient,
  getBrowserPetsApiClient,
  getBrowserRecoveryRedirectUrl,
  getBrowserRemindersApiClient
} from "../services/supabase-browser";
import { HouseholdsWorkspace } from "../../households/components/HouseholdsWorkspace";
import { PetsWorkspace } from "../../pets/components/PetsWorkspace";
import { HealthWorkspace } from "../../health/components/HealthWorkspace";
import { RemindersWorkspace } from "../../reminders/components/RemindersWorkspace";
import { MarketplaceWorkspace } from "../../marketplace/components/MarketplaceWorkspace";
import { ProvidersWorkspace } from "../../providers/components/ProvidersWorkspace";
import { BookingsWorkspace } from "../../bookings/components/BookingsWorkspace";
import { MessagingWorkspace } from "../../messaging/components/MessagingWorkspace";
import { ReviewsWorkspace } from "../../reviews/components/ReviewsWorkspace";
import { SupportWorkspace } from "../../support/components/SupportWorkspace";

type OwnerWebSectionId =
  | "owner-web-panel"
  | "owner-web-households"
  | "owner-web-pets"
  | "owner-web-health"
  | "owner-web-reminders"
  | "owner-web-marketplace"
  | "owner-web-bookings"
  | "owner-web-messaging"
  | "owner-web-account";

type OwnerWebIconName =
  | "account"
  | "booking"
  | "calendar"
  | "chat"
  | "health"
  | "home"
  | "marketplace"
  | "panel"
  | "paw";

type RegisterFormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: CoreRole;
};

type LoginFormState = {
  email: string;
  password: string;
};

type VerifyFormState = {
  email: string;
  token: string;
};

type RecoverFormState = {
  email: string;
};

type RecoveryPasswordFormState = {
  password: string;
  confirmPassword: string;
};

type AuthAccessPanel = "login" | "register" | "verify" | "recover";

type PaymentFormState = Omit<AddPaymentMethodInput, "expMonth" | "expYear"> & {
  expMonth: string;
  expYear: string;
};

const emptyRegisterForm: RegisterFormState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "pet_owner"
};

const emptyLoginForm: LoginFormState = {
  email: "",
  password: ""
};

const emptyVerifyForm: VerifyFormState = {
  email: "",
  token: ""
};

const emptyRecoverForm: RecoverFormState = {
  email: ""
};

const emptyRecoveryPasswordForm: RecoveryPasswordFormState = {
  password: "",
  confirmPassword: ""
};

const emptyProfileForm: UpdateProfileInput = {
  firstName: "",
  lastName: "",
  phone: "",
  avatarUrl: "",
  locale: "es"
};

const emptyPreferenceForm: Required<UpdatePreferencesInput> = {
  marketingOptIn: false,
  reminderEmailOptIn: true,
  reminderPushOptIn: true
};

const emptyAddressForm: UpsertAddressInput = {
  label: "home",
  recipientName: "",
  line1: "",
  line2: "",
  city: "",
  stateRegion: "",
  postalCode: "",
  countryCode: "PA",
  isDefault: true
};

const emptyPaymentForm: PaymentFormState = {
  brand: "visa",
  last4: "",
  expMonth: "",
  expYear: "",
  cardholderName: "",
  isDefault: true
};

const ownerWebSections: Array<{ id: OwnerWebSectionId; label: string; detail: string; icon: OwnerWebIconName }> = [
  { id: "owner-web-panel", label: "Panel", detail: "Cuenta y activacion", icon: "panel" },
  { id: "owner-web-households", label: "Hogar", detail: "Familia y permisos", icon: "home" },
  { id: "owner-web-pets", label: "Mascotas", detail: "Perfiles y documentos", icon: "paw" },
  { id: "owner-web-health", label: "Salud", detail: "Vacunas y condiciones", icon: "health" },
  { id: "owner-web-reminders", label: "Agenda", detail: "Recordatorios", icon: "calendar" },
  { id: "owner-web-marketplace", label: "Buscar", detail: "Proveedores y servicios", icon: "marketplace" },
  { id: "owner-web-bookings", label: "Reservas", detail: "Historial y preview", icon: "booking" },
  { id: "owner-web-messaging", label: "Mensajes", detail: "Chat y soporte", icon: "chat" },
  { id: "owner-web-account", label: "Cuenta", detail: "Perfil y pagos", icon: "account" }
];

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

function OwnerWebIcon({ name, size = 17 }: { name: OwnerWebIconName; size?: number }) {
  const commonProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2
  };
  const paths: Record<OwnerWebIconName, ReactNode> = {
    account: (
      <>
        <circle {...commonProps} cx="12" cy="8" r="4" />
        <path {...commonProps} d="M4 21c1.5-4 4.2-6 8-6s6.5 2 8 6" />
      </>
    ),
    booking: (
      <>
        <rect {...commonProps} height="15" rx="2" width="16" x="4" y="5" />
        <path {...commonProps} d="M8 3v4M16 3v4M4 10h16M8 15l2 2 5-5" />
      </>
    ),
    calendar: (
      <>
        <rect {...commonProps} height="15" rx="2" width="16" x="4" y="5" />
        <path {...commonProps} d="M8 3v4M16 3v4M4 10h16M8 14h3M14 14h2M8 17h2" />
      </>
    ),
    chat: (
      <>
        <path {...commonProps} d="M4 5h16v11H8l-4 4V5Z" />
        <path {...commonProps} d="M8 9h8M8 13h5" />
      </>
    ),
    health: (
      <>
        <path {...commonProps} d="M12 21s-7-4.5-9-9.2C1.5 8 3.8 5 7 5c2 0 3.2 1.1 5 3 1.8-1.9 3-3 5-3 3.2 0 5.5 3 4 6.8C19 16.5 12 21 12 21Z" />
        <path {...commonProps} d="M12 10v5M9.5 12.5h5" />
      </>
    ),
    home: (
      <>
        <path {...commonProps} d="M4 11 12 4l8 7v9H5v-9" />
        <path {...commonProps} d="M10 20v-6h4v6" />
      </>
    ),
    marketplace: (
      <>
        <path {...commonProps} d="M5 10h14l-1 10H6L5 10Z" />
        <path {...commonProps} d="M8 10a4 4 0 0 1 8 0M9 14h.01M15 14h.01" />
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
    paw: (
      <>
        <path {...commonProps} d="M8.5 11.5c-2.5 1.5-4 3.3-3.2 5.2.7 1.7 2.9 1.2 4.8.9 1.1-.2 2.7-.2 3.8 0 1.9.3 4.1.8 4.8-.9.8-1.9-.7-3.7-3.2-5.2-2.3-1.4-4.7-1.4-7 0Z" />
        <path {...commonProps} d="M6.5 8.5c.7 1.1.4 2.4-.6 2.8-1 .5-2.2-.1-2.8-1.3-.7-1.1-.4-2.4.6-2.8 1-.5 2.2.1 2.8 1.3ZM11 5.8c.2 1.4-.5 2.5-1.6 2.6-1.1.1-2.1-.9-2.2-2.2C7 4.8 7.7 3.7 8.8 3.6c1.1-.1 2.1.9 2.2 2.2ZM17.5 8.5c-.7 1.1-.4 2.4.6 2.8 1 .5 2.2-.1 2.8-1.3.7-1.1.4-2.4-.6-2.8-1-.5-2.2.1-2.8 1.3ZM13 5.8c-.2 1.4.5 2.5 1.6 2.6 1.1.1 2.1-.9 2.2-2.2.2-1.4-.5-2.5-1.6-2.6-1.1-.1-2.1.9-2.2 2.2Z" />
      </>
    )
  };

  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
      {paths[name]}
    </svg>
  );
}

function OwnerWebShell({
  children,
  ownerName
}: {
  children: (activeSectionId: OwnerWebSectionId, onNavigate: (sectionId: OwnerWebSectionId) => void) => ReactNode;
  ownerName: string;
}) {
  const [activeSectionId, setActiveSectionId] = useState<OwnerWebSectionId>("owner-web-panel");

  return (
    <div
      className="owner-web-shell"
      style={{
        background: "linear-gradient(180deg, #fbfaf7 0%, #f7f2e7 100%)",
        border: "1px solid rgba(15, 118, 110, 0.1)",
        borderRadius: "28px",
        display: "grid",
        gap: "18px",
        gridTemplateColumns: "minmax(190px, 230px) minmax(0, 1fr)",
        padding: "16px"
      }}
    >
      <style>
        {`
          .owner-web-shell {
            grid-template-columns: minmax(190px, 230px) minmax(0, 1fr);
          }

          .owner-web-sidebar {
            position: sticky;
            top: 16px;
          }

          .owner-web-nav {
            grid-template-columns: 1fr;
          }

          @media (max-width: 980px) {
            .owner-web-shell {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .owner-web-sidebar {
              position: static !important;
            }

            .owner-web-nav {
              display: grid !important;
              grid-auto-flow: column;
              grid-auto-columns: minmax(130px, 1fr);
              overflow-x: auto;
              padding-bottom: 4px;
            }
          }

          @media (max-width: 560px) {
            .owner-web-shell {
              border-radius: 20px !important;
              padding: 10px !important;
            }

            .owner-web-nav {
              grid-auto-columns: minmax(112px, 1fr);
            }
          }
        `}
      </style>
      <aside
        className="owner-web-sidebar"
        style={{
          alignSelf: "start",
          background: "linear-gradient(180deg, #101828 0%, #172033 100%)",
          borderRadius: "22px",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
          display: "grid",
          gap: "16px",
          padding: "16px"
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: "10px", minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.94)",
              borderRadius: "16px",
              color: "#0f766e",
              display: "inline-flex",
              flexShrink: 0,
              height: "42px",
              justifyContent: "center",
              overflow: "hidden",
              width: "42px"
            }}
          >
            <img alt="" src="/brand/pet-ecosystem-logo-mark.png" style={{ height: "34px", objectFit: "contain", width: "34px" }} />
          </span>
          <div style={{ display: "grid", gap: "2px", minWidth: 0 }}>
            <strong style={{ color: "#f8fafc", fontSize: "14px", lineHeight: 1.15 }}>Pet Ecosystem</strong>
            <span style={{ color: "rgba(248,250,252,0.68)", fontSize: "11px" }}>{ownerName}</span>
          </div>
        </div>
        <nav aria-label="Secciones owner web" className="owner-web-nav" style={{ display: "grid", gap: "8px" }}>
          {ownerWebSections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSectionId(section.id);
              }}
              style={{
                background: section.id === activeSectionId ? "rgba(20, 184, 166, 0.18)" : "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                color: "#f8fafc",
                cursor: "pointer",
                display: "grid",
                gap: "3px",
                gridTemplateColumns: "22px minmax(0, 1fr)",
                padding: "10px 11px",
                textAlign: "left"
              }}
              type="button"
            >
              <span style={{ color: section.id === activeSectionId ? "#99f6e4" : "rgba(248,250,252,0.78)", paddingTop: "1px" }}>
                <OwnerWebIcon name={section.icon} size={16} />
              </span>
              <span style={{ display: "grid", gap: "3px" }}>
                <strong style={{ color: section.id === activeSectionId ? "#99f6e4" : "#f8fafc", fontSize: "12px" }}>
                  {section.label}
                </strong>
                <span style={{ color: "rgba(248,250,252,0.64)", fontSize: "10px", lineHeight: 1.25 }}>{section.detail}</span>
              </span>
            </button>
          ))}
        </nav>
      </aside>
      <div style={{ display: "grid", gap: "18px", minWidth: 0 }}>{children(activeSectionId, setActiveSectionId)}</div>
    </div>
  );
}

function OwnerWebSection({ children, id }: { children: ReactNode; id: OwnerWebSectionId }) {
  return (
    <section id={id} style={{ display: "grid", gap: "18px", scrollMarginTop: "18px" }}>
      {children}
    </section>
  );
}

type OwnerDashboardData = {
  householdSnapshot: HouseholdsSnapshot | null;
  pets: PetSummary[];
  bookings: BookingSummary[];
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
  threads: ChatThreadSummary[];
};

const emptyOwnerDashboardData: OwnerDashboardData = {
  householdSnapshot: null,
  pets: [],
  bookings: [],
  reminders: [],
  calendarEvents: [],
  threads: []
};

function formatOwnerDashboardDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getPetAgeLabel(birthDate: string | null) {
  if (!birthDate) {
    return "Edad no registrada";
  }

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
  }

  if (years <= 0) {
    return "Menor de 1 ano";
  }

  return `${years} ano(s)`;
}

function OwnerDashboardCard({ children }: { children: ReactNode }) {
  return (
    <article
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "16px",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: "12px",
        padding: "14px"
      }}
    >
      {children}
    </article>
  );
}

function OwnerDashboardMetric({
  icon,
  label,
  note,
  tone = "teal",
  value
}: {
  icon: OwnerWebIconName;
  label: string;
  note: string;
  tone?: "teal" | "blue" | "orange" | "rose";
  value: ReactNode;
}) {
  const palette = {
    teal: { background: "rgba(15, 118, 110, 0.1)", color: "#0f766e" },
    blue: { background: "rgba(37, 99, 235, 0.1)", color: "#1d4ed8" },
    orange: { background: "rgba(245, 158, 11, 0.14)", color: "#b45309" },
    rose: { background: "rgba(225, 29, 72, 0.1)", color: "#be123c" }
  }[tone];

  return (
    <OwnerDashboardCard>
      <div style={{ alignItems: "center", display: "flex", gap: "10px" }}>
        <span
          style={{
            alignItems: "center",
            background: palette.background,
            borderRadius: "12px",
            color: palette.color,
            display: "inline-flex",
            height: "34px",
            justifyContent: "center",
            width: "34px"
          }}
        >
          <OwnerWebIcon name={icon} size={17} />
        </span>
        <strong style={{ color: "#344054", fontSize: "11px" }}>{label}</strong>
      </div>
      <strong style={{ color: "#0b163f", fontSize: "22px", lineHeight: 1 }}>{value}</strong>
      <span style={{ color: "#667085", fontSize: "11px" }}>{note}</span>
    </OwnerDashboardCard>
  );
}

function OwnerDashboard({
  onNavigate,
  snapshot
}: {
  onNavigate: (sectionId: OwnerWebSectionId) => void;
  snapshot: CoreIdentitySnapshot;
}) {
  const [dashboardData, setDashboardData] = useState<OwnerDashboardData>(emptyOwnerDashboardData);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoadingDashboard(true);
      setDashboardError(null);

      try {
        const householdSnapshot = await getBrowserHouseholdsApiClient().getHouseholdsSnapshot();
        const householdIds = householdSnapshot.households.map((household) => household.id);
        const petsByHousehold = await Promise.all(householdIds.map((householdId) => getBrowserPetsApiClient().listHouseholdPets(householdId)));
        const bookingsByHousehold = await Promise.all(
          householdIds.map((householdId) =>
            getBrowserBookingsApiClient().listBookings({
              householdId,
              includeCancelled: true
            })
          )
        );
        const remindersByHousehold = await Promise.all(
          householdIds.map((householdId) =>
            getBrowserRemindersApiClient().listReminders({
              householdId,
              includeCompleted: true
            })
          )
        );
        const calendarEventsByHousehold = await Promise.all(
          householdIds.map((householdId) =>
            getBrowserRemindersApiClient().listCalendarEvents({
              householdId,
              includeCompleted: true
            })
          )
        );
        const threads = await getBrowserMessagingApiClient().listThreads();

        if (!isMounted) {
          return;
        }

        setDashboardData({
          householdSnapshot,
          pets: petsByHousehold.flat(),
          bookings: bookingsByHousehold.flat(),
          reminders: remindersByHousehold.flat(),
          calendarEvents: calendarEventsByHousehold.flat(),
          threads
        });
      } catch (error) {
        if (isMounted) {
          setDashboardError(error instanceof Error ? error.message : "No fue posible cargar el dashboard owner.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingDashboard(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const now = new Date();
  const activePets = dashboardData.pets.filter((pet) => pet.status === "active");
  const activeBookings = dashboardData.bookings.filter((booking) => booking.status === "pending_approval" || booking.status === "confirmed");
  const upcomingBookings = activeBookings
    .filter((booking) => new Date(booking.scheduledStartAt) >= now)
    .sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt));
  const pendingReminders = dashboardData.reminders
    .filter((reminder) => reminder.status === "pending")
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  const vaccineReminders = pendingReminders.filter((reminder) => reminder.reminderType === "vaccine");
  const documentCount = dashboardData.pets.reduce((total, pet) => total + pet.documentCount, 0);
  const recentActivity = [
    ...dashboardData.bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      title: booking.serviceName,
      detail: `${booking.petName} con ${booking.providerName}`,
      date: booking.createdAt,
      icon: "booking" as const
    })),
    ...dashboardData.reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      title: reminder.title,
      detail: reminder.status === "completed" ? "Recordatorio completado" : "Recordatorio pendiente",
      date: reminder.createdAt,
      icon: "calendar" as const
    }))
  ]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);
  const ownerName = `${snapshot.profile.firstName} ${snapshot.profile.lastName}`.trim() || "Propietario";

  return (
    <section style={{ display: "grid", gap: "14px" }}>
      <OwnerDashboardCard>
        <div style={{ alignItems: "center", display: "flex", gap: "16px", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: "5px" }}>
            <span style={{ color: "#0f766e", fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Panel owner
            </span>
            <h2 style={{ color: "#0b163f", fontSize: "24px", lineHeight: 1.08, margin: 0 }}>Hola, {ownerName}</h2>
            <span style={{ color: "#667085", fontSize: "13px" }}>
              Gestiona mascotas, salud, reservas, documentos y mensajes desde una vista consolidada.
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusPill tone="active" label="Propietario" />
            <StatusPill tone="neutral" label={`${dashboardData.householdSnapshot?.households.length ?? 0} hogar(es)`} />
            <StatusPill tone={dashboardError ? "pending" : "neutral"} label={isLoadingDashboard ? "cargando" : dashboardError ? "datos parciales" : "datos al dia"} />
          </div>
        </div>
      </OwnerDashboardCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(118px, 1fr))", gap: "10px" }}>
        <OwnerDashboardMetric icon="paw" label="Mascotas" note="registradas activas" value={activePets.length} />
        <OwnerDashboardMetric
          icon="calendar"
          label="Proxima actividad"
          note={upcomingBookings[0] ? formatOwnerDashboardDateTime(upcomingBookings[0].scheduledStartAt) : "sin agenda proxima"}
          tone="blue"
          value={upcomingBookings[0]?.petName ?? "-"}
        />
        <OwnerDashboardMetric icon="booking" label="Reservas activas" note="pendientes o confirmadas" tone="teal" value={activeBookings.length} />
        <OwnerDashboardMetric icon="health" label="Recordatorios" note="pendientes de atender" tone="orange" value={pendingReminders.length} />
        <OwnerDashboardMetric icon="account" label="Documentos" note="archivos de mascotas" tone="blue" value={documentCount} />
        <OwnerDashboardMetric icon="chat" label="Mensajes" note="hilos con actividad" tone="rose" value={dashboardData.threads.filter((thread) => thread.lastMessageAt).length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.9fr", gap: "14px" }}>
        <OwnerDashboardCard>
          <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "grid", gap: "3px" }}>
              <strong style={{ color: "#0b163f", fontSize: "15px" }}>Mis mascotas</strong>
              <span style={{ color: "#667085", fontSize: "11px" }}>Perfil, documentos y estado general</span>
            </div>
            <button
              onClick={() => onNavigate("owner-web-pets")}
              style={{
                background: "transparent",
                border: "none",
                color: "#0f766e",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 800,
                padding: 0
              }}
              type="button"
            >
              Ver todas
            </button>
          </div>
          {activePets.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
              {activePets.slice(0, 4).map((pet) => (
                <article
                  key={pet.id}
                  style={{
                    background: "linear-gradient(180deg, rgba(236,253,245,0.74), #ffffff)",
                    border: "1px solid rgba(15, 118, 110, 0.12)",
                    borderRadius: "16px",
                    display: "grid",
                    gap: "10px",
                    padding: "12px"
                  }}
                >
                  <div style={{ alignItems: "center", display: "flex", gap: "10px" }}>
                    <span
                      style={{
                        alignItems: "center",
                        background: "rgba(15, 118, 110, 0.1)",
                        borderRadius: "16px",
                        color: "#0f766e",
                        display: "inline-flex",
                        height: "46px",
                        justifyContent: "center",
                        overflow: "hidden",
                        width: "46px"
                      }}
                    >
                      {pet.avatarUrl ? (
                        <img alt="" src={pet.avatarUrl} style={{ height: "100%", objectFit: "cover", width: "100%" }} />
                      ) : (
                        <OwnerWebIcon name="paw" size={22} />
                      )}
                    </span>
                    <span style={{ display: "grid", gap: "2px", minWidth: 0 }}>
                      <strong style={{ color: "#0b163f", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis" }}>{pet.name}</strong>
                      <span style={{ color: "#667085", fontSize: "10px" }}>
                        {pet.species}
                        {pet.breed ? ` / ${pet.breed}` : ""}
                      </span>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <StatusPill tone="active" label={getPetAgeLabel(pet.birthDate)} />
                    <StatusPill tone={pet.documentCount ? "neutral" : "pending"} label={`${pet.documentCount} doc.`} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ background: "rgba(15, 118, 110, 0.06)", borderRadius: "14px", color: "#667085", padding: "14px" }}>
              Aun no hay mascotas registradas. Agrega la primera mascota para activar salud, documentos y reservas.
            </div>
          )}
        </OwnerDashboardCard>

        <OwnerDashboardCard>
          <strong style={{ color: "#0b163f", fontSize: "15px" }}>Proximas actividades</strong>
          {upcomingBookings.length ? (
            <div style={{ display: "grid", gap: "9px" }}>
              {upcomingBookings.slice(0, 4).map((booking) => (
                <article key={booking.id} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)", display: "grid", gap: "3px", paddingBottom: "9px" }}>
                  <strong style={{ color: "#101828", fontSize: "12px" }}>{booking.serviceName}</strong>
                  <span style={{ color: "#667085", fontSize: "11px" }}>
                    {booking.petName} / {booking.providerName}
                  </span>
                  <span style={{ color: "#0f766e", fontSize: "10px", fontWeight: 800 }}>{formatOwnerDashboardDateTime(booking.scheduledStartAt)}</span>
                </article>
              ))}
            </div>
          ) : (
            <span style={{ color: "#667085", fontSize: "12px" }}>No hay reservas proximas. Busca servicios para planificar la siguiente actividad.</span>
          )}
        </OwnerDashboardCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
        <OwnerDashboardCard>
          <strong style={{ color: "#0b163f", fontSize: "15px" }}>Salud y recordatorios</strong>
          <div style={{ display: "grid", gap: "8px" }}>
            <StatusPill tone={vaccineReminders.length ? "pending" : "active"} label={`${vaccineReminders.length} vacuna(s) pendiente(s)`} />
            <StatusPill tone={pendingReminders.length ? "pending" : "active"} label={`${pendingReminders.length} recordatorio(s)`} />
            <span style={{ color: "#667085", fontSize: "11px" }}>
              {pendingReminders[0] ? `Proximo: ${pendingReminders[0].title}` : "Todo luce al dia segun los datos actuales."}
            </span>
          </div>
        </OwnerDashboardCard>
        <OwnerDashboardCard>
          <strong style={{ color: "#0b163f", fontSize: "15px" }}>Documentos</strong>
          <span style={{ color: "#667085", fontSize: "12px" }}>
            {documentCount ? `${documentCount} documento(s) cargado(s) entre tus mascotas.` : "Sin documentos cargados todavia."}
          </span>
          <button
            onClick={() => onNavigate("owner-web-pets")}
            style={{
              background: "transparent",
              border: "none",
              color: "#0f766e",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 800,
              justifySelf: "start",
              padding: 0
            }}
            type="button"
          >
            Gestionar documentos
          </button>
        </OwnerDashboardCard>
        <OwnerDashboardCard>
          <strong style={{ color: "#0b163f", fontSize: "15px" }}>Actividad reciente</strong>
          {recentActivity.length ? (
            <div style={{ display: "grid", gap: "8px" }}>
              {recentActivity.slice(0, 4).map((activity) => (
                <div key={activity.id} style={{ alignItems: "start", display: "grid", gap: "8px", gridTemplateColumns: "22px minmax(0, 1fr)" }}>
                  <span style={{ color: "#0f766e" }}>
                    <OwnerWebIcon name={activity.icon} size={15} />
                  </span>
                  <span style={{ display: "grid", gap: "2px" }}>
                    <strong style={{ color: "#101828", fontSize: "11px" }}>{activity.title}</strong>
                    <span style={{ color: "#667085", fontSize: "10px" }}>{activity.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ color: "#667085", fontSize: "12px" }}>Todavia no hay actividad reciente.</span>
          )}
        </OwnerDashboardCard>
      </div>

      <OwnerDashboardCard>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { label: "Buscar servicios", sectionId: "owner-web-marketplace" as const },
            { label: "Reservar servicio", sectionId: "owner-web-bookings" as const },
            { label: "Gestionar mascotas", sectionId: "owner-web-pets" as const },
            { label: "Abrir mensajes", sectionId: "owner-web-messaging" as const }
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.sectionId)}
              style={{
                background: action.label === "Buscar servicios" ? "#0f766e" : "#ffffff",
                border: "1px solid rgba(15, 118, 110, 0.18)",
                borderRadius: "999px",
                color: action.label === "Buscar servicios" ? "#ffffff" : "#0f766e",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 800,
                padding: "8px 12px",
              }}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      </OwnerDashboardCard>
    </section>
  );
}

function Button({
  children,
  compact = false,
  disabled,
  onClick,
  tone = "primary",
  type = "button"
}: {
  children: string;
  compact?: boolean;
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
        fontSize: compact ? "12px" : undefined,
        padding: compact ? "8px 13px" : "12px 18px",
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
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "number" | "password" | "text";
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
        style={controlStyle}
      />
    </label>
  );
}

function SelectField<TValue extends string>({
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
      <select onChange={(event) => onChange(event.target.value as TValue)} value={value} style={controlStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function getRoleTone(role: CoreRole, isActive: boolean) {
  if (isActive) {
    return "active" as const;
  }

  return role === "provider" ? ("pending" as const) : ("neutral" as const);
}

function getShellCopy(activeRole: CoreRole, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return {
      eyebrow: "Pet Ecosystem",
      title: "Cuidado y servicios para tus mascotas",
      description: "Inicia sesion o crea tu cuenta para gestionar mascotas, proveedores, reservas y mensajes.",
      accent: "Acceso seguro"
    };
  }

  if (activeRole === "provider") {
    return {
      eyebrow: "Suite proveedor",
      title: "Consola de gestion para tu negocio pet",
      description: "Administra publicacion, servicios, disponibilidad, documentos y reservas desde una superficie web enfocada en proveedor.",
      accent: "Modo proveedor"
    };
  }

  return {
    eyebrow: "Owner web",
    title: "Centro de cuidado de tus mascotas",
    description: "Consulta hogares, mascotas, salud, busqueda de servicios, reservas y conversaciones desde tu contexto de propietario.",
    accent: "Modo propietario"
  };
}

export function CoreExperienceScreen() {
  const {
    authState,
    snapshot,
    configError,
    errorMessage,
    infoMessage,
    isLoading,
    isRecoverySession,
    isSubmitting,
    clearMessages,
    clearRecoverySession,
    refresh,
    runAction
  } = useCoreWorkspace();
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [verifyForm, setVerifyForm] = useState(emptyVerifyForm);
  const [recoverForm, setRecoverForm] = useState(emptyRecoverForm);
  const [recoveryPasswordForm, setRecoveryPasswordForm] = useState(emptyRecoveryPasswordForm);
  const [authAccessPanel, setAuthAccessPanel] = useState<AuthAccessPanel>("register");
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [preferenceForm, setPreferenceForm] = useState(emptyPreferenceForm);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [marketplaceSelection, setMarketplaceSelection] = useState<MarketplaceServiceSelection | null>(null);
  const [focusedBookingId, setFocusedBookingId] = useState<Uuid | null>(null);
  const [chatFocusVersion, setChatFocusVersion] = useState(0);
  const [focusedReviewBookingId, setFocusedReviewBookingId] = useState<Uuid | null>(null);
  const [reviewFocusVersion, setReviewFocusVersion] = useState(0);
  const [focusedSupportBookingId, setFocusedSupportBookingId] = useState<Uuid | null>(null);
  const [supportFocusVersion, setSupportFocusVersion] = useState(0);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setProfileForm({
      firstName: snapshot.profile.firstName,
      lastName: snapshot.profile.lastName,
      phone: snapshot.profile.phone ?? "",
      avatarUrl: snapshot.profile.avatarUrl ?? "",
      locale: snapshot.profile.locale
    });
    setPreferenceForm({
      marketingOptIn: snapshot.preferences.marketingOptIn,
      reminderEmailOptIn: snapshot.preferences.reminderEmailOptIn,
      reminderPushOptIn: snapshot.preferences.reminderPushOptIn
    });
    setRecoverForm({ email: snapshot.profile.email });
    setVerifyForm((currentForm) => ({ ...currentForm, email: currentForm.email || snapshot.profile.email }));
  }, [snapshot]);

  const completedTasks = snapshot?.onboardingTasks.filter((task) => task.status === "completed").length ?? 0;
  const activeRole = snapshot?.roles.find((role) => role.isActive)?.role ?? "pet_owner";
  const hasProviderRole = snapshot?.roles.some((role) => role.role === "provider") ?? false;
  const isProviderMode = authState.isAuthenticated && activeRole === "provider";
  const isOwnerMode = authState.isAuthenticated && activeRole === "pet_owner";
  const shellCopy = getShellCopy(activeRole, authState.isAuthenticated);
  const visibleConfigError = isHiddenTechnicalAuthMessage(configError) ? null : configError;
  const visibleErrorMessage = isHiddenTechnicalAuthMessage(errorMessage) ? null : errorMessage;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(15, 118, 110, 0.18), transparent 32%), linear-gradient(180deg, #f7f2e7 0%, #efe5d0 100%)",
        color: colorTokens.ink,
        padding: `${spacingTokens.xl + 16}px ${spacingTokens.lg}px ${spacingTokens.xl * 2}px`
      }}
    >
      <section style={{ width: "min(1180px, 100%)", margin: "0 auto", display: "grid", gap: "24px" }}>
        <header
          style={{
            borderRadius: isProviderMode ? "18px" : "22px",
            padding: isProviderMode ? "16px 22px" : "24px 28px",
            background: "rgba(28, 25, 23, 0.92)",
            color: "#f8fafc",
            boxShadow: "0 18px 46px rgba(28, 25, 23, 0.16)",
            display: "grid",
            gap: isProviderMode ? "8px" : "12px"
          }}
        >
          <p style={{ margin: 0, fontSize: isProviderMode ? "9px" : "12px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#99f6e4" }}>
            {shellCopy.eyebrow}
          </p>
          <h1 style={{ margin: 0, fontSize: isProviderMode ? "24px" : "34px", lineHeight: 1.08 }}>{shellCopy.title}</h1>
          <p style={{ margin: 0, maxWidth: "780px", fontSize: isProviderMode ? "11px" : "15px", lineHeight: isProviderMode ? 1.38 : 1.55, color: "rgba(248, 250, 252, 0.82)" }}>
            {shellCopy.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: isProviderMode ? "8px" : "12px" }}>
            {!isProviderMode ? (
              <StatusPill
                tone={snapshot ? "active" : "pending"}
                label={snapshot ? `${completedTasks}/${snapshot.onboardingTasks.length} pasos listos` : "acceso pendiente"}
              />
            ) : null}
            <StatusPill tone="neutral" label={shellCopy.accent} />
            <StatusPill
              tone={coreMvpBoundaries.paymentCaptureInCore ? "pending" : "active"}
              label={coreMvpBoundaries.paymentCaptureInCore ? "cobro activo" : "sin cobro real"}
            />
            {authState.isAuthenticated && authState.email ? <StatusPill tone="neutral" label={authState.email} /> : null}
          </div>
          {authState.isAuthenticated ? (
            <div style={{ display: "flex", gap: isProviderMode ? "8px" : "12px", flexWrap: "wrap" }}>
              <Button compact={isProviderMode} disabled={isSubmitting} onClick={() => void refresh()} tone="secondary">
                Actualizar
              </Button>
              <Button
                compact={isProviderMode}
                disabled={isSubmitting}
                onClick={() => {
                  void runAction(() => getBrowserCoreApiClient().logout(), "Sesion cerrada.", false);
                }}
                tone="secondary"
              >
                Cerrar sesion
              </Button>
            </div>
          ) : null}
        </header>

        {visibleConfigError ? <Notice message={visibleConfigError} tone="error" /> : null}
        {!visibleConfigError && visibleErrorMessage ? <Notice message={visibleErrorMessage} tone="error" /> : null}
        {!visibleConfigError && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}
        {isRecoverySession ? (
          <Notice
            message="Supabase detecto una sesion de recuperacion. Define una nueva contrasena para completar el flujo de acceso."
            tone="info"
          />
        ) : null}

        {!visibleConfigError && isRecoverySession ? (
          <CoreSection
            eyebrow="Sesion de recuperacion"
            title="Define una nueva contrasena"
            description="Supabase ya valido el enlace de recuperacion para esta sesion. Guarda aqui la nueva contrasena para completar la recuperacion de acceso."
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                clearMessages();
                void runAction(
                  async () => {
                    if (!recoveryPasswordForm.password) {
                      throw new Error("Se requiere una nueva contrasena.");
                    }

                    if (recoveryPasswordForm.password !== recoveryPasswordForm.confirmPassword) {
                      throw new Error("Las contrasenas de recuperacion deben coincidir.");
                    }

                    await getBrowserCoreApiClient().completeRecovery({
                      password: recoveryPasswordForm.password
                    });
                  },
                  "Contrasena actualizada. Flujo de recuperacion completado."
                ).then(() => {
                  clearRecoverySession();
                  setRecoveryPasswordForm(emptyRecoveryPasswordForm);
                });
              }}
              style={{ display: "grid", gap: "14px" }}
            >
              <Field
                label="Nueva contrasena"
                onChange={(value) => setRecoveryPasswordForm((currentForm) => ({ ...currentForm, password: value }))}
                type="password"
                value={recoveryPasswordForm.password}
              />
              <Field
                label="Confirmar nueva contrasena"
                onChange={(value) =>
                  setRecoveryPasswordForm((currentForm) => ({ ...currentForm, confirmPassword: value }))
                }
                type="password"
                value={recoveryPasswordForm.confirmPassword}
              />
              <Button disabled={isSubmitting} type="submit">
                Actualizar contrasena
              </Button>
            </form>
          </CoreSection>
        ) : null}

        {!isLoading && authState.isAuthenticated && snapshot ? (
          <section
            style={{
              borderRadius: "20px",
              border: "1px solid rgba(28, 25, 23, 0.1)",
              background: "rgba(255, 255, 255, 0.82)",
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "grid", gap: "4px" }}>
              <strong>{isProviderMode ? "Vista de proveedor" : "Vista de propietario"}</strong>
              <span style={{ color: "#57534e", fontSize: "14px" }}>
                {isProviderMode
                  ? "Solo se muestra la consola del negocio. Cambia de rol para ver hogares, mascotas y reservas como propietario."
                  : "Solo se muestra el contexto del hogar y las reservas como propietario. Cambia de rol para operar negocios."}
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {snapshot.roles.map((role) => (
                <button
                  key={role.id}
                  disabled={isSubmitting || role.isActive}
                  onClick={() => {
                    if (role.isActive) {
                      return;
                    }

                    clearMessages();
                    void runAction(
                      () => getBrowserCoreApiClient().switchRole({ role: role.role }),
                      `Vista cambiada a ${coreRoleLabels[role.role]}.`
                    );
                  }}
                  style={{
                    borderRadius: "999px",
                    border: role.isActive ? "1px solid rgba(15, 118, 110, 0.24)" : "1px solid rgba(28, 25, 23, 0.12)",
                    background: role.isActive ? "rgba(15, 118, 110, 0.12)" : "rgba(255,255,255,0.86)",
                    color: role.isActive ? "#0f766e" : "#44403c",
                    cursor: role.isActive || isSubmitting ? "default" : "pointer",
                    fontWeight: 800,
                    padding: "9px 13px"
                  }}
                  type="button"
                >
                  {role.isActive ? "✓ " : ""}
                  {coreRoleLabels[role.role]}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {isLoading ? (
          <CoreSection
            eyebrow="Cargando"
            title="Preparando tu espacio"
            description="Estamos cargando tu sesion y mostrando la experiencia que corresponde a tu rol activo."
          >
            <p style={{ margin: 0, color: "#57534e" }}>Cargando datos de cuenta y permisos...</p>
          </CoreSection>
        ) : null}

        {!isLoading && !authState.isAuthenticated ? (
          <div
            style={{
              display: "grid",
              justifyItems: "center"
            }}
          >
            <CoreSection
              eyebrow="Acceso Pet Ecosystem"
              title={
                authAccessPanel === "register"
                  ? "Crea tu cuenta"
                  : authAccessPanel === "login"
                    ? "Inicia sesion"
                    : authAccessPanel === "verify"
                      ? "Verifica tu correo"
                      : "Recupera tu contrasena"
              }
              description={
                authAccessPanel === "register"
                  ? "Registra tu identidad para gestionar mascotas, reservas o servicios desde un solo lugar."
                  : authAccessPanel === "login"
                    ? "Usa tu correo y contrasena para continuar con tu cuenta."
                    : authAccessPanel === "verify"
                      ? "Ingresa el codigo de 6 digitos enviado a tu correo para activar el acceso."
                      : "Te enviaremos un enlace seguro para definir una nueva contrasena."
              }
            >
              <div style={{ display: "grid", gap: "18px", width: "min(560px, 100%)" }}>
                <div
                  aria-label="Opciones de acceso"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    borderRadius: "999px",
                    background: "rgba(15, 118, 110, 0.08)",
                    border: "1px solid rgba(15, 118, 110, 0.14)",
                    padding: "5px"
                  }}
                >
                  {[
                    { label: "Crear cuenta", value: "register" as const },
                    { label: "Iniciar sesion", value: "login" as const }
                  ].map((option) => {
                    const isActive = authAccessPanel === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          clearMessages();
                          setAuthAccessPanel(option.value);
                        }}
                        style={{
                          border: "none",
                          borderRadius: "999px",
                          background: isActive ? "#0f766e" : "transparent",
                          color: isActive ? "#ffffff" : "#0f766e",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 800,
                          padding: "10px 14px"
                        }}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {authAccessPanel === "register" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      setVerifyForm((currentForm) => ({ ...currentForm, email: registerForm.email }));
                      setRecoverForm({ email: registerForm.email });
                      void runAction(
                        () =>
                          getBrowserCoreApiClient().register({
                            email: registerForm.email,
                            password: registerForm.password,
                            firstName: registerForm.firstName,
                            lastName: registerForm.lastName,
                            requestedRoles: [registerForm.role],
                            emailRedirectTo: getBrowserRecoveryRedirectUrl()
                          }),
                        "Registro enviado. Revisa tu correo e ingresa el codigo para verificar tu cuenta."
                      ).then(() => setAuthAccessPanel("verify"));
                    }}
                    style={{ display: "grid", gap: "14px" }}
                  >
                    <Field
                      label="Correo"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, email: value }))}
                      type="email"
                      value={registerForm.email}
                    />
                    <Field
                      label="Contrasena"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, password: value }))}
                      type="password"
                      value={registerForm.password}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                      <Field
                        label="Nombre"
                        onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, firstName: value }))}
                        value={registerForm.firstName}
                      />
                      <Field
                        label="Apellido"
                        onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, lastName: value }))}
                        value={registerForm.lastName}
                      />
                    </div>
                    <SelectField
                      label="Rol inicial"
                      onChange={(value) => setRegisterForm((currentForm) => ({ ...currentForm, role: value }))}
                      options={[
                        { label: coreRoleLabels.pet_owner, value: "pet_owner" },
                        { label: coreRoleLabels.provider, value: "provider" }
                      ]}
                      value={registerForm.role}
                    />
                    <Button disabled={isSubmitting} type="submit">
                      Crear cuenta
                    </Button>
                    <button
                      onClick={() => {
                        clearMessages();
                        setAuthAccessPanel("verify");
                        setVerifyForm((currentForm) => ({ ...currentForm, email: currentForm.email || registerForm.email }));
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#0f766e",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 800,
                        justifySelf: "center"
                      }}
                      type="button"
                    >
                      Ya tengo un codigo de verificacion
                    </button>
                  </form>
                ) : null}

                {authAccessPanel === "login" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      setVerifyForm((currentForm) => ({ ...currentForm, email: loginForm.email }));
                      setRecoverForm({ email: loginForm.email });
                      void runAction(
                        () =>
                          getBrowserCoreApiClient().login({
                            email: loginForm.email,
                            password: loginForm.password
                          }),
                        "Sesion autenticada."
                      );
                    }}
                    style={{ display: "grid", gap: "14px" }}
                  >
                    <Field
                      label="Correo"
                      onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, email: value }))}
                      type="email"
                      value={loginForm.email}
                    />
                    <Field
                      label="Contrasena"
                      onChange={(value) => setLoginForm((currentForm) => ({ ...currentForm, password: value }))}
                      type="password"
                      value={loginForm.password}
                    />
                    <Button disabled={isSubmitting} type="submit">
                      Iniciar sesion
                    </Button>
                    <button
                      onClick={() => {
                        clearMessages();
                        setRecoverForm({ email: recoverForm.email || loginForm.email });
                        setAuthAccessPanel("recover");
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#0f766e",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 800,
                        justifySelf: "center"
                      }}
                      type="button"
                    >
                      Olvidaste tu contrasena?
                    </button>
                  </form>
                ) : null}

                {authAccessPanel === "verify" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      void runAction(
                        () =>
                          getBrowserCoreApiClient().verifyOtp({
                            email: verifyForm.email,
                            token: verifyForm.token
                          }),
                        "Verificacion de correo completada. Ya puedes iniciar sesion."
                      ).then(() => setAuthAccessPanel("login"));
                    }}
                    style={{ display: "grid", gap: "14px" }}
                  >
                    <Field
                      label="Correo de verificacion"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, email: value }))}
                      type="email"
                      value={verifyForm.email}
                    />
                    <Field
                      label="Codigo de 6 digitos"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                      value={verifyForm.token}
                    />
                    <Button disabled={isSubmitting} type="submit">
                      Verificar codigo
                    </Button>
                    <Button disabled={isSubmitting} onClick={() => setAuthAccessPanel("login")} tone="secondary">
                      Volver a iniciar sesion
                    </Button>
                  </form>
                ) : null}

                {authAccessPanel === "recover" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      void runAction(
                        () =>
                          getBrowserCoreApiClient().recoverAccess({
                            email: recoverForm.email,
                            redirectTo: getBrowserRecoveryRedirectUrl()
                          }),
                        "Correo de recuperacion solicitado. Revisa tu bandeja y evita pedir varios enlaces seguidos.",
                        false
                      );
                    }}
                    style={{ display: "grid", gap: "14px" }}
                  >
                    <Field
                      label="Correo de recuperacion"
                      onChange={(value) => setRecoverForm({ email: value })}
                      type="email"
                      value={recoverForm.email}
                    />
                    <Button disabled={isSubmitting} type="submit">
                      Enviar enlace de recuperacion
                    </Button>
                    <Button onClick={() => setAuthAccessPanel("login")} tone="secondary">
                      Volver a iniciar sesion
                    </Button>
                  </form>
                ) : null}
              </div>
            </CoreSection>
          </div>
        ) : null}

        {!isLoading && isOwnerMode ? (
          <OwnerWebShell ownerName={snapshot ? `${snapshot.profile.firstName} ${snapshot.profile.lastName}`.trim() || "Propietario" : "Propietario"}>
            {(activeOwnerWebSectionId, navigateOwnerWebSection) => (
              <>
            {snapshot && activeOwnerWebSectionId === "owner-web-panel" ? (
              <OwnerWebSection id="owner-web-panel">
                <OwnerDashboard onNavigate={navigateOwnerWebSection} snapshot={snapshot} />
              </OwnerWebSection>
            ) : null}

            {snapshot && activeOwnerWebSectionId === "owner-web-account" ? (
              <OwnerWebSection id="owner-web-account">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "18px"
                  }}
                >
            <CoreSection
              eyebrow="Onboarding"
              title="Ruta de activacion actual"
              description="These task states are computed from the real auth session and persisted core records."
            >
              <div style={{ display: "grid", gap: "12px" }}>
                {snapshot.onboardingTasks.map((task) => (
                  <article
                    key={task.id}
                    style={{
                      display: "grid",
                      gap: "8px",
                      borderRadius: "18px",
                      padding: "16px",
                      background: "rgba(247, 242, 231, 0.72)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
                      <strong>{task.title}</strong>
                      <StatusPill tone={task.status === "completed" ? "active" : "pending"} label={task.status} />
                    </div>
                    <span style={{ color: "#57534e", lineHeight: 1.6 }}>{task.description}</span>
                  </article>
                ))}
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Access"
              title="Verification and recovery"
              description="La verificacion usa el OTP manual de correo cuando Confirm email esta activo y la recuperacion pasa por Auth."
            >
              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <StatusPill
                    tone={snapshot.verification.status === "verified" ? "active" : "pending"}
                    label={snapshot.verification.status}
                  />
                  <StatusPill tone="neutral" label={snapshot.verification.channel} />
                  <StatusPill tone="neutral" label={snapshot.profile.email} />
                </div>
                {snapshot.verification.status !== "verified" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      clearMessages();
                      void runAction(
                        () =>
                          getBrowserCoreApiClient().verifyOtp({
                            email: verifyForm.email || snapshot.profile.email,
                            token: verifyForm.token
                          }),
                        "Verificacion de correo completada."
                      );
                    }}
                    style={{ display: "grid", gap: "12px" }}
                  >
                    <Field
                      label="Verification email"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, email: value }))}
                      type="email"
                      value={verifyForm.email || snapshot.profile.email}
                    />
                    <Field
                      label="Codigo OTP de 6 digitos"
                      onChange={(value) => setVerifyForm((currentForm) => ({ ...currentForm, token: value }))}
                      value={verifyForm.token}
                    />
                    <Button disabled={isSubmitting} type="submit">
                      Verificar correo actual
                    </Button>
                  </form>
                ) : null}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    clearMessages();
                    void runAction(
                      () =>
                        getBrowserCoreApiClient().recoverAccess({
                          email: recoverForm.email || snapshot.profile.email,
                          redirectTo: getBrowserRecoveryRedirectUrl()
                        }),
                      "Correo de recuperacion solicitado.",
                      false
                    );
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <Field
                    label="Correo de recuperacion"
                    onChange={(value) => setRecoverForm({ email: value })}
                    type="email"
                    value={recoverForm.email || snapshot.profile.email}
                  />
                  <Button disabled={isSubmitting} type="submit">
                    Re-send recovery email
                  </Button>
                </form>
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Perfil"
              title="Perfil base persistido"
              description="Estos campos se almacenan en `public.profiles` y permanecen separados de hogares y mascotas."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().updateProfile({
                        firstName: profileForm.firstName?.trim(),
                        lastName: profileForm.lastName?.trim(),
                        phone: profileForm.phone?.trim() || null,
                        avatarUrl: profileForm.avatarUrl?.trim() || null,
                        locale: profileForm.locale?.trim()
                      }),
                    "Perfil actualizado."
                  );
                }}
                style={{ display: "grid", gap: "12px" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field
                    label="Nombre"
                    onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, firstName: value }))}
                    value={profileForm.firstName ?? ""}
                  />
                  <Field
                    label="Apellido"
                    onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, lastName: value }))}
                    value={profileForm.lastName ?? ""}
                  />
                </div>
                <Field
                  label="Telefono"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, phone: value }))}
                  value={profileForm.phone ?? ""}
                />
                <Field
                  label="URL del avatar"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, avatarUrl: value }))}
                  value={profileForm.avatarUrl ?? ""}
                />
                <Field
                  label="Configuracion regional"
                  onChange={(value) => setProfileForm((currentForm) => ({ ...currentForm, locale: value }))}
                  value={profileForm.locale ?? "es"}
                />
                <Button disabled={isSubmitting} type="submit">
                  Guardar perfil
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Preferencias"
              title="Preferencias de comunicacion"
              description="Las preferencias permanecen en el mismo perfil asociado al propietario."
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  clearMessages();
                  void runAction(
                    () =>
                      getBrowserCoreApiClient().updatePreferences({
                        marketingOptIn: preferenceForm.marketingOptIn,
                        reminderEmailOptIn: preferenceForm.reminderEmailOptIn,
                        reminderPushOptIn: preferenceForm.reminderPushOptIn
                      }),
                    "Preferencias actualizadas."
                  );
                }}
                style={{ display: "grid", gap: "12px" }}
              >
                <CheckField
                  checked={preferenceForm.marketingOptIn}
                  label="Acepta marketing"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, marketingOptIn: value }))}
                />
                <CheckField
                  checked={preferenceForm.reminderEmailOptIn}
                  label="Recordatorios por correo"
                  onChange={(value) =>
                    setPreferenceForm((currentForm) => ({ ...currentForm, reminderEmailOptIn: value }))
                  }
                />
                <CheckField
                  checked={preferenceForm.reminderPushOptIn}
                  label="Recordatorios push"
                  onChange={(value) => setPreferenceForm((currentForm) => ({ ...currentForm, reminderPushOptIn: value }))}
                />
                <Button disabled={isSubmitting} type="submit">
                  Guardar preferencias
                </Button>
              </form>
            </CoreSection>

            <CoreSection
              eyebrow="Roles"
              title="Cambio basico de rol"
              description="Aqui solo existen los contextos de propietario y proveedor; la operacion del proveedor queda fuera de EP-01."
            >
              <div style={{ display: "grid", gap: "12px" }}>
                {snapshot.roles.map((role) => (
                  <article
                    key={role.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: "18px",
                      padding: "14px 16px",
                      background: role.isActive ? "rgba(15, 118, 110, 0.08)" : "rgba(28, 25, 23, 0.04)"
                    }}
                  >
                    <div style={{ display: "grid", gap: "4px" }}>
                      <strong>{coreRoleLabels[role.role]}</strong>
                      <span style={{ color: "#57534e" }}>
                        {role.isActive ? "Contexto visible para la sesion actual." : "Disponible, pero inactivo."}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <StatusPill tone={getRoleTone(role.role, role.isActive)} label={role.isActive ? "activo" : "disponible"} />
                      {!role.isActive ? (
                        <Button
                          disabled={isSubmitting}
                          onClick={() => {
                            clearMessages();
                            void runAction(
                              () => getBrowserCoreApiClient().switchRole({ role: role.role }),
                              `Rol activo cambiado a ${coreRoleLabels[role.role]}.`
                            );
                          }}
                          tone="secondary"
                        >
                          Activar
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Direcciones"
              title="Ubicaciones del usuario"
              description="Las direcciones siguen ligadas al usuario y no se convierten en registros del hogar."
            >
              <div style={{ display: "grid", gap: "18px" }}>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    clearMessages();
                    void runAction(
                      () =>
                        getBrowserCoreApiClient().upsertAddress({
                          ...addressForm,
                          recipientName: addressForm.recipientName.trim(),
                          line1: addressForm.line1.trim(),
                          line2: addressForm.line2?.trim() || null,
                          city: addressForm.city.trim(),
                          stateRegion: addressForm.stateRegion.trim(),
                          postalCode: addressForm.postalCode.trim(),
                          countryCode: addressForm.countryCode.trim()
                        }),
                      addressForm.id ? "Direccion actualizada." : "Direccion guardada."
                    ).then(() => {
                      setAddressForm(emptyAddressForm);
                    });
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectField<AddressLabel>
                      label="Etiqueta"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, label: value }))}
                      options={[
                        { label: "Casa", value: "home" },
                        { label: "Trabajo", value: "work" },
                        { label: "Otro", value: "other" }
                      ]}
                      value={addressForm.label}
                    />
                    <Field
                      label="Destinatario"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, recipientName: value }))}
                      value={addressForm.recipientName}
                    />
                  </div>
                  <Field
                    label="Linea 1"
                    onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, line1: value }))}
                    value={addressForm.line1}
                  />
                  <Field
                    label="Linea 2"
                    onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, line2: value }))}
                    value={addressForm.line2 ?? ""}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <Field
                      label="Ciudad"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, city: value }))}
                      value={addressForm.city}
                    />
                    <Field
                      label="Provincia / region"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, stateRegion: value }))}
                      value={addressForm.stateRegion}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <Field
                      label="Codigo postal"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, postalCode: value }))}
                      value={addressForm.postalCode}
                    />
                    <Field
                      label="Codigo de pais"
                      onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, countryCode: value }))}
                      value={addressForm.countryCode}
                    />
                  </div>
                  <CheckField
                    checked={Boolean(addressForm.isDefault)}
                    label="Marcar como direccion predeterminada"
                    onChange={(value) => setAddressForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                  />
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button disabled={isSubmitting} type="submit">
                      {addressForm.id ? "Actualizar direccion" : "Guardar direccion"}
                    </Button>
                    {addressForm.id ? (
                      <Button disabled={isSubmitting} onClick={() => setAddressForm(emptyAddressForm)} tone="secondary">
                        Cancelar edicion
                      </Button>
                    ) : null}
                  </div>
                </form>

                <div style={{ display: "grid", gap: "12px" }}>
                  {snapshot.addresses.map((address) => (
                    <article
                      key={address.id}
                      style={{
                        borderRadius: "18px",
                        padding: "16px",
                        background: "rgba(247, 242, 231, 0.72)",
                        display: "grid",
                        gap: "8px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <strong>{address.recipientName}</strong>
                        <StatusPill tone={address.isDefault ? "active" : "neutral"} label={address.isDefault ? "predeterminada" : address.label} />
                      </div>
                      <span style={{ color: "#57534e" }}>
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}
                      </span>
                      <span style={{ color: "#57534e" }}>
                        {address.city}, {address.stateRegion} {address.postalCode}, {address.countryCode}
                      </span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          disabled={isSubmitting}
                          onClick={() =>
                            setAddressForm({
                              id: address.id,
                              label: address.label,
                              recipientName: address.recipientName,
                              line1: address.line1,
                              line2: address.line2 ?? "",
                              city: address.city,
                              stateRegion: address.stateRegion,
                              postalCode: address.postalCode,
                              countryCode: address.countryCode,
                              isDefault: address.isDefault
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
              </div>
            </CoreSection>

            <CoreSection
              eyebrow="Metodos de pago"
              title="Solo tarjetas guardadas"
              description="Core guarda tarjetas reutilizables, pero checkout, precios y cobro quedan fuera de EP-01."
            >
              <div style={{ display: "grid", gap: "18px" }}>
                <p style={{ margin: 0, color: "#57534e" }}>
                  Compatibles en el core del MVP: {coreSupportedPaymentMethodTypes.join(", ")}.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    clearMessages();
                    void runAction(
                      () =>
                        getBrowserCoreApiClient().addPaymentMethod({
                          brand: paymentForm.brand,
                          last4: paymentForm.last4.trim(),
                          expMonth: Number(paymentForm.expMonth),
                          expYear: Number(paymentForm.expYear),
                          cardholderName: paymentForm.cardholderName.trim(),
                          isDefault: paymentForm.isDefault
                        }),
                      "Metodo de pago guardado."
                    ).then(() => {
                      setPaymentForm(emptyPaymentForm);
                    });
                  }}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectField<PaymentMethodBrand>
                      label="Marca"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, brand: value }))}
                      options={[
                        { label: "Visa", value: "visa" },
                        { label: "Mastercard", value: "mastercard" },
                        { label: "Amex", value: "amex" }
                      ]}
                      value={paymentForm.brand}
                    />
                    <Field
                      label="Ultimos 4"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, last4: value }))}
                      value={paymentForm.last4}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <Field
                      label="Mes de vencimiento"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expMonth: value }))}
                      type="number"
                      value={paymentForm.expMonth}
                    />
                    <Field
                      label="Ano de vencimiento"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, expYear: value }))}
                      type="number"
                      value={paymentForm.expYear}
                    />
                    <Field
                      label="Titular"
                      onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, cardholderName: value }))}
                      value={paymentForm.cardholderName}
                    />
                  </div>
                  <CheckField
                    checked={Boolean(paymentForm.isDefault)}
                    label="Marcar como metodo de pago predeterminado"
                    onChange={(value) => setPaymentForm((currentForm) => ({ ...currentForm, isDefault: value }))}
                  />
                  <Button disabled={isSubmitting} type="submit">
                    Guardar tarjeta
                  </Button>
                </form>

                <div style={{ display: "grid", gap: "12px" }}>
                  {snapshot.paymentMethods.map((paymentMethod) => (
                    <article
                      key={paymentMethod.id}
                      style={{
                        borderRadius: "18px",
                        padding: "16px",
                        background: "rgba(247, 242, 231, 0.72)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "16px",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ display: "grid", gap: "4px" }}>
                        <strong>
                          {paymentMethod.brand.toUpperCase()} terminada en {paymentMethod.last4}
                        </strong>
                        <span style={{ color: "#57534e" }}>
                          {paymentMethod.cardholderName} - vence {paymentMethod.expMonth}/{paymentMethod.expYear}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <StatusPill
                          tone={paymentMethod.isDefault ? "active" : "neutral"}
                          label={paymentMethod.isDefault ? "predeterminada" : paymentMethod.status}
                        />
                        {!paymentMethod.isDefault ? (
                          <Button
                            disabled={isSubmitting}
                            onClick={() => {
                              clearMessages();
                              void runAction(
                                () => getBrowserCoreApiClient().setDefaultPaymentMethod(paymentMethod.id),
                                `Metodo de pago predeterminado actualizado a ${paymentMethod.brand.toUpperCase()} ${paymentMethod.last4}.`
                              );
                            }}
                            tone="secondary"
                          >
                            Marcar como predeterminada
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </CoreSection>
                </div>
              </OwnerWebSection>
            ) : null}

            {activeOwnerWebSectionId === "owner-web-households" ? (
            <OwnerWebSection id="owner-web-households">
              <HouseholdsWorkspace enabled />
            </OwnerWebSection>
            ) : null}
            {activeOwnerWebSectionId === "owner-web-pets" ? (
            <OwnerWebSection id="owner-web-pets">
              <PetsWorkspace enabled />
            </OwnerWebSection>
            ) : null}
            {activeOwnerWebSectionId === "owner-web-health" ? (
            <OwnerWebSection id="owner-web-health">
              <HealthWorkspace enabled />
            </OwnerWebSection>
            ) : null}
            {activeOwnerWebSectionId === "owner-web-reminders" ? (
            <OwnerWebSection id="owner-web-reminders">
              <RemindersWorkspace enabled />
            </OwnerWebSection>
            ) : null}
            {activeOwnerWebSectionId === "owner-web-marketplace" ? (
            <OwnerWebSection id="owner-web-marketplace">
              <MarketplaceWorkspace
                enabled
                onSelectBookingService={(selection) => {
                  setMarketplaceSelection(selection);
                  navigateOwnerWebSection("owner-web-bookings");
                }}
              />
            </OwnerWebSection>
            ) : null}
            {activeOwnerWebSectionId === "owner-web-bookings" ? (
            <OwnerWebSection id="owner-web-bookings">
              <BookingsWorkspace
                enabled
                marketplaceSelection={marketplaceSelection}
                onOpenChatForBooking={(bookingId) => {
                  setFocusedBookingId(bookingId);
                  setChatFocusVersion(Date.now());
                }}
                onOpenReviewForBooking={(bookingId) => {
                  setFocusedReviewBookingId(bookingId);
                  setReviewFocusVersion(Date.now());
                }}
                onOpenSupportForBooking={(bookingId) => {
                  setFocusedSupportBookingId(bookingId);
                  setSupportFocusVersion(Date.now());
                }}
              />
            </OwnerWebSection>
            ) : null}
            {activeOwnerWebSectionId === "owner-web-messaging" ? (
            <OwnerWebSection id="owner-web-messaging">
              <MessagingWorkspace enabled focusedBookingId={focusedBookingId} focusVersion={chatFocusVersion} />
              <ReviewsWorkspace enabled focusedBookingId={focusedReviewBookingId} focusVersion={reviewFocusVersion} />
              <SupportWorkspace enabled focusedBookingId={focusedSupportBookingId} focusVersion={supportFocusVersion} />
            </OwnerWebSection>
            ) : null}
              </>
            )}
          </OwnerWebShell>
        ) : null}

        {!isLoading && isProviderMode ? (
          <ProvidersWorkspace enabled hasProviderRole={hasProviderRole} providerRoleActive />
        ) : null}
      </section>
    </main>
  );
}


