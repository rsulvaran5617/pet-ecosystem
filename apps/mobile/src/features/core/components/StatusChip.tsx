import { Text, View } from "react-native";

interface StatusChipProps {
  label: string;
  tone: "active" | "pending" | "neutral";
}

const palette = {
  active: {
    backgroundColor: "rgba(15, 118, 110, 0.12)",
    borderColor: "rgba(15, 118, 110, 0.24)",
    color: "#0f766e"
  },
  pending: {
    backgroundColor: "rgba(180, 83, 9, 0.12)",
    borderColor: "rgba(180, 83, 9, 0.24)",
    color: "#b45309"
  },
  neutral: {
    backgroundColor: "rgba(87, 83, 78, 0.08)",
    borderColor: "rgba(87, 83, 78, 0.14)",
    color: "#44403c"
  }
} as const;

export function StatusChip({ label, tone }: StatusChipProps) {
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette[tone].borderColor,
        backgroundColor: palette[tone].backgroundColor,
        paddingHorizontal: 10,
        paddingVertical: 6
      }}
    >
      <Text
        style={{
          color: palette[tone].color,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase"
        }}
      >
        {label}
      </Text>
    </View>
  );
}
