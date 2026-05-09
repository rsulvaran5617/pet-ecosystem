import { colorTokens } from "@pet/ui";
import { Text, View } from "react-native";

interface StatusChipProps {
  label: string;
  tone: "active" | "pending" | "neutral";
}

const palette = {
  active: {
    backgroundColor: colorTokens.accentSoft,
    borderColor: "rgba(0,151,143,0.22)",
    color: colorTokens.accentDark
  },
  pending: {
    backgroundColor: colorTokens.warningSoft,
    borderColor: "rgba(249,115,22,0.24)",
    color: "#c2410c"
  },
  neutral: {
    backgroundColor: "rgba(95,102,117,0.08)",
    borderColor: "rgba(95,102,117,0.14)",
    color: colorTokens.mutedStrong
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
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0
        }}
      >
        {label}
      </Text>
    </View>
  );
}
