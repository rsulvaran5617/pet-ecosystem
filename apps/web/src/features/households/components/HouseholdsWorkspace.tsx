"use client";

import type { HouseholdPermission } from "@pet/types";
import { useEffect, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { useHouseholdsWorkspace } from "../hooks/useHouseholdsWorkspace";
import { getBrowserHouseholdsApiClient } from "../../core/services/supabase-browser";

const householdPermissionOptions: Array<{ label: string; value: HouseholdPermission }> = [
  { label: "View", value: "view" },
  { label: "Edit", value: "edit" },
  { label: "Book", value: "book" },
  { label: "Pay", value: "pay" },
  { label: "Admin", value: "admin" }
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
          title="Create a household"
          description="A household groups members, permissions and later pet access, but this MVP slice stays inside household setup only."
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
                "Household created."
              ).then(() => {
                setCreateHouseholdName("");
              });
            }}
            style={{ display: "grid", gap: "14px" }}
          >
            <Field
              label="Household name"
              onChange={setCreateHouseholdName}
              placeholder="Paws family"
              value={createHouseholdName}
            />
            <Button disabled={isSubmitting || isLoading} type="submit">
              Create household
            </Button>
          </form>
        </CoreSection>

        <CoreSection
          eyebrow="Incoming"
          title="Pending invitations"
          description="Only existing users can be invited in this MVP slice, so invitations stay actionable directly inside the app."
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
                  <span style={{ color: "#57534e" }}>Permissions: {invitation.permissions.join(", ")}</span>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => {
                        clearMessages();
                        void runAction(
                          () => getBrowserHouseholdsApiClient().acceptInvitation(invitation.id),
                          "Invitation accepted."
                        );
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => {
                        clearMessages();
                        void runAction(
                          () => getBrowserHouseholdsApiClient().rejectInvitation(invitation.id),
                          "Invitation rejected.",
                          true
                        );
                      }}
                      tone="secondary"
                    >
                      Reject
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <p style={{ margin: 0, color: "#57534e" }}>No pending invitations for the current account.</p>
            )}
          </div>
        </CoreSection>
      </div>

      <CoreSection
        eyebrow="Households"
        title="Household list and basic detail"
        description="This covers create, list, basic detail, members, invitations and per-member permissions without moving into pets yet."
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Loading live household data from Supabase...</p>
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
                      <span style={{ color: "#57534e" }}>{household.memberCount} member(s)</span>
                      <span style={{ color: "#57534e" }}>
                        {household.pendingInvitationCount} pending invitation(s)
                      </span>
                    </button>
                  );
                })
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>No households yet. Create the first one to begin.</p>
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
                      Your permissions: {selectedHouseholdDetail.household.myPermissions.join(", ")}
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
                      <h3 style={{ margin: 0 }}>Invite members</h3>
                      <StatusPill tone="neutral" label={`${selectedHouseholdDetail.invitations.length} visible pending`} />
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
                            "Invitation saved."
                          ).then(() => {
                            setInviteEmail("");
                            setInvitePermissions(["view"]);
                          });
                        }}
                        style={{ display: "grid", gap: "12px" }}
                      >
                        <Field
                          label="Member email"
                          onChange={setInviteEmail}
                          placeholder="member@example.com"
                          type="email"
                          value={inviteEmail}
                        />
                        <div style={{ display: "grid", gap: "8px" }}>
                          <span style={fieldLabelStyle}>Permissions</span>
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
                          Send invitation
                        </Button>
                      </form>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>
                        Only household admins can invite members and manage permissions.
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
                              Permissions: {invitation.permissions.join(", ")}
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
                    <h3 style={{ margin: 0 }}>Members</h3>
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
                          <span style={{ color: "#57534e" }}>Current: {member.permissions.join(", ")}</span>
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
                                    `Permissions updated for ${member.profile?.email ?? "member"}.`
                                  );
                                }}
                                tone="secondary"
                              >
                                Save permissions
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
                  Select a household to inspect members, invitations and permissions.
                </p>
              )}
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
