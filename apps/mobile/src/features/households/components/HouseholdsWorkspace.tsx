import { colorTokens } from "@pet/ui";
import type { HouseholdPermission } from "@pet/types";
import { useEffect, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { getMobileHouseholdsApiClient } from "../../core/services/supabase-mobile";
import { useHouseholdsWorkspace } from "../hooks/useHouseholdsWorkspace";

const householdPermissionOptions: Array<{ label: string; value: HouseholdPermission }> = [
  { label: "View", value: "view" },
  { label: "Edit", value: "edit" },
  { label: "Book", value: "book" },
  { label: "Pay", value: "pay" },
  { label: "Admin", value: "admin" }
];

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

function Button({
  disabled,
  label,
  onPress,
  tone = "primary"
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
}) {
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
      <Text style={{ color: tone === "primary" ? "#f8fafc" : "#1c1917", fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  keyboardType,
  label,
  onChange,
  value
}: {
  keyboardType?: "default" | "email-address";
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

function PermissionRow({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colorTokens.muted, flex: 1 }}>{label}</Text>
      <Switch onValueChange={onChange} value={checked} />
    </View>
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
      Object.fromEntries(selectedHouseholdDetail.members.map((member) => [member.id, member.permissions]))
    );
  }, [selectedHouseholdDetail]);

  if (!enabled) {
    return null;
  }

  const canManageSelectedHousehold = selectedHouseholdDetail?.household.myPermissions.includes("admin") ?? false;

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSectionCard
        eyebrow="EP-02 / Households"
        title="Create a household"
        description="This MVP slice adds households, members, invitations and permissions without moving into pets yet."
      >
        <View style={{ gap: 12 }}>
          <Field label="Household name" onChange={setCreateHouseholdName} value={createHouseholdName} />
          <Button
            disabled={isSubmitting || isLoading}
            label="Create household"
            onPress={() => {
              clearMessages();
              void runAction(
                () =>
                  getMobileHouseholdsApiClient().createHousehold({
                    name: createHouseholdName.trim()
                  }),
                "Household created."
              ).then(() => {
                setCreateHouseholdName("");
              });
            }}
          />
        </View>
      </CoreSectionCard>

      <CoreSectionCard
        eyebrow="Incoming"
        title="Pending invitations"
        description="Invitations are actionable inside the app for existing users already present in core."
      >
        <View style={{ gap: 12 }}>
          {snapshot?.pendingInvitations.length ? (
            snapshot.pendingInvitations.map((invitation) => (
              <View key={invitation.id} style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>{invitation.invitedEmail}</Text>
                  <StatusChip label={invitation.status} tone="pending" />
                </View>
                <Text style={{ color: colorTokens.muted }}>Permissions: {invitation.permissions.join(", ")}</Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    label="Accept"
                    onPress={() => {
                      clearMessages();
                      void runAction(
                        () => getMobileHouseholdsApiClient().acceptInvitation(invitation.id),
                        "Invitation accepted."
                      );
                    }}
                  />
                  <Button
                    disabled={isSubmitting}
                    label="Reject"
                    onPress={() => {
                      clearMessages();
                      void runAction(
                        () => getMobileHouseholdsApiClient().rejectInvitation(invitation.id),
                        "Invitation rejected."
                      );
                    }}
                    tone="secondary"
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: colorTokens.muted }}>No pending invitations for the current account.</Text>
          )}
        </View>
      </CoreSectionCard>

      <CoreSectionCard
        eyebrow="Households"
        title="List and basic detail"
        description="This covers create, list, detail, members, invitations and per-member permissions."
      >
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Loading live household data from Supabase...</Text> : null}

          {snapshot?.households.length ? (
            snapshot.households.map((household) => (
              <Pressable
                key={household.id}
                onPress={() => void selectHousehold(household.id)}
                style={{
                  borderRadius: 18,
                  backgroundColor:
                    household.id === selectedHouseholdId ? "rgba(15,118,110,0.08)" : "rgba(247,242,231,0.84)",
                  borderWidth: 1,
                  borderColor:
                    household.id === selectedHouseholdId ? "rgba(15,118,110,0.24)" : "rgba(28,25,23,0.08)",
                  padding: 14,
                  gap: 8
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>{household.name}</Text>
                  <StatusChip
                    label={household.myPermissions.includes("admin") ? "admin" : "member"}
                    tone={household.myPermissions.includes("admin") ? "active" : "neutral"}
                  />
                </View>
                <Text style={{ color: colorTokens.muted }}>{household.memberCount} member(s)</Text>
                <Text style={{ color: colorTokens.muted }}>{household.pendingInvitationCount} pending invitation(s)</Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ color: colorTokens.muted }}>No households yet. Create the first one to begin.</Text>
          )}

          {selectedHouseholdDetail ? (
            <>
              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>
                    {selectedHouseholdDetail.household.name}
                  </Text>
                  <StatusChip label={canManageSelectedHousehold ? "admin access" : "member access"} tone={canManageSelectedHousehold ? "active" : "neutral"} />
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  Your permissions: {selectedHouseholdDetail.household.myPermissions.join(", ")}
                </Text>
              </View>

              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Invite members</Text>
                {canManageSelectedHousehold ? (
                  <>
                    <Field keyboardType="email-address" label="Member email" onChange={setInviteEmail} value={inviteEmail} />
                    {householdPermissionOptions.map((permission) => (
                      <PermissionRow
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
                    <Button
                      disabled={isSubmitting}
                      label="Send invitation"
                      onPress={() => {
                        clearMessages();
                        void runAction(
                          () =>
                            getMobileHouseholdsApiClient().inviteMember(selectedHouseholdDetail.household.id, {
                              email: inviteEmail.trim(),
                              permissions: invitePermissions
                            }),
                          "Invitation saved."
                        ).then(() => {
                          setInviteEmail("");
                          setInvitePermissions(["view"]);
                        });
                      }}
                    />
                  </>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>
                    Only household admins can invite members and manage permissions.
                  </Text>
                )}

                {selectedHouseholdDetail.invitations.map((invitation) => (
                  <View key={invitation.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{invitation.invitedEmail}</Text>
                      <StatusChip label={invitation.status} tone="pending" />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>Permissions: {invitation.permissions.join(", ")}</Text>
                  </View>
                ))}
              </View>

              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Members</Text>
                {selectedHouseholdDetail.members.map((member) => {
                  const draftPermissions = memberPermissionDrafts[member.id] ?? member.permissions;

                  return (
                    <View key={member.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <View style={{ gap: 4, flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917" }}>
                            {member.profile?.firstName} {member.profile?.lastName}
                          </Text>
                          <Text style={{ color: colorTokens.muted }}>{member.profile?.email ?? member.userId}</Text>
                        </View>
                        <StatusChip label={member.permissions.includes("admin") ? "admin" : "member"} tone={member.permissions.includes("admin") ? "active" : "neutral"} />
                      </View>
                      <Text style={{ color: colorTokens.muted }}>Current: {member.permissions.join(", ")}</Text>
                      {householdPermissionOptions.map((permission) => (
                        <PermissionRow
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
                      {canManageSelectedHousehold ? (
                        <Button
                          disabled={isSubmitting}
                          label="Save permissions"
                          onPress={() => {
                            clearMessages();
                            void runAction(
                              () =>
                                getMobileHouseholdsApiClient().updateMemberPermissions(
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
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      </CoreSectionCard>
    </View>
  );
}
