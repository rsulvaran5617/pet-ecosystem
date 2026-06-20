import { colorTokens } from "@pet/ui";
import type { HouseholdPermission, PetTransferRecord, ProtectiveHouseholdOrganizationType, ProtectiveHouseholdProfile } from "@pet/types";
import { useEffect, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

import { CoreSectionCard } from "../../core/components/CoreSectionCard";
import { StatusChip } from "../../core/components/StatusChip";
import { getMobileFosterApiClient, getMobileHouseholdsApiClient } from "../../core/services/supabase-mobile";
import { useHouseholdsWorkspace } from "../hooks/useHouseholdsWorkspace";

const householdPermissionOptions: Array<{ label: string; value: HouseholdPermission }> = [
  { label: "Ver", value: "view" },
  { label: "Editar", value: "edit" },
  { label: "Reservar", value: "book" },
  { label: "Pagar", value: "pay" },
  { label: "Administrar", value: "admin" }
];

const protectiveOrganizationTypeOptions: Array<{ label: string; value: ProtectiveHouseholdOrganizationType }> = [
  { label: "Rescatista", value: "individual_rescuer" },
  { label: "Hogar temporal", value: "foster_home" },
  { label: "Fundacion", value: "foundation" },
  { label: "Acogida", value: "temporary_home" },
  { label: "Otro", value: "other" }
];

const protectiveStatusLabels: Record<ProtectiveHouseholdProfile["status"], string> = {
  draft: "Borrador",
  pending_review: "En revision",
  approved: "Aprobada",
  rejected: "Rechazada",
  suspended: "Suspendida"
};

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
  helperText,
  keyboardType,
  label,
  multiline,
  onChange,
  placeholder,
  value
}: {
  helperText?: string;
  keyboardType?: "default" | "email-address";
  label: string;
  multiline?: boolean;
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
        multiline={multiline}
        style={[inputStyle, multiline ? { minHeight: 78, textAlignVertical: "top" } : null]}
        value={value}
      />
      {helperText ? <Text style={{ color: colorTokens.muted, fontSize: 12, lineHeight: 17 }}>{helperText}</Text> : null}
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

export function HouseholdsWorkspace({ enabled, onHouseholdCreated }: { enabled: boolean; onHouseholdCreated?: () => void | Promise<void> }) {
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
  const [protectiveProfile, setProtectiveProfile] = useState<ProtectiveHouseholdProfile | null>(null);
  const [isProtectiveProfileLoading, setIsProtectiveProfileLoading] = useState(false);
  const [protectiveDisplayName, setProtectiveDisplayName] = useState("");
  const [protectiveOrganizationType, setProtectiveOrganizationType] =
    useState<ProtectiveHouseholdOrganizationType>("foster_home");
  const [protectiveCity, setProtectiveCity] = useState("");
  const [protectiveStateRegion, setProtectiveStateRegion] = useState("");
  const [protectiveCountryCode, setProtectiveCountryCode] = useState("PA");
  const [protectiveContactNotes, setProtectiveContactNotes] = useState("");
  const [protectivePublicNotes, setProtectivePublicNotes] = useState("");
  const [incomingPetTransfers, setIncomingPetTransfers] = useState<PetTransferRecord[]>([]);
  const [isTransfersLoading, setIsTransfersLoading] = useState(false);

  async function loadProtectiveProfile(householdId: string | null) {
    if (!householdId) {
      setProtectiveProfile(null);
      return;
    }

    setIsProtectiveProfileLoading(true);

    try {
      const nextProfile = await getMobileFosterApiClient().getProtectiveHouseholdProfile(householdId);
      setProtectiveProfile(nextProfile);
    } finally {
      setIsProtectiveProfileLoading(false);
    }
  }

  async function loadIncomingPetTransfers() {
    setIsTransfersLoading(true);

    try {
      const nextTransfers = await getMobileFosterApiClient().listIncomingPetTransfers();
      setIncomingPetTransfers(nextTransfers);
    } finally {
      setIsTransfersLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedHouseholdDetail) {
      setMemberPermissionDrafts({});
      return;
    }

    setMemberPermissionDrafts(
      Object.fromEntries(selectedHouseholdDetail.members.map((member) => [member.id, member.permissions]))
    );
  }, [selectedHouseholdDetail]);

  useEffect(() => {
    void loadProtectiveProfile(selectedHouseholdId);
  }, [selectedHouseholdId]);

  useEffect(() => {
    if (!enabled) {
      setIncomingPetTransfers([]);
      return;
    }

    void loadIncomingPetTransfers();
  }, [enabled]);

  useEffect(() => {
    if (protectiveProfile) {
      setProtectiveDisplayName(protectiveProfile.displayName);
      setProtectiveOrganizationType(protectiveProfile.organizationType);
      setProtectiveCity(protectiveProfile.city);
      setProtectiveStateRegion(protectiveProfile.stateRegion ?? "");
      setProtectiveCountryCode(protectiveProfile.countryCode);
      setProtectiveContactNotes(protectiveProfile.contactNotes ?? "");
      setProtectivePublicNotes(protectiveProfile.publicNotes ?? "");
      return;
    }

    setProtectiveDisplayName(selectedHouseholdDetail?.household.name ?? "");
    setProtectiveOrganizationType("foster_home");
    setProtectiveCity("");
    setProtectiveStateRegion("");
    setProtectiveCountryCode("PA");
    setProtectiveContactNotes("");
    setProtectivePublicNotes("");
  }, [protectiveProfile, selectedHouseholdDetail?.household.name]);

  if (!enabled) {
    return null;
  }

  const canManageSelectedHousehold = selectedHouseholdDetail?.household.myPermissions.includes("admin") ?? false;
  const canEditProtectiveProfile =
    canManageSelectedHousehold && (!protectiveProfile || protectiveProfile.status === "draft" || protectiveProfile.status === "rejected");
  const protectiveProfileIsSubmittable =
    Boolean(protectiveDisplayName.trim()) &&
    Boolean(protectiveCity.trim()) &&
    protectiveCountryCode.trim().length === 2 &&
    canEditProtectiveProfile;

  return (
    <View style={{ gap: 20 }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSectionCard
        eyebrow="Hogar"
        title="Crea tu hogar"
        description="Tu hogar organiza las mascotas, las personas que pueden ayudar y las reservas familiares. Es el primer paso antes de registrar una mascota."
      >
        <View style={{ gap: 12 }}>
          <Field
            helperText="Puedes usar un nombre familiar, por ejemplo: Hogar Sulvaran Velasco."
            label="Nombre del hogar"
            onChange={setCreateHouseholdName}
            placeholder="Nombre de tu hogar"
            value={createHouseholdName}
          />
          <Button
            disabled={isSubmitting || isLoading || !createHouseholdName.trim()}
            label="Crear mi hogar"
            onPress={() => {
              clearMessages();
              void runAction(
                () =>
                  getMobileHouseholdsApiClient().createHousehold({
                    name: createHouseholdName.trim()
                  }),
                "Hogar creado."
              ).then(async () => {
                setCreateHouseholdName("");
                await onHouseholdCreated?.();
              });
            }}
          />
        </View>
      </CoreSectionCard>

      <CoreSectionCard
        eyebrow="Invitaciones"
        title="Invitaciones pendientes"
        description="Las invitaciones se resuelven dentro de la app para usuarios existentes en core."
      >
        <View style={{ gap: 12 }}>
          {snapshot?.pendingInvitations.length ? (
            snapshot.pendingInvitations.map((invitation) => (
              <View key={invitation.id} style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917", flex: 1 }}>{invitation.invitedEmail}</Text>
                  <StatusChip label={invitation.status} tone="pending" />
                </View>
                <Text style={{ color: colorTokens.muted }}>Permisos: {invitation.permissions.join(", ")}</Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    label="Aceptar"
                    onPress={() => {
                      clearMessages();
                      void runAction(
                        () => getMobileHouseholdsApiClient().acceptInvitation(invitation.id),
                        "Invitacion aceptada."
                      );
                    }}
                  />
                  <Button
                    disabled={isSubmitting}
                    label="Rechazar"
                    onPress={() => {
                      clearMessages();
                      void runAction(
                        () => getMobileHouseholdsApiClient().rejectInvitation(invitation.id),
                        "Invitacion rechazada."
                      );
                    }}
                    tone="secondary"
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: colorTokens.muted }}>No hay invitaciones pendientes para esta cuenta.</Text>
          )}
        </View>
      </CoreSectionCard>

      <CoreSectionCard
        eyebrow="Custodia"
        title="Invitaciones de mascota"
        description="Acepta o rechaza transferencias privadas enviadas por una familia protectora aprobada."
      >
        <View style={{ gap: 12 }}>
          {isTransfersLoading ? <Text style={{ color: colorTokens.muted }}>Cargando invitaciones de mascota...</Text> : null}
          {incomingPetTransfers.length ? (
            incomingPetTransfers.map((transfer) => {
              const canAcceptInSelectedHousehold = Boolean(selectedHouseholdDetail?.household.myPermissions.includes("admin"));
              const isPending = transfer.status === "pending";
              const snapshot = transfer.consentSnapshot as {
                document_count?: number;
                vaccine_count?: number;
                allergy_count?: number;
                condition_count?: number;
                pending_reminder_count?: number;
              };

              return (
                <View key={transfer.id} style={{ borderRadius: 18, backgroundColor: "rgba(240,253,250,0.72)", padding: 14, gap: 9 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#1c1917" }}>{transfer.petName}</Text>
                      <Text style={{ color: colorTokens.muted, fontSize: 12 }}>
                        De {transfer.fromHouseholdName} - {transfer.petSpecies}
                      </Text>
                    </View>
                    <StatusChip
                      label={
                        transfer.status === "pending"
                          ? "pendiente"
                          : transfer.status === "accepted"
                            ? "aceptada"
                            : transfer.status === "rejected"
                              ? "rechazada"
                              : transfer.status
                      }
                      tone={transfer.status === "accepted" ? "active" : transfer.status === "pending" ? "pending" : "neutral"}
                    />
                  </View>
                  <Text style={{ color: "#115e59", fontSize: 12, lineHeight: 17 }}>
                    La mascota conserva su expediente permitido. No se transfieren reservas, chats, pagos, soporte ni recordatorios futuros.
                  </Text>
                  <Text style={{ color: colorTokens.muted, fontSize: 11, lineHeight: 16 }}>
                    Incluye {snapshot.document_count ?? 0} documento(s), {snapshot.vaccine_count ?? 0} vacuna(s), {snapshot.allergy_count ?? 0} alergia(s) y {snapshot.condition_count ?? 0} condicion(es). Recordatorios pendientes: {snapshot.pending_reminder_count ?? 0}.
                  </Text>
                  {transfer.transferNotes ? (
                    <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "700" }}>Nota: {transfer.transferNotes}</Text>
                  ) : null}
                  {isPending ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Button
                        disabled={isSubmitting || !canAcceptInSelectedHousehold || !selectedHouseholdId}
                        label="Aceptar en este hogar"
                        onPress={() => {
                          if (!selectedHouseholdId) {
                            return;
                          }

                          clearMessages();
                          void runAction(
                            () => getMobileFosterApiClient().acceptPetTransfer(transfer.id, selectedHouseholdId),
                            "Transferencia aceptada. La mascota ahora pertenece al hogar seleccionado.",
                            false
                          ).then(async () => {
                            await loadIncomingPetTransfers();
                          });
                        }}
                      />
                      <Button
                        disabled={isSubmitting}
                        label="Rechazar"
                        onPress={() => {
                          clearMessages();
                          void runAction(
                            () => getMobileFosterApiClient().rejectPetTransfer(transfer.id),
                            "Transferencia rechazada.",
                            false
                          ).then(async () => {
                            await loadIncomingPetTransfers();
                          });
                        }}
                        tone="secondary"
                      />
                    </View>
                  ) : null}
                  {!canAcceptInSelectedHousehold && isPending ? (
                    <Text style={{ color: colorTokens.muted, fontSize: 11 }}>
                      Selecciona un hogar donde tengas permiso administrador para aceptar esta transferencia.
                    </Text>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={{ color: colorTokens.muted }}>No tienes invitaciones de transferencia de mascota.</Text>
          )}
        </View>
      </CoreSectionCard>

      <CoreSectionCard
        eyebrow="Hogares"
        title="Lista y detalle basico"
        description="Gestiona integrantes, invitaciones y permisos por hogar."
      >
        <View style={{ gap: 12 }}>
          {isLoading ? <Text style={{ color: colorTokens.muted }}>Preparando hogares, integrantes e invitaciones...</Text> : null}

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
                <Text style={{ color: colorTokens.muted }}>{household.memberCount} integrante(s)</Text>
                <Text style={{ color: colorTokens.muted }}>{household.pendingInvitationCount} invitacion(es) pendiente(s)</Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ color: colorTokens.muted }}>Todavia no hay hogares. Crea el primero para empezar.</Text>
          )}

          {selectedHouseholdDetail ? (
            <>
              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917", flex: 1 }}>
                    {selectedHouseholdDetail.household.name}
                  </Text>
                  <StatusChip label={canManageSelectedHousehold ? "admin" : "integrante"} tone={canManageSelectedHousehold ? "active" : "neutral"} />
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  Tus permisos: {selectedHouseholdDetail.household.myPermissions.join(", ")}
                </Text>
              </View>

              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Familia protectora</Text>
                    <Text style={{ color: colorTokens.muted, lineHeight: 19 }}>
                      Solicita aprobacion para custodiar mascotas y preparar futuras transferencias privadas. No habilita venta, cobros ni publicacion automatica.
                    </Text>
                  </View>
                  <StatusChip
                    label={protectiveProfile ? protectiveStatusLabels[protectiveProfile.status] : "Sin solicitud"}
                    tone={protectiveProfile?.status === "approved" ? "active" : protectiveProfile ? "pending" : "neutral"}
                  />
                </View>
                {isProtectiveProfileLoading ? (
                  <Text style={{ color: colorTokens.muted }}>Cargando estado de familia protectora...</Text>
                ) : null}
                {protectiveProfile?.reviewNotes ? (
                  <Notice message={`Nota de revision: ${protectiveProfile.reviewNotes}`} tone={protectiveProfile.status === "approved" ? "info" : "error"} />
                ) : null}
                {canEditProtectiveProfile ? (
                  <>
                    <Field
                      label="Nombre visible"
                      onChange={setProtectiveDisplayName}
                      placeholder="Nombre de la familia o fundacion"
                      value={protectiveDisplayName}
                    />
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 12, textTransform: "uppercase", color: "#78716c" }}>Tipo de familia protectora</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {protectiveOrganizationTypeOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => setProtectiveOrganizationType(option.value)}
                            style={{
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor:
                                option.value === protectiveOrganizationType ? "rgba(15,118,110,0.3)" : "rgba(28,25,23,0.14)",
                              backgroundColor:
                                option.value === protectiveOrganizationType ? "rgba(15,118,110,0.12)" : "rgba(255,255,255,0.92)",
                              paddingHorizontal: 12,
                              paddingVertical: 8
                            }}
                          >
                            <Text style={{ color: option.value === protectiveOrganizationType ? "#0f766e" : "#1c1917", fontWeight: "700" }}>
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <Field label="Ciudad" onChange={setProtectiveCity} placeholder="Ciudad" value={protectiveCity} />
                    <Field label="Region/provincia" onChange={setProtectiveStateRegion} placeholder="Provincia o zona" value={protectiveStateRegion} />
                    <Field
                      helperText="Usa codigo de pais ISO de dos letras. Para Panama: PA."
                      label="Pais"
                      onChange={(value) => setProtectiveCountryCode(value.toUpperCase().slice(0, 2))}
                      value={protectiveCountryCode}
                    />
                    <Field
                      label="Notas de contacto"
                      multiline
                      onChange={setProtectiveContactNotes}
                      placeholder="Como puede evaluar admin la solicitud"
                      value={protectiveContactNotes}
                    />
                    <Field
                      label="Descripcion corta"
                      multiline
                      onChange={setProtectivePublicNotes}
                      placeholder="Contexto de acogida o rescate"
                      value={protectivePublicNotes}
                    />
                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                      <Button
                        disabled={isSubmitting || !protectiveProfileIsSubmittable}
                        label="Guardar borrador"
                        onPress={() => {
                          if (!selectedHouseholdId) {
                            return;
                          }

                          clearMessages();
                          void runAction(
                            () =>
                              getMobileFosterApiClient().upsertProtectiveHouseholdProfile({
                                householdId: selectedHouseholdId,
                                displayName: protectiveDisplayName.trim(),
                                organizationType: protectiveOrganizationType,
                                city: protectiveCity.trim(),
                                stateRegion: protectiveStateRegion.trim() || null,
                                countryCode: protectiveCountryCode.trim().toUpperCase(),
                                contactNotes: protectiveContactNotes.trim() || null,
                                publicNotes: protectivePublicNotes.trim() || null
                              }),
                            "Solicitud de familia protectora guardada.",
                            false
                          ).then((nextProfile) => {
                            setProtectiveProfile(nextProfile);
                          });
                        }}
                        tone="secondary"
                      />
                      <Button
                        disabled={isSubmitting || !protectiveProfileIsSubmittable}
                        label="Enviar a revision"
                        onPress={() => {
                          if (!selectedHouseholdId) {
                            return;
                          }

                          clearMessages();
                          void runAction(
                            async () => {
                              await getMobileFosterApiClient().upsertProtectiveHouseholdProfile({
                                householdId: selectedHouseholdId,
                                displayName: protectiveDisplayName.trim(),
                                organizationType: protectiveOrganizationType,
                                city: protectiveCity.trim(),
                                stateRegion: protectiveStateRegion.trim() || null,
                                countryCode: protectiveCountryCode.trim().toUpperCase(),
                                contactNotes: protectiveContactNotes.trim() || null,
                                publicNotes: protectivePublicNotes.trim() || null
                              });
                              return getMobileFosterApiClient().submitProtectiveHouseholdProfile(selectedHouseholdId);
                            },
                            "Solicitud enviada a revision administrativa.",
                            false
                          ).then((nextProfile) => {
                            setProtectiveProfile(nextProfile);
                          });
                        }}
                      />
                    </View>
                  </>
                ) : protectiveProfile ? (
                  <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#1c1917" }}>{protectiveProfile.displayName}</Text>
                    <Text style={{ color: colorTokens.muted }}>
                      {protectiveProfile.city}, {protectiveProfile.countryCode}
                    </Text>
                    <Text style={{ color: colorTokens.muted, lineHeight: 19 }}>
                      {protectiveProfile.status === "pending_review"
                        ? "Tu solicitud esta en revision. Admin debe aprobarla antes de habilitar capacidades futuras."
                        : protectiveProfile.status === "approved"
                          ? "Familia protectora aprobada. Las transferencias privadas se habilitaran en un slice posterior."
                          : protectiveProfile.status === "suspended"
                            ? "La capacidad protectora esta suspendida. Contacta soporte para revision."
                            : "El estado actual no permite edicion directa."}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>
                    Solo integrantes administradores del hogar pueden iniciar esta solicitud.
                  </Text>
                )}
              </View>

              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Invitar integrantes</Text>
                {canManageSelectedHousehold ? (
                  <>
                    <Field keyboardType="email-address" label="Correo del integrante" onChange={setInviteEmail} value={inviteEmail} />
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
                      label="Enviar invitacion"
                      onPress={() => {
                        clearMessages();
                        void runAction(
                          () =>
                            getMobileHouseholdsApiClient().inviteMember(selectedHouseholdDetail.household.id, {
                              email: inviteEmail.trim(),
                              permissions: invitePermissions
                            }),
                          "Invitacion guardada."
                        ).then(() => {
                          setInviteEmail("");
                          setInvitePermissions(["view"]);
                        });
                      }}
                    />
                  </>
                ) : (
                  <Text style={{ color: colorTokens.muted }}>
                    Solo integrantes administradores pueden invitar personas y gestionar permisos.
                  </Text>
                )}

                {selectedHouseholdDetail.invitations.map((invitation) => (
                  <View key={invitation.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", padding: 12, gap: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1917", flex: 1 }}>{invitation.invitedEmail}</Text>
                      <StatusChip label={invitation.status} tone="pending" />
                    </View>
                    <Text style={{ color: colorTokens.muted }}>Permisos: {invitation.permissions.join(", ")}</Text>
                  </View>
                ))}
              </View>

              <View style={{ borderRadius: 18, backgroundColor: "rgba(247,242,231,0.84)", padding: 14, gap: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1917" }}>Integrantes</Text>
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
                      <Text style={{ color: colorTokens.muted }}>Actuales: {member.permissions.join(", ")}</Text>
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
                          label="Guardar permisos"
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
                              `Permisos actualizados para ${member.profile?.email ?? "member"}.`
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


