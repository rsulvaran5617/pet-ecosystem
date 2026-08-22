import { colorTokens, visualTokens } from "@pet/ui";
import type { ClaimedAdoptionInvite, HouseholdSummary, UserProfile } from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { StatusChip } from "../../core/components/StatusChip";
import { getMobileFosterApiClient } from "../../core/services/supabase-mobile";

const inputStyle = {
  backgroundColor: colorTokens.surface,
  borderColor: colorTokens.line,
  borderRadius: 14,
  borderWidth: 1,
  color: colorTokens.ink,
  paddingHorizontal: 13,
  paddingVertical: 11
} as const;

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        backgroundColor: active ? "rgba(15,118,110,0.12)" : colorTokens.surface,
        borderColor: active ? "rgba(15,118,110,0.35)" : colorTokens.line,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8
      }}
    >
      <Text style={{ color: active ? colorTokens.accentDark : colorTokens.ink, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function AdoptionInviteContinuation({
  households,
  onClose,
  onComplete,
  onCreateHousehold,
  profile,
  token
}: {
  households: HouseholdSummary[];
  onClose: () => void;
  onComplete: () => void;
  onCreateHousehold: () => void;
  profile: UserProfile;
  token: string;
}) {
  const eligibleHouseholds = useMemo(
    () => households.filter((household) => household.householdType === "owner" && household.myPermissions.includes("admin")),
    [households]
  );
  const [claimed, setClaimed] = useState<ClaimedAdoptionInvite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(eligibleHouseholds[0]?.id ?? null);
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState(profile.email);
  const [applicantPhone, setApplicantPhone] = useState(profile.phone ?? "");
  const [housingType, setHousingType] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [hasOtherPets, setHasOtherPets] = useState<boolean | null>(null);
  const [petExperience, setPetExperience] = useState("");
  const [motivation, setMotivation] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [commitmentAcknowledged, setCommitmentAcknowledged] = useState(false);

  useEffect(() => {
    setHouseholdId((current) => current ?? eligibleHouseholds[0]?.id ?? null);
  }, [eligibleHouseholds]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    getMobileFosterApiClient().claimAdoptionInvite(token)
      .then((result) => {
        if (!mounted) return;
        setClaimed(result);
        setIsComplete(result.nextStep === "completed");
        setApplicantName(result.requesterName || `${profile.firstName} ${profile.lastName}`.trim());
        setApplicantEmail(result.requesterEmail || profile.email);
        setApplicantPhone(result.requesterPhone ?? profile.phone ?? "");
        setHousingType(result.housingType ?? "");
        setHasChildren(result.hasChildren);
        setHasOtherPets(result.hasOtherPets);
        setPetExperience(result.experience ?? "");
        setMotivation(result.motivation);
      })
      .catch((error) => {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : "No fue posible validar la invitacion.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [profile.email, profile.firstName, profile.lastName, profile.phone, token]);

  async function submit() {
    if (!claimed || !householdId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await getMobileFosterApiClient().convertPublicRequestToAdoptionApplication({
        applicantEmail: applicantEmail.trim(),
        applicantHouseholdId: householdId,
        applicantName: applicantName.trim(),
        applicantPhone: applicantPhone.trim() || null,
        availabilityNotes: availabilityNotes.trim() || null,
        commitmentAcknowledged,
        hasChildren,
        hasOtherPets,
        housingType: housingType.trim(),
        inviteId: claimed.inviteId,
        motivation: motivation.trim(),
        petExperience: petExperience.trim()
      });
      setIsComplete(true);
      onComplete();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible enviar la solicitud formal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={{ backgroundColor: colorTokens.surface, borderColor: "rgba(15,118,110,0.2)", borderRadius: 22, borderWidth: 1, gap: 14, padding: 16, ...visualTokens.mobile.softShadow }}>
      <View style={{ gap: 5 }}>
        <Text style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "900" }}>INVITACION DE ADOPCION</Text>
        <Text style={{ color: colorTokens.ink, fontSize: 22, fontWeight: "900" }}>Continua tu proceso responsable</Text>
        {claimed ? <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>{claimed.protectiveDisplayName} te invito a continuar tu interes por {claimed.petName}.</Text> : null}
      </View>

      {isLoading ? <View style={{ alignItems: "center", gap: 8, padding: 20 }}><ActivityIndicator color={colorTokens.accent} /><Text style={{ color: colorTokens.muted }}>Validando invitacion...</Text></View> : null}
      {errorMessage ? <Text accessibilityRole="alert" style={{ backgroundColor: "#fff1f2", borderRadius: 12, color: "#9f1239", padding: 12 }}>{errorMessage}</Text> : null}

      {!isLoading && claimed && isComplete ? (
        <View style={{ gap: 12 }}>
          <StatusChip label="Solicitud formal enviada" tone="active" />
          <Text style={{ color: colorTokens.muted, lineHeight: 20 }}>La Familia Protectora ya puede revisar tu solicitud. La custodia de {claimed.petName} no cambia en esta etapa.</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ backgroundColor: colorTokens.accent, borderRadius: 999, padding: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>Ver adopciones</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && claimed && !isComplete ? (
        <View style={{ gap: 13 }}>
          {!eligibleHouseholds.length ? (
            <View style={{ backgroundColor: "#fff7ed", borderRadius: 14, gap: 8, padding: 12 }}>
              <Text style={{ color: "#9a3412", fontWeight: "900" }}>Primero crea tu hogar familiar</Text>
              <Text style={{ color: "#7c2d12", lineHeight: 18 }}>La solicitud debe quedar asociada a un hogar Owner que administres.</Text>
              <Pressable accessibilityRole="button" onPress={onCreateHousehold} style={{ backgroundColor: colorTokens.accent, borderRadius: 999, padding: 10 }}>
                <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>Crear hogar familiar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={{ color: colorTokens.ink, fontWeight: "900" }}>Hogar receptor</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {eligibleHouseholds.map((household) => <Choice active={household.id === householdId} key={household.id} label={household.name} onPress={() => setHouseholdId(household.id)} />)}
              </View>
              <TextInput onChangeText={setApplicantName} placeholder="Nombre completo" style={inputStyle} value={applicantName} />
              <TextInput autoCapitalize="none" editable={false} keyboardType="email-address" style={{ ...inputStyle, opacity: 0.72 }} value={applicantEmail} />
              <TextInput keyboardType="phone-pad" onChangeText={setApplicantPhone} placeholder="Telefono opcional" style={inputStyle} value={applicantPhone} />
              <TextInput onChangeText={setHousingType} placeholder="Tipo de vivienda" style={inputStyle} value={housingType} />
              <Text style={{ color: colorTokens.ink, fontWeight: "800" }}>¿Hay ninos en casa?</Text>
              <View style={{ flexDirection: "row", gap: 8 }}><Choice active={hasChildren === true} label="Si" onPress={() => setHasChildren(true)} /><Choice active={hasChildren === false} label="No" onPress={() => setHasChildren(false)} /></View>
              <Text style={{ color: colorTokens.ink, fontWeight: "800" }}>¿Tienes otras mascotas?</Text>
              <View style={{ flexDirection: "row", gap: 8 }}><Choice active={hasOtherPets === true} label="Si" onPress={() => setHasOtherPets(true)} /><Choice active={hasOtherPets === false} label="No" onPress={() => setHasOtherPets(false)} /></View>
              <TextInput multiline onChangeText={setPetExperience} placeholder="Experiencia con mascotas" style={{ ...inputStyle, minHeight: 72, textAlignVertical: "top" }} value={petExperience} />
              <TextInput multiline onChangeText={setMotivation} placeholder="Por que deseas adoptar" style={{ ...inputStyle, minHeight: 88, textAlignVertical: "top" }} value={motivation} />
              <TextInput multiline onChangeText={setAvailabilityNotes} placeholder="Disponibilidad o notas adicionales" style={{ ...inputStyle, minHeight: 68, textAlignVertical: "top" }} value={availabilityNotes} />
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: commitmentAcknowledged }} onPress={() => setCommitmentAcknowledged((current) => !current)} style={{ alignItems: "flex-start", flexDirection: "row", gap: 10 }}>
                <View style={{ alignItems: "center", backgroundColor: commitmentAcknowledged ? colorTokens.accent : "#fff", borderColor: colorTokens.line, borderRadius: 6, borderWidth: 1, height: 22, justifyContent: "center", width: 22 }}>
                  <Text style={{ color: "#fff", fontWeight: "900" }}>{commitmentAcknowledged ? "✓" : ""}</Text>
                </View>
                <Text style={{ color: colorTokens.muted, flex: 1, lineHeight: 19 }}>Confirmo que la informacion es verdadera y acepto continuar el proceso responsable. Esto no transfiere la custodia.</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting || !householdId || !applicantName.trim() || !housingType.trim() || !petExperience.trim() || !motivation.trim() || !commitmentAcknowledged}
                onPress={() => void submit()}
                style={{ backgroundColor: colorTokens.accent, borderRadius: 999, opacity: isSubmitting ? 0.65 : 1, padding: 12 }}
              >
                <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>{isSubmitting ? "Enviando..." : "Enviar solicitud formal"}</Text>
              </Pressable>
            </>
          )}
          <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 8 }}><Text style={{ color: colorTokens.accentDark, fontWeight: "800", textAlign: "center" }}>Continuar mas tarde</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}
