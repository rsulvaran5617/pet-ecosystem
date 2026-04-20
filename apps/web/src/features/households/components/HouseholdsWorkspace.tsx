"use client";

import type { HouseholdPermission } from "@pet/types";
import { useEffect, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useHouseholdsWorkspace } from "../hooks/useHouseholdsWorkspace";
import { getBrowserHouseholdsApiClient } from "../../core/services/supabase-browser";

const householdPermissionOptions: Array<{ label: string; value: HouseholdPermission }> = [
  { label: "Ver", value: "view" },
  { label: "Editar", value: "edit" },
  { label: "Reservar", value: "book" },
  { label: "Pagar", value: "pay" },
  { label: "Administrar", value: "admin" }
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
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "text";
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={controlStyle}
        type={type}
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

function togglePermission(currentPermissions: HouseholdPermission[], permission: HouseholdPermission, enabled: boolean) {
  if (enabled) {
    return Array.from(new Set([...currentPermissions, permission]));
  }

  return currentPermissions.filter((value) => value !== permission);
}

export function HouseholdsWorkspace({ enabled }: { enabled: boolean }) {
  const {
    snapshot,
    selectedHouseholdId,
    selectedHouseholdDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    selectHousehold,
    runAction
  } = useHouseholdsWorkspace(enabled);
  const [createHouseholdName, setCreateHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<HouseholdPermission[]>(["view"]);
  const [memberPermissionDrafts, setMemberPermissionDrafts] = useState<Record<string, HouseholdPermission[]>>({});

  useEffect(() => {
    if (!selectedHouseholdDetail) {
      setMemberPermissionDrafts({});
      return;
    }

    setMemberPermissionDrafts(
      Object.fromEntries(
        selectedHouseholdDetail.members.map((member) => [
          member.id,
          member.permissions
        ])
      )
    );
  }, [selectedHouseholdDetail]);

  if (!enabled) {
    return null;
  }

  const canManageSelectedHousehold = selectedHouseholdDetail?.household.myPermissions.includes("admin") ?? false;

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px"
        }}
      >
        <CoreSection
          eyebrow="EP-02 / Households"
          title="Crear un hogar"
          description="Un hogar agrupa integrantes, permisos y luego acceso a mascotas, pero este alcance del MVP se mantiene solo en la configuracion del hogar."
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              clearMessages();
              void runAction(
                () =>
                  getBrowserHouseholdsApiClient().createHousehold({
                    name: createHouseholdName.trim()
                  }),
                "Hogar creado."
              ).then(() => {
                setCreateHouseholdName("");
              });
            }}
            style={{ display: "grid", gap: "14px" }}
          >
            <Field
              label="Nombre del hogar"
              onChange={setCreateHouseholdName}
              placeholder="Hogar Patitas"
              value={createHouseholdName}
            />
            <Button disabled={isSubmitting || isLoading} type="submit">
              Crear hogar
            </Button>
          </form>
        </CoreSection>

        <CoreSection
          eyebrow="Incoming"
          title="Invitaciones pendientes"
          description="En este MVP solo se invita a usuarios existentes, asi que las invitaciones se resuelven dentro de la app."
        >
          <div style={{ display: "grid", gap: "12px" }}>
            {snapshot?.pendingInvitations.length ? (
              snapshot.pendingInvitations.map((invitation) => (
                <article
                  key={invitation.id}
                  style={{
                    borderRadius: "18px",
                    padding: "16px",
                    background: "rgba(247, 242, 231, 0.72)",
                    display: "grid",
                    gap: "10px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <strong>{invitation.invitedEmail}</strong>
                    <StatusPill tone="pending" label={invitation.status} />
                  </div>
                  <span style={{ color: "#57534e" }}>Permisos: {invitation.permissions.join(", ")}</span>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => {
                        clearMessages();
                        void runAction(
                          () => getBrowserHouseholdsApiClient().acceptInvitation(invitation.id),
                          "Invitacion aceptada."
                        );
                      }}
                    >
                      Aceptar
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => {
                        clearMessages();
                        void runAction(
                          () => getBrowserHouseholdsApiClient().rejectInvitation(invitation.id),
                          "Invitacion rechazada.",
                          true
                        );
                      }}
                      tone="secondary"
                    >
                      Rechazar
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <p style={{ margin: 0, color: "#57534e" }}>No hay invitaciones pendientes para esta cuenta.</p>
            )}
          </div>
        </CoreSection>
      </div>

      <CoreSection
        eyebrow="Households"
        title="Lista de hogares y detalle basico"
        description="Esto cubre crear, listar, ver detalle, integrantes, invitaciones y permisos por integrante sin pasar todavia a mascotas."
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando datos del hogar desde Supabase...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)",
              gap: "18px"
            }}
          >
            <div style={{ display: "grid", gap: "12px" }}>
              {snapshot?.households.length ? (
                snapshot.households.map((household) => {
                  const isActive = household.id === selectedHouseholdId;

                  return (
                    <button
                      key={household.id}
                      onClick={() => void selectHousehold(household.id)}
                      style={{
                        borderRadius: "18px",
                        border: isActive ? "1px solid rgba(15, 118, 110, 0.28)" : "1px solid rgba(28, 25, 23, 0.1)",
                        padding: "16px",
                        textAlign: "left",
                        background: isActive ? "rgba(15, 118, 110, 0.08)" : "rgba(247, 242, 231, 0.72)",
                        display: "grid",
                        gap: "10px",
                        cursor: "pointer"
                      }}
                      type="button"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <strong>{household.name}</strong>
                        <StatusPill
                          tone={household.myPermissions.includes("admin") ? "active" : "neutral"}
                          label={household.myPermissions.includes("admin") ? "admin" : "member"}
                        />
                      </div>
                      <span style={{ color: "#57534e" }}>{household.memberCount} integrante(s)</span>
                      <span style={{ color: "#57534e" }}>
                        {household.pendingInvitationCount} invitacion(es) pendiente(s)
                      </span>
                    </button>
                  );
                })
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay hogares. Crea el primero para empezar.</p>
              )}
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              {selectedHouseholdDetail ? (
                <>
                  <article
                    style={{
                      borderRadius: "22px",
                      padding: "20px",
                      background: "rgba(247, 242, 231, 0.72)",
                      display: "grid",
                      gap: "10px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <h3 style={{ margin: 0 }}>{selectedHouseholdDetail.household.name}</h3>
                      <StatusPill
                        tone={canManageSelectedHousehold ? "active" : "neutral"}
                        label={canManageSelectedHousehold ? "admin access" : "member access"}
                      />
                    </div>
                    <p style={{ margin: 0, color: "#57534e" }}>
                      Tus permisos: {selectedHouseholdDetail.household.myPermissions.join(", ")}
                    </p>
                  </article>

                  <article
                    style={{
                      borderRadius: "22px",
                      padding: "20px",
                      background: "rgba(247, 242, 231, 0.72)",
                      display: "grid",
                      gap: "14px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <h3 style={{ margin: 0 }}>Invitar integrantes</h3>
                      <StatusPill tone="neutral" label={`${selectedHouseholdDetail.invitations.length} pendientes visibles`} />
                    </div>
                    {canManageSelectedHousehold ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          clearMessages();
                          void runAction(
                            () =>
                              getBrowserHouseholdsApiClient().inviteMember(selectedHouseholdDetail.household.id, {
                                email: inviteEmail.trim(),
                                permissions: invitePermissions
                              }),
                            "Invitacion guardada."
                          ).then(() => {
                            setInviteEmail("");
                            setInvitePermissions(["view"]);
                          });
                        }}
                        style={{ display: "grid", gap: "12px" }}
                      >
                        <Field
                          label="Correo del integrante"
                          onChange={setInviteEmail}
                          placeholder="member@example.com"
                          type="email"
                          value={inviteEmail}
                        />
                        <div style={{ display: "grid", gap: "8px" }}>
                          <span style={fieldLabelStyle}>Permisos</span>
                          {householdPermissionOptions.map((permission) => (
                            <CheckField
                              key={permission.value}
                              checked={invitePermissions.includes(permission.value)}
                              label={permission.label}
                              onChange={(checked) =>
                                setInvitePermissions((currentPermissions) =>
                                  togglePermission(currentPermissions, permission.value, checked)
                                )
                              }
                            />
                          ))}
                        </div>
                        <Button disabled={isSubmitting} type="submit">
                          Enviar invitacion
                        </Button>
                      </form>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>
                        Solo los administradores del hogar pueden invitar integrantes y gestionar permisos.
                      </p>
                    )}

                    {selectedHouseholdDetail.invitations.length ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {selectedHouseholdDetail.invitations.map((invitation) => (
                          <article
                            key={invitation.id}
                            style={{
                              borderRadius: "18px",
                              padding: "14px 16px",
                              background: "rgba(255,255,255,0.72)",
                              display: "grid",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                              <strong>{invitation.invitedEmail}</strong>
                              <StatusPill tone="pending" label={invitation.status} />
                            </div>
                            <span style={{ color: "#57534e" }}>
                              Permisos: {invitation.permissions.join(", ")}
                            </span>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </article>

                  <article
                    style={{
                      borderRadius: "22px",
                      padding: "20px",
                      background: "rgba(247, 242, 231, 0.72)",
                      display: "grid",
                      gap: "14px"
                    }}
                  >
                    <h3 style={{ margin: 0 }}>Integrantes</h3>
                    {selectedHouseholdDetail.members.map((member) => {
                      const draftPermissions = memberPermissionDrafts[member.id] ?? member.permissions;

                      return (
                        <article
                          key={member.id}
                          style={{
                            borderRadius: "18px",
                            padding: "16px",
                            background: "rgba(255,255,255,0.72)",
                            display: "grid",
                            gap: "12px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                            <div style={{ display: "grid", gap: "4px" }}>
                              <strong>
                                {member.profile?.firstName} {member.profile?.lastName}
                              </strong>
                              <span style={{ color: "#57534e" }}>{member.profile?.email ?? member.userId}</span>
                            </div>
                            <StatusPill
                              tone={member.permissions.includes("admin") ? "active" : "neutral"}
                              label={member.permissions.includes("admin") ? "admin" : "member"}
                            />
                          </div>
                          <span style={{ color: "#57534e" }}>Actuales: {member.permissions.join(", ")}</span>
                          <div style={{ display: "grid", gap: "8px" }}>
                            {householdPermissionOptions.map((permission) => (
                              <CheckField
                                key={`${member.id}-${permission.value}`}
                                checked={draftPermissions.includes(permission.value)}
                                label={permission.label}
                                onChange={(checked) =>
                                  setMemberPermissionDrafts((currentDrafts) => ({
                                    ...currentDrafts,
                                    [member.id]: togglePermission(draftPermissions, permission.value, checked)
                                  }))
                                }
                              />
                            ))}
                          </div>
                          {canManageSelectedHousehold ? (
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <Button
                                disabled={isSubmitting}
                                onClick={() => {
                                  clearMessages();
                                  void runAction(
                                    () =>
                                      getBrowserHouseholdsApiClient().updateMemberPermissions(
                                        selectedHouseholdDetail.household.id,
                                        member.id,
                                        {
                                          permissions: memberPermissionDrafts[member.id] ?? member.permissions
                                        }
                                      ),
                                    `Permisos actualizados para ${member.profile?.email ?? "member"}.`
                                  );
                                }}
                                tone="secondary"
                              >
                                Guardar permisos
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </article>
                </>
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>
                  Selecciona un hogar para revisar integrantes, invitaciones y permisos.
                </p>
              )}
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}


