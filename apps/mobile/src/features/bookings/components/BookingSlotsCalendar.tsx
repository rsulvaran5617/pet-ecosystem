import { colorTokens, visualTokens } from "@pet/ui";
import type { BookingSlot } from "@pet/types";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales.es = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ],
  monthNamesShort: ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."],
  dayNames: ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"],
  dayNamesShort: ["Dom.", "Lun.", "Mar.", "Mie.", "Jue.", "Vie.", "Sab."],
  today: "Hoy"
};
LocaleConfig.defaultLocale = "es";

const slotCardStyle = {
  borderRadius: 18,
  borderWidth: 1,
  padding: 12,
  gap: 8,
  ...visualTokens.mobile.softShadow
} as const;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getSlotLabel(slot: BookingSlot) {
  if (slot.status === "full") {
    return "Lleno";
  }

  if (slot.status === "expired") {
    return "Expirado";
  }

  if (slot.status === "unavailable") {
    return "No disponible";
  }

  if (slot.availableCount <= 0) {
    return "Lleno";
  }

  if (slot.status === "low_capacity" || slot.availableCount === 1) {
    return "Ultimo cupo";
  }

  return `${slot.availableCount} disponibles`;
}

function canSelectSlot(slot: BookingSlot) {
  return (slot.status === "available" || slot.status === "low_capacity") && slot.availableCount > 0;
}

export function BookingSlotsCalendar({
  isLoading,
  onSelectDate,
  onSelectSlot,
  selectedDate,
  selectedSlot,
  slots
}: {
  isLoading: boolean;
  onSelectDate: (slotDate: string) => void;
  onSelectSlot: (slot: BookingSlot) => void;
  selectedDate: string | null;
  selectedSlot: BookingSlot | null;
  slots: BookingSlot[];
}) {
  const selectedDateValue = selectedDate ?? new Date().toISOString().slice(0, 10);
  const slotsByDate = useMemo(() => {
    return slots.reduce<Record<string, BookingSlot[]>>((accumulator, slot) => {
      accumulator[slot.slotDate] = [...(accumulator[slot.slotDate] ?? []), slot];
      return accumulator;
    }, {});
  }, [slots]);
  const markedDates = useMemo(() => {
    return Object.entries(slotsByDate).reduce<
      Record<
        string,
        {
          disabled?: boolean;
          dotColor?: string;
          marked?: boolean;
          selected?: boolean;
          selectedColor?: string;
          selectedTextColor?: string;
        }
      >
    >((accumulator, [slotDate, dateSlots]) => {
      const hasAvailableSlot = dateSlots.some(canSelectSlot);
      accumulator[slotDate] = {
        disabled: !hasAvailableSlot,
        dotColor: hasAvailableSlot ? "#0f766e" : "#a8a29e",
        marked: true,
        selected: slotDate === selectedDateValue,
        selectedColor: slotDate === selectedDateValue ? "#0f766e" : undefined,
        selectedTextColor: slotDate === selectedDateValue ? "#f8fafc" : undefined
      };

      return accumulator;
    }, {});
  }, [selectedDateValue, slotsByDate]);
  const selectedDateSlots = slotsByDate[selectedDateValue] ?? [];

  if (isLoading) {
    return <Text style={{ color: colorTokens.muted }}>Cargando horarios disponibles...</Text>;
  }

  if (!slots.length) {
    return <Text style={{ color: colorTokens.muted }}>No hay horarios con cupos publicados para este servicio por ahora.</Text>;
  }

  return (
    <View style={{ gap: 12 }}>
      <Calendar
        current={selectedDateValue}
        markedDates={markedDates}
        onDayPress={(day: { dateString: string }) => onSelectDate(day.dateString)}
        theme={{
          arrowColor: colorTokens.accent,
          calendarBackground: colorTokens.surface,
          selectedDayBackgroundColor: colorTokens.accent,
          todayTextColor: colorTokens.accent
        }}
      />
      <View style={{ gap: 8 }}>
        <Text style={{ color: "#1c1917", fontSize: 16, fontWeight: "700" }}>Horarios disponibles</Text>
        {selectedDateSlots.length ? (
          selectedDateSlots.map((slot) => {
            const isSelected = selectedSlot?.availabilityRuleId === slot.availabilityRuleId && selectedSlot.slotStartAt === slot.slotStartAt;
            const isSelectable = canSelectSlot(slot);

            return (
              <Pressable
                disabled={!isSelectable}
                key={`${slot.availabilityRuleId}-${slot.slotStartAt}`}
                onPress={() => onSelectSlot(slot)}
                style={[
                  slotCardStyle,
                  {
                    backgroundColor: isSelected ? colorTokens.accentSoft : colorTokens.surface,
                    borderColor: isSelected ? "rgba(0,151,143,0.32)" : colorTokens.line,
                    opacity: isSelectable ? 1 : 0.6
                  }
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <Text style={{ color: "#1c1917", flex: 1, fontWeight: "700" }}>
                    {formatTime(slot.slotStartAt)} - {formatTime(slot.slotEndAt)}
                  </Text>
                  <Text style={{ color: isSelectable ? "#0f766e" : "#78716c", fontWeight: "800" }}>{getSlotLabel(slot)}</Text>
                </View>
                <Text style={{ color: colorTokens.muted }}>
                  {slot.reservedCount} reservado(s) de {slot.capacityTotal} cupo(s)
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={{ color: colorTokens.muted }}>Selecciona un dia marcado para ver horarios.</Text>
        )}
      </View>
    </View>
  );
}
