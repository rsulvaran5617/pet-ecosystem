import { bookingStatusLabels, formatCurrencyAmount, formatDateTimeLabel } from "@pet/config";
import { colorTokens, visualTokens } from "@pet/ui";
import type { BookingPreview, BookingSlot } from "@pet/types";
import { Pressable, Text, View } from "react-native";

function TicketRow({
  icon,
  label,
  value,
  helper
}: {
  icon: string;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: 14,
        backgroundColor: "rgba(248,250,252,0.82)",
        borderWidth: 1,
        borderColor: "rgba(226,232,240,0.92)",
        paddingHorizontal: 9,
        paddingVertical: 8
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          backgroundColor: "rgba(0,151,143,0.1)",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colorTokens.accentDark, fontSize: 13, fontWeight: "900" }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: colorTokens.muted, fontSize: 8, fontWeight: "900", textTransform: "uppercase" }}>
          {label}
        </Text>
        <Text numberOfLines={2} style={{ color: colorTokens.ink, fontSize: 11, fontWeight: "900", lineHeight: 14 }}>
          {value}
        </Text>
        {helper ? (
          <Text numberOfLines={2} style={{ color: colorTokens.muted, fontSize: 9, fontWeight: "600", lineHeight: 12 }}>
            {helper}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TicketAction({
  disabled,
  label,
  onPress,
  tone = "secondary"
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
}) {
  const isPrimary = tone === "primary";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: isPrimary ? colorTokens.accent : "#ffffff",
        borderWidth: isPrimary ? 0 : 1,
        borderColor: "rgba(0,151,143,0.26)",
        paddingHorizontal: isPrimary ? 16 : 10,
        paddingVertical: isPrimary ? 11 : 8,
        opacity: disabled ? 0.65 : 1,
        alignItems: "center",
        justifyContent: "center",
        ...visualTokens.mobile.softShadow
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: isPrimary ? "#ffffff" : colorTokens.accentDark,
          fontSize: isPrimary ? 12 : 10,
          fontWeight: "900"
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function BookingPreviewTicket({
  cancellationDeadlineLabel,
  isSubmitting,
  onChangePayment,
  onChangeSlot,
  onConfirm,
  onGoBack,
  preview,
  selectedSlot
}: {
  cancellationDeadlineLabel: string;
  isSubmitting: boolean;
  onChangePayment: () => void;
  onChangeSlot: () => void;
  onConfirm: () => void;
  onGoBack: () => void;
  preview: BookingPreview;
  selectedSlot: BookingSlot | null;
}) {
  const scheduleValue = selectedSlot
    ? `${formatDateTimeLabel(selectedSlot.slotStartAt)} - ${formatDateTimeLabel(selectedSlot.slotEndAt)}`
    : formatDateTimeLabel(preview.scheduledStartAt);
  const paymentLabel = preview.paymentMethodSummary
    ? `${preview.paymentMethodSummary.brand.toUpperCase()} ${preview.paymentMethodSummary.last4}`
    : "Sin metodo guardado";

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(0,151,143,0.18)",
        backgroundColor: "#ffffff",
        padding: 12,
        gap: 10,
        ...visualTokens.mobile.shadow
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colorTokens.accentDark, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
            Resumen final
          </Text>
          <Text style={{ color: colorTokens.ink, fontSize: 17, fontWeight: "900", lineHeight: 21 }}>
            Resumen de reserva
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            backgroundColor: "rgba(245,158,11,0.13)",
            paddingHorizontal: 9,
            paddingVertical: 6
          }}
        >
          <Text style={{ color: "#92400e", fontSize: 9, fontWeight: "900" }}>
            {bookingStatusLabels[preview.statusOnCreate]}
          </Text>
        </View>
      </View>

      <View
        style={{
          borderRadius: 16,
          backgroundColor: "rgba(0,151,143,0.08)",
          borderWidth: 1,
          borderColor: "rgba(0,151,143,0.16)",
          padding: 10,
          gap: 2
        }}
      >
        <Text numberOfLines={1} style={{ color: colorTokens.ink, fontSize: 13, fontWeight: "900" }}>
          {preview.providerName}
        </Text>
        <Text numberOfLines={2} style={{ color: colorTokens.accentDark, fontSize: 11, fontWeight: "800", lineHeight: 14 }}>
          {preview.serviceName}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <TicketRow icon="P" label="Mascota" value={preview.petName} />
        </View>
        <View style={{ flex: 1 }}>
          <TicketRow icon="$" label="Total" value={formatCurrencyAmount(preview.totalPriceCents, preview.currencyCode)} helper={paymentLabel} />
        </View>
      </View>

      <TicketRow
        icon="C"
        label="Horario"
        value={scheduleValue}
        helper={selectedSlot ? "El cupo se valida al confirmar." : "Horario resuelto por disponibilidad legacy."}
      />

      <View
        style={{
          borderRadius: 14,
          backgroundColor: "rgba(251,250,247,0.92)",
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.86)",
          paddingHorizontal: 10,
          paddingVertical: 8,
          gap: 3
        }}
      >
        <Text style={{ color: colorTokens.muted, fontSize: 8, fontWeight: "900", textTransform: "uppercase" }}>
          Politica de cancelacion
        </Text>
        <Text numberOfLines={2} style={{ color: colorTokens.ink, fontSize: 10, fontWeight: "700", lineHeight: 13 }}>
          Disponible hasta {cancellationDeadlineLabel}. No hay cobro real en este MVP.
        </Text>
      </View>

      <TicketAction disabled={isSubmitting} label="Confirmar reserva" onPress={onConfirm} tone="primary" />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        <TicketAction disabled={isSubmitting} label="Cambiar horario" onPress={onChangeSlot} />
        <TicketAction disabled={isSubmitting} label="Cambiar metodo" onPress={onChangePayment} />
        <TicketAction disabled={isSubmitting} label="Volver" onPress={onGoBack} />
      </View>
    </View>
  );
}
